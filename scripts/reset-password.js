// Reset (or create) the admin login from the command line:
//   npm run reset-password -- you@example.com "a-new-strong-password"
const { db } = require("../src/db");
const { hashPassword } = require("../src/auth");

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error('Usage: npm run reset-password -- you@example.com "new-password (10+ characters)"');
  process.exit(1);
}
const e = email.toLowerCase().trim();
const hash = hashPassword(password);
const user = db.prepare("SELECT id FROM users ORDER BY id LIMIT 1").get();
if (user) db.prepare("UPDATE users SET email = ?, password_hash = ? WHERE id = ?").run(e, hash, user.id);
else db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(e, hash);
db.prepare("DELETE FROM sessions").run();
console.log(`Admin login updated: ${e}. All sessions were signed out.`);
