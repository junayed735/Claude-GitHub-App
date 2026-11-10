// Renders the page from content.js
(() => {
  const P = PROFILE;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // Simple text bindings
  const binds = { ...P, ...P.numbers };
  document.querySelectorAll("[data-bind]").forEach((n) => {
    const v = binds[n.dataset.bind];
    if (v != null) n.textContent = v;
  });
  $(".ledger").setAttribute("aria-label", `${P.numbers.spend} in ad spend, ${P.numbers.revenue} in revenue`);

  // Return on spend, computed so it always matches the two numbers
  const num = (s) => {
    const m = String(s).replace(/[$,\s]/g, "").match(/^([\d.]+)([kKmMbB]?)/);
    if (!m) return NaN;
    return parseFloat(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1);
  };
  const r = num(P.numbers.revenue) / num(P.numbers.spend);
  $("#roas").textContent = isFinite(r) ? `${(Math.round(r * 10) / 10)}x` : "";
  $("#platforms").textContent = P.platforms.join(", ");

  // Photo with initial fallback
  const photo = $("#photo");
  photo.querySelector("span").textContent = (P.name || "?").trim()[0];
  if (P.photo) {
    const img = new Image();
    img.alt = P.name;
    img.onload = () => { photo.prepend(img); photo.classList.add("has-img"); };
    img.src = P.photo;
  }

  // Case studies
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cases = $("#cases");
  CASES.forEach((c) => {
    const art = el("article", "case");
    const head = el("div", "case-head");
    const titles = el("div");
    titles.append(el("h3", "case-brand", c.brand), el("p", "case-meta", `${c.category}. ${c.platforms.join(", ")}`));
    head.append(titles);
    if (c.summary) head.append(el("p", "case-summary", c.summary));

    const dl = el("dl", "metrics");
    c.metrics.forEach((m) => {
      const d = el("div");
      d.append(el("dt", null, m.label), el("dd", null, m.value));
      dl.append(d);
    });
    head.append(dl);

    const reel = el("ul", "reel");
    reel.setAttribute("aria-label", `${c.brand} ad creatives`);
    c.creatives.forEach((cr, i) => {
      const li = el("li", "creative");
      if (cr.src && cr.type === "video") {
        const v = document.createElement("video");
        v.src = cr.src; v.muted = true; v.loop = true; v.playsInline = true;
        v.preload = "metadata";
        if (cr.poster) v.poster = cr.poster;
        v.setAttribute("aria-label", `${c.brand} video ad ${i + 1}`);
        if (reduce) v.controls = true; else v.dataset.autoplay = "";
        li.append(v);
      } else if (cr.src) {
        const img = el("img");
        img.src = cr.src; img.loading = "lazy";
        img.alt = cr.alt || `${c.brand} ad ${i + 1}`;
        li.append(img);
      } else {
        li.classList.add("empty");
        li.append(el("span", null, cr.type === "video" ? "Video ad" : "Ad screenshot"));
      }
      reel.append(li);
    });

    art.append(head, reel);
    cases.append(art);
  });

  // Videos play only while on screen
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()));
  }, { threshold: 0.5 });
  document.querySelectorAll("video[data-autoplay]").forEach((v) => io.observe(v));

  // Client logos
  const logos = $("#logos");
  CLIENTS.forEach((c) => {
    const li = el("li");
    if (c.logo) {
      const img = el("img");
      img.src = c.logo; img.alt = c.name; img.loading = "lazy";
      li.append(img);
    } else {
      li.append(el("span", "logo-name", c.name));
    }
    logos.append(li);
  });

  // Contact
  const email = $("#email");
  email.href = `mailto:${P.email}`;
  email.textContent = P.email;
  const links = $("#links");
  P.links.forEach((l) => {
    const li = el("li");
    const a = el("a", null, l.label);
    a.href = l.url;
    li.append(a);
    links.append(li);
  });

  $("#year").textContent = new Date().getFullYear();
})();
