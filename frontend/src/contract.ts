import {
  Account,
  Contract,
  TransactionBuilder,
  Transaction,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK, NETWORKS, CONTRACT_ADDRESS } from "./config";

const net = NETWORKS[ACTIVE_NETWORK];
const server = new rpc.Server(net.rpcUrl, { allowHttp: true });

function assertContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "No contract address configured. Set VITE_CONTRACT_ADDRESS or deploy the contract."
    );
  }
  return CONTRACT_ADDRESS;
}

// Submit a built transaction: simulate, sign via Freighter, send, poll.
export async function submit(built: Transaction, payer: string): Promise<string> {
  void payer; // payer authorizes inside Freighter during signing
  const api = window.freighter;
  if (!api) throw new Error("Freighter not available");

  const prepared = await server.prepareTransaction(built);
  const simulated = await server.simulateTransaction(prepared);
  const assembled = rpc.assembleTransaction(prepared, simulated);

  const signedXdr = await api.signTransaction(assembled.build().toEnvelope().toXDR(), {
    networkPassphrase: net.networkPassphrase,
  });
  const signed = xdr.TransactionEnvelope.fromXDR(signedXdr, "base64") as unknown as Transaction;
  const result = await server.sendTransaction(signed);
  if (result.status === "ERROR") {
    throw new Error(`Submit rejected: ${result.status}`);
  }

  // Poll for confirmation.
  const hash = result.hash;
  for (let i = 0; i < 30; i++) {
    const txr = await server.getTransaction(hash);
    if (txr.status === "SUCCESS") return hash;
    if (txr.status === "FAILED") throw new Error("Transaction failed on-chain");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Transaction timed out waiting for confirmation");
}

function baseBuilder(source: string) {
  return new TransactionBuilder(new Account(source, "0"), {
    fee: "100",
    networkPassphrase: net.networkPassphrase,
  }).setTimeout(60);
}

export async function createPayment(
  payer: string,
  token: string,
  recipients: string[],
  shares: number[],
  amount: string
): Promise<string> {
  const contract = new Contract(assertContract());
  const tx = baseBuilder(payer).addOperation(
    contract.call(
      "create",
      Address.fromString(payer).toScVal(),
      Address.fromString(token).toScVal(),
      vecAddresses(recipients),
      vecU32(shares),
      nativeToScVal(amount, { type: "i128" })
    )
  );
  return submit(tx.build(), payer);
}

function vecAddresses(addrs: string[]) {
  return xdr.ScVal.scvVec(addrs.map((a) => Address.fromString(a).toScVal()));
}

function vecU32(values: number[]) {
  return xdr.ScVal.scvVec(values.map((v) => nativeToScVal(v, { type: "u32" })));
}

export async function releasePayment(payer: string, id: number): Promise<string> {
  const contract = new Contract(assertContract());
  const tx = baseBuilder(payer).addOperation(
    contract.call("release", nativeToScVal(id, { type: "u64" }))
  );
  return submit(tx.build(), payer);
}

export async function refundPayment(payer: string, id: number): Promise<string> {
  const contract = new Contract(assertContract());
  const tx = baseBuilder(payer).addOperation(
    contract.call("refund", nativeToScVal(id, { type: "u64" }))
  );
  return submit(tx.build(), payer);
}

export interface PaymentView {
  id: number;
  payer: string;
  recipients: string[];
  shares: number[];
  amount: string;
  token: string;
  released: boolean;
  refunded: boolean;
}

export async function getPayment(id: number): Promise<PaymentView> {
  const contract = new Contract(assertContract());
  const tx = baseBuilder(assertContract()).addOperation(
    contract.call("get", nativeToScVal(id, { type: "u64" }))
  );
  const res = await server.simulateTransaction(tx.build());
  if (!rpc.Api.isSimulationSuccess(res)) {
    throw new Error(`Simulation failed: ${res.error}`);
  }
  const scVal = res.result?.retval;
  if (!scVal) throw new Error("No result from contract");
  return decodePayment(scVal, id);
}

export async function listPayments(payer: string): Promise<number[]> {
  const contract = new Contract(assertContract());
  const tx = baseBuilder(payer).addOperation(
    contract.call("list", Address.fromString(payer).toScVal())
  );
  const res = await server.simulateTransaction(tx.build());
  if (!rpc.Api.isSimulationSuccess(res)) {
    return [];
  }
  const scVal = res.result?.retval;
  if (!scVal) return [];
  return scVal
    .value()
    .map((v: any) => Number(scValToNative(v)));
}

function decodePayment(v: any, id: number): PaymentView {
  const map = v.value();
  const get = (k: string) => map.find((e: any) => e.key().toString() === k)?.val();
  return {
    id,
    payer: Address.fromScVal(get("payer")).toString(),
    recipients: get("recipients")
      .value()
      .map((a: any) => Address.fromScVal(a).toString()),
    shares: get("shares")
      .value()
      .map((s: any) => Number(scValToNative(s))),
    amount: String(scValToNative(get("amount"))),
    token: Address.fromScVal(get("token")).toString(),
    released: Boolean(scValToNative(get("released"))),
    refunded: Boolean(scValToNative(get("refunded"))),
  };
}
