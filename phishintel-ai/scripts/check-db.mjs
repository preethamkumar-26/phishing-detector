import { DatabaseSync } from "node:sqlite";

for (const f of [".data/phishintel.db", ".data/phishguard.db"]) {
  try {
    const db = new DatabaseSync(f);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(f, "tables:", tables.map(t => t.name));
    if (tables.some(t => t.name === "users")) {
      const users = db.prepare("SELECT id, email, name, designation FROM users").all();
      console.log(f, "users:", users);
    }
  } catch (e) {
    console.log(f, "error:", e.message);
  }
}
