/* Admin dashboard: a small schema-driven CMS. No build step. */
(() => {
  "use strict";

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else if (k === "checked") el.checked = !!v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const $ = (s, r = document) => r.querySelector(s);
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  let uid = 0;
  const nextId = (p = "f") => `${p}-${++uid}`;

  function toast(msg, err) {
    const t = h("div", { class: `toast${err ? " err" : ""}` }, msg);
    $("#toasts").append(t);
    setTimeout(() => t.remove(), err ? 7000 : 3500);
  }

  // ---------- API ----------
  async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(path, {
      method,
      headers: { "X-Requested-With": "fetch", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.startsWith("/api/auth/login")) { showLogin(); throw new Error(data.error || "Sign in again."); }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
    return data;
  }

  function uploadFiles(files, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      [...files].forEach((f) => fd.append("files", f));
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/upload");
      xhr.setRequestHeader("X-Requested-With", "fetch");
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch {}
        if (xhr.status === 401) { showLogin(); return reject(new Error("Sign in again.")); }
        xhr.status < 300 ? resolve(data) : reject(new Error(data.error || `Upload failed (${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
      xhr.send(fd);
    });
  }

  // ---------- schemas ----------
  const PLATFORMS = ["Meta Ads", "Google Ads", "TikTok Ads", "YouTube Ads", "LinkedIn Ads", "Snapchat Ads"];
  const ICON_KEYS = [["", "Automatic (from name)"], ["cart", "Shopping cart"], ["briefcase", "Briefcase"], ["people", "People"], ["factory", "Factory"], ["shirt", "Clothing"], ["baby", "Baby"], ["play", "Play zone"], ["hotel", "Hotel"], ["restaurant", "Restaurant"], ["education", "Education"], ["passport", "Passport"], ["plane", "Plane"], ["building", "Building"], ["spark", "Spark"]];

  const SETTINGS_PAGES = {
    home: {
      title: "Homepage", desc: "The first screen visitors see: your photo, headline, buttons and key numbers.",
      sections: [
        { title: "Identity", fields: [
          { key: "name", label: "Name", type: "text", required: true },
          { key: "title", label: "Professional title", type: "text" },
          { key: "positioning", label: "Positioning", type: "text", hint: "Used for context; not shown on the page." },
        ] },
        { title: "Hero", fields: [
          { key: "headline", label: "Headline", type: "text", required: true },
          { key: "intro", label: "Introduction", type: "textarea", rows: 3 },
          { key: "heroImage", label: "Hero photo", type: "image", hint: "Portrait (4:5) works best. Your face should sit in the upper third.", cover: true },
          { key: "heroImageShape", label: "Photo frame", type: "select", options: [["portrait", "Portrait (4:5 rounded rectangle)"], ["circle", "Circle (for round cut-out photos)"]] },
          { key: "heroImageAlt", label: "Photo description (for screen readers)", type: "text" },
          { key: "ctaPrimary", label: "Main button", type: "group", fields: [{ key: "label", label: "Text", type: "text" }, { key: "href", label: "Link", type: "text", hint: "#work, #contact, or a full URL" }] },
          { key: "ctaSecondary", label: "Second button", type: "group", fields: [{ key: "label", label: "Text", type: "text" }, { key: "href", label: "Link", type: "text" }] },
        ] },
        { title: "Performance metrics", fields: [
          { key: "metrics", label: "Metrics", type: "repeater", itemLabel: "Metric", hint: "Only metrics marked visible appear on the site. Numbers count up on screen.", fields: [
            { key: "value", label: "Value", type: "text", hint: "e.g. $9M+, 50+" },
            { key: "label", label: "Label", type: "text" },
            { key: "visible", label: "Show on website", type: "toggle" },
            { key: "note", label: "Private note", type: "text", hint: "Only you see this." },
          ], blank: { value: "", label: "", visible: true, note: "" } },
          { key: "values", label: "Core values", type: "strings", hint: "Shown in the About section, e.g. Strategy, Performance, Data, Growth." },
        ] },
      ],
    },
    about: {
      title: "About", desc: "Your professional introduction and mission.",
      sections: [{ title: "About", fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "body", label: "Introduction", type: "textarea", rows: 8, hint: "Leave a blank line between paragraphs." },
        { key: "mission", label: "Mission statement", type: "textarea", rows: 3 },
        { key: "image", label: "About photo", type: "image", cover: true, hint: "Optional. A different photo from the hero works best." },
        { key: "imageAlt", label: "Photo description", type: "text" },
      ] }],
    },
    approach: {
      title: "My approach", desc: "The process timeline.",
      sections: [{ title: "Process", fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "steps", label: "Steps", type: "repeater", itemLabel: "Step", fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea", rows: 2 }], blank: { title: "", text: "" } },
      ] }],
    },
    contact: {
      title: "Contact & social", desc: "Contact details, social links and the contact form.",
      sections: [
        { title: "Contact section", fields: [
          { key: "headline", label: "Headline", type: "text" },
          { key: "text", label: "Supporting text", type: "textarea", rows: 2 },
        ] },
        { title: "Details & links", fields: [
          { key: "email", label: "Email", type: "text" },
          { key: "whatsapp", label: "WhatsApp", type: "text", hint: "Number with country code (e.g. 8801XXXXXXXXX) or a wa.me link." },
          { key: "linkedin", label: "LinkedIn URL", type: "text" },
          { key: "facebook", label: "Facebook URL", type: "text" },
        ] },
        { title: "Contact form", fields: [
          { key: "formEnabled", label: "Show the contact form", type: "toggle" },
          { key: "formButton", label: "Button text", type: "text" },
          { key: "notifyEmail", label: "Send new messages to", type: "text", hint: "Leave empty to use the email above. Needs SMTP to be configured on the server." },
        ] },
      ],
    },
    site: {
      title: "Settings", desc: "Search engines, navigation, section visibility and theme.",
      sections: [
        { title: "SEO & sharing", fields: [
          { key: "seoTitle", label: "SEO title", type: "text", hint: "Shown in Google results and browser tabs. Aim for under 60 characters." },
          { key: "metaDescription", label: "Meta description", type: "textarea", rows: 3, hint: "Aim for 140–160 characters." },
          { key: "favicon", label: "Favicon", type: "image", hint: "Square PNG or SVG, at least 64×64." },
          { key: "ogImage", label: "Social sharing image", type: "image", cover: true, hint: "1200×630 is ideal. Uses the hero photo if empty." },
          { key: "footer", label: "Footer text", type: "text" },
        ] },
        { title: "Section visibility", fields: [
          { key: "sections", type: "group", fields: ["about", "expertise", "industries", "work", "clients", "approach", "contact"].map((k) => ({ key: k, label: { work: "Case studies", approach: "My approach" }[k] || k[0].toUpperCase() + k.slice(1), type: "toggle" })) },
        ] },
        { title: "Section headings", fields: [
          { key: "headings", type: "group", fields: [
            { key: "expertise", label: "Expertise", type: "text" }, { key: "industries", label: "Industries", type: "text" },
            { key: "work", label: "Case studies", type: "text" }, { key: "clients", label: "Clients", type: "text" },
          ] },
        ] },
        { title: "Navigation labels", fields: [
          { key: "nav", type: "group", fields: ["about", "expertise", "industries", "work", "clients", "contact"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), type: "text" })) },
        ] },
        { title: "Theme", fields: [
          { key: "theme", type: "group", fields: [
            { key: "accent", label: "Accent color", type: "color" },
            { key: "background", label: "Background", type: "color" },
            { key: "surface", label: "Section & card surface", type: "color" },
          ] },
        ] },
      ],
    },
  };

  const COLLECTIONS = {
    expertise: {
      title: "Expertise", desc: "Skill categories shown as tabs. Each skill is edited individually.", singular: "category",
      itemTitle: (i) => i.name, itemSub: (i) => `${(i.skills || []).length} skills`,
      blank: { name: "", description: "", skills: [] },
      sections: [{ title: "Category", fields: [
        { key: "name", label: "Category name", type: "text", required: true },
        { key: "description", label: "Short description", type: "text" },
        { key: "skills", label: "Skills", type: "strings", hint: "One skill per line. Use the arrows to reorder." },
      ] }],
    },
    industries: {
      title: "Industries", desc: "Industries you've worked in. Only list experience you can stand behind.", singular: "industry",
      itemTitle: (i) => i.name, itemSub: (i) => i.description,
      blank: { name: "", description: "", iconKey: "", icon: "" },
      sections: [{ title: "Industry", fields: [
        { key: "name", label: "Industry name", type: "text", required: true },
        { key: "description", label: "Short description", type: "textarea", rows: 2 },
        { key: "iconKey", label: "Icon", type: "select", options: ICON_KEYS },
        { key: "icon", label: "Custom icon (optional)", type: "image", hint: "Overrides the icon above. A simple SVG works best." },
      ] }],
    },
    cases: {
      title: "Case studies", desc: "Your projects. Drafts are only visible here.", singular: "case study",
      itemTitle: (i) => i.brand, itemSub: (i) => [i.industry, (i.platforms || []).join(", ")].filter(Boolean).join(" · "),
      itemThumb: (i) => i.heroImage, itemPill: (i) => i.status === "published" ? ["Published", "on"] : ["Draft", "warn"],
      blank: { status: "draft", brand: "", title: "", slug: "", industry: "", categories: [], platforms: [], heroImage: "", summary: "", overview: "", challenge: "", objective: "", strategy: "", execution: "", creativeStrategy: "", results: "", learnings: "", metrics: [{ label: "Ad spend", value: "" }, { label: "Revenue", value: "" }, { label: "ROAS", value: "" }], creatives: [], screenshots: [] },
      sections: [
        { title: "Basics", fields: [
          { key: "status", label: "Status", type: "select", options: [["draft", "Draft (hidden)"], ["published", "Published"]] },
          { key: "brand", label: "Client / brand name", type: "text", required: true },
          { key: "title", label: "Project title", type: "text", hint: "e.g. Scaling online sales during Eid season" },
          { key: "slug", label: "URL", type: "text", hint: "Leave empty to create one from the brand name.", prefix: "/work/" },
          { key: "industry", label: "Industry", type: "text" },
          { key: "categories", label: "Categories (for filters)", type: "checks", optionsFrom: "categories" },
          { key: "platforms", label: "Platforms used", type: "checks", options: PLATFORMS },
          { key: "heroImage", label: "Project hero image", type: "image", cover: true, hint: "Wide image (16:9). Also used on the case study card." },
          { key: "summary", label: "Card summary", type: "textarea", rows: 2, hint: "One sentence shown on the case study card." },
        ] },
        { title: "Results", fields: [
          { key: "metrics", label: "Key results", type: "repeater", itemLabel: "Result", hint: "Only real numbers. The first filled-in result shows on the card.", fields: [{ key: "label", label: "Label", type: "text" }, { key: "value", label: "Value", type: "text" }], blank: { label: "", value: "" }, compact: true },
        ] },
        { title: "Story", fields: [
          { key: "overview", label: "Project overview", type: "textarea" },
          { key: "challenge", label: "Business challenge", type: "textarea" },
          { key: "objective", label: "Campaign objective", type: "text" },
          { key: "strategy", label: "Marketing strategy", type: "textarea" },
          { key: "execution", label: "Execution & optimization", type: "textarea" },
          { key: "creativeStrategy", label: "Creative strategy", type: "textarea" },
          { key: "results", label: "Results", type: "textarea" },
          { key: "learnings", label: "Key learnings", type: "textarea" },
        ] },
        { title: "Campaign creatives", fields: [
          { key: "creatives", label: "Ad creatives", type: "media", hint: "Static ads and video ads. Vertical (9:16) works best. Videos up to 100 MB; under 15 MB loads faster." },
        ] },
        { title: "Performance screenshots", fields: [
          { key: "screenshots", label: "Screenshots", type: "media", hint: "Ads Manager, Google Ads, TikTok and analytics dashboards. Hide private account IDs before uploading." },
        ] },
      ],
    },
    categories: {
      title: "Project categories", desc: "Filters shown above the case studies. A filter only appears once a published project uses it.", singular: "category",
      itemTitle: (i) => i.name, blank: { name: "" },
      sections: [{ title: "Category", fields: [{ key: "name", label: "Name", type: "text", required: true }] }],
    },
    clients: {
      title: "Clients", desc: "Brands you've worked with. Use only real clients you have permission to show.", singular: "client",
      itemTitle: (i) => i.name, itemSub: (i) => i.industry, itemThumb: (i) => i.logo, thumbClass: "logo",
      blank: { name: "", logo: "", logoStyle: "mono", industry: "", url: "" },
      sections: [{ title: "Client", fields: [
        { key: "name", label: "Brand name", type: "text", required: true },
        { key: "logo", label: "Logo", type: "image", hint: "Transparent PNG or SVG. Aspect ratio is preserved." },
        { key: "logoStyle", label: "Logo display", type: "select", options: [["mono", "White on dark (consistent wall)"], ["original", "Original colors on a light tile"]] },
        { key: "industry", label: "Industry label", type: "text", hint: "Optional, shown under the logo." },
        { key: "url", label: "Website", type: "text", hint: "Optional. Makes the logo clickable." },
      ] }],
    },
  };

  // ---------- form engine ----------
  // Each renderer gets (field, get, set) and returns a DOM node.
  let lookups = {};

  function fieldWrap(f, control, id) {
    return h("div", { class: "f" },
      f.label ? h(f.type === "toggle" ? "span" : "label", f.type === "toggle" ? { class: "sr" } : { for: id }, f.label) : null,
      control,
      f.hint ? h("p", { class: "hint" }, f.hint) : null);
  }

  function renderField(f, obj, onChange) {
    const id = nextId();
    const val = obj[f.key];
    const set = (v) => { obj[f.key] = v; onChange(); };

    switch (f.type) {
      case "text":
        return fieldWrap(f, f.prefix
          ? h("div", { class: "color" }, h("span", { class: "hint" }, f.prefix), h("input", { id, type: "text", value: val ?? "", oninput: (e) => set(e.target.value) }))
          : h("input", { id, type: "text", value: val ?? "", required: f.required, oninput: (e) => set(e.target.value) }), id);
      case "textarea":
        return fieldWrap(f, h("textarea", { id, rows: f.rows || 5, oninput: (e) => set(e.target.value) }, val ?? ""), id);
      case "toggle":
        return h("div", { class: "f" }, h("label", { class: "toggle" }, h("input", { type: "checkbox", checked: val !== false && val != null ? !!val : false, onchange: (e) => set(e.target.checked) }), f.label), f.hint ? h("p", { class: "hint" }, f.hint) : null);
      case "select":
        return fieldWrap(f, h("select", { id, onchange: (e) => set(e.target.value) },
          f.options.map(([v, l]) => h("option", { value: v, selected: (val ?? "") === v }, l))), id);
      case "color": {
        const text = h("input", { type: "text", value: val || "", "aria-label": `${f.label} hex value`, pattern: "#[0-9A-Fa-f]{6}", oninput: (e) => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) { pick.value = e.target.value; set(e.target.value); } } });
        const pick = h("input", { type: "color", id, value: /^#[0-9a-f]{6}$/i.test(val || "") ? val : "#35d0ba", oninput: (e) => { text.value = e.target.value; set(e.target.value); } });
        return fieldWrap(f, h("div", { class: "color" }, pick, text), id);
      }
      case "checks": {
        const opts = f.optionsFrom ? (lookups[f.optionsFrom] || []).map((x) => x.name) : f.options;
        const cur = new Set(Array.isArray(val) ? val : []);
        const extra = [...cur].filter((x) => !opts.includes(x));
        return h("div", { class: "f" }, h("span", { class: "label" }, f.label),
          h("div", { class: "checks" }, [...opts, ...extra].map((o) => h("label", {}, h("input", { type: "checkbox", checked: cur.has(o), onchange: (e) => { e.target.checked ? cur.add(o) : cur.delete(o); set([...cur]); } }), o))),
          f.optionsFrom && !opts.length ? h("p", { class: "hint" }, "Add categories under Project categories first.") : null,
          f.hint ? h("p", { class: "hint" }, f.hint) : null);
      }
      case "group": {
        if (!obj[f.key] || typeof obj[f.key] !== "object") obj[f.key] = {};
        const inner = obj[f.key];
        return h("div", { class: "f" }, f.label ? h("span", { class: "label" }, f.label) : null,
          h("div", { class: "grid2" }, f.fields.map((sf) => renderField(sf, inner, onChange))));
      }
      case "strings": return renderStrings(f, obj, onChange);
      case "repeater": return renderRepeater(f, obj, onChange);
      case "image": return renderImage(f, obj, onChange, id);
      case "media": return renderMedia(f, obj, onChange);
    }
    return h("p", {}, `Unknown field ${f.type}`);
  }

  function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
  const arrowBtns = (arr, i, rerender, label) => [
    h("button", { type: "button", class: "btn btn-sm btn-icon", "aria-label": `Move ${label} up`, disabled: i === 0, onclick: () => { move(arr, i, -1); rerender(); } }, "↑"),
    h("button", { type: "button", class: "btn btn-sm btn-icon", "aria-label": `Move ${label} down`, disabled: i === arr.length - 1, onclick: () => { move(arr, i, 1); rerender(); } }, "↓"),
  ];

  function renderStrings(f, obj, onChange) {
    if (!Array.isArray(obj[f.key])) obj[f.key] = [];
    const arr = obj[f.key];
    const box = h("div", { class: "strings" });
    const draw = (focusLast) => {
      box.replaceChildren(...arr.map((s, i) => h("div", { class: "str-row" },
        h("input", { type: "text", value: s, "aria-label": `${f.label} ${i + 1}`, oninput: (e) => { arr[i] = e.target.value; onChange(); },
          onkeydown: (e) => { if (e.key === "Enter") { e.preventDefault(); arr.splice(i + 1, 0, ""); onChange(); draw(); box.querySelectorAll("input")[i + 1]?.focus(); } } }),
        ...arrowBtns(arr, i, () => { onChange(); draw(); }, `item ${i + 1}`),
        h("button", { type: "button", class: "btn btn-sm btn-icon btn-danger", "aria-label": `Remove item ${i + 1}`, onclick: () => { arr.splice(i, 1); onChange(); draw(); } }, "×"))),
        h("div", {}, h("button", { type: "button", class: "btn btn-sm", onclick: () => { arr.push(""); onChange(); draw(true); } }, "Add item")));
      if (focusLast) box.querySelectorAll("input")[arr.length - 1]?.focus();
    };
    draw();
    return h("div", { class: "f" }, h("span", { class: "label" }, f.label), f.hint ? h("p", { class: "hint" }, f.hint) : null, box);
  }

  function renderRepeater(f, obj, onChange) {
    if (!Array.isArray(obj[f.key])) obj[f.key] = [];
    const arr = obj[f.key];
    const box = h("div", { class: "repeater" });
    const draw = () => {
      box.replaceChildren(...arr.map((item, i) => h("div", { class: "rep-item" },
        h("div", { class: "rep-head" }, h("b", {}, `${f.itemLabel || "Item"} ${i + 1}`),
          h("div", { class: "row-actions" }, ...arrowBtns(arr, i, () => { onChange(); draw(); }, `${f.itemLabel || "item"} ${i + 1}`),
            h("button", { type: "button", class: "btn btn-sm btn-danger", onclick: () => { arr.splice(i, 1); onChange(); draw(); } }, "Remove"))),
        item.note && /pending/i.test(item.note) ? h("p", { class: "note-warn" }, item.note) : null,
        h("div", { class: f.compact ? "grid2" : "grid2" }, f.fields.map((sf) => renderField(sf, item, onChange))))),
        h("div", {}, h("button", { type: "button", class: "btn btn-sm", onclick: () => { arr.push(clone(f.blank || {})); onChange(); draw(); } }, `Add ${(f.itemLabel || "item").toLowerCase()}`)));
    };
    draw();
    return h("div", { class: "f" }, h("span", { class: "label" }, f.label), f.hint ? h("p", { class: "hint" }, f.hint) : null, box);
  }

  function renderImage(f, obj, onChange, id) {
    const prev = h("div", { class: `image-prev${f.cover ? " cover" : ""}` });
    const bar = h("div", { class: "progress", hidden: true }, h("i"));
    const file = h("input", { type: "file", accept: "image/*", class: "sr", id, tabindex: -1 });
    const removeBtn = h("button", { type: "button", class: "btn btn-sm btn-danger", onclick: () => { obj[f.key] = ""; onChange(); draw(); } }, "Remove");
    const draw = () => {
      prev.replaceChildren(obj[f.key] ? h("img", { src: obj[f.key], alt: "" }) : "No image");
      removeBtn.hidden = !obj[f.key];
    };
    file.addEventListener("change", async () => {
      if (!file.files.length) return;
      bar.hidden = false;
      try {
        const [m] = await uploadFiles(file.files, (p) => (bar.firstChild.style.width = `${p * 100}%`));
        obj[f.key] = m.url; onChange(); draw();
        toast("Image uploaded. Save to publish it.");
      } catch (e) { toast(e.message, true); }
      finally { bar.hidden = true; bar.firstChild.style.width = 0; file.value = ""; }
    });
    draw();
    return h("div", { class: "f" }, h("span", { class: "label" }, f.label),
      h("div", { class: "image-field" }, prev, h("div", { class: "image-btns" },
        h("button", { type: "button", class: "btn btn-sm", onclick: () => file.click() }, obj[f.key] ? "Replace" : "Upload"),
        h("button", { type: "button", class: "btn btn-sm", onclick: () => pickFromLibrary("image", (m) => { obj[f.key] = m.url; onChange(); draw(); }) }, "Choose from library"),
        removeBtn), file),
      bar, f.hint ? h("p", { class: "hint" }, f.hint) : null);
  }

  function renderMedia(f, obj, onChange) {
    if (!Array.isArray(obj[f.key])) obj[f.key] = [];
    const arr = obj[f.key];
    const list = h("div", { class: "media-list" });
    const bar = h("div", { class: "progress", hidden: true }, h("i"));
    const file = h("input", { type: "file", accept: "image/*,video/mp4,video/webm,video/quicktime", multiple: true, class: "sr", tabindex: -1 });
    const draw = () => {
      list.replaceChildren(...arr.map((m, i) => {
        const preview = m.type === "video" ? h("video", { src: m.url, muted: true, preload: "metadata" })
          : m.type === "embed" ? h("span", {}, "Video link")
          : h("img", { src: m.url, alt: "" });
        return h("div", { class: "media-item" },
          h("div", { class: "mprev" }, preview),
          h("div", { class: "mbody" },
            m.type === "embed" ? h("input", { type: "text", value: m.url, "aria-label": "Video URL", oninput: (e) => { m.url = e.target.value; onChange(); } }) : null,
            h("input", { type: "text", value: m.caption || "", placeholder: "Caption (optional)", "aria-label": `Caption for item ${i + 1}`, oninput: (e) => { m.caption = e.target.value; onChange(); } }),
            h("div", { class: "mact" },
              h("span", { class: "pill" }, m.type === "embed" ? "Link" : m.type === "video" ? "Video" : "Image"),
              h("div", { class: "row-actions" }, ...arrowBtns(arr, i, () => { onChange(); draw(); }, `item ${i + 1}`).map((b) => { b.textContent = b.textContent === "↑" ? "←" : "→"; return b; }),
                h("button", { type: "button", class: "btn btn-sm btn-icon btn-danger", "aria-label": `Remove item ${i + 1}`, onclick: () => { arr.splice(i, 1); onChange(); draw(); } }, "×")))));
      }));
      if (!arr.length) list.append(h("p", { class: "hint" }, "Nothing added yet."));
    };
    file.addEventListener("change", async () => {
      if (!file.files.length) return;
      bar.hidden = false;
      try {
        const out = await uploadFiles(file.files, (p) => (bar.firstChild.style.width = `${p * 100}%`));
        out.forEach((m) => arr.push({ type: m.kind === "video" ? "video" : "image", url: m.url, caption: "" }));
        onChange(); draw();
        toast(`${out.length} file${out.length > 1 ? "s" : ""} uploaded. Save to publish.`);
      } catch (e) { toast(e.message, true); }
      finally { bar.hidden = true; bar.firstChild.style.width = 0; file.value = ""; }
    });
    draw();
    return h("div", { class: "f" }, h("span", { class: "label" }, f.label), f.hint ? h("p", { class: "hint" }, f.hint) : null,
      list, bar,
      h("div", { class: "image-btns" },
        h("button", { type: "button", class: "btn btn-sm", onclick: () => file.click() }, "Upload images or videos"),
        h("button", { type: "button", class: "btn btn-sm", onclick: () => pickFromLibrary(null, (m) => { arr.push({ type: m.kind === "video" ? "video" : "image", url: m.url, caption: "" }); onChange(); draw(); }) }, "Choose from library"),
        h("button", { type: "button", class: "btn btn-sm", onclick: () => {
          const u = prompt("Paste a YouTube or Vimeo link:");
          if (!u) return;
          if (!/youtu\.?be|vimeo\.com/.test(u)) return toast("Only YouTube and Vimeo links are supported.", true);
          arr.push({ type: "embed", url: u.trim(), caption: "" }); onChange(); draw();
        } }, "Add video link")),
      file);
  }

  async function pickFromLibrary(kind, onPick) {
    let items;
    try { items = await api("/api/admin/media"); } catch (e) { return toast(e.message, true); }
    if (kind) items = items.filter((m) => m.kind === kind);
    const dlg = h("dialog", { class: "modal", "aria-label": "Media library" });
    dlg.append(
      h("div", { class: "modal-head" }, h("h2", {}, "Choose a file"), h("button", { class: "btn btn-sm", onclick: () => dlg.close() }, "Close")),
      h("div", { class: "modal-body" }, items.length ? h("div", { class: "lib" }, items.map((m) => h("div", { class: "lib-item" },
        h("button", { class: "pick", type: "button", "aria-label": `Choose ${m.name}`, onclick: () => { onPick(m); dlg.close(); } },
          h("div", { class: "lib-thumb" }, m.kind === "video" ? h("video", { src: m.url, muted: true, preload: "metadata" }) : h("img", { src: m.thumb || m.url, alt: "" }))),
        h("div", { class: "lib-meta" }, h("span", {}, m.name || "")))))
        : h("p", { class: "empty" }, "The library is empty. Upload a file first.")));
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }

  // ---------- dirty state ----------
  let dirty = false;
  const setDirty = (v) => { dirty = v; const s = $(".savebar .state"); if (s) { s.textContent = v ? "Unsaved changes" : "All changes saved"; s.classList.toggle("dirty", v); } };
  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  function formView({ title, desc, sections, data, onSave, extraHead = [], onDelete }) {
    const state = clone(data);
    const form = h("form", { class: "form", novalidate: true });
    sections.forEach((s) => form.append(h("section", { class: "fieldset" }, s.title ? h("h2", {}, s.title) : null, s.fields.map((f) => renderField(f, state, () => setDirty(true))))));
    const saveBtn = h("button", { type: "submit", class: "btn btn-primary" }, "Save changes");
    form.append(h("div", { class: "savebar" }, h("span", { class: "state" }, "All changes saved"),
      onDelete ? h("button", { type: "button", class: "btn btn-danger", onclick: onDelete }, "Delete") : null,
      saveBtn));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const missing = sections.flatMap((s) => s.fields).find((f) => f.required && !String(state[f.key] || "").trim());
      if (missing) { toast(`${missing.label} is required.`, true); return; }
      saveBtn.disabled = true; saveBtn.textContent = "Saving…";
      try { await onSave(state); setDirty(false); toast("Saved. The website is updated."); }
      catch (err) { toast(err.message, true); }
      finally { saveBtn.disabled = false; saveBtn.textContent = "Save changes"; }
    });
    return [h("div", { class: "page-head" }, h("div", {}, h("h1", {}, title), desc ? h("p", {}, desc) : null), h("div", { class: "head-actions" }, extraHead)), form];
  }

  // ---------- pages ----------
  const NAV = [
    ["overview", "Overview"],
    ["Content"],
    ["home", "Homepage"], ["about", "About"], ["expertise", "Expertise"], ["industries", "Industries"],
    ["cases", "Case studies"], ["categories", "Project categories"], ["clients", "Clients"], ["approach", "My approach"],
    ["Inbox & files"],
    ["messages", "Messages"], ["media", "Media library"],
    ["Site"],
    ["contact", "Contact & social"], ["site", "Settings"], ["account", "Account"],
  ];
  let me = null;
  let unread = 0;

  function layout(route, content) {
    const side = h("aside", { class: "side", id: "side" },
      h("div", { class: "side-brand" }, "Portfolio admin", h("small", {}, me?.email || "")),
      h("nav", { "aria-label": "Admin" }, NAV.map(([k, l]) => l
        ? h("a", { href: `#/${k}`, "aria-current": route === k ? "page" : null, onclick: () => side.classList.remove("open") }, l, k === "messages" && unread ? h("span", { class: "badge" }, unread) : null)
        : h("p", { class: "group-label" }, k))),
      h("div", { class: "side-foot" },
        h("a", { class: "btn btn-sm", href: "/", target: "_blank", rel: "noopener" }, "View website"),
        h("button", { class: "btn btn-sm", onclick: logout }, "Sign out")));
    const top = h("div", { class: "topbar" }, h("button", { class: "btn btn-sm", "aria-controls": "side", onclick: () => side.classList.toggle("open") }, "Menu"), h("b", {}, "Portfolio admin"));
    $("#app").replaceChildren(h("div", { class: "shell" }, side, h("div", {}, top, h("main", { class: "main", id: "main" }, content))));
  }

  let lastHash = location.hash;
  let ignoreHash = false;
  async function route() {
    if (!me) return;
    if (ignoreHash) { ignoreHash = false; return; }
    if (dirty && location.hash !== lastHash && !confirm("You have unsaved changes. Leave without saving?")) {
      ignoreHash = true;
      location.hash = lastHash;
      return;
    }
    lastHash = location.hash;
    setDirty(false);
    const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
    const p = page || "overview";
    layout(p, h("p", { class: "hint" }, "Loading…"));
    try {
      let content;
      if (p === "overview") content = await overviewPage();
      else if (SETTINGS_PAGES[p]) content = await settingsPage(p);
      else if (COLLECTIONS[p] && id) content = await itemPage(p, id);
      else if (COLLECTIONS[p]) content = await listPage(p);
      else if (p === "messages") content = await messagesPage();
      else if (p === "media") content = await mediaPage();
      else if (p === "account") content = accountPage();
      else content = h("p", {}, "Page not found.");
      layout(p, content);
      $("#main h1")?.setAttribute("tabindex", "-1");
    } catch (e) {
      layout(p, h("p", { class: "empty" }, e.message));
    }
  }

  async function overviewPage() {
    const o = await api("/api/admin/overview");
    unread = o.counts.unread;
    const c = o.counts;
    return [
      h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "Overview"), h("p", {}, "Everything on the website is edited here. Changes go live as soon as you save."))),
      h("div", { class: "stats" },
        [[c.published, "Published case studies"], [c.drafts, "Draft case studies"], [c.clients, "Client brands"], [c.industries, "Industries"], [c.unread, "Unread messages"]]
          .map(([n, l]) => h("div", { class: "stat" }, h("b", {}, n), h("span", {}, l)))),
      h("section", { class: "card" }, h("h2", {}, "Website content status"),
        o.todo.length ? h("ul", { class: "todo" }, o.todo.map((t) => h("li", {}, t)))
          : h("ul", { class: "todo done" }, h("li", {}, "Everything is filled in."))),
    ];
  }

  async function settingsPage(key) {
    const cfg = SETTINGS_PAGES[key];
    const data = await api(`/api/admin/settings/${key}`);
    const extra = [];
    if (key === "contact") {
      const o = await api("/api/admin/overview");
      extra.push(h("span", { class: `pill ${o.mailConfigured ? "on" : "warn"}` }, o.mailConfigured ? "Email notifications on" : "Email notifications not configured"));
    }
    return formView({ ...cfg, data, extraHead: extra, onSave: (s) => api(`/api/admin/settings/${key}`, { method: "PUT", body: s }) });
  }

  async function listPage(col) {
    const cfg = COLLECTIONS[col];
    let items = await api(`/api/admin/c/${col}`);
    const rows = h("div", { class: "rows" });
    const draw = () => {
      rows.replaceChildren(...(items.length ? items.map((it, i) => {
        const thumb = cfg.itemThumb ? (cfg.itemThumb(it) ? h("img", { class: `row-thumb ${cfg.thumbClass || ""}`, src: cfg.itemThumb(it), alt: "" }) : h("div", { class: "row-thumb" })) : null;
        const pill = cfg.itemPill?.(it);
        return h("div", { class: "row" }, thumb,
          h("div", { class: "row-main" }, h("div", { class: "row-title" }, cfg.itemTitle(it) || "Untitled"), cfg.itemSub ? h("div", { class: "row-sub" }, cfg.itemSub(it) || "") : null),
          pill ? h("span", { class: `pill ${pill[1]}` }, pill[0]) : null,
          h("div", { class: "row-actions" },
            h("button", { class: "btn btn-sm btn-icon", "aria-label": "Move up", disabled: i === 0, onclick: () => reorder(i, -1) }, "↑"),
            h("button", { class: "btn btn-sm btn-icon", "aria-label": "Move down", disabled: i === items.length - 1, onclick: () => reorder(i, 1) }, "↓"),
            col === "cases" && it.status === "published" ? h("a", { class: "btn btn-sm", href: `/work/${it.slug}`, target: "_blank", rel: "noopener" }, "View") : null,
            h("a", { class: "btn btn-sm", href: `#/${col}/${it.id}` }, "Edit"),
            h("button", { class: "btn btn-sm btn-danger", onclick: () => del(it) }, "Delete")));
      }) : [h("p", { class: "empty" }, `No ${cfg.singular} yet.`)]));
    };
    const reorder = async (i, d) => {
      move(items, i, d); draw();
      try { items = await api(`/api/admin/c/${col}/reorder`, { method: "POST", body: { ids: items.map((x) => x.id) } }); toast("Order saved."); }
      catch (e) { toast(e.message, true); }
    };
    const del = async (it) => {
      if (!confirm(`Delete "${cfg.itemTitle(it) || "this item"}"? This can't be undone.`)) return;
      try { await api(`/api/admin/c/${col}/${it.id}`, { method: "DELETE" }); items = items.filter((x) => x.id !== it.id); draw(); toast("Deleted."); }
      catch (e) { toast(e.message, true); }
    };
    draw();
    return [h("div", { class: "page-head" }, h("div", {}, h("h1", {}, cfg.title), h("p", {}, cfg.desc)),
      h("div", { class: "head-actions" }, h("a", { class: "btn btn-primary", href: `#/${col}/new` }, `Add ${cfg.singular}`))), rows];
  }

  async function itemPage(col, id) {
    const cfg = COLLECTIONS[col];
    if (cfg.sections.some((s) => s.fields.some((f) => f.optionsFrom))) lookups.categories = await api("/api/admin/c/categories");
    const isNew = id === "new";
    const data = isNew ? clone(cfg.blank) : (await api(`/api/admin/c/${col}`)).find((x) => String(x.id) === id);
    if (!data) return h("p", { class: "empty" }, "This item no longer exists.");
    return formView({
      title: isNew ? `New ${cfg.singular}` : (cfg.itemTitle(data) || "Edit"),
      desc: h("a", { href: `#/${col}` }, `Back to ${cfg.title.toLowerCase()}`),
      sections: cfg.sections, data,
      extraHead: col === "cases" && !isNew && data.status === "published" ? [h("a", { class: "btn", href: `/work/${data.slug}`, target: "_blank", rel: "noopener" }, "View on website")] : [],
      onSave: async (s) => {
        const saved = isNew ? await api(`/api/admin/c/${col}`, { method: "POST", body: s }) : await api(`/api/admin/c/${col}/${id}`, { method: "PUT", body: s });
        if (isNew) { setDirty(false); location.hash = `#/${col}/${saved.id}`; }
        else if (col === "cases" && saved.slug !== s.slug) { const el = $('input[type="text"]', $(".color")); if (el) el.value = saved.slug; s.slug = saved.slug; }
      },
      onDelete: isNew ? null : async () => {
        if (!confirm("Delete this item? This can't be undone.")) return;
        try { await api(`/api/admin/c/${col}/${id}`, { method: "DELETE" }); setDirty(false); toast("Deleted."); location.hash = `#/${col}`; }
        catch (e) { toast(e.message, true); }
      },
    });
  }

  async function messagesPage() {
    let msgs = await api("/api/admin/messages");
    const box = h("div", { class: "rows" });
    const draw = () => {
      unread = msgs.filter((m) => !m.read).length;
      box.replaceChildren(...(msgs.length ? msgs.map((m) => h("article", { class: `msg${m.read ? "" : " unread"}` },
        h("div", { class: "msg-head" }, h("div", {}, h("b", {}, m.name), m.company ? ` · ${m.company}` : "", h("div", {}, h("a", { href: `mailto:${m.email}` }, m.email))),
          h("div", { class: "msg-meta" }, new Date(m.created_at.replace(" ", "T") + "Z").toLocaleString(), m.emailed ? " · emailed" : "")),
        h("p", { class: "msg-body" }, m.details),
        h("div", { class: "row-actions" },
          h("a", { class: "btn btn-sm", href: `mailto:${m.email}?subject=${encodeURIComponent("Re: your enquiry")}` }, "Reply by email"),
          h("button", { class: "btn btn-sm", onclick: async () => { await api(`/api/admin/messages/${m.id}/read`, { method: "PUT", body: { read: !m.read } }); m.read = m.read ? 0 : 1; draw(); } }, m.read ? "Mark as unread" : "Mark as read"),
          h("button", { class: "btn btn-sm btn-danger", onclick: async () => { if (!confirm("Delete this message?")) return; await api(`/api/admin/messages/${m.id}`, { method: "DELETE" }); msgs = msgs.filter((x) => x.id !== m.id); draw(); } }, "Delete"))))
        : [h("p", { class: "empty" }, "No messages yet. Messages sent through the contact form appear here.")]));
    };
    draw();
    return [h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "Messages"), h("p", {}, "Enquiries from the contact form. They're always saved here, even when email notifications are off."))), box];
  }

  async function mediaPage() {
    let items = await api("/api/admin/media");
    const grid = h("div", { class: "lib" });
    const bar = h("div", { class: "progress", hidden: true }, h("i"));
    const file = h("input", { type: "file", multiple: true, accept: "image/*,video/mp4,video/webm,video/quicktime", class: "sr", tabindex: -1 });
    const fmt = (b) => !b ? "" : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`;
    const draw = () => grid.replaceChildren(...(items.length ? items.map((m) => h("div", { class: "lib-item" },
      h("div", { class: "lib-thumb" }, m.kind === "video" ? h("video", { src: m.url, muted: true, preload: "metadata", controls: true }) : h("img", { src: m.thumb || m.url, alt: m.name || "" })),
      h("div", { class: "lib-meta" }, h("span", { title: m.name }, `${m.name || ""} ${fmt(m.bytes)}`),
        h("button", { class: "btn btn-sm btn-icon btn-danger", "aria-label": `Delete ${m.name}`, onclick: async () => {
          if (!confirm("Delete this file? Anything using it on the website will lose it.")) return;
          try { await api(`/api/admin/media/${m.id}`, { method: "DELETE" }); items = items.filter((x) => x.id !== m.id); draw(); toast("File deleted."); } catch (e) { toast(e.message, true); }
        } }, "×")))) : [h("p", { class: "empty" }, "No files uploaded yet.")]));
    file.addEventListener("change", async () => {
      if (!file.files.length) return;
      bar.hidden = false;
      try { await uploadFiles(file.files, (p) => (bar.firstChild.style.width = `${p * 100}%`)); items = await api("/api/admin/media"); draw(); toast("Uploaded."); }
      catch (e) { toast(e.message, true); }
      finally { bar.hidden = true; file.value = ""; }
    });
    draw();
    return [h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "Media library"), h("p", {}, "Every uploaded file. Images are converted to WebP and resized automatically.")),
      h("div", { class: "head-actions" }, h("button", { class: "btn btn-primary", onclick: () => file.click() }, "Upload files"))), bar, file, grid];
  }

  function accountPage() {
    const cur = h("input", { type: "password", id: "pw-cur", autocomplete: "current-password", required: true });
    const nw = h("input", { type: "password", id: "pw-new", autocomplete: "new-password", required: true, minlength: 10 });
    const form = h("form", { class: "fieldset", onsubmit: async (e) => {
      e.preventDefault();
      try { await api("/api/admin/password", { method: "POST", body: { current: cur.value, next: nw.value } }); form.reset(); toast("Password changed. Other devices have been signed out."); }
      catch (err) { toast(err.message, true); }
    } }, h("h2", {}, "Change password"),
      h("div", { class: "f" }, h("label", { for: "pw-cur" }, "Current password"), cur),
      h("div", { class: "f" }, h("label", { for: "pw-new" }, "New password"), nw, h("p", { class: "hint" }, "At least 10 characters.")),
      h("div", {}, h("button", { class: "btn btn-primary", type: "submit" }, "Change password")));
    return [h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "Account"), h("p", {}, `Signed in as ${me.email}`))), form];
  }

  // ---------- auth ----------
  function showLogin() {
    me = null;
    const email = h("input", { type: "email", id: "l-email", autocomplete: "username", required: true });
    const pw = h("input", { type: "password", id: "l-pw", autocomplete: "current-password", required: true });
    const err = h("p", { class: "note-warn", role: "alert" });
    const btn = h("button", { class: "btn btn-primary", type: "submit" }, "Sign in");
    $("#app").replaceChildren(h("div", { class: "login" }, h("form", { onsubmit: async (e) => {
      e.preventDefault(); err.textContent = ""; btn.disabled = true;
      try { me = await api("/api/auth/login", { method: "POST", body: { email: email.value, password: pw.value } }); route(); }
      catch (x) { err.textContent = x.message; pw.select(); }
      finally { btn.disabled = false; }
    } }, h("h1", {}, "Sign in"), h("p", {}, "Manage your portfolio website."),
      h("div", { class: "f" }, h("label", { for: "l-email" }, "Email"), email),
      h("div", { class: "f" }, h("label", { for: "l-pw" }, "Password"), pw), err, btn)));
    email.focus();
  }

  async function logout() {
    if (dirty && !confirm("You have unsaved changes. Sign out anyway?")) return;
    setDirty(false);
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    showLogin();
  }

  addEventListener("hashchange", route);
  (async () => {
    try { me = await api("/api/auth/me"); } catch { return; }
    try { unread = (await api("/api/admin/overview")).counts.unread; } catch {}
    route();
  })();
})();
