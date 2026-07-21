# SplitLock — Hosting & Service Topology

## Diagram

```
User (Browser)
    │
    ├──▶ Freighter (Wallet) ──▶ Soroban RPC (Futurenet/Testnet)
    │                              │
    │                              └──▶ SplitLock Contract (on-chain)
    │
    └──▶ Vercel (Frontend) ──▶ Render (API Server)
                                  │
                                  ├──▶ SQLite (db.splitlock.internal)
                                  │
                                  └──▶ Soroban RPC (read-only polling)
```

## Service Breakdown

### Frontend → Vercel

- **Platform:** Vercel (purpose-built for static frontends)
- **Build command:** `cd frontend && npm install && npm run build`
- **Output directory:** `frontend/dist/`
- **Environment variables:**
  - `VITE_CONTRACT_ADDRESS` = deployed contract id
  - `VITE_NETWORK` = `futurenet` (or `testnet`)
- **Domains:** `splitlock.vercel.app` → custom domain `app.splitlock.io`
- **Notes:** Vite SPA with client-side routing; `vercel.json` rewrites all paths to `index.html`

### API/Indexer Server → Render

- **Platform:** Render (Web Service — long-running stateful process)
- **Runtime:** Node 20
- **Build command:** `cd server && npm install`
- **Start command:** `node server/src/index.js`
- **Health check:** `GET /health`
- **Environment variables:**
  - `CONTRACT_ID` = deployed contract id
  - `BACKEND_NETWORK` = `futurenet`
  - `PORT` = `10000` (Render internal port)
  - `FRONTEND_DIR` = (empty — frontend served by Vercel)
  - `DB_FILE` = `/var/data/splitlock.db`
  - `RATE_LIMIT` = `100`
- **Disk:** Persistent disk mounted at `/var/data` for SQLite
- **Domains:** `splitlock-api.onrender.com` → custom API domain

### Database → Same region as Render

- **Type:** SQLite (file-based, no separate DB service)
- **Location:** Persistent disk on Render (`/var/data/splitlock.db`)
- **Connection:** Internal — no network exposure, only the server process connects
- **Backup:** Render snapshot + weekly `sqlite3 .backup` to external storage

### Soroban RPC (External)

- **Provider:** Public Futurenet/Testnet RPC endpoints (or custom RPC provider)
- **Usage:** Frontend sends writes via Freighter → Soroban RPC. Server polls via RPC for indexing.
- **No API key required** for public testnets

## Failure Tracing

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Frontend shows no data | Indexer not started or crashed | Check Render logs; restart service |
| Writes fail | Freighter not connected or wrong network | User must install/switch Freighter |
| API returns stale data | Indexer polling interval too high | Reduce `POLL_INTERVAL_MS` |
| Frontend hitting localhost in prod | `VITE_CONTRACT_ADDRESS` not set or wrong | Check Vercel env vars |
| Contract call fails | Contract not deployed at that id | Verify `CONTRACT_ID` in both envs |

## Cost Estimate (per month)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Render | Starter | $7–$15 |
| SQLite disk | Included with Render | $0 |
| RPC | Public testnet | Free |
| **Total** | | **$7–$15/mo** |
