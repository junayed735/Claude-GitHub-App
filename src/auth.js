// Password hashing (scrypt), cookie sessions stored in SQLite, login rate limiting.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { db, DATA_DIR } = require("./db");

const COOKIE = "sid";
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored).split("$");
  if (alg !== "scrypt") return false;
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
}
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Create the first admin account on first run.
function ensureAdmin() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count) return;
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password || password.length < 10) {
    password = crypto.randomBytes(12).toString("base64url");
    generated = true;
  }
  db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(email, hashPassword(password));
  if (generated) {
    const file = path.join(DATA_DIR, "initial-admin.txt");
    fs.writeFileSync(file, `Admin login\nEmail: ${email}\nPassword: ${password}\n\nChange this password in Admin, Account, then delete this file.\n`, { mode: 0o600 });
    console.log(`\n  Admin account created: ${email}\n  Generated password saved to ${file}\n`);
  }
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((p) => p.trim().split("=")).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
}

function createSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, Date.now() + SESSION_MS);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: req.secure,
    maxAge: SESSION_MS,
    path: "/",
  });
}

function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const row = db.prepare(
    "SELECT u.id, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?"
  ).get(sha256(token));
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email };
}

function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  res.clearCookie(COOKIE, { path: "/" });
}

// Admin API guard. The custom header blocks cross-site form posts (CSRF) on top of SameSite=Strict.
function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Your session has ended. Sign in again." });
  if (req.method !== "GET" && req.get("X-Requested-With") !== "fetch") {
    return res.status(403).json({ error: "Request blocked." });
  }
  req.user = user;
  next();
}

// Simple in-memory rate limiter
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const rec = hits.get(key) || { n: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.n = 0; rec.reset = now + windowMs; }
    rec.n++;
    hits.set(key, rec);
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    if (rec.n > max) return res.status(429).json({ error: message });
    next();
  };
}

module.exports = { hashPassword, verifyPassword, ensureAdmin, createSession, currentUser, destroySession, requireAdmin, rateLimit };
