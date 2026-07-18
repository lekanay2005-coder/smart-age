#!/usr/bin/env bash
# Run every test suite in the repo: Soroban contract tests + frontend build/typecheck.
# Intended for local use and CI.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Contracts (cargo test)"
(cd contracts && cargo test)

echo "==> Frontend (typecheck + lint + build)"
(cd frontend && npm install && npm run typecheck && npm run lint && npm run build)

echo "==> Server (typecheck)"
(cd server && npm install && npm run typecheck)

echo "All tests passed."
