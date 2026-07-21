# Contributing to SplitLock

Thanks for helping build SplitLock — a Stellar/Soroban escrow split-payments dApp.
This guide explains how to pick up work and open a clean PR.

## Where the work lives

The repo is split into three layers, each with its own issue file:

| Layer      | Code                      | Issue file            | Stack                        |
|------------|---------------------------|-----------------------|------------------------------|
| Frontend   | `frontend/`               | `front-end.md`        | React + Vite + TypeScript    |
| Backend    | `backend/`, `scripts/`    | `back-end.md`         | Node, Express, SQLite, CLI   |
| Contracts  | `contracts/`              | `contracts.md`        | Rust, Soroban SDK            |

Grab any unchecked item from the relevant file. Each issue notes the file to
touch and a difficulty. **Everything is meant to be approachable** — you do not
need to be a Soroban expert to start.

## Quick start

```bash
# Contracts
cd contracts && cargo test
cargo build --target wasm32-unknown-unknown --release

# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && cp .env.example .env && npm run migrate
```

## Before you open a PR

1. Branch off `main`: `git checkout -b fix/issue-<n>`.
2. Keep changes small and focused — **one issue per PR**.
3. Run the checks locally:
   - Contracts: `cargo fmt --check && cargo clippy -- -D warnings && cargo test`
   - Frontend: `npm run typecheck && npm run lint && npm run build`
   - All: `./scripts/test.sh`
4. Add your name to the contributor table in `note.md` (what you worked on +
   one line on what you learned).
5. Reference the issue number in the PR description (e.g. "Closes FE-12").

## Important gotchas

- **Never remove the `ed25519-dalek` patch** in `contracts/Cargo.toml`. It
  works around a broken `ed25519-dalek 3.0.0` pulled by `soroban-env-host`.
- Frontend env comes from `VITE_*` vars (see `frontend/.env.example`).
- Backend env comes from its own `.env` (see `backend/.env.example`).
- The indexer is **read-only** and never signs transactions.

## Need help?

Open a discussion or ping a maintainer. Newcomer-friendly issues are tagged
`trivial` / `easy` in the issue files.
