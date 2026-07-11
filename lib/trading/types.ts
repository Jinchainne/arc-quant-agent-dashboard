import type { ARC_MARKETS, EXECUTION_PHASES } from "@/lib/arc/constants";

export type ExecutionPhase = (typeof EXECUTION_PHASES)[number];
export type MarketSymbol = (typeof ARC_MARKETS)[number];
export type AgentTriggerSource =
  | "dashboard"
  | "local-runner"
  | "vercel-cron"
  | "manual-wallet"
  | "manual-trade"
  | "burner-executor"
  | "api";
export type ChainActivityStatus =
  | "info"
  | "prepared"
  | "submitted"
  | "pending"
  | "confirmed"
  | "reverted"
  | "error";

export type MarketCandle = {
  timestamp: number;
  price: number;
};

export type StrategyAction = "BUY" | "SELL" | "HOLD";
export type StrategyName = "Momentum" | "Mean Reversion" | "Volatility Breakout";
export type ExecutionMode = "paper" | "testnet-intent" | "testnet-contract";
export type AutoBotMode = "manual-wallet" | "burner-key";

export type StrategySignal = {
  market: MarketSymbol;
  strategy: StrategyName;
  action: StrategyAction;
  confidence: number;
  notionalUsdc6: bigint;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  riskFlags: string[];
};

export type DecisionNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: "idle" | "active" | "success" | "warning";
};

export type DecisionEdge = {
  from: string;
  to: string;
  label?: string;
  active?: boolean;
};

export type RiskStatus = {
  approved: boolean;
  score: number;
  phase: ExecutionPhase;
  flags: string[];
};

export type TradeRecord = {
  id: string;
  market: MarketSymbol;
  strategy: StrategyName;
  side: StrategyAction;
  confidence: number;
  notionalUsdc6: bigint;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number;
  rr: number;
  reason: string;
  mode: ExecutionMode;
  timestamp: number;
  status: "filled" | "rejected" | "intent-pending" | "intent-logged";
  txHash?: string;
  chainStatus?: ChainActivityStatus;
  submittedAt?: number;
  confirmedAt?: number;
  runnerSource?: AgentTriggerSource;
};

export type ActivityLogEntry = {
  id: string;
  source: AgentTriggerSource;
  kind: "cycle" | "intent" | "tx" | "risk" | "runner";
  status: ChainActivityStatus;
  message: string;
  timestamp: number;
  market?: MarketSymbol;
  txHash?: string;
};

export type SimulationState = {
  markets: Record<MarketSymbol, MarketCandle[]>;
  lastSignal: StrategySignal | null;
  risk: RiskStatus;
  trades: TradeRecord[];
  activityLog: ActivityLogEntry[];
  feed: Array<{ id: string; tone: "info" | "good" | "bad"; message: string; timestamp: number }>;
  pnlSeries: Array<{ index: number; pnl: number }>;
  monteCarlo: {
    expectedReturn: number;
    expectedDrawdown: number;
    percentile5: number;
    percentile95: number;
    histogram: number[];
  };
  decision: {
    nodes: DecisionNode[];
    edges: DecisionEdge[];
    headline: string;
    edgeConfidence: number;
  };
  stats: {
    walletAddress: string;
    nativeBalance: string;
    erc20Balance: string;
    allTimePnl: number;
    tradeCount: number;
    winRate: number;
    averageRR: number;
    riskScore: number;
    currentPhase: ExecutionPhase;
    lastTxHash: string | null;
    rpcHealthy: boolean;
    currentMarket: MarketSymbol;
    pace: number;
    nextTickSeconds: number;
    horizonScore: number;
    inFlight: number;
    biggestWin: number;
    globalRank: number;
    outperformDelta: number;
    lastRunnerAt: number | null;
    lastRunnerSource: AgentTriggerSource | "idle";
    cycleCount: number;
  };
};

export type AutoBotState = {
  enabled: boolean;
  mode: AutoBotMode;
  ledgerAddress: string;
  notionalUsdc: string;
  cooldownMs: number;
  objective: string;
  lastRunAt: number | null;
  lastError: string | null;
  lastMessage: string;
  lastDecision: string;
  nextAction: string;
  blockedReason: string;
  totalPrepared: number;
  totalSubmitted: number;
  signerAddress: string;
  pendingCount: number;
  lastTriggerSource: AgentTriggerSource | "idle";
  lastCycleStartedAt: number | null;
  lastCycleCompletedAt: number | null;
  cycleCount: number;
};
