# AGENTS.md — For AI Engineers & Coding Agents

This file helps automated agents work on SplitLock safely and productively.

## What this project is

A Stellar/Soroban **escrow split-payments** dApp:
- `contracts/` — Rust Soroban contract (`Payments`): create/release/refund/get/list.
- `frontend/` — React + Vite + TypeScript dApp using Freighter.
- `server/` — **Unified main server**: serves the built frontend, REST API (`/api/*`), and runs the contract indexer — all in one process.
- `scripts/` — deploy + test helpers.

## Build & test (run before finishing any task)

```bash
# Contracts
cd contracts && cargo fmt --check && cargo clippy -- -D warnings && cargo test
cargo build --target wasm32v1-none --release

# Frontend
cd frontend && npm install && npm run typecheck && npm run lint && npm run build

# Server (build frontend first)
cd server && npm install && npm start

# All together
./scripts/test.sh
```

## Critical gotchas (DO NOT break these)

1. **Never remove the `ed25519-dalek` patch** in `contracts/Cargo.toml`. It
   works around a broken `ed25519-dalek 3.0.0` pulled by `soroban-env-host`.
2. The frontend reads env from `VITE_*` vars (see `frontend/.env.example`).
3. The server is **read-only** — it must never sign transactions or hold keys.
4. Keep changes small: **one issue per PR**.

## Where to find work

See `note.md` (onboarding / starter issues) and `CONTRIBUTING.md` (PR flow).

## Contract method reference

| Method | Auth | Notes |
|--------|------|-------|
| `create(payer, token, recipients, shares, amount)` | payer | pulls funds into escrow |
| `release(payment_id)` | payer | splits to recipients by share |
| `refund(payment_id)` | payer | returns full amount to payer |
| `get(payment_id)` | none | view |
| `list(payer)` | none | ids created by payer |
| `payment_count()` | none | total payments (used by indexer) |
| `stats()` | none | `{ count, volume }` |

Validation guards: empty/unequal recipients, non-positive amount, zero shares,
and double-settling. Mirror these rules on the frontend.

## Suggested workflow for an agent

1. Read the relevant issue from the tracker file.
2. Make the change with tests/docs.
3. Run the checks above.
4. Report the diff summary and which issue it closes.
