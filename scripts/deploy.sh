#!/usr/bin/env bash
# Deploy the Payments contract to a Stellar test network (Futurenet by default).
# Requires the Stellar CLI: https://developers.stellar.org/docs/tools/cli/install
#
# Usage:
#   ./scripts/deploy.sh             # Futurenet
#   NETWORK=testnet ./scripts/deploy.sh
set -euo pipefail

NETWORK="${NETWORK:-futurenet}"
WASM="contracts/target/wasm32-unknown-unknown/release/stellar_dapp_contract.wasm"

if [ ! -f "$WASM" ]; then
  echo "WASM not found. Building contract first..."
  (cd contracts && cargo build --target wasm32-unknown-unknown --release)
fi

echo "Deploying to ${NETWORK}..."
stellar contract deploy \
  --wasm "$WASM" \
  --network "${NETWORK}" \
  --source "${STELLAR_ACCOUNT:-testnet account}"

echo ""
echo "Copy the contract id above and set it when running the frontend:"
echo "  VITE_CONTRACT_ADDRESS=<contract_id> VITE_NETWORK=${NETWORK} npm run dev"
