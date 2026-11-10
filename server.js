const path = require("node:path");
const express = require("express");
const store = require("./src/db");
const render = require("./src/render");
const auth = require("./src/auth");
const media = require("./src/uploads");
const { sendContactEmail, mailConfigured } = require("./src/mail");

const PORT = Number(process.env.PORT || 3000);
const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

auth.ensureAdmin();

// ---------- security headers ----------
const CSP = [
  "default-src 'self'",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": CSP,
  });
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// ---------- static files ----------
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h", index: false }));
app.use("/uploads", (req, res, next) => {
  // Uploaded files can never run scripts, even SVGs
  res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  next();
}, express.static(media.UPLOAD_DIR, { maxAge: "30d", immutable: true, dotfiles: "deny", index: false }));

// ---------- public pages ----------
app.get("/", (req, res) => res.type("html").send(render.homePage({ sent: req.query.sent })));
app.get("/work/:slug", (req, res) => {
  const html = render.casePage(req.params.slug);
  if (!html) return res.status(404).type("html").send(render.notFoundPage());
  res.type("html").send(html);
});
app.get("/robots.txt", (req, res) => res.type("text").send("User-agent: *\nDisallow: /admin\nDisallow: /api\n"));
app.get("/sitemap.xml", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const urls = ["/", ...store.list("cases").filter((c) => c.status === "published").map((c) => `/work/${c.slug}`)];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${render.esc(base + u)}</loc></url>`).join("")}</urlset>`);
});

// ---------- contact form ----------
const contactLimit = auth.rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: "Too many messages from this connection. Try again in a few minutes." });
app.post("/api/contact", contactLimit, async (req, res) => {
  const wantsJson = req.is("application/json");
  const fail = (status, error) => wantsJson ? res.status(status).json({ error }) : res.redirect(303, "/?sent=0#contact");
  const c = store.getSetting("contact");
  if (c.formEnabled === false) return fail(403, "The contact form is turned off.");

  const b = req.body || {};
  if (b.website) return wantsJson ? res.json({ ok: true }) : res.redirect(303, "/?sent=1#contact"); // spam trap
  const msg = {
    name: String(b.name || "").trim().slice(0, 120),
    email: String(b.email || "").trim().slice(0, 200),
    company: String(b.company || "").trim().slice(0, 160),
    details: String(b.details || "").trim().slice(0, 5000),
  };
  const errors = {};
  if (!msg.name) errors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email)) errors.email = "Enter a valid email address, like name@company.com.";
  if (msg.details.length < 10) errors.details = "Tell me a little about your project (at least 10 characters).";
  if (Object.keys(errors).length) return wantsJson ? res.status(400).json({ error: "Check the highlighted fields.", fields: errors }) : fail(400);

  const r = store.db.prepare("INSERT INTO messages (name, email, company, details) VALUES (?, ?, ?, ?)").run(msg.name, msg.email, msg.company, msg.details);
  let emailed = false;
  try {
    emailed = await sendContactEmail(c.notifyEmail || c.email, msg);
    if (emailed) store.db.prepare("UPDATE messages SET emailed = 1 WHERE id = ?").run(r.lastInsertRowid);
  } catch (e) {
    console.error("Contact email failed:", e.message);
  }
  wantsJson ? res.json({ ok: true }) : res.redirect(303, "/?sent=1#contact");
});

// ---------- auth ----------
const loginLimit = auth.rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many sign-in attempts. Wait 15 minutes and try again." });
app.post("/api/auth/login", loginLimit, (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  const password = String(req.body?.password || "");
  const user = store.db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  auth.createSession(res, req, user.id);
  res.json({ ok: true, email: user.email });
});
app.post("/api/auth/logout", (req, res) => { auth.destroySession(req, res); res.json({ ok: true }); });
app.get("/api/auth/me", (req, res) => {
  const u = auth.currentUser(req);
  u ? res.json(u) : res.status(401).json({ error: "Not signed in." });
});

// ---------- admin API ----------
const admin = express.Router();
admin.use(auth.requireAdmin);

const SETTINGS = ["home", "about", "approach", "contact", "site"];
const COLLECTIONS = ["expertise", "industries", "categories", "cases", "clients"];
const checkCol = (req, res, next) => COLLECTIONS.includes(req.params.col) ? next() : res.status(404).json({ error: "Unknown section." });

admin.get("/overview", (req, res) => {
  const cases = store.list("cases");
  const home = store.getSetting("home");
  const contact = store.getSetting("contact");
  const todo = [];
  if (!home.heroImage) todo.push("Add your hero photo (Homepage).");
  if (!store.getSetting("about").image) todo.push("Add an About photo (About).");
  if (cases.some((c) => /^Brand name/.test(c.brand))) todo.push("Replace the placeholder case studies with real projects.");
  if (store.list("clients").some((c) => /^Client name/.test(c.name))) todo.push("Replace the placeholder client names and logos.");
  if (/example\.com$/.test(contact.email || "")) todo.push("Set your real email address (Contact & social).");
  if ((home.metrics || []).some((m) => m.note && /pending/i.test(m.note))) todo.push("Confirm the media spend figure, then make it visible (Homepage, Metrics).");
  if (!mailConfigured()) todo.push("Email notifications aren't configured. Messages are saved in Messages; set SMTP settings to get them by email.");
  res.json({
    counts: {
      published: cases.filter((c) => c.status === "published").length,
      drafts: cases.filter((c) => c.status !== "published").length,
      clients: store.list("clients").length,
      industries: store.list("industries").length,
      unread: store.db.prepare("SELECT COUNT(*) AS n FROM messages WHERE read = 0").get().n,
    },
    mailConfigured: mailConfigured(),
    todo,
  });
});

admin.get("/settings/:key", (req, res) => {
  if (!SETTINGS.includes(req.params.key)) return res.status(404).json({ error: "Unknown settings." });
  res.json(store.getSetting(req.params.key));
});
admin.put("/settings/:key", (req, res) => {
  if (!SETTINGS.includes(req.params.key)) return res.status(404).json({ error: "Unknown settings." });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ error: "Invalid data." });
  res.json(store.setSetting(req.params.key, req.body));
});

function prepareCase(data, id) {
  const d = { ...data };
  d.brand = String(d.brand || "").trim() || "Untitled project";
  let slug = render.slugify(d.slug || d.brand);
  const taken = new Set(store.list("cases").filter((c) => c.id !== id).map((c) => c.slug));
  let s = slug, n = 2;
  while (taken.has(s)) s = `${slug}-${n++}`;
  d.slug = s;
  d.status = d.status === "published" ? "published" : "draft";
  return d;
}

admin.get("/c/:col", checkCol, (req, res) => res.json(store.list(req.params.col)));
admin.post("/c/:col", checkCol, (req, res) => {
  const data = req.params.col === "cases" ? prepareCase(req.body || {}) : req.body || {};
  res.status(201).json(store.create(req.params.col, data));
});
admin.put("/c/:col/:id", checkCol, (req, res) => {
  const id = Number(req.params.id);
  const data = req.params.col === "cases" ? prepareCase(req.body || {}, id) : req.body || {};
  const item = store.update(req.params.col, id, data);
  item ? res.json(item) : res.status(404).json({ error: "This item no longer exists." });
});
admin.delete("/c/:col/:id", checkCol, (req, res) => {
  store.remove(req.params.col, Number(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: "This item no longer exists." });
});
admin.post("/c/:col/reorder", checkCol, (req, res) => {
  const ids = (req.body?.ids || []).map(Number).filter(Number.isInteger);
  store.reorder(req.params.col, ids);
  res.json(store.list(req.params.col));
});

admin.post("/upload", media.upload.array("files", 20), async (req, res, next) => {
  try {
    const out = [];
    for (const f of req.files || []) out.push(await media.processFile(f));
    res.status(201).json(out);
  } catch (e) { next(e); }
});
admin.get("/media", (req, res) => res.json(media.listMedia()));
admin.delete("/media/:id", (req, res) => media.deleteMedia(Number(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: "File not found." }));

admin.get("/messages", (req, res) => res.json(store.db.prepare("SELECT * FROM messages ORDER BY id DESC").all()));
admin.put("/messages/:id/read", (req, res) => { store.db.prepare("UPDATE messages SET read = ? WHERE id = ?").run(req.body?.read ? 1 : 0, Number(req.params.id)); res.json({ ok: true }); });
admin.delete("/messages/:id", (req, res) => { store.db.prepare("DELETE FROM messages WHERE id = ?").run(Number(req.params.id)); res.json({ ok: true }); });

admin.post("/password", (req, res) => {
  const { current, next: pw } = req.body || {};
  const user = store.db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!auth.verifyPassword(String(current || ""), user.password_hash)) return res.status(400).json({ error: "Your current password is incorrect." });
  if (String(pw || "").length < 10) return res.status(400).json({ error: "Use at least 10 characters for the new password." });
  store.db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(auth.hashPassword(String(pw)), user.id);
  store.db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  auth.createSession(res, req, user.id);
  res.json({ ok: true });
});

app.use("/api/admin", admin);

// Admin single-page app
app.get(["/admin", "/admin/*splat"], (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
app.use((req, res) => res.status(404).type("html").send(render.notFoundPage()));

// Errors
app.use((err, req, res, next) => {
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : err.name === "MulterError" ? 400 : 500);
  const message = err.code === "LIMIT_FILE_SIZE" ? `That file is too large. The limit is ${media.MAX_MB} MB.` : status < 500 ? err.message : "Something went wrong on the server. Try again.";
  if (status >= 500) console.error(err);
  if (req.path.startsWith("/api")) return res.status(status).json({ error: message });
  res.status(status).type("text").send(message);
});

app.listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}  (admin: /admin)`));
