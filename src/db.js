// SQLite storage (built into Node 22.5+). One file: data/site.db
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const defaults = require("./defaults");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "site.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS items_collection ON items(collection, position);
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    thumb TEXT,
    kind TEXT NOT NULL,
    original_name TEXT,
    width INTEGER, height INTEGER, bytes INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, email TEXT NOT NULL, company TEXT, details TEXT NOT NULL,
    emailed INTEGER NOT NULL DEFAULT 0,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------- Settings (single documents: home, about, contact, site, approach) ----------
function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? JSON.parse(row.value) : structuredClone(defaults.settings[key] ?? {});
}
function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value));
  return value;
}

// ---------- Collections (expertise, industries, cases, clients, categories) ----------
const row2item = (r) => ({ id: r.id, position: r.position, ...JSON.parse(r.data), updated_at: r.updated_at });

function list(collection) {
  return db.prepare("SELECT * FROM items WHERE collection = ? ORDER BY position, id").all(collection).map(row2item);
}
function get(collection, id) {
  const r = db.prepare("SELECT * FROM items WHERE collection = ? AND id = ?").get(collection, id);
  return r ? row2item(r) : null;
}
function clean(data) {
  const { id, position, updated_at, ...rest } = data;
  return rest;
}
function create(collection, data) {
  const max = db.prepare("SELECT COALESCE(MAX(position), -1) AS m FROM items WHERE collection = ?").get(collection).m;
  const r = db.prepare("INSERT INTO items (collection, position, data) VALUES (?, ?, ?)")
    .run(collection, max + 1, JSON.stringify(clean(data)));
  return get(collection, Number(r.lastInsertRowid));
}
function update(collection, id, data) {
  const r = db.prepare("UPDATE items SET data = ?, updated_at = datetime('now') WHERE collection = ? AND id = ?")
    .run(JSON.stringify(clean(data)), collection, id);
  return r.changes ? get(collection, id) : null;
}
function remove(collection, id) {
  return db.prepare("DELETE FROM items WHERE collection = ? AND id = ?").run(collection, id).changes > 0;
}
function reorder(collection, ids) {
  const stmt = db.prepare("UPDATE items SET position = ? WHERE collection = ? AND id = ?");
  db.exec("BEGIN");
  try { ids.forEach((id, i) => stmt.run(i, collection, id)); db.exec("COMMIT"); }
  catch (e) { db.exec("ROLLBACK"); throw e; }
}

// ---------- First-run seed ----------
function seed() {
  const has = db.prepare("SELECT COUNT(*) AS n FROM settings").get().n;
  if (has) return;
  db.exec("BEGIN");
  try {
    for (const [k, v] of Object.entries(defaults.settings)) setSetting(k, v);
    for (const [col, items] of Object.entries(defaults.collections)) items.forEach((it) => create(col, it));
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
seed();

module.exports = { db, getSetting, setSetting, list, get, create, update, remove, reorder, DATA_DIR };
