// Polls the Payments contract and stores every payment in SQLite.
// Scans ids 1..payment_count() in batches; safe to restart (upserts).

import { openDb, upsertPayment } from "./db.js";
import { paymentCount, getPayment } from "./stellar.js";
import { CONFIG } from "./config.js";

let cursor = 0; // next id to scan

function nowMs() {
  return Math.floor(Date.now() / 1000);
}

async function scanBatch(db) {
  const count = await paymentCount();
  if (count === 0) return;
  if (cursor === 0) cursor = 1;
  const end = Math.min(cursor + CONFIG.batchSize - 1, count);
  for (let id = cursor; id <= end; id++) {
    try {
      const p = await getPayment(id);
      if (p) {
        upsertPayment(db, {
          id: p.id,
          payer: p.payer,
          token: p.token,
          amount: p.amount,
          recipients: JSON.stringify(p.recipients),
          shares: JSON.stringify(p.shares),
          released: p.released ? 1 : 0,
          refunded: p.refunded ? 1 : 0,
          created_at: null,
          updated_at: nowMs(),
          first_seen_at: nowMs(),
        });
      }
    } catch (err) {
      console.error(`[indexer] get(${id}) failed:`, err.message);
    }
  }
  cursor = end + 1;
  if (cursor > count) cursor = 1; // wrap around to catch new settlements
}

export async function runIndexer() {
  if (!CONFIG.contractId) {
    console.error("[indexer] CONTRACT_ID is not set. Exiting.");
    process.exit(1);
  }
  const db = openDb();
  console.log(
    `[indexer] started for contract ${CONFIG.contractId} on ${CONFIG.network}`
  );
  // Initial backfill then poll.
  await scanBatch(db);
  setInterval(() => scanBatch(db).catch(console.error), CONFIG.pollIntervalMs);
}

// Allow running directly: node src/indexer.js
if (import.meta.url === `file://${process.argv[1]}`) {
  runIndexer();
}
