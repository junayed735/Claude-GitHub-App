// Content the site starts with on first run. After that, everything is edited in /admin.
// Placeholders are deliberately obvious. No client names, results or achievements are invented.

const settings = {
  home: {
    name: "Junayed",
    title: "Media Buying & Growth Specialist",
    positioning: "Growth Marketing, Performance Marketing, Media Buying, Business Growth",
    headline: "Turning media investment into measurable business growth.",
    intro: "I help B2B and B2C brands accelerate growth through strategic media buying, performance marketing, and data-driven growth solutions.",
    heroImage: "",
    heroImageAlt: "Portrait of Junayed",
    heroImageShape: "portrait",
    ctaPrimary: { label: "Explore my work", href: "#work" },
    ctaSecondary: { label: "Let's connect", href: "#contact" },
    metrics: [
      { value: "5+", label: "Years of experience", visible: true, note: "" },
      { value: "50+", label: "Brands worked with", visible: true, note: "" },
      { value: "$9M+", label: "Revenue generated", visible: true, note: "" },
      { value: "$3M+", label: "Media spend managed", visible: false, note: "Pending confirmation: earlier figure was about $2M. Confirm before making visible." },
    ],
    values: ["Strategy", "Performance", "Data", "Growth"],
  },
  about: {
    heading: "Growth is a system, not a lucky campaign.",
    body:
      "I'm a Media Buying & Growth Specialist focused on helping businesses grow through performance-driven marketing.\n\n" +
      "With 5+ years of experience across multiple industries, I work at the intersection of paid acquisition, growth strategy, creative optimization, and marketing analytics.\n\n" +
      "My focus is to understand business objectives, identify growth opportunities, develop effective marketing strategies, and turn data into actionable results.",
    mission: "To help businesses unlock their growth potential through smarter marketing strategies, measurable performance, and continuous optimization.",
    image: "",
    imageAlt: "Junayed at work",
  },
  approach: {
    heading: "How I drive growth",
    steps: [
      { title: "Research & understanding", text: "Understand the business model, target audience, competition, and growth objectives." },
      { title: "Strategy development", text: "Build a data-driven marketing strategy based on business requirements." },
      { title: "Execution", text: "Launch campaigns across suitable platforms and execute creative strategies." },
      { title: "Testing & optimization", text: "Analyze results, test creatives, optimize targeting, and improve campaign efficiency." },
      { title: "Growth & scaling", text: "Identify opportunities, scale successful campaigns, and pursue sustainable business growth." },
    ],
  },
  contact: {
    headline: "Let's turn your next growth opportunity into results.",
    text: "Have a business looking to grow? Let's discuss your marketing goals and explore the right strategy.",
    email: "hello@example.com",
    whatsapp: "",
    linkedin: "",
    facebook: "",
    formEnabled: true,
    formButton: "Start a conversation",
    notifyEmail: "",
  },
  site: {
    seoTitle: "Junayed, Media Buying & Growth Specialist",
    metaDescription: "Media buying and growth specialist. Paid acquisition on Meta, Google and TikTok for B2B and B2C brands, with 50+ brands and $9M+ in revenue generated.",
    favicon: "",
    ogImage: "",
    footer: "Strategy. Performance. Data. Growth.",
    nav: { about: "About", expertise: "Expertise", industries: "Industries", work: "Work", clients: "Clients", contact: "Contact" },
    sections: { about: true, expertise: true, industries: true, work: true, clients: true, approach: true, contact: true },
    headings: {
      expertise: "Expertise & capabilities",
      industries: "Industries I've helped grow",
      work: "Selected case studies",
      clients: "Brands & businesses I've worked with",
    },
    theme: { accent: "#35D0BA", background: "#0B1220", surface: "#111C31" },
  },
};

const expertise = [
  { name: "Paid media & acquisition", description: "Buying attention at a price that makes sense for the business.",
    skills: ["Meta Ads (Facebook & Instagram)", "Google Ads", "TikTok Ads", "Media buying", "Paid customer acquisition", "Campaign structure & management", "Budget allocation & optimization", "Audience targeting & retargeting"] },
  { name: "Growth strategy & scaling", description: "Deciding where the next customers come from, and how to get more of them.",
    skills: ["Growth marketing strategy", "Growth hacking", "Business growth strategy", "Campaign scaling", "Customer acquisition strategy", "Partnership marketing strategy", "Marketing funnel strategy", "Market & competitor research"] },
  { name: "Creative & content strategy", description: "Ads that stop the scroll and say the right thing.",
    skills: ["Creative strategy", "Creative testing", "Winning ad creative research", "Ad copy & messaging strategy", "Content ideas & planning", "Marketing content strategy", "Video ad concept development", "Hook & angle research"] },
  { name: "Performance & campaign optimization", description: "Finding what works, cutting what doesn't, every week.",
    skills: ["Campaign management", "A/B testing", "Campaign optimization", "Performance analysis", "Conversion optimization", "Audience research", "ROI & ROAS analysis"] },
  { name: "Analytics, tracking & measurement", description: "Numbers you can trust before you spend more.",
    skills: ["Marketing data analytics", "Meta Pixel setup", "Conversion tracking", "Google Analytics 4", "Google Tag Manager", "Server-side tracking", "Meta Conversions API", "Event tracking & measurement", "Campaign reporting"] },
];

// Descriptions describe the type of work, not results. Review and edit them in /admin.
const industries = [
  ["E-commerce businesses", "Catalogue ads, retargeting and scaling for online stores."],
  ["B2B businesses", "Lead generation and qualified pipeline for longer sales cycles."],
  ["B2C brands", "Direct-response campaigns built around purchase and repeat orders."],
  ["Manufacturing businesses", "Reaching distributors, wholesale buyers and new markets."],
  ["Fashion & apparel brands", "Collection launches, seasonal pushes and creative testing."],
  ["Kids & baby product brands", "Messaging for parents, built on trust and safety."],
  ["Kids play zones", "Local awareness, footfall and event-driven bookings."],
  ["Hotels & resorts", "Direct bookings and seasonal occupancy campaigns."],
  ["Restaurants & hospitality", "Local reach, offers and reservations."],
  ["Educational consultancy", "Student lead generation and enquiry follow-up."],
  ["Visa consultancy", "Qualified enquiries for visa and immigration services."],
  ["Travel agencies", "Package promotion, seasonal demand and enquiry generation."],
  ["Real estate businesses", "Project launches and buyer lead generation."],
].map(([name, description]) => ({ name, description, icon: "" }));

const categories = ["E-commerce", "B2B", "B2C", "Meta Ads", "Google Ads", "TikTok Ads", "Lead Generation", "Other Industries"].map((name) => ({ name }));

const placeholderCase = (n, industry, cats, platforms) => ({
  status: "published",
  slug: `case-study-${n}`,
  brand: `Brand name ${n}`,
  title: "Case study title",
  industry,
  categories: cats,
  platforms,
  heroImage: "",
  summary: "One sentence on the outcome. Replace this in Admin, Case studies.",
  overview: "Add the project overview: who the client is and what they sell.",
  challenge: "Add the business challenge: what wasn't working, and what was at stake.",
  objective: "Add the campaign objective.",
  strategy: "Add the marketing strategy.",
  execution: "Add how the campaigns were executed and optimized.",
  creativeStrategy: "Add the creative strategy.",
  results: "Add the final results.",
  learnings: "Add key learnings.",
  metrics: [
    { label: "Ad spend", value: "—" },
    { label: "Revenue", value: "—" },
    { label: "ROAS", value: "—" },
  ],
  creatives: [],
  screenshots: [],
});

const cases = [
  placeholderCase(1, "E-commerce", ["E-commerce", "B2C", "Meta Ads"], ["Meta Ads", "TikTok Ads"]),
  placeholderCase(2, "Educational consultancy", ["B2C", "Lead Generation", "Meta Ads", "Google Ads"], ["Meta Ads", "Google Ads"]),
  placeholderCase(3, "Manufacturing", ["B2B", "Lead Generation", "Google Ads"], ["Google Ads"]),
];

const clients = Array.from({ length: 8 }, (_, i) => ({ name: `Client name ${i + 1}`, logo: "", industry: "", url: "" }));

module.exports = {
  settings,
  collections: { expertise, industries, categories, cases, clients },
};
