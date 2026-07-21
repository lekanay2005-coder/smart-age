# SmartAge — Stellar Escrow Split-Payments dApp

[![CI](https://github.com/your-org/smart-age/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/smart-age/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**What it does:** SmartAge is a Web3 dApp on **Stellar** that lets a payer lock
a token into an on-chain escrow and later either **split it proportionally
across multiple recipients** or **refund it** — a reusable "escrow
split-payment" primitive for payroll, group payments, dividends, reimbursements,
and any scenario where funds should be held safely before distribution.

> 🌱 New here? Start with [`note.md`](note.md) (onboarding) and grab a
> [good first issue](https://github.com/your-org/smart-age/labels/good%20first%20issue).
> The full task list lives in [`front-end.md`](front-end.md),
> [`back-end.md`](back-end.md), and [`contracts.md`](contracts.md).

## How it works

1. A **payer** creates a payment: they pick a Stellar asset (token contract),
   an amount, and a list of recipients with **shares** (e.g. 1:3 splits the
   amount 25% / 75%).
2. The full amount is pulled from the payer into the contract **escrow**
   immediately.
3. Later, the payer **releases** — the contract sends each recipient their
   share (the last recipient absorbs any rounding remainder so the full amount
   is always distributed) — or **refunds** the whole amount back to the payer.
4. Each payment is viewable by id, and a payer can list all their payments.

All value-moving actions require **payer authorization** (via Freighter) and a
payment can only be settled **once** (release and refund are mutually
exclusive).

## What's in this repo

```
smart-age/
├── contracts/        # Soroban smart contract (Rust)
│   ├── src/lib.rs    # Payments contract: create / release / refund / get / list / payment_count / stats
│   ├── src/test.rs   # 14 unit tests (escrow, refund, double-settle, guards, events)
│   └── Cargo.toml
├── frontend/         # React + Vite + TypeScript dApp
│   └── src/          # App, wallet hook (Freighter), contract client, shared types, error boundary
├── backend/          # Node indexer + REST API (read-only)
│   ├── src/          # config, db (SQLite), stellar RPC client, indexer, server
│   └── openapi.yaml  # API contract
├── scripts/          # deploy.sh, test.sh, invoke.sh helpers
├── .github/          # CI, issue/PR templates, dependabot
├── AGENTS.md         # guidance for AI coding agents
├── CONTRIBUTING.md   # how to pick up work + open a PR
├── SECURITY.md       # vulnerability reporting policy
└── README.md
```

### Smart contract (`contracts/`)

`Payments` (Soroban / `soroban-sdk` 23) is the on-chain core. It holds funds and
enforces the rules:

| Method | Auth | What it does |
|--------|------|--------------|
| `create(payer, token, recipients, shares, amount)` | payer | Pulls `amount` of `token` into escrow and records a proportional split. |
| `release(payment_id)` | payer | Sends each recipient their share; full amount always distributed. |
| `refund(payment_id)` | payer | Returns the full amount to the payer. |
| `get(payment_id)` | none  | Read-only view of a payment. |
| `list(payer)` | none  | All payment ids created by `payer` (powers "My Payments"). |
| `payment_count()` | none  | Total payments ever created (used by the indexer). |
| `stats()` | none  | `{ count, volume }` aggregate escrowed volume. |

**Validation & safety:** rejects empty/duplicate recipients, mismatched
recipient/share counts, non-positive amounts, zero shares, and more than 50
recipients. Release/refund are blocked once a payment is already settled.
Typed `#[contracterror]` codes make failures easy for clients to map. Emits
events on create/release/refund.

### Frontend (`frontend/`)

A React + Vite + TypeScript app using `@stellar/stellar-sdk` and the
**Freighter** browser wallet. It lets users:

- Connect Freighter (auto-detects, with an install link if missing).
- Create an escrow split-payment with live per-recipient **share %**, a
  "split equally" shortcut, and inline validation (address format, positive
  amount, unique recipients, payer ≠ recipient).
- Look up any payment by id and see its state with a colored **status badge**.
- Release or refund (signed via Freighter), with a refresh button and
  Stellar Expert links for transactions/contracts.
- View "My Payments" (newest first) and get friendly error messages mapped
  from contract failures.

### Backend (`backend/`)

A read-only off-chain service (no signing, no keys) that makes the dApp fast
and queryable:

- **Indexer** (`indexer.js`) polls `payment_count()` + `get(id)` and mirrors
  every payment into **SQLite** — so the UI/API don't hammer RPC on every load.
- **REST API** (`server.js`, Express) over the indexed data:
  - `GET /health` — liveness + active network/contract.
  - `GET /payments` — list, filterable by `payer` / `released`, paginated.
  - `GET /payments/:id` — single payment.
  - `GET /stats` — `{ count, volume, releasedCount }`.
  - CORS + per-IP rate limiting, configurable via env.
- See [`backend/openapi.yaml`](backend/openapi.yaml) for the full contract and
  [`backend/docs/operations.md`](backend/docs/operations.md) for the
  deploy→invoke flow and incident runbook.

## Quick start

### Contracts
```bash
cd contracts
cargo build --target wasm32v1-none --release
cargo test
```
> Note: `soroban-env-host 23.0.1` pulls a broken `ed25519-dalek 3.0.0`.
> `Cargo.toml` pins a working `ed25519-dalek` via a `[patch.crates-io]` git
> source. Keep that patch when updating dependencies.
>
> WASM output: `contracts/target/wasm32v1-none/release/stellar_dapp_contract.wasm`

### Frontend
```bash
cd frontend
npm install
VITE_CONTRACT_ADDRESS=<contract_id> VITE_NETWORK=futurenet npm run dev
```
Supported `VITE_NETWORK` values: `futurenet` (default), `testnet`.

### Backend
```bash
cd backend
npm install
cp .env.example .env        # set CONTRACT_ID + BACKEND_NETWORK
npm run migrate             # create the SQLite DB
npm run index               # start indexing (in foreground)
# in another shell:
npm start                   # start the REST API on :3000
```

### Deploy
Requires the [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install)
and a funded test account.
```bash
./scripts/deploy.sh                 # Futurenet
NETWORK=testnet ./scripts/deploy.sh # Testnet
```
The script builds the wasm, deploys, verifies the contract is live, prints the
contract id, and writes it to `.contract/<network>.id`.

## End-to-end flow
1. Deploy the contract → get a contract id.
2. Configure `VITE_CONTRACT_ADDRESS` (and `CONTRACT_ID` for the backend).
3. Open the dApp, connect Freighter (a Futurenet/Testnet account holding the token).
4. Create a payment → funds are held in escrow.
5. Release (split to recipients) or Refund (back to payer).
6. The indexer picks up the payment and serves it via the REST API.

## Tech stack
- **Contracts:** Rust, Soroban SDK 27, `wasm32v1-none`
- **Frontend:** React 18, Vite 5, TypeScript, `@stellar/stellar-sdk` 13
- **Wallet:** Freighter
- **Backend:** Node 20, Express, SQLite (`better-sqlite3`), `@stellar/stellar-sdk`
- **CI:** GitHub Actions (contract fmt/clippy/test/wasm, frontend typecheck/build, `cargo audit` + `npm audit`)
- **Tooling:** Stellar CLI 27

## Contributing
SmartAge is open source and welcomes contributors of all levels. Pick any
unchecked item from the issue tracker files and open a PR:

- [`front-end.md`](front-end.md) — UI/UX, wallet, a11y, tooling
- [`back-end.md`](back-end.md) — deploy scripts, indexer/API, CI, config
- [`contracts.md`](contracts.md) — contract logic, storage, tests

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow, and
[`SECURITY.md`](SECURITY.md) for how to report vulnerabilities. All
contributions are released under the [MIT License](LICENSE).

## License
[MIT](LICENSE) © 2026 Adebanjo Ayo
