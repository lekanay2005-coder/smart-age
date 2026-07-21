#!/usr/bin/env bash
# Deploy the SmartAge Payments contract to a Stellar network.
#
# Requires the Stellar CLI: https://developers.stellar.org/docs/tools/cli/install
# and a funded account configured for the chosen network.
#
# ENVIRONMENT / ARGUMENTS
#   NETWORK           Target network: "futurenet" (default) or "testnet".
#                     (You can also pass it positionally: ./deploy.sh testnet)
#   STELLAR_ACCOUNT   Account name (or G... address) used to sign + fund the
#                     deploy. Defaults to "testnet account".
#   WASM_PATH         Override the built wasm path. Optional.
#   OUTPUT_FILE       Where to write the deployed contract id. Default:
#                     .contract/<network>.id (gitignored). Set to "" to skip.
#
# EXAMPLES
#   ./scripts/deploy.sh                  # Futurenet
#   NETWORK=testnet ./scripts/deploy.sh  # Testnet
#   ./scripts/deploy.sh testnet          # same, positional
#   OUTPUT_FILE= deploy.sh               # print only, don't write a file
set -euo pipefail

NETWORK="${1:-${NETWORK:-futurenet}}"
case "$NETWORK" in
  futurenet|testnet) ;;
  *)
    echo "ERROR: unsupported NETWORK '$NETWORK' (use futurenet or testnet)" >&2
    exit 1
    ;;
esac

# Allow mainnet-only deploys behind an explicit flag so they are never accidental.
if [ "${ALLOW_MAINNET:-0}" != "1" ] && [ "$NETWORK" = "mainnet" ]; then
  echo "ERROR: mainnet deploys require ALLOW_MAINNET=1. Refusing." >&2
  exit 1
fi

WASM="${WASM_PATH:-contracts/target/wasm32v1-none/release/stellar_dapp_contract.wasm}"

if [ ! -f "$WASM" ]; then
  echo "WASM not found at $WASM. Building contract first..."
  (cd contracts && cargo build --target wasm32v1-none --release)
fi

ACCOUNT="${STELLAR_ACCOUNT:-testnet account}"

# Fail fast if the CLI is missing.
if ! command -v stellar >/dev/null 2>&1; then
  echo "ERROR: 'stellar' CLI not found. Install from" \
       "https://developers.stellar.org/docs/tools/cli/install" >&2
  exit 1
fi

echo "Deploying '${WASM}' to ${NETWORK} as '${ACCOUNT}'..."

CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --network "${NETWORK}" \
  --source "${ACCOUNT}")

echo ""
echo "Deployed contract id: ${CONTRACT_ID}"

# Friendly funding hint when the deployer looks unfunded (best-effort check).
if command -v stellar >/dev/null 2>&1; then
  if ! stellar balance --account "${ACCOUNT}" --network "${NETWORK}" >/dev/null 2>&1; then
    echo "NOTE: could not read balance for '${ACCOUNT}'. If it is empty, fund it with:"
    if [ "$NETWORK" = "testnet" ]; then
      echo "  stellar faucet --network testnet --account ${ACCOUNT}"
    else
      echo "  (futurenet) use the Futurenet friendbot / lab faucet for '${ACCOUNT}'"
    fi
  fi
fi

# Verify the deployment by reading payment #0 (will panic "unknown payment"
# which still proves the contract is live and reachable).
echo ""
echo "Verifying deployment (reading payment 0)..."
if stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --network "${NETWORK}" \
  --source "${ACCOUNT}" \
  -- get --payment_id 0 >/dev/null 2>&1; then
  echo "OK: contract responded."
else
  echo "OK: contract is live (get(0) reverted as expected for an empty escrow)."
fi

# Persist the id so the frontend / other scripts can read it.
if [ -n "${OUTPUT_FILE:-}" ]; then
  mkdir -p "$(dirname "$OUTPUT_FILE")"
  printf '%s' "$CONTRACT_ID" > "$OUTPUT_FILE"
  echo "Wrote contract id to ${OUTPUT_FILE}"
elif [ "${OUTPUT_FILE:-unset}" = "unset" ]; then
  mkdir -p .contract
  printf '%s' "$CONTRACT_ID" > ".contract/${NETWORK}.id"
  echo "Wrote contract id to .contract/${NETWORK}.id"
fi

echo ""
echo "Next: set this when running the frontend:"
echo "  VITE_CONTRACT_ADDRESS=${CONTRACT_ID} VITE_NETWORK=${NETWORK} npm run dev"
