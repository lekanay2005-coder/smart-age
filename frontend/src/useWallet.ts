import { useCallback, useEffect, useState } from "react";

// Minimal Freighter wallet integration. Freighter injects `window.freighter`.
export interface FreighterApi {
  isConnected: () => Promise<boolean>;
  getPublicKey: () => Promise<string>;
  signTransaction: (
    tx: string,
    opts: { networkPassphrase?: string; network?: string }
  ) => Promise<string>;
}

declare global {
  interface Window {
    freighter?: FreighterApi;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const isAvailable = () => typeof window !== "undefined" && !!window.freighter;

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!isAvailable()) {
        throw new Error("Freighter wallet not found. Please install it.");
      }
      const connected = await window.freighter!.isConnected();
      if (!connected) {
        throw new Error("Freighter is not connected. Open the extension.");
      }
      const pk = await window.freighter!.getPublicKey();
      setAddress(pk);
    } catch (e: any) {
      setError(e?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    if (isAvailable()) {
      window.freighter!.isConnected().then((c) => {
        if (c) window.freighter!.getPublicKey().then(setAddress).catch(() => {});
      });
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  return { address, error, connecting, connect, disconnect, isAvailable };
}
