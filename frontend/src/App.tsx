import { useState } from "react";
import { useWallet } from "./useWallet";
import { CONTRACT_ADDRESS, NETWORKS, ACTIVE_NETWORK } from "./config";
import {
  createPayment,
  releasePayment,
  refundPayment,
  getPayment,
  PaymentView,
} from "./contract";

interface Recipient {
  address: string;
  share: number;
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

  function updateRecipient(i: number, patch: Partial<Recipient>) {
    setRecipients((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleCreate() {
    if (!address) return;
    setBusy(true);
    setMsg(null);
    try {
      const addrs = recipients.map((r) => r.address.trim()).filter(Boolean);
      const shares = recipients.map((r) => Number(r.share));
      if (addrs.length === 0) throw new Error("Add at least one recipient");
      if (!token) throw new Error("Token (Stellar asset) address required");
      if (!amount || Number(amount) <= 0)
        throw new Error("Amount must be positive");
      const hash = await createPayment(
        address,
        token.trim(),
        addrs,
        shares,
        amount
      );
      setMsg(`Created payment. Tx: ${hash}`);
      setLookupId((Number(lookupId) + (view ? 0 : 0)).toString());
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup() {
    setBusy(true);
    setView(null);
    try {
      const p = await getPayment(Number(lookupId));
      setView(p);
    } catch (e: any) {
      setMsg(`Lookup error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (!address || !view) return;
    setBusy(true);
    try {
      const hash = await releasePayment(address, Number(lookupId));
      setMsg(`Released. Tx: ${hash}`);
      setView(await getPayment(Number(lookupId)));
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund() {
    if (!address || !view) return;
    setBusy(true);
    try {
      const hash = await refundPayment(address, Number(lookupId));
      setMsg(`Refunded. Tx: ${hash}`);
      setView(await getPayment(Number(lookupId)));
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>SmartAge</h1>
        <p className="sub">Stellar escrow split-payments · Soroban DeFi</p>
        <div className="net">
          Network: {NETWORKS[ACTIVE_NETWORK].name} · Contract:{" "}
          {CONTRACT_ADDRESS || "not set"}
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
        {error && <p className="err">{error}</p>}
      </section>

      <section className="card">
        <h2>Create Payment</h2>
        <label>
          Token (Stellar asset contract address)
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="C…"
          />
        </label>
        <label>
          Amount (in smallest token units)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000000"
          />
        </label>
        <h3>Recipients</h3>
        {recipients.map((r, i) => (
          <div className="row" key={i}>
            <input
              value={r.address}
              onChange={(e) => updateRecipient(i, { address: e.target.value })}
              placeholder="Recipient address C…"
            />
            <input
              type="number"
              value={r.share}
              onChange={(e) => updateRecipient(i, { share: Number(e.target.value) })}
              placeholder="share"
              style={{ width: 80 }}
            />
            <button
              onClick={() =>
                setRecipients((rs) => rs.filter((_, idx) => idx !== i))
              }
              disabled={recipients.length <= 1}
            >
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => setRecipients((rs) => [...rs, { address: "", share: 1 }])}>
          + Add recipient
        </button>
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
          />
          <button onClick={handleLookup} disabled={busy}>
            Lookup
          </button>
        </div>
        {view && (
          <div className="view">
            <p>Payer: <code>{view.payer}</code></p>
            <p>Token: <code>{view.token}</code></p>
            <p>Amount: {view.amount}</p>
            <p>Recipients: {view.recipients.join(", ")}</p>
            <p>Shares: {view.shares.join(" / ")}</p>
            <p>
              Status: {view.released ? "Released" : view.refunded ? "Refunded" : "Escrowed"}
            </p>
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

      {msg && <p className="msg">{msg}</p>}
      <footer>Built on Stellar · Soroban smart contracts</footer>
    </div>
  );
}
