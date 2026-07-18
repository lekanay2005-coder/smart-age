# Security Policy

## Supported Versions

SmartAge is early-stage software. The `main` branch is the only supported
version. Smart contracts live under `contracts/` and handle real (testnet)
value — treat them as experimental.

| Version | Supported |
|---------|-----------|
| main    | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability (e.g. a way to drain escrowed funds,
bypass auth, or block refunds), **please do not open a public issue.**

Instead, report it privately to the maintainer:

- Email: **dclife16q@gmail.com**
- Subject: `[SmartAge Security] <short description>`

You will get a response within **72 hours**. Once the issue is confirmed and a
fix is prepared, we will coordinate a disclosure timeline with you.

## Scope

In scope:
- `contracts/` — Soroban `Payments` contract logic, auth, and storage.
- `backend/` — indexer + API (read-only; still report injection/exposure bugs).
- `frontend/` — wallet interaction, signature handling.

Out of scope:
- Third-party dependencies (report upstream, but feel free to CC us).
- Misuse of the dApp on mainnet (the contract is not audited for production).

## Hardening notes for contributors

- Never remove the `ed25519-dalek` patch in `contracts/Cargo.toml`.
- The backend indexer is read-only and must never hold signing keys.
- Releasing funds always requires payer auth (`require_auth`).
