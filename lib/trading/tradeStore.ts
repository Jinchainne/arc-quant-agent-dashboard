import { createInitialMarketState } from "@/lib/trading/marketSimulator";
import type {
  AutoBotState,
  MarketSymbol,
  RiskStatus,
  SimulationState,
  StrategySignal,
  TradeRecord
} from "@/lib/trading/types";

export const tradeStore: {
  markets: Record<MarketSymbol, { timestamp: number; price: number }[]>;
  trades: TradeRecord[];
  activityLog: SimulationState["activityLog"];
  feed: Array<{ id: string; tone: "info" | "good" | "bad"; message: string; timestamp: number }>;
  pnlSeries: Array<{ index: number; pnl: number }>;
  monteCarlo: SimulationState["monteCarlo"];
  lastSignal: StrategySignal | null;
  risk: RiskStatus;
  allTimePnl: number;
  autoBot: AutoBotState;
} = {
  markets: createInitialMarketState(),
  trades: [],
  activityLog: [],
  feed: [],
  pnlSeries: [],
  monteCarlo: {
    expectedReturn: 0,
    expectedDrawdown: 0,
    percentile5: 0,
    percentile95: 0,
    histogram: []
  },
  lastSignal: null,
  risk: {
    approved: false,
    score: 72,
    phase: "Scan",
    flags: []
  },
  allTimePnl: 0,
  autoBot: {
    enabled: false,
    mode: "manual-wallet",
    ledgerAddress: "",
    notionalUsdc: "250",
    cooldownMs: 12000,
    objective: "Keep Arc testnet execution healthy and submit only high-quality intents.",
    lastRunAt: null,
    lastError: null,
    lastMessage: "Auto bot idle. Configure a ledger and choose a testnet execution mode.",
    lastDecision: "Planner not started yet.",
    nextAction: "Configure a ledger, choose a mode, and arm the bot.",
    blockedReason: "",
    totalPrepared: 0,
    totalSubmitted: 0,
    signerAddress: "",
    pendingCount: 0,
    lastTriggerSource: "idle",
    lastCycleStartedAt: null,
    lastCycleCompletedAt: null,
    cycleCount: 0
  }
};
