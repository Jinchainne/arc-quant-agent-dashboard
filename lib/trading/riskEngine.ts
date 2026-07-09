import {
  ARC_CHAIN_ID,
  ENABLE_TESTNET_CONTRACT_MODE,
  REAL_TRADING_DISABLED,
  SIM_MAX_DAILY_LOSS_PCT,
  SIM_MIN_CONFIDENCE
} from "@/lib/arc/constants";
import { fromUsdc6 } from "@/lib/arc/usdc";
import type { ExecutionMode, RiskStatus, StrategySignal, TradeRecord } from "@/lib/trading/types";

export function evaluateRisk(input: {
  signal: StrategySignal;
  rpcHealthy: boolean;
  chainId: number | null;
  accountValue: number;
  walletConnected: boolean;
  mode: ExecutionMode;
  dailyPnl: number;
  consecutiveLosses: number;
}) {
  const flags: string[] = [];

  if (!input.rpcHealthy) {
    flags.push("Arc RPC unhealthy.");
  }
  if (input.chainId !== null && input.chainId !== ARC_CHAIN_ID) {
    flags.push("Wrong chain ID for Arc Testnet.");
  }
  if (input.signal.confidence < SIM_MIN_CONFIDENCE) {
    flags.push("Signal confidence below minimum threshold.");
  }
  if (input.dailyPnl <= -(input.accountValue * (SIM_MAX_DAILY_LOSS_PCT / 100))) {
    flags.push("Daily loss limit reached.");
  }
  if (input.consecutiveLosses >= 3) {
    flags.push("Max consecutive losses reached.");
  }
  if (input.mode !== "paper" && !input.walletConnected) {
    flags.push("Wallet required for non-paper mode.");
  }
  if (input.mode === "testnet-contract" && !ENABLE_TESTNET_CONTRACT_MODE) {
    flags.push("Testnet contract mode disabled by config.");
  }
  if (input.mode !== "paper" && REAL_TRADING_DISABLED) {
    flags.push("REAL_TRADING_DISABLED prevents any automatic execution.");
  }
  if (fromUsdc6(input.signal.notionalUsdc6).includes(".")) {
    const [whole, fraction = ""] = fromUsdc6(input.signal.notionalUsdc6).split(".");
    if (fraction.length > 6 || whole.length === 0) {
      flags.push("USDC decimal ambiguity detected.");
    }
  }

  const approved = flags.length === 0 && input.signal.action !== "HOLD";
  const score = Math.max(0, 100 - flags.length * 18 - Math.max(0, 70 - input.signal.confidence));

  return {
    approved,
    score,
    phase: approved ? "Fill" : "Validate",
    flags
  } satisfies RiskStatus;
}

export function getConsecutiveLosses(trades: TradeRecord[]) {
  let losses = 0;
  for (let index = trades.length - 1; index >= 0; index -= 1) {
    if (trades[index].pnl < 0) {
      losses += 1;
    } else {
      break;
    }
  }
  return losses;
}
