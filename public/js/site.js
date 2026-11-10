(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header border on scroll
  const header = $(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu
  const toggle = $(".nav-toggle");
  const list = $("#nav-list");
  if (toggle && list) {
    const set = (open) => { toggle.setAttribute("aria-expanded", String(open)); list.classList.toggle("open", open); };
    toggle.addEventListener("click", () => set(toggle.getAttribute("aria-expanded") !== "true"));
    list.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  }

  // Count-up metrics (values are already correct in the HTML; this only animates them)
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const target = parseFloat(el.dataset.count.replace(",", "."));
        const decimals = (el.dataset.count.split(/[.,]/)[1] || "").length;
        const start = performance.now();
        const dur = 1200;
        const tick = (t) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(tick); else el.textContent = el.dataset.count;
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach((el) => io.observe(el));
  }

  // Expertise tabs (all panels are visible without JavaScript)
  $$("[data-tabs]").forEach((wrap) => {
    wrap.classList.add("js");
    const tabs = $$('[role="tab"]', wrap);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (on) panel.removeAttribute("data-hidden"); else panel.setAttribute("data-hidden", "");
      });
      if (focus) tab.focus();
      tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  });

  // Case study filters
  const filterBtns = $$(".filters button");
  if (filterBtns.length) {
    const cards = $$(".case-card");
    const empty = $(".filter-empty");
    filterBtns.forEach((b) => b.addEventListener("click", () => {
      filterBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const f = b.dataset.filter;
      let shown = 0;
      cards.forEach((c) => {
        const ok = f === "all" || JSON.parse(c.dataset.tags || "[]").includes(f);
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    }));
  }

  // Contact form
  const form = $("[data-contact]");
  if (form) {
    const status = $(".form-status", form);
    const btn = $('button[type="submit"]', form);
    const label = btn.textContent;
    const clearErrors = () => $$(".field", form).forEach((f) => { f.removeAttribute("data-error"); $(".field-error", f)?.remove(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors();
      status.className = "form-status";
      status.textContent = "";
      btn.disabled = true;
      btn.textContent = "Sending…";
      const data = Object.fromEntries(new FormData(form));
      try {
        const res = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) {
          Object.entries(out.fields || {}).forEach(([name, msg]) => {
            const input = form.elements[name];
            const field = input?.closest(".field");
            if (!field) return;
            field.setAttribute("data-error", "");
            const p = document.createElement("p");
            p.className = "field-error";
            p.id = `${input.id}-err`;
            p.textContent = msg;
            field.append(p);
            input.setAttribute("aria-describedby", p.id);
          });
          const first = form.querySelector("[data-error] input, [data-error] textarea");
          first?.focus();
          throw new Error(out.error || "Your message wasn't sent. Try again in a moment.");
        }
        form.reset();
        status.classList.add("ok");
        status.textContent = "Thanks, your message was sent. I'll reply soon.";
      } catch (err) {
        status.classList.add("err");
        status.textContent = err.message === "Failed to fetch" ? "Your message wasn't sent. Check your connection and try again." : err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  // Lightbox for case study images
  const dlg = $(".lightbox");
  if (dlg && typeof dlg.showModal === "function") {
    const zooms = $$(".zoom");
    const im = $("img", dlg);
    let idx = 0, opener = null;
    const show = (i) => {
      idx = (i + zooms.length) % zooms.length;
      const z = zooms[idx];
      im.src = z.dataset.full;
      im.alt = $("img", z)?.alt || "";
    };
    zooms.forEach((z, i) => z.addEventListener("click", () => { opener = z; show(i); dlg.showModal(); }));
    $(".lb-close", dlg).addEventListener("click", () => dlg.close());
    $(".lb-prev", dlg).addEventListener("click", () => show(idx - 1));
    $(".lb-next", dlg).addEventListener("click", () => show(idx + 1));
    $$(".lb-prev, .lb-next", dlg).forEach((b) => (b.hidden = zooms.length < 2));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    dlg.addEventListener("close", () => { im.removeAttribute("src"); opener?.focus(); });
  }
})();
