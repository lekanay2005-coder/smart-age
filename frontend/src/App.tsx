import { useState } from "react";
import { useWallet } from "./useWallet";
import { CONTRACT_ADDRESS, NETWORKS, ACTIVE_NETWORK } from "./config";
import {
  createPayment,
  releasePayment,
  refundPayment,
  getPayment,
  listPayments,
  PaymentView,
} from "./contract";
import {
  Recipient,
  friendlyError,
  isValidStellarAddress,
  totalShares,
  sharePercentage,
  recipientAmount,
  validateCreate,
} from "./types";

const NETWORK_NAME = NETWORKS[ACTIVE_NETWORK].name;
const EXPLORER = "https://stellar.expert/explorer";
const explorerTx = (hash: string) =>
  `${EXPLORER}/${ACTIVE_NETWORK === "testnet" ? "testnet" : "futurenet"}?tx=${hash}`;
const explorerContract = (id: string) =>
  `${EXPLORER}/${ACTIVE_NETWORK === "testnet" ? "testnet" : "futurenet"}/contract/${id}`;

function devLog(method: string, args: unknown) {
  if (import.meta.env.DEV) console.log(`[contract] ${method}`, args);
}

export default function App() {
  const { address, error, connecting, connect, disconnect, isAvailable } =
    useWallet();
  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: "", share: 1 },
    { address: "", share: 1 },
  ]);
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [lookupId, setLookupId] = useState("");
  const [view, setView] = useState<PaymentView | null>(null);
  const [myIds, setMyIds] = useState<number[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const total = totalShares(recipients);

  function updateRecipient(i: number, patch: Partial<Recipient>) {
    setRecipients((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function splitEqually() {
    setRecipients((rs) => rs.map((r) => ({ ...r, share: 1 })));
  }

  async function handleCreate() {
    if (!address) return;
    const validation = validateCreate(token, amount, recipients, address);
    if (validation) {
      setMsg(validation);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const addrs = recipients.map((r) => r.address.trim());
      const shares = recipients.map((r) => Number(r.share));
      devLog("create", { payer: address, token, addrs, shares, amount });
      const hash = await createPayment(address, token.trim(), addrs, shares, amount);
      setMsg(`Created payment. Tx: ${hash}`);
      setLookupId(String(view ? view.id ?? "" : ""));
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup() {
    setBusy(true);
    setView(null);
    try {
      devLog("get", Number(lookupId));
      const p = await getPayment(Number(lookupId));
      setView(p);
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadMine() {
    if (!address) return;
    setLoadingList(true);
    try {
      const ids = await listPayments(address);
      setMyIds([...ids].reverse());
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setLoadingList(false);
    }
  }

  async function openPayment(id: number) {
    setLookupId(String(id));
    setBusy(true);
    try {
      setView(await getPayment(id));
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshView() {
    if (!view) return;
    setBusy(true);
    try {
      setView(await getPayment(view.id));
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (!address || !view) return;
    setBusy(true);
    try {
      devLog("release", view.id);
      const hash = await releasePayment(address, view.id);
      setMsg(`Released. Tx: ${hash}`);
      setView(await getPayment(view.id));
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund() {
    if (!address || !view) return;
    setBusy(true);
    try {
      devLog("refund", view.id);
      const hash = await refundPayment(address, view.id);
      setMsg(`Refunded. Tx: ${hash}`);
      setView(await getPayment(view.id));
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = (v: PaymentView) =>
    v.released ? "Released" : v.refunded ? "Refunded" : "Escrowed";
  const statusClass = (v: PaymentView) =>
    v.released ? "badge released" : v.refunded ? "badge refunded" : "badge escrowed";

  return (
    <div className="app">
      <div className="orb orb--1" aria-hidden="true" />
      <div className="orb orb--2" aria-hidden="true" />
      <div className="orb orb--3" aria-hidden="true" />
      <header>
        <h1>SmartAge</h1>
        <p className="sub">Stellar escrow split-payments · Soroban DeFi</p>
        <div className="net">
          <span className="dot" aria-hidden="true" />
          {NETWORK_NAME} · Contract: {CONTRACT_ADDRESS || "not set"}
        </div>
      </header>

      <section className="card">
        <h2>Wallet</h2>
        {!address ? (
          <button onClick={connect} disabled={connecting || !isAvailable()}>
            {connecting
              ? "Connecting…"
              : isAvailable()
              ? "Connect Freighter"
              : "Install Freighter"}
          </button>
        ) : (
          <div className="row">
            <code>{address}</code>
            <button onClick={disconnect}>Disconnect</button>
          </div>
        )}
        {!isAvailable() && (
          <p className="err">
            Freighter not detected.{" "}
            <a href="https://freighter.app" target="_blank" rel="noreferrer">
              Install Freighter
            </a>
            .
          </p>
        )}
        {error && <p className="err" role="alert">{error}</p>}
      </section>

      <section className="card">
        <h2>Create Payment</h2>
        <label>
          Token (Stellar asset contract address)
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="C…"
            aria-label="Token contract address"
          />
        </label>
        <label>
          Amount (in smallest token units)
          <span className="hint"> Whole-number of base units, e.g. 10000000 = 10 XLM.</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000000"
            inputMode="numeric"
            aria-label="Amount"
          />
        </label>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Recipients</h3>
          <button type="button" onClick={splitEqually} className="link">
            Split equally
          </button>
        </div>
        {recipients.map((r, i) => (
          <div className="row" key={i}>
            <input
              value={r.address}
              onChange={(e) => updateRecipient(i, { address: e.target.value })}
              placeholder="Recipient address G… or C…"
              aria-label={`Recipient ${i + 1} address`}
              className={
                r.address && !isValidStellarAddress(r.address.trim()) ? "invalid" : ""
              }
            />
            <input
              type="number"
              value={r.share}
              min={1}
              onChange={(e) => updateRecipient(i, { share: Number(e.target.value) })}
              placeholder="share"
              style={{ width: 80 }}
              aria-label={`Recipient ${i + 1} share`}
            />
            <span className="share-pct" aria-hidden>
              {sharePercentage(r.share, total)}%
            </span>
            <button
              type="button"
              onClick={() => setRecipients((rs) => rs.filter((_, idx) => idx !== i))}
              disabled={recipients.length <= 1}
              aria-label={`Remove recipient ${i + 1}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRecipients((rs) => [...rs, { address: "", share: 1 }])}
        >
          + Add recipient
        </button>
        {total > 0 && (
          <p className="muted small">
            Split totals {total} shares · each recipient gets their share ÷ {total}.
          </p>
        )}
        <button onClick={handleCreate} disabled={busy || !address}>
          {busy ? "Working…" : "Create Escrow Payment"}
        </button>
      </section>

      <section className="card">
        <h2>Lookup Payment</h2>
        <div className="row">
          <input
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Payment ID"
            inputMode="numeric"
            aria-label="Payment ID"
          />
          <button onClick={handleLookup} disabled={busy}>
            Lookup
          </button>
        </div>
        {view && (
          <div className="view">
            <p>
              Status: <span className={statusClass(view)}>{statusLabel(view)}</span>{" "}
              <button type="button" className="link" onClick={refreshView} disabled={busy}>
                ↻ Refresh
              </button>
            </p>
            <p>Payer: <code>{view.payer}</code></p>
            <p>
              Token: <code>{view.token}</code>{" "}
              <a href={explorerContract(view.token)} target="_blank" rel="noreferrer">
                view
              </a>
            </p>
            <p>Amount: {view.amount}</p>
            <p>Recipients:</p>
            <ul className="rcpt">
              {view.recipients.map((a, i) => (
                <li key={i}>
                  <code>{a}</code> — share {view.shares[i]} (
                  {sharePercentage(view.shares[i], totalShares(view.shares.map((s) => ({ address: "", share: s }))))}
                  %) → {recipientAmount(view.shares[i], view.shares.reduce((x, y) => x + y, 0), view.amount)}
                </li>
              ))}
            </ul>
            {!view.released && !view.refunded && (
              <div className="row">
                <button onClick={handleRelease} disabled={busy || !address}>
                  Release
                </button>
                <button onClick={handleRefund} disabled={busy || !address}>
                  Refund
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {msg && (
        <p className="msg">
          {msg}{" "}
          {msg.includes("Tx: ") && (
            <a href={explorerTx(msg.split("Tx: ")[1])} target="_blank" rel="noreferrer">
              view on explorer
            </a>
          )}
        </p>
      )}

      {address && (
        <section className="card">
          <h2>My Payments</h2>
          <button onClick={handleLoadMine} disabled={loadingList}>
            {loadingList ? "Loading…" : "Load my payments"}
          </button>
          {loadingList && <p className="muted small">Loading payments…</p>}
          {loadingList ? (
            <div className="ids" aria-hidden="true">
              {[0, 1, 2].map((k) => (
                <li key={k} className="skeleton" style={{ width: 56, height: 30, borderRadius: 10 }} />
              ))}
            </div>
          ) : (
            <>
              <ul className="ids">
                {myIds.map((id) => (
                  <li key={id}>
                    <button className="link" onClick={() => openPayment(id)}>
                      #{id}
                    </button>
                  </li>
                ))}
                {myIds.length === 0 && (
                  <li className="muted">No payments yet — create your first escrow above.</li>
                )}
              </ul>
            </>
          )}
        </section>
      )}

      <footer>
        Built on Stellar · Soroban smart contracts ·{" "}
        <a href="https://github.com/your-org/smart-age" target="_blank" rel="noreferrer">
          Source
        </a>{" "}
        · MIT License
      </footer>
    </div>
  );
}
