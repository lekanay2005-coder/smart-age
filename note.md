# Note — SmartAge Contributor Onboarding

> **Purpose:** A starter list of issues and tasks for incoming AI-engineers and
> human contributors. Everything here is **beginner-friendly** — you do not need
> to be a Soroban/Rust expert to pick one up. Each item explains what to do, why
> it matters, and roughly how hard it is.
>
> Goal: grow the contributor list, help newcomers learn, and keep the project
> moving. Grab any unchecked item, open a PR, and add your name below.

## How to get started (for anyone)
1. Read `README.md` (architecture, build, deploy).
2. Install tooling: Rust + `wasm32-unknown-unknown`, Node 18+, Stellar CLI.
3. Build the contract: `cd contracts && cargo build --target wasm32-unknown-unknown --release`.
4. Run the frontend: `cd frontend && npm install && npm run dev`.
5. Pick an issue below, branch off `main`, and open a PR.

**Gotcha:** `soroban-env-host 23.0.1` pulls a broken `ed25519-dalek 3.0.0`.
The `Cargo.toml` pins a working version via `[patch.crates-io]`. **Keep that
patch** or the build breaks.

---

## Starter issues (anyone can do)

- [ ] **#1 Write a "How to run" quickstart for non-devs**
  - Add a short `QUICKSTART.md` (or section in README) with copy-paste commands.
  - Why: lowers the barrier for new contributors. Difficulty: trivial.

- [ ] **#2 Add input validation in the frontend create form**
  - `frontend/src/App.tsx` lets you submit a payment with 0 recipients or empty
    shares. Add client-side checks that match the contract's guards
    (non-positive amount, zero shares, unequal recipients/shares length).
  - Why: nicer UX, fewer failed tx. Difficulty: easy.

- [ ] **#3 Show human-readable errors from the contract**
  - Contract reverts are shown as raw errors in the UI. Map common contract
    error messages to friendly text. File: `frontend/src/contract.ts`.
  - Why: better UX. Difficulty: easy.

- [ ] **#4 Add a "copy address" button on payment/recipient views**
  - Small UI helper so users can copy Stellar addresses. File: `frontend/src/App.tsx`.
  - Why: quality-of-life. Difficulty: easy.

- [ ] **#5 Add unit tests for `refund` edge cases**
  - `contracts/src/test.rs` has release/refund tests but not "refund after
    partial state" coverage. Add cases (e.g. refund of already-released payment
    should fail via double-settle guard).
  - Why: safety. Difficulty: easy-medium.

- [ ] **#6 Add a loading / pending state to buttons**
  - Release/Refund/Create fire and the button shows nothing until tx confirms.
    Add a spinner/disabled state while waiting on Freighter. File: `useWallet.ts` / `App.tsx`.
  - Why: prevents double-clicks. Difficulty: easy.

- [ ] **#7 Document the contract method signatures with examples**
  - Add a `## Examples` section to README showing a `create` -> `release` flow
    with sample args. Difficulty: easy.

- [ ] **#8 Add network switcher in the UI**
  - App only supports `futurenet`/`testnet` via env. Add an in-app dropdown to
    switch networks without editing `.env`. File: `frontend/src/config.ts`.
  - Why: usability. Difficulty: medium.

- [ ] **#9 Add a "My Payments" empty-state message**
  - `list(payer)` returns nothing when empty; UI should show a friendly
    "No payments yet" message instead of a blank list. File: `App.tsx`.
  - Why: polish. Difficulty: easy.

- [ ] **#10 Add GitHub Actions CI**
  - Run `cargo test` (contracts) and `npm run build` (frontend) on PRs.
  - Why: protects main branch. Difficulty: medium.

- [ ] **#11 Improve error handling when Freighter is not installed**
  - Currently connecting without Freighter may throw an unclear error. Detect
    missing wallet and show install link. File: `frontend/src/useWallet.ts`.
  - Why: onboarding. Difficulty: easy.

- [ ] **#12 Add a short architecture diagram (ASCII or image)**
  - Visualize contract <-> frontend <-> Freighter flow for newcomers.
  - Why: comprehension. Difficulty: trivial.

- [ ] **#13 Add a "disconnect wallet" button**
  - `frontend/src/useWallet.ts` connects but never disconnects. Add a clear
    button + reset state. Difficulty: easy.

- [ ] **#14 Show connected network name in the header**
  - Display `futurenet`/`testnet` somewhere visible so users know where they are.
    File: `frontend/src/App.tsx`. Difficulty: easy.

- [ ] **#15 Add tooltips to the share input fields**
  - Explain what "shares" mean (proportional split). Small UX text.
    File: `App.tsx`. Difficulty: trivial.

- [ ] **#16 Format token amounts with thousands separators**
  - Raw numbers are hard to read. Add locale-aware formatting in `App.tsx`.
  - Why: readability. Difficulty: easy.

- [ ] **#17 Add a confirmation modal before release/refund**
  - These are irreversible-ish actions. Ask "are you sure?" with a summary.
  - File: `App.tsx`. Difficulty: easy.

- [ ] **#18 Add a favicon and app title**
  - `frontend/index.html` likely uses defaults. Add a SmartAge favicon + title.
  - Difficulty: trivial.

- [ ] **#19 Write a one-paragraph project description for the repo**
  - Add a short `description` to `package.json` and a repo About blurb.
  - Difficulty: trivial.

- [ ] **#20 Add a "back to top" link on long pages**
  - Minor nav helper for the payment list. Difficulty: trivial.

- [ ] **#21 Add keyboard accessibility to buttons**
  - Ensure all buttons/inputs are focusable and Enter/Space works.
    File: `App.tsx` + `styles.css`. Difficulty: easy.

- [ ] **#22 Add aria-labels to icon-only buttons**
  - Screen-reader support for copy/connect icons. Difficulty: easy.

- [ ] **#23 Create a CONTRIBUTING.md**
  - Explain branching, PR format, how to claim an issue from this note.
  - Difficulty: easy.

- [ ] **#24 Create a CODE_OF_CONDUCT.md**
  - Standard contributor-friendly doc. Difficulty: trivial.

- [ ] **#25 Add a LICENSE file**
  - Pick a license (MIT/Apache-2.0) and add it. Difficulty: trivial.

- [ ] **#26 Add a `.env.example`**
  - Show `VITE_CONTRACT_ADDRESS` and `VITE_NETWORK` with comments.
  - File: `frontend/.env.example`. Difficulty: trivial.

- [ ] **#27 Document how to get testnet XLM**
  - Link the Stellar friendbot and explain funding a Freighter account.
  - Add to README/QUICKSTART. Difficulty: easy.

- [ ] **#28 Add a "created at" timestamp to payments**
  - Store block timestamp on `create()` and display it. Contract + frontend.
  - Difficulty: medium.

- [ ] **#29 Add a search/filter box to "My Payments"**
  - Filter by payment id or recipient address. File: `App.tsx`. Difficulty: easy.

- [ ] **#30 Sort payments by newest first**
  - Order the `list()` results for better UX. File: `App.tsx`. Difficulty: easy.

- [ ] **#31 Add pagination / "load more" to payment list**
  - If many payments, page them instead of one giant list. Difficulty: medium.

- [ ] **#32 Show total escrowed amount per payer**
  - Sum amounts across a payer's payments and show a balance card.
  - Difficulty: medium.

- [ ] **#33 Add a "share link" to a payment**
  - Generate a URL like `#/payment/<id>` so it can be shared. Difficulty: easy.

- [ ] **#34 Deep-link to a payment from URL hash**
  - On load, if URL has `#/payment/<id>`, open that payment. Difficulty: medium.

- [ ] **#35 Add light/dark theme toggle**
  - `styles.css` theming with a toggle button. Difficulty: medium.

- [ ] **#36 Improve mobile responsiveness**
  - Test on small screens; fix overflow in the create form. `styles.css`.
  - Difficulty: easy.

- [ ] **#37 Add a basic ESLint config to frontend**
  - `frontend/.eslintrc` with sensible React rules. Difficulty: easy.

- [ ] **#38 Add Prettier config to frontend**
  - `frontend/.prettierrc` + format script. Difficulty: trivial.

- [ ] **#39 Add rustfmt check to contracts**
  - Ensure `cargo fmt --check` passes; add a script. Difficulty: trivial.

- [ ] **#40 Add clippy lint pass to contracts**
  - Run `cargo clippy` and fix warnings. Difficulty: easy.

- [ ] **#41 Write contract doc-comments for each method**
  - Add `///` docs above `create/release/refund/get/list`. Helps AI + humans.
  - Difficulty: easy.

- [ ] **#42 Add a CHANGELOG.md**
  - Track releases/features. Difficulty: trivial.

- [ ] **#43 Add a "What's new" section to README**
  - Summarize recent capability additions. Difficulty: trivial.

- [ ] **#44 Create an issues template (bug report)**
  - `.github/ISSUE_TEMPLATE/bug.md`. Difficulty: trivial.

- [ ] **#45 Create a PR template**
  - `.github/PULL_REQUEST_TEMPLATE.md` referencing this note. Difficulty: trivial.

- [ ] **#46 Add a security policy (SECURITY.md)**
  - How to report vulnerabilities. Difficulty: trivial.

- [ ] **#47 Write a FAQ section**
  - Common questions: "why escrow?", "what is a share?", "fees?". README.
  - Difficulty: easy.

- [ ] **#48 Add a glossary of Stellar terms**
  - Explain escrow, Soroban, Freighter, strkey, etc. Difficulty: easy.

- [ ] **#49 Add a screenshot/recording to README**
  - Capture the dApp running and embed it. Difficulty: easy.

- [ ] **#50 Add a "demo video" link placeholder**
  - Reserve a spot for a walkthrough video. Difficulty: trivial.

- [ ] **#51 Add unit test: create with duplicate recipients**
  - Contract should reject or handle duplicate recipient addresses. `test.rs`.
  - Difficulty: easy.

- [ ] **#52 Add unit test: release with single recipient (100% share)**
  - Edge case where one recipient takes all. `test.rs`. Difficulty: easy.

- [ ] **#53 Add unit test: shares summing to zero rejected**
  - Ensure total shares > 0 validation. `test.rs`. Difficulty: easy.

- [ ] **#54 Add unit test: get() on unknown id reverts**
  - Verify read of a missing payment fails gracefully. `test.rs`. Difficulty: easy.

- [ ] **#55 Add unit test: list() returns empty for new payer**
  - Fresh payer has no payments. `test.rs`. Difficulty: easy.

- [ ] **#56 Improve contract error types with meaningful codes**
  - Replace generic panics with typed `Error` enum + messages. `lib.rs`.
  - Difficulty: medium.

- [ ] **#57 Add events to contract methods**
  - Emit `payment_created` / `released` / `refunded` events for indexers.
  - `lib.rs`. Difficulty: medium.

- [ ] **#58 Add a `cancel` method (payer-only, pre-release)**
  - Let payer void an unpaid escrow and refund. New contract method + UI.
  - Difficulty: medium.

- [ ] **#59 Add partial release support**
  - Allow releasing to a subset of recipients. Requires contract redesign.
  - Difficulty: hard.

- [ ] **#60 Add a deadline / auto-refund**
  - Payments auto-refund after a timestamp if not released. `lib.rs` + tests.
  - Difficulty: medium.

- [ ] **#61 Add an arbitrator role**
  - Third party can force release/refund on dispute. New auth model. Hard.

- [ ] **#62 Store token decimals and show them**
  - Display amounts using the token's actual decimals. Frontend + maybe contract.
  - Difficulty: medium.

- [ ] **#63 Validate token is a real Stellar asset**
  - On create, sanity-check the token address format. `contract.ts`/`lib.rs`.
  - Difficulty: easy.

- [ ] **#64 Add a "recipients count" limit**
  - Cap recipients (e.g. 50) to bound gas. Contract guard. Difficulty: easy.

- [ ] **#65 Add gas/cost estimate display before signing**
  - Show approximate fee before Freighter prompt. `contract.ts`. Difficulty: medium.

- [ ] **#66 Add a transaction history view**
  - List past tx hashes per payment. Frontend only (from RPC). Difficulty: medium.

- [ ] **#67 Add explorer links to tx hashes**
  - Link to Stellar Expert / lab for each tx. `App.tsx`. Difficulty: easy.

- [ ] **#68 Add a "refresh" button to payment view**
  - Re-fetch latest state after actions. `App.tsx`. Difficulty: easy.

- [ ] **#69 Debounce the create form inputs**
  - Avoid re-render storms on typing. `App.tsx`. Difficulty: easy.

- [ ] **#70 Add form state persistence (localStorage)**
  - Keep draft payment form across reloads. `App.tsx`. Difficulty: easy.

- [ ] **#71 Add a "save as draft" feature**
  - Store incomplete payments locally to finish later. Difficulty: medium.

- [ ] **#72 Add input masks for Stellar addresses**
  - Validate `G...` format as the user types. `App.tsx`. Difficulty: easy.

- [ ] **#73 Add a "paste multiple addresses" textarea**
  - Bulk-add recipients from comma/newline separated list. Difficulty: medium.

- [ ] **#74 Add equal-split shortcut button**
  - "Split equally" sets all shares to 1. `App.tsx`. Difficulty: easy.

- [ ] **#75 Show share percentage next to each recipient**
  - Compute and display `%` from shares live. `App.tsx`. Difficulty: easy.

- [ ] **#76 Add a "remove recipient" row button**
  - Dynamic add/remove recipient rows in the form. `App.tsx`. Difficulty: easy.

- [ ] **#77 Add a "add recipient" with + button**
  - Currently likely static; make it dynamic. `App.tsx`. Difficulty: easy.

- [ ] **#78 Validate sum of displayed percentages = 100%**
  - Warn if rounding leaves mismatch. `App.tsx`. Difficulty: easy.

- [ ] **#79 Add a toast/notification system**
  - Success/error toasts instead of inline text. `App.tsx` + `styles.css`.
  - Difficulty: medium.

- [ ] **#80 Replace window.alert with custom modal**
  - Cleaner UX. Difficulty: easy.

- [ ] **#81 Add a footer with repo + license links**
  - `App.tsx` footer. Difficulty: trivial.

- [ ] **#82 Add meta tags / OG tags to index.html**
  - Better link previews. `frontend/index.html`. Difficulty: trivial.

- [ ] **#83 Add a manifest.json (PWA-ish)**
  - Basic web app manifest. `frontend/public/manifest.json`. Difficulty: easy.

- [ ] **#84 Add a 404 / not-found view**
  - Handle unknown routes/payment ids gracefully. Difficulty: easy.

- [ ] **#85 Add a loading skeleton for payment list**
  - Show placeholder rows while fetching. `App.tsx`. Difficulty: easy.

- [ ] **#86 Add error boundary in React**
  - Catch render errors so the app doesn't white-screen. `main.tsx`. Difficulty: easy.

- [ ] **#87 Add a "retry" on failed fetch**
  - Auto or manual retry when RPC call fails. `contract.ts`. Difficulty: easy.

- [ ] **#88 Log outgoing contract calls in dev**
  - Console.log method name + args when `import.meta.env.DEV`. `contract.ts`.
  - Difficulty: trivial.

- [ ] **#89 Add TypeScript strict mode**
  - Enable `strict` in `tsconfig.json` and fix errors. Difficulty: medium.

- [ ] **#90 Remove `any` types from frontend**
  - Replace `any` with proper interfaces. `contract.ts`/`useWallet.ts`. Medium.

- [ ] **#91 Add a shared types file**
  - Define `Payment`, `Recipient` interfaces in one place. Difficulty: easy.

- [ ] **#92 Add a `usePayments` hook**
  - Encapsulate payment fetching logic from `App.tsx`. Difficulty: medium.

- [ ] **#93 Add a `useContract` hook**
  - Wrap contract client creation. Cleaner `App.tsx`. Difficulty: medium.

- [ ] **#94 Add unit tests to frontend (Vitest)**
  - Test pure helpers (share math, formatting). Difficulty: medium.

- [ ] **#95 Add component tests (React Testing Library)**
  - Test the create form renders and validates. Difficulty: medium.

- [ ] **#96 Add a `npm run lint` script**
  - Wire eslint+prettier into package.json scripts. Difficulty: trivial.

- [ ] **#97 Add a `npm run typecheck` script**
  - `tsc --noEmit` convenience. Difficulty: trivial.

- [ ] **#98 Add Storybook (optional)**
  - Document UI components in isolation. Difficulty: hard.

- [ ] **#99 Improve contract storage efficiency**
  - Review `instance`/`persistent`/`temporary` storage usage in `lib.rs`. Medium.

- [ ] **#100 Add a `payment_count` counter**
  - Track total payments created (stats). Contract + maybe UI. Difficulty: easy.

- [ ] **#101 Add a public `stats()` view**
  - Return total payments + total volume escrowed. `lib.rs` + `App.tsx`.
  - Difficulty: medium.

- [ ] **#102 Show global stats on a dashboard page**
  - New route showing contract stats. Frontend. Difficulty: medium.

- [ ] **#103 Add a "recent activity" feed**
  - Latest N payments across all payers (if contract supports listing all).
  - Difficulty: hard.

- [ ] **#104 Add i18n scaffolding**
  - Set up a lightweight i18n so strings are translatable. Difficulty: medium.

- [ ] **#105 Add a language switcher (EN/ES) starter**
  - Prove i18n works with two languages. Difficulty: medium.

- [ ] **#106 Write onboarding docs for AI-engines**
  - A `AGENTS.md` describing build/test/deploy and the gotchas. Difficulty: easy.

- [ ] **#107 Add a `Makefile` with common tasks**
  - `make build`, `make test`, `make dev`, `make deploy`. Difficulty: easy.

- [ ] **#108 Add a `justfile` alternative**
  - Same as Makefile but using `just`. Difficulty: easy.

- [ ] **#109 Add a Dockerfile for reproducible builds**
  - Build contract in a Rust image; optional. Difficulty: medium.

- [ ] **#110 Add a `scripts/test.sh`**
  - One command to run both contract + frontend tests. Difficulty: trivial.

- [ ] **#111 Document the deploy.sh arguments**
  - Explain `NETWORK`, account funding, fee flags in `scripts/deploy.sh`. Easy.

- [ ] **#112 Add a "verify deployment" step to deploy.sh**
  - After deploy, call `get(0)` or print contract id + explorer link. Difficulty: easy.

---

## Contributor list
_Add your name + what you worked on when you open a PR._

| Contributor | Issue(s) | Notes |
|-------------|----------|-------|
| _your name_ | #_n_     | _what you learned_ |

---

## Notes for AI-engines picking this up
- The contract validates: empty/unequal recipients, non-positive amounts, zero
  shares, and double-settling. Mirror those rules on the frontend.
- WASM output lives at
  `contracts/target/wasm32-unknown-unknown/release/stellar_dapp_contract.wasm`.
- Never remove the `ed25519-dalek` patch in `contracts/Cargo.toml`.
- Keep changes small and focused; one issue per PR.
