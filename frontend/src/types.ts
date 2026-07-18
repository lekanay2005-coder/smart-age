// Shared types and pure helpers used across the frontend.
import type { PaymentView } from "./contract";

export interface Recipient {
  address: string;
  share: number;
}

/** Parse a contract panic/error message into a friendly, user-facing string. */
export function friendlyError(err: unknown): string {
  const raw =
    (err as { message?: string })?.message ||
    (typeof err === "string" ? err : "") ||
    "Unknown error";

  const known: Record<string, string> = {
    "no recipients": "Add at least one recipient.",
    "recipients/shares mismatch": "Recipients and shares counts do not match.",
    "amount must be positive": "Amount must be greater than zero.",
    "shares sum to zero": "Shares must add up to more than zero.",
    "share must be greater than zero": "Every share must be greater than zero.",
    "duplicate recipient": "Each recipient address must be unique.",
    "too many recipients": "Too many recipients for a single payment.",
    "unknown payment": "That payment does not exist.",
    "payment already settled": "This payment has already been released or refunded.",
  };

  for (const key of Object.keys(known)) {
    if (raw.includes(key)) return known[key];
  }
  return raw;
}

/** Validate a Stellar strkey (G... account or C... contract). */
export function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(addr) || /^C[A-Z0-9]{55}$/.test(addr);
}

/** Total of all shares. */
export function totalShares(recipients: Recipient[]): number {
  return recipients.reduce((sum, r) => sum + (Number(r.share) || 0), 0);
}

/** Per-recipient percentage of the split (rounded to 1 decimal). */
export function sharePercentage(share: number, total: number): number {
  if (!total) return 0;
  return Math.round((share / total) * 1000) / 10;
}

/** Exact amount a single recipient would receive for a given total. */
export function recipientAmount(share: number, total: number, amount: string): string {
  const amt = Number(amount);
  if (!total || !Number.isFinite(amt) || amt <= 0) return "0";
  return String(Math.floor((amt * share) / total));
}

/** Validate the create form, returning a user-facing message or null. */
export function validateCreate(
  token: string,
  amount: string,
  recipients: Recipient[],
  payer: string | null
): string | null {
  const addrs = recipients.map((r) => r.address.trim()).filter(Boolean);
  if (addrs.length === 0) return "Add at least one recipient.";
  if (!token.trim()) return "Token (Stellar asset) address is required.";
  if (!isValidStellarAddress(token.trim()))
    return "Token address is not a valid Stellar contract (C…) address.";
  if (!amount || Number(amount) <= 0) return "Amount must be greater than zero.";

  const seen = new Set<string>();
  for (const r of recipients) {
    const a = r.address.trim();
    if (!a) return "Every recipient needs an address.";
    if (!isValidStellarAddress(a)) return `Invalid recipient address: ${a}`;
    if (seen.has(a)) return "Each recipient address must be unique.";
    seen.add(a);
    if (!r.share || r.share <= 0) return "Every share must be greater than zero.";
  }
  if (payer && seen.has(payer)) return "The payer cannot also be a recipient.";
  return null;
}

export type { PaymentView };
