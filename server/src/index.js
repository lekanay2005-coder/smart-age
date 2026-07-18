import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";
import { runIndexer } from "./indexer.js";
import { buildApi } from "./api.js";
import { CONFIG } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Open database
  const db = openDb();

  // Start indexer (background)
  runIndexer().catch(console.error);

  // Build Express app
  const app = express();

  // REST API under /api
  app.use("/api", buildApi(db));

  // Health endpoint (at root level too)
  app.get("/health", (req, res) => {
    res.json({
      ok: true,
      network: CONFIG.network,
      contractId: CONFIG.contractId,
    });
  });

  // Serve built frontend
  const frontendDir = path.resolve(__dirname, CONFIG.frontendDir);
  const indexHtml = path.join(frontendDir, "index.html");

  if (fs.existsSync(indexHtml)) {
    app.use(express.static(frontendDir));
    // SPA fallback: any non-API route serves index.html
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) return;
      res.sendFile(indexHtml);
    });
    console.log(`[server] serving frontend from ${frontendDir}`);
  } else {
    console.log(
      `[server] frontend not found at ${frontendDir} — build it first with: cd frontend && npm run build`
    );
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) return;
      res.status(200).type("html").send(`
        <html><body style="background:#020408;color:#22e694;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100dvh;flex-direction:column;gap:8px;text-align:center;padding:20px">
          <h1>SmartAge</h1>
          <p style="color:#6c8a9e">Server is running.</p>
          <p style="color:#6c8a9e;font-size:13px">Build the frontend with <code>cd frontend && npm run build</code> then restart.</p>
          <p style="color:#6c8a9e;font-size:13px">API: <a href="/api/stats" style="color:#38bdf8">/api/stats</a></p>
        </body></html>
      `);
    });
  }

  app.listen(CONFIG.port, () => {
    console.log(`[server] SmartAge unified server running on :${CONFIG.port}`);
    console.log(`[server] network=${CONFIG.network} contract=${CONFIG.contractId || "(not set)"}`);
  });
}

main().catch((err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
