import { createInitialMarketState } from "@/lib/trading/marketSimulator";
import type { MarketSymbol, RiskStatus, SimulationState, StrategySignal, TradeRecord } from "@/lib/trading/types";

export const tradeStore: {
  markets: Record<MarketSymbol, { timestamp: number; price: number }[]>;
  trades: TradeRecord[];
  feed: Array<{ id: string; tone: "info" | "good" | "bad"; message: string; timestamp: number }>;
  pnlSeries: Array<{ index: number; pnl: number }>;
  monteCarlo: SimulationState["monteCarlo"];
  lastSignal: StrategySignal | null;
  risk: RiskStatus;
  allTimePnl: number;
} = {
  markets: createInitialMarketState(),
  trades: [],
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
  allTimePnl: 0
};
