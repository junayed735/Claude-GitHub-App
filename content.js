// =============================================================
//  ALL SITE CONTENT LIVES HERE. Edit this file to update the site.
//  Images and videos go in the assets/ folder.
// =============================================================

const PROFILE = {
  name: "Junayed",
  role: "Media buyer and growth specialist",
  photo: "assets/photo.jpg",            // your photo (square or portrait works best)
  intro: "I run paid ads on Meta, TikTok and Google for brands that want profitable growth.",
  mission:
    "Paid ads should be a growth channel you can plan around, not a cost you hope works out. " +
    "I test fast, cut what doesn’t sell, and put the budget behind what does.",
  numbers: {
    spend: "$3M",        // total ad spend managed
    revenue: "$9M",      // revenue generated from that spend
    brands: "50+",
    years: "5",
  },
  platforms: ["Meta Ads", "TikTok Ads", "Google Ads"],
  email: "hello@example.com",          // REPLACE with your real email
  links: [
    { label: "LinkedIn", url: "#" },    // REPLACE
    { label: "WhatsApp", url: "#" },    // REPLACE, e.g. https://wa.me/8801XXXXXXXXX
  ],
};

// Case studies. Each creative is { type: "video" | "image", src: "assets/..." }.
// A creative without a src shows an empty slot until you add the file.
const CASES = [
  {
    brand: "Brand name",
    category: "Skincare, online store",
    platforms: ["Meta", "TikTok"],
    summary: "One or two lines: what the brand needed and what you changed.",
    metrics: [
      { label: "Ad spend", value: "$0" },
      { label: "Revenue", value: "$0" },
      { label: "ROAS", value: "0x" },
    ],
    creatives: [{ type: "video" }, { type: "image" }, { type: "image" }],
  },
  {
    brand: "Brand name",
    category: "Fashion, online store",
    platforms: ["Meta", "Google"],
    summary: "One or two lines: what the brand needed and what you changed.",
    metrics: [
      { label: "Ad spend", value: "$0" },
      { label: "Revenue", value: "$0" },
      { label: "ROAS", value: "0x" },
    ],
    creatives: [{ type: "image" }, { type: "video" }, { type: "image" }],
  },
  {
    brand: "Brand name",
    category: "Mobile app",
    platforms: ["TikTok", "Google"],
    summary: "One or two lines: what the brand needed and what you changed.",
    metrics: [
      { label: "Ad spend", value: "$0" },
      { label: "Installs", value: "0" },
      { label: "Cost per install", value: "$0" },
    ],
    creatives: [{ type: "video" }, { type: "video" }, { type: "image" }],
  },
];

// Client logos. Add a logo file (SVG or PNG, ideally transparent) to assets/clients/.
// Without a logo, the brand name is shown instead.
const CLIENTS = [
  { name: "Client one" },
  { name: "Client two" },
  { name: "Client three" },
  { name: "Client four" },
  { name: "Client five" },
  { name: "Client six" },
  { name: "Client seven" },
  { name: "Client eight" },
  { name: "Client nine" },
  { name: "Client ten" },
  { name: "Client eleven" },
  { name: "Client twelve" },
];
