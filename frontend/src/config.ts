// Network + contract configuration.
// Set VITE_CONTRACT_ADDRESS to your deployed Payments contract id.
// Defaults to Futurenet RPC + passphrase.

export const NETWORKS = {
  futurenet: {
    name: "Futurenet",
    rpcUrl: "https://rpc-futurenet.stellar.org",
    networkPassphrase: "Test SDF Future Network ; October 2022",
  },
  testnet: {
    name: "Testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
} as const;

export type NetworkKey = keyof typeof NETWORKS;

export const ACTIVE_NETWORK: NetworkKey =
  (import.meta.env.VITE_NETWORK as NetworkKey) || "futurenet";

export const CONTRACT_ADDRESS: string =
  import.meta.env.VITE_CONTRACT_ADDRESS || "";
