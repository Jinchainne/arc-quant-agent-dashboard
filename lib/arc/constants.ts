export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app";
export const ARC_USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS as `0x${string}` | undefined) ??
  "0x3600000000000000000000000000000000000000";

export const SIMULATION_ONLY = process.env.SIMULATION_ONLY !== "false";
export const PAPER_TRADING_ONLY = process.env.PAPER_TRADING_ONLY !== "false";
export const REAL_TRADING_DISABLED = process.env.REAL_TRADING_DISABLED !== "false";
export const ENABLE_TESTNET_CONTRACT_MODE =
  process.env.NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE === "true";

export const SIM_STARTING_USDC = Number(process.env.SIM_STARTING_USDC ?? 10000);
export const SIM_TICK_MS = Number(process.env.SIM_TICK_MS ?? 2500);
export const SIM_MAX_POSITION_PCT = Number(process.env.SIM_MAX_POSITION_PCT ?? 5);
export const SIM_MAX_DAILY_LOSS_PCT = Number(process.env.SIM_MAX_DAILY_LOSS_PCT ?? 3);
export const SIM_MIN_CONFIDENCE = Number(process.env.SIM_MIN_CONFIDENCE ?? 65);

export const ARC_MARKETS = ["BTC/USDC-SIM", "ETH/USDC-SIM", "SOL/USDC-SIM", "ARC-GAS/USDC-SIM"] as const;
export const EXECUTION_PHASES = ["Scan", "Detect", "Validate", "Size", "Fill", "Settle"] as const;
