# SplitLock — Documentation Site Generation Prompt

## Purpose

Generate a documentation site for SplitLock using a static site generator (e.g., Docusaurus, VitePress, or Astro). The doc site is separate from the README — it lives at `docs.splitlock.io`.

## Site Structure

```
docs.splitlock.io/
├── index.md              # Introduction with real cited figures
├── protocol/
│   ├── mechanics.md      # Protocol mechanics & state machine
│   └── math.md           # Worked numbers: split calculation, rounding
├── smart-contracts/
│   └── reference.md      # Full contract reference (all 8 methods)
├── guides/
│   ├── payer.md          # How to create/release/refund a payment
│   └── recipient.md      # How to receive funds
├── developers/
│   ├── setup.md          # Env setup, prerequisites, install
│   ├── sdk.md            # SDK/API reference with real examples
│   ├── deployment.md     # Deploy contract, configure frontend/backend
│   └── indexer.md         # How the indexer works
└── contributing.md       # Same as CONTRIBUTING.md
```

## Content Rules (strict)

1. **Plain writing** — no "seamlessly," "robust," "powerful," "revolutionary"
2. **Real figures** — cite actual on-chain data where available (e.g., "SplitLock processes N payments, representing XLM escrowed")
3. **State machine** — show the exact payment state transitions: `Created → Released | Refunded | Cancelled`
4. **Worked math** — show: "For a payment of 1000 USDC with shares [1,3]: r1 gets 250, r2 gets 750. Last recipient absorbs rounding."
5. **Contract reference** — every method with params, return types, auth, events
6. **Developer guide** — real code examples for both `@stellar/stellar-sdk` read/write calls
7. **No generated placeholders** — every section must have real content

## Tech Stack Recommendation

- **Generator:** VitePress (TypeScript-native, works with the existing Vite setup)
- **Theme:** Default VitePress theme (clean, minimal)
- **Deployment:** Vercel (same org as frontend)
- **Domain:** `docs.splitlock.io` → CNAME to Vercel

## Writing Style

- Active voice. "The payer creates a payment" not "A payment is created by the payer."
- One idea per paragraph.
- Code examples are runnable (or clearly marked if they need env vars).
- Every page has a "related" section at the bottom linking to relevant other pages.
