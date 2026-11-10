# Junayed — portfolio

Media buyer and growth specialist portfolio. Plain HTML, CSS and JavaScript, no build step.

## Editing content
Everything you see on the page comes from **`content.js`**:
- `PROFILE` — name, role, photo, intro, mission, headline numbers, email, links
- `CASES` — case studies: brand, category, platforms, summary, metrics, ad creatives
- `CLIENTS` — client names and logos

Return on spend in the header is calculated from `spend` and `revenue` automatically.

## Adding files
- Your photo: `assets/photo.jpg`
- Ad creatives: `assets/cases/` — vertical 9:16 images (`.jpg`, `.png`, `.webp`) or videos (`.mp4`, keep under ~5 MB each)
- Client logos: `assets/clients/` — transparent `.svg` or `.png`

Then reference them in `content.js`, e.g.
```js
creatives: [{ type: "video", src: "assets/cases/brand-ad-1.mp4" }, { type: "image", src: "assets/cases/brand-ad-2.jpg" }]
{ name: "Brand", logo: "assets/clients/brand.svg" }
```

## Preview locally
```bash
python3 -m http.server 8000
```

## Publish with GitHub Pages
Settings → Pages → Deploy from a branch → `main`, `/ (root)`.
