# SmartAge — Stellar Escrow Split-Payments dApp

A Web3 dApp on **Stellar** (Soroban smart contracts + React frontend) for
**escrowed split payments** — a DeFi payments primitive where a payer locks an
asset into a contract and later releases it to multiple recipients by share, or
refunds it.

## Architecture

```
smart-age/
├── contracts/        # Soroban smart contract (Rust)
│   ├── src/lib.rs    # Payments contract: create / release / refund / get
│   ├── src/test.rs   # Unit tests (escrow release, refund, double-settle guard)
│   └── Cargo.toml
├── frontend/        # React + Vite dApp
│   ├── src/          # App, wallet hook (Freighter), contract client
│   └── package.json
├── scripts/          # deploy.sh (Stellar CLI deploy helper)
└── README.md
```

## Smart contract

`Payments` (Soroban / `soroban-sdk` 23):

| Method | Auth | Description |
|--------|------|-------------|
| `create(payer, token, recipients, shares, amount)` | payer | Locks `amount` of `token` into escrow, records a proportional split. |
| `release(payment_id)` | payer | Distributes funds to recipients by share (last recipient absorbs rounding). |
| `refund(payment_id)` | payer | Returns the full amount to the payer. |
| `get(payment_id)` | none  | Read-only view of a payment. |

Validation guards against empty/unequal recipients, non-positive amounts,
zero shares, and double-settling.

### Build & test

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test
```

> Note: `soroban-env-host 23.0.1` pulls a broken `ed25519-dalek 3.0.0`.
> `Cargo.toml` pins a working `ed25519-dalek` via a `[patch.crates-io]` git source.
> Keep that patch when updating dependencies.

WASM output: `contracts/target/wasm32-unknown-unknown/release/stellar_dapp_contract.wasm`

## Frontend

React + Vite app using `@stellar/stellar-sdk` and the **Freighter** browser
wallet. Features:

- Connect Freighter (auto-detect + connect button)
- Create an escrow split-payment (token, amount, N recipients + shares)
- Look up any payment by id and see its state
- Release or refund an escrowed payment (signed via Freighter)

### Run

```bash
cd frontend
npm install
npm run dev
```

Set the deployed contract address and network via env vars (or a `.env`):

```bash
VITE_CONTRACT_ADDRESS=<contract_id> VITE_NETWORK=futurenet npm run dev
```

Supported `VITE_NETWORK` values: `futurenet` (default), `testnet`.

## Deploy

Requires the [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install)
and a funded test account.

```bash
# build the wasm first (see above)
./scripts/deploy.sh                 # Futurenet
NETWORK=testnet ./scripts/deploy.sh # Testnet
```

The script prints the contract id — paste it into `VITE_CONTRACT_ADDRESS`.

## End-to-end flow

1. Deploy the contract → get a contract id.
2. Configure `VITE_CONTRACT_ADDRESS`.
3. Open the dApp, connect Freighter (Futurenet/Testnet account with the token).
4. Create a payment → it is held in escrow.
5. Release (split to recipients) or Refund (back to payer).

## Tech stack

- **Contracts:** Rust, Soroban SDK 23, `wasm32-unknown-unknown`
- **Frontend:** React 18, Vite 5, TypeScript, `@stellar/stellar-sdk` 13
- **Wallet:** Freighter
- **Tooling:** Stellar CLI 27
