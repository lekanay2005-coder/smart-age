// Thin wrapper around @stellar/stellar-sdk for reading the Payments contract.
// Uses the RPC server directly (no wallet) for read-only indexing.

import { Contract, rpc, xdr, Address } from "@stellar/stellar-sdk";
import { CONFIG, resolveNetwork } from "./config.js";

let _server;
function server() {
  if (!_server) {
    const { rpcUrl } = resolveNetwork();
    _server = new rpc.Server(rpcUrl, { allowHttp: false });
  }
  return _server;
}

function contract() {
  return new Contract(CONFIG.contractId);
}

// Build an unsigned simulation transaction for a read-only operation.
async function buildSimTx(operation) {
  const { networkPassphrase } = resolveNetwork();
  const { sequence } = await server().getLatestLedger();
  const { Account, TransactionBuilder } = await import("@stellar/stellar-sdk");
  // Simulation-only source account (not used for auth on reads).
  const source = new Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    sequence.toString()
  );
  return new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
}

// Call a read-only method and return its decoded ScVal. Not signed.
async function read(method, ...args) {
  const c = contract();
  const op = c.call(method, ...args);
  const tx = await buildSimTx(op);
  const sim = await server().simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`simulate ${method} failed: ${sim.error}`);
  }
  // On success the SDK returns the return ScVal directly in `result.retval`.
  const retval = sim.result?.retval;
  if (!retval) throw new Error(`no result for ${method}`);
  return retval;
}

// payment_count() -> u64
export async function paymentCount() {
  const v = await read("payment_count");
  return Number(v?.u64?.() ?? v?._value ?? 0);
}

// stats() -> struct { count: u64, volume: i128 }
export async function contractStats() {
  const v = await read("stats");
  return v;
}

// get(id) -> Payment struct
export async function getPayment(id) {
  const v = await read("get", xdr.ScVal.scvU64(BigInt(id)));
  if (!v) return null;
  return decodePayment(v, id);
}

function decodeAddress(scv) {
  return Address.fromScVal(scv).toString();
}

function decodePayment(scv, id) {
  // scv is a map (contracttype struct encoded as ScMap)
  const map = scv.map();
  const get = (key) => map.find((e) => e.key.sym().toString() === key)?.val;
  const recipientsVec = get("recipients")?.vec() || [];
  const sharesVec = get("shares")?.vec() || [];
  const recipients = recipientsVec.map(decodeAddress);
  const shares = sharesVec.map((s) => Number(s.u32()));
  return {
    id,
    payer: decodeAddress(get("payer")),
    token: decodeAddress(get("token")),
    amount: (get("amount")?.i128?.().toString?.() ?? get("amount")?.toString?.()) || "0",
    recipients,
    shares,
    released: Boolean(get("released")?.bool()),
    refunded: Boolean(get("refunded")?.bool()),
  };
}
