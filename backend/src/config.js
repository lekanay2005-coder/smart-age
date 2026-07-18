// Shared configuration for the SmartAge backend (indexer + API).
// All values come from environment variables with sensible defaults.

export const CONFIG = {
  // Deployed Payments contract id (from scripts/deploy.sh).
  contractId: process.env.CONTRACT_ID || process.env.VITE_CONTRACT_ADDRESS || "",

  // Network: "futurenet" (default) or "testnet".
  network: process.env.BACKEND_NETWORK || process.env.VITE_NETWORK || "futurenet",

  // RPC URL override (optional). If empty we derive from the network.
  rpcUrl: process.env.RPC_URL || "",

  // Port for the REST API.
  port: Number(process.env.PORT || 3000),

  // Polling interval (ms) for the indexer.
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 15000),

  // How many payment ids to scan per poll batch.
  batchSize: Number(process.env.BATCH_SIZE || 50),

  // Optional API key required for write/webhook endpoints. Empty = open.
  apiKey: process.env.API_KEY || "",

  // Trusted origins for CORS (comma separated). Empty = allow all.
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // SQLite file path.
  dbFile: process.env.DB_FILE || "data/smartage.db",

  // Max requests per 15min window per IP (0 = disabled).
  rateLimit: Number(process.env.RATE_LIMIT || 100),
};

export const NETWORK_CONFIG = {
  futurenet: {
    rpcUrl: "https://rpc-futurenet.stellar.org",
    networkPassphrase: "Test SDF Future Network ; October 2022",
  },
  testnet: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
};

export function resolveNetwork() {
  const cfg = NETWORK_CONFIG[CONFIG.network];
  if (!cfg) {
    throw new Error(
      `Unsupported BACKEND_NETWORK "${CONFIG.network}". Use futurenet or testnet.`
    );
  }
  return {
    rpcUrl: CONFIG.rpcUrl || cfg.rpcUrl,
    networkPassphrase: cfg.networkPassphrase,
  };
}
