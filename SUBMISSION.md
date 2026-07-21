# SplitLock — Drips Wave Stellar Submission

> **Project status:** Confirmed not already on the approved list (checked Jul 2026).

## Project Description

SplitLock is a proportional split-payment escrow dApp on Stellar. A payer locks tokens into a Soroban smart contract and later splits them across multiple recipients by share, or refunds the full amount. Unlike single-recipient escrow services, SplitLock handles proportional distribution — the contract calculates each recipient's share using integer math, with the last recipient absorbing any rounding remainder so the full amount is always distributed.

Use cases: payroll with multiple payees, group-purchase payouts, dividend distributions, reimbursements to multiple parties, and any scenario where funds should be held safely before proportional distribution.

The project is live on Stellar Futurenet/Testnet: create an escrow, add recipients with custom share weights, release when ready, or set a deadline for auto-refund.

## Supporting Links

| Resource | URL |
|----------|-----|
| Live app | *(add after deploy)* |
| Smart contract repo | https://github.com/lekanay2005-coder/splitlock-contract |
| App (frontend + backend) repo | https://github.com/lekanay2005-coder/splitlock-app |
| Contract on-chain (Futurenet) | *(add after deploy)* |
| Contract on-chain (Testnet) | *(add after deploy)* |
| Documentation site | *(add after deploy)* |
| Demo video | *(add after recording)* |

## Repo Relationship

SplitLock is split into two repositories for the Drips Wave program:

1. **splitlock-contract** — Pure Rust Soroban workspace containing the `Payments` smart contract. This is the on-chain core: create, release, refund, cancel, get, list, payment_count, and stats. It has its own CI (fmt + clippy + test + wasm build), issue tracker, and release cycle. The wasm artifact is ~86KB.

2. **splitlock-app** — The off-chain application layer: a React + Vite + TypeScript frontend (Freighter wallet), an Express REST API, a SQLite-based contract indexer, a unified server that can serve both, and deployment scripts. It has independent CI (typecheck + lint + build for both frontend and backend).

The two repos are loosely coupled through the contract interface. The contract defines the on-chain data model and auth rules; the app layer reads and writes through Soroban RPC. This split maximizes Wave program surface area (two independent contributable codebases) while keeping maintainer overhead low.

## Planned Issues

Issues are created in both repos with commit-style titles, acceptance criteria, and tech-stack tags:

### splitlock-contract (2 open issues)
- **test: add unit test for refund edge cases** — double-settle guard, pre-deadline auth rejection, post-deadline anyone-callable
- **feat: add list_by_recipient lookup method** — recipient-indexed payment lookup covering current blind spot

### splitlock-app (3 open issues)
- **feat: add input validation in create form matching contract guards** — mirror all contract validation rules client-side
- **feat: add loading/pending state to release/refund buttons** — spinner + disable while tx pending
- **feat: add network switcher dropdown in UI** — switch between futurenet/testnet without editing env vars

Additional issues covering mobile responsiveness, error boundaries, dark mode, i18n, and accessibility are documented in `note.md` (52 issues across all difficulty levels).

## Track Record

- Smart contract: 18 unit tests, all passing. Zero clippy warnings. Wasm ≤ 200KB.
- Frontend: TypeScript strict, ESLint + Prettier, production build passing.
- Backend: type-checked, read-only (no signing keys), rate-limited REST API with OpenAPI spec.
- CI: GitHub Actions on both repos — contract tests, frontend typecheck/build, dependency audits.
- Security: SECURITY.md with disclosure contact, 72-hour response SLA.
- Documentation: CONTRIBUTING.md, AGENTS.md, READMEs for both repos, note.md with 52 onboarding issues.
- Two repos with independent release tags (v0.1.0).
