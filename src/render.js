// Server-side HTML for the public site.
const store = require("./db");
const { iconFor } = require("./icons");
const { thumbFor } = require("./uploads");

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const paras = (s) => String(s || "").split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t).replace(/\n/g, "<br>")}</p>`).join("");
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || "");

function safeHref(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s) || /^[#/](?!\/)/.test(s)) return s;
  return "";
}
function safeMedia(u) {
  const s = String(u || "").trim();
  return /^\/uploads\/[\w.-]+$/.test(s) || /^https:\/\//i.test(s) ? s : "";
}
function slugify(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 80) || "case-study";
}
const isPlaceholder = (s) => !s || /^(add |replace |—$)/i.test(String(s).trim());

function img(url, alt, { sizes = "100vw", cls = "", eager = false, extra = "" } = {}) {
  const src = safeMedia(url);
  if (!src) return "";
  const t = thumbFor(src);
  const srcset = t && t.thumb ? ` srcset="${esc(t.thumb)} 800w, ${esc(src)} ${t.width || 2400}w" sizes="${esc(sizes)}"` : "";
  const dims = t && t.width ? ` width="${t.width}" height="${t.height}"` : "";
  return `<img src="${esc(src)}"${srcset}${dims} alt="${esc(alt)}" class="${cls}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" ${extra}>`;
}

function embedUrl(u) {
  const s = String(u || "");
  let m = s.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return "";
}

// Split "$9M+" into prefix / number / suffix for count-up animation
function countParts(v) {
  const m = String(v).match(/^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/);
  return m ? { pre: m[1], num: m[2], suf: m[3] } : null;
}

// ---------- shared page shell ----------
function shell({ site, home, title, description, body, canonical = "/", ogImage }) {
  const th = site.theme || {};
  const vars = [
    isHex(th.accent) && `--teal:${th.accent}`,
    isHex(th.background) && `--navy:${th.background}`,
    isHex(th.surface) && `--graphite:${th.surface}`,
  ].filter(Boolean).join(";");
  const og = safeMedia(ogImage || site.ogImage || home.heroImage);
  const fav = safeMedia(site.favicon);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${og ? `<meta property="og:image" content="${esc(og)}"><meta name="twitter:card" content="summary_large_image">` : ""}
<meta name="theme-color" content="${esc(isHex(th.background) ? th.background : "#0B1220")}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="${fav ? esc(fav) : "/favicon.svg"}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
${vars ? `<style>:root{${vars}}</style>` : ""}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${body}
<script src="/js/site.js" defer></script>
</body>
</html>`;
}

function header(site, home, onHome = true) {
  const nav = site.nav || {};
  const vis = site.sections || {};
  const base = onHome ? "" : "/";
  const links = ["about", "expertise", "industries", "work", "clients"]
    .filter((k) => vis[k] !== false && nav[k])
    .map((k) => `<li><a href="${base}#${k}">${esc(nav[k])}</a></li>`).join("");
  const contact = vis.contact !== false ? `<a class="btn btn-small" href="${base}#contact">${esc(nav.contact || "Contact")}</a>` : "";
  return `<header class="site-header" id="top">
  <div class="wrap header-inner">
    <a class="brand" href="/">${esc(home.name)}</a>
    <nav class="nav" aria-label="Main">
      <button class="nav-toggle" aria-expanded="false" aria-controls="nav-list"><span class="sr">Menu</span><i></i><i></i></button>
      <ul id="nav-list">${links}${contact ? `<li class="nav-cta">${contact}</li>` : ""}</ul>
    </nav>
  </div>
</header>`;
}

function footer(site, home, contact) {
  const links = socialLinks(contact);
  return `<footer class="site-footer">
  <div class="wrap footer-inner">
    <p class="footer-brand">${esc(home.name)}</p>
    <p class="footer-note">${esc(site.footer)}</p>
    ${links ? `<ul class="footer-links">${links}</ul>` : ""}
    <p class="footer-copy">© ${new Date().getFullYear()} ${esc(home.name)}</p>
  </div>
</footer>`;
}

function socialLinks(c) {
  const items = [];
  if (c.email) items.push(["Email", `mailto:${c.email}`]);
  if (c.whatsapp) items.push(["WhatsApp", /^https?:/.test(c.whatsapp) ? c.whatsapp : `https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}`]);
  if (c.linkedin) items.push(["LinkedIn", c.linkedin]);
  if (c.facebook) items.push(["Facebook", c.facebook]);
  return items.map(([l, u]) => safeHref(u) ? `<li><a href="${esc(safeHref(u))}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ""}>${l}</a></li>` : "").join("");
}

// ---------- sections ----------
function hero(home) {
  const metrics = (home.metrics || []).filter((m) => m.visible !== false && m.value);
  const metricHtml = metrics.map((m) => {
    const c = countParts(m.value);
    const val = c ? `${esc(c.pre)}<span data-count="${esc(c.num)}">${esc(c.num)}</span>${esc(c.suf)}` : esc(m.value);
    return `<div class="metric"><dt>${esc(m.label)}</dt><dd>${val}</dd></div>`;
  }).join("");
  const photo = home.heroImage
    ? img(home.heroImage, home.heroImageAlt || home.name, { sizes: "(max-width: 900px) 90vw, 40vw", cls: "hero-photo", eager: true })
    : `<div class="photo-placeholder" role="img" aria-label="Photo coming soon"><span>${esc((home.name || "?").trim()[0])}</span></div>`;
  const cta = (c, cls) => c && c.label && safeHref(c.href) ? `<a class="btn ${cls}" href="${esc(safeHref(c.href))}">${esc(c.label)}</a>` : "";
  return `<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="hero-title">${esc(home.title)}</p>
      <h1 class="hero-headline">${esc(home.headline)}</h1>
      <p class="hero-intro">${esc(home.intro)}</p>
      <div class="hero-ctas">${cta(home.ctaPrimary, "btn-primary")}${cta(home.ctaSecondary, "btn-ghost")}</div>
    </div>
    <figure class="hero-figure${home.heroImageShape === "circle" ? " shape-circle" : ""}">${photo}</figure>
  </div>
  ${metrics.length ? `<div class="wrap"><dl class="metrics m${metrics.length}">${metricHtml}</dl></div>` : ""}
</section>`;
}

function about(a, home) {
  const values = (home.values || []).filter(Boolean);
  return `<section class="section about" id="about" aria-labelledby="about-h">
  <div class="wrap about-grid">
    <div class="about-media">
      ${a.image ? img(a.image, a.imageAlt || home.name, { sizes: "(max-width: 900px) 90vw, 35vw", cls: "about-photo" }) : ""}
      ${values.length ? `<p class="values">${values.map((v) => `<span>${esc(v)}.</span>`).join(" ")}</p>` : ""}
    </div>
    <div class="about-copy">
      <h2 id="about-h" class="h2">${esc(a.heading)}</h2>
      <div class="prose">${paras(a.body)}</div>
      ${a.mission ? `<blockquote class="mission"><p class="mission-label">Mission</p><p>${esc(a.mission)}</p></blockquote>` : ""}
    </div>
  </div>
</section>`;
}

function expertise(cats, heading) {
  if (!cats.length) return "";
  const tabs = cats.map((c, i) => `<button role="tab" id="tab-${c.id}" aria-controls="panel-${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
      <span class="tab-num">${String(i + 1).padStart(2, "0")}</span><span class="tab-name">${esc(c.name)}</span></button>`).join("");
  const panels = cats.map((c, i) => `<div class="panel" role="tabpanel" id="panel-${c.id}" aria-labelledby="tab-${c.id}"${i ? " data-hidden" : ""}>
      <h3 class="panel-title"><span class="tab-num">${String(i + 1).padStart(2, "0")}</span> ${esc(c.name)}</h3>
      ${c.description ? `<p class="panel-desc">${esc(c.description)}</p>` : ""}
      <ul class="skills">${(c.skills || []).filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    </div>`).join("");
  return `<section class="section expertise" id="expertise" aria-labelledby="expertise-h">
  <div class="wrap">
    <h2 id="expertise-h" class="h2">${esc(heading)}</h2>
    <div class="tabs" data-tabs>
      <div class="tablist" role="tablist" aria-label="Expertise categories">${tabs}</div>
      <div class="panels">${panels}</div>
    </div>
  </div>
</section>`;
}

function industries(list, heading) {
  if (!list.length) return "";
  return `<section class="section industries" id="industries" aria-labelledby="industries-h">
  <div class="wrap">
    <h2 id="industries-h" class="h2">${esc(heading)}</h2>
    <ul class="industry-grid">${list.map((it) => `<li class="industry">
      <span class="industry-icon">${it.icon && safeMedia(it.icon) ? `<img src="${esc(it.icon)}" alt="" width="24" height="24">` : iconFor(it.name, it.iconKey)}</span>
      <h3>${esc(it.name)}</h3>
      ${it.description ? `<p>${esc(it.description)}</p>` : ""}
    </li>`).join("")}</ul>
  </div>
</section>`;
}

function caseCard(c) {
  const key = (c.metrics || []).find((m) => m.value && m.value !== "—");
  const tags = (c.categories || []).map((t) => t.toLowerCase());
  return `<li class="case-card" data-tags="${esc(JSON.stringify(tags))}">
    <a href="/work/${esc(c.slug)}" class="case-link">
      <div class="case-thumb">${c.heroImage ? img(c.heroImage, "", { sizes: "(max-width: 700px) 90vw, 45vw" }) : `<span class="thumb-empty">Project image</span>`}</div>
      <div class="case-body">
        <p class="case-industry">${esc(c.industry)}</p>
        <h3 class="case-brand">${esc(c.brand)}</h3>
        ${c.summary ? `<p class="case-summary">${esc(c.summary)}</p>` : ""}
        <div class="case-foot">
          <ul class="chips">${(c.platforms || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
          ${key ? `<p class="case-key"><strong>${esc(key.value)}</strong> ${esc(key.label)}</p>` : ""}
        </div>
      </div>
    </a>
  </li>`;
}

function work(cases, categories, heading) {
  const published = cases.filter((c) => c.status === "published");
  const used = new Set(published.flatMap((c) => (c.categories || []).map((t) => t.toLowerCase())));
  const filters = categories.filter((c) => used.has(c.name.toLowerCase()));
  return `<section class="section work" id="work" aria-labelledby="work-h">
  <div class="wrap">
    <h2 id="work-h" class="h2">${esc(heading)}</h2>
    ${published.length ? `
    ${filters.length > 1 ? `<div class="filters" role="group" aria-label="Filter case studies">
      <button aria-pressed="true" data-filter="all">All projects</button>
      ${filters.map((f) => `<button aria-pressed="false" data-filter="${esc(f.name.toLowerCase())}">${esc(f.name)}</button>`).join("")}
    </div>` : ""}
    <ul class="case-grid">${published.map(caseCard).join("")}</ul>
    <p class="filter-empty" hidden>No case studies in this category yet.</p>` : `<p class="empty-state">Case studies are being prepared.</p>`}
  </div>
</section>`;
}

function clients(list, heading) {
  if (!list.length) return "";
  return `<section class="section clients" id="clients" aria-labelledby="clients-h">
  <div class="wrap">
    <h2 id="clients-h" class="h2">${esc(heading)}</h2>
    <ul class="logo-wall">${list.map((c) => {
      const logo = safeMedia(c.logo);
      const inner = `<span class="logo-box ${c.logoStyle === "original" ? "logo-original" : "logo-mono"}">${logo ? `<img src="${esc(logo)}" alt="${esc(c.name)}" loading="lazy">` : `<span class="logo-text">${esc(c.name)}</span>`}</span>
        ${c.industry ? `<span class="logo-industry">${esc(c.industry)}</span>` : ""}`;
      const href = safeHref(c.url);
      return `<li>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener" class="logo-item">${inner}</a>` : `<div class="logo-item">${inner}</div>`}</li>`;
    }).join("")}</ul>
  </div>
</section>`;
}

function approach(a) {
  const steps = (a.steps || []).filter((s) => s.title);
  if (!steps.length) return "";
  return `<section class="section approach" id="approach" aria-labelledby="approach-h">
  <div class="wrap">
    <h2 id="approach-h" class="h2">${esc(a.heading)}</h2>
    <ol class="timeline">${steps.map((s, i) => `<li><span class="step-num">${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("")}</ol>
  </div>
</section>`;
}

function contactSection(c, sent) {
  const links = socialLinks(c);
  const form = c.formEnabled !== false ? `
    <form class="contact-form" action="/api/contact" method="post" novalidate data-contact>
      <div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" autocomplete="name" required maxlength="120"></div>
      <div class="field"><label for="f-email">Email address</label><input id="f-email" name="email" type="email" autocomplete="email" required maxlength="200"></div>
      <div class="field"><label for="f-company">Company / brand <span class="opt">optional</span></label><input id="f-company" name="company" autocomplete="organization" maxlength="160"></div>
      <div class="field"><label for="f-details">Project details</label><textarea id="f-details" name="details" rows="5" required maxlength="5000"></textarea></div>
      <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>
      <button class="btn btn-primary" type="submit">${esc(c.formButton || "Start a conversation")}</button>
      <p class="form-status" role="status" aria-live="polite">${sent === "1" ? "Thanks, your message was sent. I'll reply soon." : sent === "0" ? "Your message wasn't sent. Check the fields and try again." : ""}</p>
    </form>` : "";
  return `<section class="contact" id="contact" aria-labelledby="contact-h">
  <div class="wrap contact-grid">
    <div class="contact-copy">
      <h2 id="contact-h" class="h2 contact-h">${esc(c.headline)}</h2>
      <p class="contact-text">${esc(c.text)}</p>
      ${c.email ? `<a class="contact-email" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}
      ${links ? `<ul class="contact-links">${links}</ul>` : ""}
    </div>
    ${form}
  </div>
</section>`;
}

// ---------- pages ----------
function homePage({ sent } = {}) {
  const site = store.getSetting("site");
  const home = store.getSetting("home");
  const vis = site.sections || {};
  const h = site.headings || {};
  const contact = store.getSetting("contact");
  const parts = [
    hero(home),
    vis.about !== false && about(store.getSetting("about"), home),
    vis.expertise !== false && expertise(store.list("expertise"), h.expertise),
    vis.industries !== false && industries(store.list("industries"), h.industries),
    vis.work !== false && work(store.list("cases"), store.list("categories"), h.work),
    vis.clients !== false && clients(store.list("clients"), h.clients),
    vis.approach !== false && approach(store.getSetting("approach")),
    vis.contact !== false && contactSection(contact, sent),
  ].filter(Boolean).join("\n");
  return shell({
    site, home,
    title: site.seoTitle || `${home.name}, ${home.title}`,
    description: site.metaDescription || home.intro,
    body: `${header(site, home)}<main id="main">${parts}</main>${footer(site, home, contact)}`,
  });
}

function caseBlock(title, text) {
  if (!String(text || "").trim()) return "";
  // Placeholder text (starts with "Add ...") is shown dimmed so it's obvious it still needs content
  return `<div class="cs-block"><h2>${esc(title)}</h2><div class="prose${isPlaceholder(text) ? " muted" : ""}">${paras(text)}</div></div>`;
}

function mediaItem(m, i, label) {
  const cap = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : "";
  if (m.type === "embed") {
    const u = embedUrl(m.url);
    return u ? `<figure class="media media-embed"><div class="embed"><iframe src="${esc(u)}" title="${esc(m.caption || label)}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>${cap}</figure>` : "";
  }
  const src = safeMedia(m.url);
  if (!src) return "";
  if (m.type === "video") {
    return `<figure class="media media-video"><video src="${esc(src)}" controls playsinline preload="metadata" muted${m.poster && safeMedia(m.poster) ? ` poster="${esc(m.poster)}"` : ""} aria-label="${esc(m.caption || label)}"></video>${cap}</figure>`;
  }
  return `<figure class="media media-image"><button class="zoom" data-full="${esc(src)}" aria-label="Enlarge: ${esc(m.caption || label)}">${img(src, m.caption || label, { sizes: "(max-width: 700px) 90vw, 33vw" })}</button>${cap}</figure>`;
}

function casePage(slug) {
  const cases = store.list("cases").filter((c) => c.status === "published");
  const idx = cases.findIndex((c) => c.slug === slug);
  if (idx < 0) return null;
  const c = cases[idx];
  const next = cases[(idx + 1) % cases.length];
  const site = store.getSetting("site");
  const home = store.getSetting("home");
  const contact = store.getSetting("contact");
  const metrics = (c.metrics || []).filter((m) => m.label && String(m.value || "").trim());
  const creatives = (c.creatives || []).map((m, i) => mediaItem(m, i, `${c.brand} ad creative ${i + 1}`)).filter(Boolean);
  const shots = (c.screenshots || []).map((m, i) => mediaItem(m, i, `${c.brand} performance screenshot ${i + 1}`)).filter(Boolean);

  const body = `${header(site, home, false)}
<main id="main" class="cs">
  <section class="cs-hero">
    <div class="wrap">
      <a class="back" href="/#work">All case studies</a>
      <p class="cs-industry">${esc(c.industry)}</p>
      <h1 class="cs-title">${esc(c.brand)}</h1>
      ${c.title ? `<p class="cs-sub">${esc(c.title)}</p>` : ""}
      <ul class="chips">${(c.platforms || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    </div>
    <div class="wrap">${c.heroImage ? `<figure class="cs-cover">${img(c.heroImage, `${c.brand} project`, { eager: true })}</figure>` : `<div class="cs-cover cover-empty"><span>Project hero image</span></div>`}</div>
  </section>

  ${metrics.length ? `<div class="wrap"><dl class="metrics cs-metrics m${Math.min(metrics.length, 4)}">${metrics.map((m) => `<div class="metric"><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join("")}</dl></div>` : ""}

  <div class="wrap cs-body">
    <aside class="cs-aside">
      <dl>
        <div><dt>Brand</dt><dd>${esc(c.brand)}</dd></div>
        <div><dt>Industry</dt><dd>${esc(c.industry)}</dd></div>
        ${c.objective ? `<div><dt>Objective</dt><dd>${esc(c.objective)}</dd></div>` : ""}
        ${(c.platforms || []).length ? `<div><dt>Platforms</dt><dd>${esc(c.platforms.join(", "))}</dd></div>` : ""}
      </dl>
    </aside>
    <div class="cs-main">
      ${caseBlock("Project overview", c.overview)}
      ${caseBlock("Business challenge", c.challenge)}
      ${caseBlock("Marketing strategy", c.strategy)}
      ${caseBlock("Execution & optimization", c.execution)}
      ${caseBlock("Creative strategy", c.creativeStrategy)}
    </div>
  </div>

  <section class="wrap cs-gallery" aria-labelledby="cr-h">
    <h2 id="cr-h" class="h3">Campaign creatives</h2>
    ${creatives.length ? `<div class="gallery creatives">${creatives.join("")}</div>` : `<p class="empty-state">Creatives will be added soon.</p>`}
  </section>

  <section class="wrap cs-gallery" aria-labelledby="ps-h">
    <h2 id="ps-h" class="h3">Performance screenshots</h2>
    ${shots.length ? `<div class="gallery shots">${shots.join("")}</div>` : `<p class="empty-state">Screenshots will be added soon.</p>`}
  </section>

  ${caseBlock("Results", c.results) || caseBlock("Key learnings", c.learnings) ? `<div class="wrap cs-body cs-results">
    <div></div>
    <div class="cs-main">
      ${caseBlock("Results", c.results)}
      ${caseBlock("Key learnings", c.learnings)}
    </div>
  </div>` : ""}

  ${next && next.slug !== c.slug ? `<div class="wrap"><a class="next-case" href="/work/${esc(next.slug)}"><span>Next case study</span><strong>${esc(next.brand)}</strong></a></div>` : ""}
</main>
<dialog class="lightbox" aria-label="Image viewer">
  <button class="lb-close" aria-label="Close">×</button>
  <button class="lb-prev" aria-label="Previous image">‹</button>
  <img alt="">
  <button class="lb-next" aria-label="Next image">›</button>
</dialog>
${footer(site, home, contact)}`;

  return shell({
    site, home,
    title: `${c.brand}: ${c.title || "Case study"} | ${home.name}`,
    description: c.summary || `${c.brand} case study`,
    body,
    canonical: `/work/${c.slug}`,
    ogImage: c.heroImage,
  });
}

function notFoundPage() {
  const site = store.getSetting("site");
  const home = store.getSetting("home");
  return shell({ site, home, title: `Page not found | ${home.name}`, description: "",
    body: `${header(site, home, false)}<main id="main" class="wrap notfound"><h1 class="h2">This page doesn't exist.</h1><p><a class="btn btn-primary" href="/">Go to the homepage</a></p></main>` });
}

module.exports = { homePage, casePage, notFoundPage, slugify, esc };
