# Growth portfolio

Personal portfolio website with a built-in admin dashboard, for a Media Buying & Growth Specialist.

- **Public site**: hero with photo and metrics, about and mission, expertise, industries, filterable case studies with detail pages (creatives, screenshots, video, lightbox), client logo wall, process timeline, and a contact form.
- **Admin dashboard** at `/admin`: edit every word, image, metric, case study, client, industry and setting. Nothing requires code changes.

## Stack

| Part | Choice | Why |
|---|---|---|
| Server | Node.js 22.5+ with Express 5 | One small, easy-to-host app |
| Database | SQLite (built into Node, `data/site.db`) | No separate database server to run or pay for |
| Images | Sharp: resized and converted to WebP, 800px thumbnails for phones | Fast loading |
| Email | Nodemailer over SMTP (optional) | Works with Gmail, Zoho, Brevo, any SMTP provider |
| Pages | Rendered on the server | Search engines see the full content |
| Admin | Plain JavaScript, no build step | Nothing to compile |

## Run it locally

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env` and set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (10+ characters). Then:

```bash
npm start
```

Open http://localhost:3000 for the site and http://localhost:3000/admin to sign in.

If you don't set `ADMIN_PASSWORD`, a random one is generated on first run and saved to `data/initial-admin.txt`.

## Editing the site

Sign in at `/admin`. The **Overview** page lists what still needs real content.

- **Homepage**: name, title, headline, intro, hero photo, buttons, metrics. Each metric has a *Show on website* switch. The media spend metric starts **hidden** and marked *pending confirmation* until you verify the figure.
- **About**: introduction, mission, second photo.
- **Expertise**: categories and individual skills (add, edit, delete, reorder).
- **Industries**: name, description, built-in or custom icon.
- **Case studies**: draft or published, brand, industry, categories, platforms, results, story sections, ad creatives (images/videos), performance screenshots, YouTube/Vimeo links.
- **Project categories**: the filter buttons above the case studies.
- **Clients**: name, logo (transparent PNG/SVG), white-on-dark or original-color display, industry label, website link.
- **Messages**: every contact form submission is saved here.
- **Media library**: all uploaded files.
- **Contact & social**, **Settings** (SEO, favicon, sharing image, nav labels, section visibility, headings, theme colors), **Account** (change password).

Forgot the password? On the server:

```bash
npm run reset-password -- you@example.com "new-long-password"
```

## Contact form email

Messages are **always saved** in Admin › Messages. To also get them by email, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`. For Gmail, create an [app password](https://myaccount.google.com/apppasswords) and use `smtp.gmail.com`, port `587`. The admin shows whether email is configured.

## Deploying

This is a server app with a database and file uploads, so it needs a host that runs Node and keeps files on a **persistent disk**. GitHub Pages can't run it.

### Render (simplest)

1. New › Web Service › connect this GitHub repo.
2. Build command `npm install`, start command `npm start`.
3. Add a **Disk** (1 GB is plenty to start) mounted at `/var/data`. Disks need a paid instance.
4. Environment variables: `DATA_DIR=/var/data/db`, `UPLOAD_DIR=/var/data/uploads`, `TRUST_PROXY=1`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and SMTP settings if wanted.
5. Add your custom domain under Settings › Custom Domains.

### Railway

New project › Deploy from GitHub. Add a **Volume** mounted at `/data`, then set `DATA_DIR=/data/db`, `UPLOAD_DIR=/data/uploads`, `TRUST_PROXY=1` and the admin and SMTP variables.

### VPS or Docker

```bash
docker build -t growth-portfolio .
```

```bash
docker run -d -p 3000:3000 -v portfolio-data:/data --env-file .env --restart unless-stopped growth-portfolio
```

Put Nginx or Caddy in front for HTTPS, and set `TRUST_PROXY=1`.

### Backups

Everything lives in two folders: `DATA_DIR` (the database) and `UPLOAD_DIR` (images and videos). Back up both.

## Security

- Passwords hashed with scrypt; sessions in HTTP-only, SameSite=Strict cookies (HTTPS-only behind a proxy with `TRUST_PROXY=1`)
- Sign-in and contact form rate limiting; contact form spam trap
- Admin writes require a same-origin header (CSRF protection)
- All content is HTML-escaped; links only allow `http(s)`, `mailto`, `tel` and on-page anchors
- Uploads: type allow-list, size limit, random file names, and a sandboxing Content-Security-Policy so uploaded SVGs can't run scripts
- Content-Security-Policy, `nosniff`, `Referrer-Policy` and frame protections on every page

## Project structure

```
server.js            routes, API, contact form
src/db.js            SQLite schema and data access
src/defaults.js      first-run content (placeholders)
src/render.js        public pages (server-side HTML)
src/auth.js          passwords, sessions, rate limiting
src/uploads.js       uploads and image processing
src/mail.js          contact form email
src/icons.js         industry icons
public/css, js       public site styles and interactions
public/admin/        admin dashboard
scripts/             password reset
```

## Placeholder content

Case studies ("Brand name 1–3") and clients ("Client name 1–8") are placeholders, so no client names or results are invented. Industry descriptions describe the type of work, not achievements; review them before launch. Replace or delete all of these in the admin.
