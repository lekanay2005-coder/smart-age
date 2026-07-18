export const CONFIG = {
  contractId: process.env.CONTRACT_ID || process.env.VITE_CONTRACT_ADDRESS || "",

  network: process.env.BACKEND_NETWORK || process.env.VITE_NETWORK || "futurenet",

  rpcUrl: process.env.RPC_URL || "",

  port: Number(process.env.PORT || 3001),

  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 15000),

  batchSize: Number(process.env.BATCH_SIZE || 50),

  apiKey: process.env.API_KEY || "",

  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  dbFile: process.env.DB_FILE || "data/smartage.db",

  rateLimit: Number(process.env.RATE_LIMIT || 100),

  frontendDir: process.env.FRONTEND_DIR || "../../frontend/dist",
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
