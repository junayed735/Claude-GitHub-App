// Media uploads: images are resized and converted to WebP; videos, SVG, GIF and ICO are stored as-is.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const sharp = require("sharp");
const { db } = require("./db");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
const TMP_DIR = path.join(UPLOAD_DIR, ".tmp");
fs.mkdirSync(TMP_DIR, { recursive: true });

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 100);

const TYPES = {
  "image/jpeg": { kind: "image", convert: true },
  "image/png": { kind: "image", convert: true },
  "image/webp": { kind: "image", convert: true },
  "image/avif": { kind: "image", convert: true },
  "image/gif": { kind: "image", ext: ".gif" },
  "image/svg+xml": { kind: "image", ext: ".svg" },
  "image/x-icon": { kind: "image", ext: ".ico" },
  "image/vnd.microsoft.icon": { kind: "image", ext: ".ico" },
  "video/mp4": { kind: "video", ext: ".mp4" },
  "video/webm": { kind: "video", ext: ".webm" },
  "video/quicktime": { kind: "video", ext: ".mov" },
};

const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 20, fields: 10, fieldNameSize: 50 },
  fileFilter: (req, file, cb) => {
    if (TYPES[file.mimetype]) cb(null, true);
    else cb(Object.assign(new Error(`This file type isn't supported: ${file.originalname}. Use JPG, PNG, WebP, SVG, GIF, MP4 or WebM.`), { status: 400 }));
  },
});

const id = () => `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`;

async function processFile(file) {
  const t = TYPES[file.mimetype];
  const base = id();
  try {
    if (t.convert) {
      const img = sharp(file.path, { failOn: "error" }).rotate();
      const meta = await img.metadata();
      const name = `${base}.webp`;
      const info = await img.clone().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 }).toFile(path.join(UPLOAD_DIR, name));
      const thumbName = `${base}-800.webp`;
      await img.clone().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(UPLOAD_DIR, thumbName));
      return save({ url: `/uploads/${name}`, thumb: `/uploads/${thumbName}`, kind: "image", name: file.originalname, width: info.width, height: info.height, bytes: info.size, hasAlpha: meta.hasAlpha });
    }
    if (file.mimetype === "image/svg+xml") {
      const text = fs.readFileSync(file.path, "utf8");
      if (!/<svg[\s>]/i.test(text)) throw Object.assign(new Error("That file isn't a valid SVG."), { status: 400 });
    }
    const name = base + t.ext;
    fs.copyFileSync(file.path, path.join(UPLOAD_DIR, name));
    return save({ url: `/uploads/${name}`, thumb: null, kind: t.kind, name: file.originalname, bytes: file.size });
  } catch (e) {
    if (!e.status) e = Object.assign(new Error(`Couldn't process ${file.originalname}. Check that it's a valid image or video.`), { status: 400 });
    throw e;
  } finally {
    fs.rm(file.path, () => {});
  }
}

function save(m) {
  const r = db.prepare("INSERT INTO media (url, thumb, kind, original_name, width, height, bytes) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(m.url, m.thumb, m.kind, m.name, m.width ?? null, m.height ?? null, m.bytes ?? null);
  return { id: Number(r.lastInsertRowid), url: m.url, thumb: m.thumb, kind: m.kind, name: m.name, width: m.width, height: m.height };
}

function listMedia() {
  return db.prepare("SELECT id, url, thumb, kind, original_name AS name, width, height, bytes, created_at FROM media ORDER BY id DESC").all();
}

function deleteMedia(mediaId) {
  const m = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId);
  if (!m) return false;
  for (const u of [m.url, m.thumb]) if (u) fs.rm(path.join(UPLOAD_DIR, path.basename(u)), () => {});
  db.prepare("DELETE FROM media WHERE id = ?").run(mediaId);
  return true;
}

// Look up the thumbnail for an uploaded image URL (for responsive srcset)
function thumbFor(url) {
  if (!url) return null;
  const r = db.prepare("SELECT thumb, width, height FROM media WHERE url = ?").get(url);
  return r || null;
}

module.exports = { upload, processFile, listMedia, deleteMedia, thumbFor, UPLOAD_DIR, MAX_MB };
