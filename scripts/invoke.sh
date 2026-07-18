#!/usr/bin/env bash
# Helper to invoke the deployed Payments contract via the Stellar CLI.
# Usage:
#   ./scripts/invoke.sh <method> [args...]
# Examples:
#   ./scripts/invoke.sh get 1
#   ./scripts/invoke.sh list GABC...PAYER
#   ./scripts/invoke.sh payment_count
#   ./scripts/invoke.sh stats
#
# Requires CONTRACT_ID (deployed id) and STELLAR_ACCOUNT in the environment.
set -euo pipefail

NETWORK="${NETWORK:-futurenet}"
CONTRACT_ID="${CONTRACT_ID:-${VITE_CONTRACT_ADDRESS:-}}"
ACCOUNT="${STELLAR_ACCOUNT:-testnet account}"

if [ -z "$CONTRACT_ID" ]; then
  echo "ERROR: set CONTRACT_ID (or VITE_CONTRACT_ADDRESS)." >&2
  exit 1
fi

METHOD="${1:?method required}"; shift || true

# Pass remaining args positionally to `stellar contract invoke`.
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --source "$ACCOUNT" \
  -- "$METHOD" "$@"
