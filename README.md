# Junayed — portfolio website

A hand-built portfolio site: plain HTML, CSS and JavaScript, no build step.

- `index.html` — all page content
- `styles.css` — design tokens (colors, type) at the top, then layout
- `script.js` — the resizable hero demo and expandable project rows

## Before publishing
- Replace the four sample projects in `index.html` (Selected work) with real ones
- Replace `hello@example.com` with your real email
- Fill in the LinkedIn and Dribbble links

## Preview locally
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000

## Publish free with GitHub Pages
Repository Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)`.

## Claude skills
`.claude/skills/` contains `frontend-design` and `webapp-testing`, loaded automatically in Claude Code sessions on this repo.
