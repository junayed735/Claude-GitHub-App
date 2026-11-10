// Minimal line icons (24px, stroke = currentColor) for industries.
const p = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const ICONS = {
  cart: p('<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>'),
  briefcase: p('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>'),
  people: p('<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>'),
  factory: p('<path d="M3 20V10l5 3V10l5 3V6h4l1 14H3z"/><path d="M7 17h2M12 17h2"/>'),
  shirt: p('<path d="M8 3 3 6l2 4 2-1v11h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>'),
  baby: p('<circle cx="12" cy="9" r="5"/><path d="M10 9h.01M14 9h.01M10.5 11.5a2 2 0 0 0 3 0M7 20c1-2.5 3-3.5 5-3.5s4 1 5 3.5"/>'),
  play: p('<path d="M4 20 9 5l5 15M6 14h6"/><circle cx="18" cy="7" r="2.5"/><path d="M18 9.5V20"/>'),
  hotel: p('<path d="M4 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15M16 10h3a1 1 0 0 1 1 1v9M2 20h20"/><path d="M8 8h1M11 8h1M8 12h1M11 12h1M9 20v-4h2v4"/>'),
  restaurant: p('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7h3"/>'),
  education: p('<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>'),
  passport: p('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>'),
  plane: p('<path d="M10.5 13.5 4 12l-1 1 5 3 2 4 1-1-.5-5.5 4.5-4.5c1.5-1.5 2-3 1.5-3.5s-2 0-3.5 1.5z"/><path d="m15 9 2 9-1 1-3-5"/>'),
  building: p('<rect x="4" y="3" width="10" height="18" rx="1"/><path d="M14 9h5a1 1 0 0 1 1 1v11M8 7h2M8 11h2M8 15h2M17 13h0M17 17h0M2 21h20"/>'),
  spark: p('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
};

const GUESS = [
  [/e-?commerce|online/i, "cart"], [/b2b/i, "briefcase"], [/b2c|consumer/i, "people"], [/manufactur|factory/i, "factory"],
  [/fashion|apparel|clothing/i, "shirt"], [/baby|kids? (&|and) baby|kids product/i, "baby"], [/play/i, "play"],
  [/hotel|resort/i, "hotel"], [/restaurant|hospitality|food/i, "restaurant"], [/educat|school|student/i, "education"],
  [/visa|immigra/i, "passport"], [/travel|tour/i, "plane"], [/real estate|property/i, "building"],
];

function iconFor(name, key) {
  if (key && ICONS[key]) return ICONS[key];
  const hit = GUESS.find(([re]) => re.test(name || ""));
  return ICONS[hit ? hit[1] : "spark"];
}

module.exports = { ICONS, iconFor };
