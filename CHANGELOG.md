# Changelog

All notable changes to SmartAge are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Soroban `Payments` contract: `create` / `release` / `refund` / `get` / `list`.
- React + Vite frontend with Freighter wallet support and "My Payments" view.
- `scripts/deploy.sh` contract deployment helper (futurenet / testnet).
- Off-chain backend: payment indexer + REST API (`backend/`).
- CI workflow (contracts fmt/clippy/test/wasm, frontend typecheck/build, audits).
- Issue tracker files: `front-end.md`, `back-end.md`, `contracts.md`.
- Contributor docs: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
  `LICENSE`.

### Changed
- `contract.ts` now uses `rpc.assembleTransaction` for correct submit flow.
- Frontend config validates `VITE_CONTRACT_ADDRESS` / `VITE_NETWORK` at load.

### Contract API
- Added `payment_count()` and `stats()` read views (used by the indexer).
