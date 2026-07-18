import express from "express";
import { getPaymentRow, listPayments, stats } from "./db.js";
import { CONFIG } from "./config.js";

export function buildApi(db) {
  const app = express.Router();

  app.use(express.json());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (CONFIG.corsOrigins.length === 0 || (origin && CONFIG.corsOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  if (CONFIG.rateLimit > 0) {
    const hits = new Map();
    setInterval(() => hits.clear(), 15 * 60 * 1000).unref();
    app.use((req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress;
      const n = (hits.get(ip) || 0) + 1;
      hits.set(ip, n);
      if (n > CONFIG.rateLimit) {
        return res.status(429).json({ error: "rate limited" });
      }
      next();
    });
  }

  app.get("/payments", (req, res) => {
    const payer = typeof req.query.payer === "string" ? req.query.payer : undefined;
    let released;
    if (req.query.released === "true") released = true;
    else if (req.query.released === "false") released = false;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const { rows, total } = listPayments(db, { payer, released, limit, offset });
    res.json({ total, limit, offset, rows: rows.map(normalize) });
  });

  app.get("/payments/:id", (req, res) => {
    const row = getPaymentRow(db, Number(req.params.id));
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(normalize(row));
  });

  app.get("/stats", (req, res) => {
    res.json(stats(db));
  });

  return app;
}

function normalize(row) {
  return {
    id: row.id,
    payer: row.payer,
    token: row.token,
    amount: row.amount,
    recipients: safeJson(row.recipients, []),
    shares: safeJson(row.shares, []),
    released: Boolean(row.released),
    refunded: Boolean(row.refunded),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    firstSeenAt: row.first_seen_at,
  };
}

function safeJson(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
