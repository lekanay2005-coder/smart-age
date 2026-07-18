// SQLite access layer with a tiny migration step.
// Creates the `payments` table on first run. Run `npm run migrate` to set up.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";

function ensureDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function openDb() {
  ensureDir(CONFIG.dbFile);
  const db = new Database(CONFIG.dbFile);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id            INTEGER PRIMARY KEY,
      payer         TEXT NOT NULL,
      token         TEXT NOT NULL,
      amount        TEXT NOT NULL,
      recipients    TEXT NOT NULL,
      shares        TEXT NOT NULL,
      released      INTEGER NOT NULL DEFAULT 0,
      refunded      INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER,
      updated_at    INTEGER,
      first_seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer);
    CREATE INDEX IF NOT EXISTS idx_payments_released ON payments(released);
  `);
}

// Insert or update a payment row. `amount`/`recipients`/`shares` are stored as
// text to avoid precision loss / JSON parsing on every read.
export function upsertPayment(db, p) {
  const stmt = db.prepare(`
    INSERT INTO payments
      (id, payer, token, amount, recipients, shares, released, refunded, created_at, updated_at, first_seen_at)
    VALUES
      (@id, @payer, @token, @amount, @recipients, @shares, @released, @refunded, @created_at, @updated_at, @first_seen_at)
    ON CONFLICT(id) DO UPDATE SET
      payer=excluded.payer,
      token=excluded.token,
      amount=excluded.amount,
      recipients=excluded.recipients,
      shares=excluded.shares,
      released=excluded.released,
      refunded=excluded.refunded,
      updated_at=excluded.updated_at
  `);
  stmt.run(p);
}

export function getPaymentRow(db, id) {
  return db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
}

export function listPayments(db, { payer, released, limit, offset }) {
  const where = [];
  const params = [];
  if (payer) {
    where.push("payer = ?");
    params.push(payer);
  }
  if (typeof released === "boolean") {
    where.push("released = ?");
    params.push(released ? 1 : 0);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT * FROM payments ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM payments ${clause}`)
    .get(...params);
  return { rows, total };
}

export function stats(db) {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(CAST(amount AS INTEGER)), 0) AS volume,
         SUM(released) AS released_count
       FROM payments`
    )
    .get();
  return {
    count: row.count,
    volume: String(row.volume),
    releasedCount: row.released_count,
  };
}
