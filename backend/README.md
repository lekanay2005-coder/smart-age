# SmartAge Backend

Off-chain services for the SmartAge escrow split-payments dApp. This backend
**does not** replace the Soroban contract (see `../contracts`) or the React UI
(see `../frontend`). It adds the supporting infrastructure those need:

- **`scripts/deploy.sh`** — deploys the contract and writes its id to disk.
- **`scripts/test.sh`** — runs every test suite in the repo.
- **`Makefile`** — common dev tasks.
- **`indexer.js`** — polls the deployed `Payments` contract and mirrors every
  payment into a local SQLite database (so the frontend/API don't hammer RPC).
- **`server.js`** — a small REST API over the indexed data.
- **`.github/workflows/ci.yml`** — CI for contracts + frontend + audits.

## Layout

```
backend/
├── package.json        # deps: express, better-sqlite3, @stellar/stellar-sdk
├── .env.example        # copy to .env and fill in
└── src/
    ├── config.js       # env-driven config + network resolution
    ├── db.js           # SQLite connection, migrations, queries
    ├── stellar.js      # read-only RPC client for the Payments contract
    ├── indexer.js      # poll loop that scans payment ids 1..count
    └── server.js       # Express REST API
```

## Setup

```bash
cd backend
npm install
cp .env.example .env      # set CONTRACT_ID + BACKEND_NETWORK
npm run migrate           # create the SQLite DB
npm run index             # start indexing in the foreground
# in another shell:
npm start                 # start the REST API on :3000
```

## REST API

| Method | Path            | Description                                  |
|--------|-----------------|----------------------------------------------|
| GET    | `/health`       | Liveness + active network/contract.          |
| GET    | `/payments`     | List payments. Query: `payer`, `released`, `limit`, `offset`. |
| GET    | `/payments/:id` | Single payment by id.                        |
| GET    | `/stats`        | `{ count, volume, releasedCount }`.          |

CORS and a per-IP rate limit are configurable via env (see `.env.example`).

## How indexing works

The contract exposes `payment_count()` (total payments) and `get(id)`. The
indexer scans ids `1..count` in batches of `BATCH_SIZE`, upserting each into
SQLite. After reaching the end it wraps around so newly settled payments
(released/refunded) are picked up on the next pass. This is a polling design;
once the contract emits events (see `contracts.md` C-17) the indexer can switch
to an event-driven model.

## Notes

- The indexer is read-only; it never signs transactions.
- `amount` is stored as text to avoid i128 precision loss.
- `.env`, `data/`, and `node_modules/` are gitignored.
