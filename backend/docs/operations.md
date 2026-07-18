# Backend Operations & Funding

## Getting testnet funds (friendbot)

The deployer account must hold XLM to pay fees and to actually escrow tokens.
On **testnet**, fund it instantly with the Stellar friendbot:

```bash
# Replace with your account's G... address.
curl "https://friendbot.stellar.org/?addr=GYOUR_ACCOUNT_ADDRESS"
```

On **futurenet**, friendbot is not available via that URL — use the
Stellar Lab (https://lab.stellar.org) "Create account" tool on the Futurenet
network, or `stellar faucet` if your CLI version supports it:

```bash
stellar faucet --network futurenet --account <your-account>
```

`scripts/deploy.sh` prints a hint automatically if it cannot read the
deployer's balance.

## Deploy → invoke flow (sequence)

```
developer                stellar CLI              contract (RPC)
   |                         |                         |
   |-- build wasm --------->|                         |
   |-- deploy --------------|------------------------>|  register
   |<------------------------ contract id ------------|
   |-- write .contract/<net>.id                       |
   |                         |                         |
   |-- invoke create --------|------------------------>|  pull funds to escrow
   |-- invoke release -------|------------------------>|  split to recipients
   |-- invoke refund --------|------------------------>|  return to payer
   |                                                  |
   |  indexer polls payment_count() + get(id)  <-----|
   |  REST API /payments, /stats <-------------------|
```

The indexer never signs transactions; it only reads on-chain state and mirrors
it into SQLite for fast queries.

## Incident runbook (quick)

- **Deploy failed / contract id not printed:** check `stellar --version`,
  confirm `STELLAR_ACCOUNT` exists and is funded (see above), retry.
- **Funds stuck (released/refunded reverted):** the contract enforces
  `require_auth` on the payer and blocks double-settling. A reverted release
  leaves the escrow intact; retry with the correct payer account connected in
  Freighter.
- **Indexer out of sync:** restart `npm run index`; it re-scans and upserts
  from id 1.
