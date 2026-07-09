import type { TradeRecord } from "@/lib/trading/types";

export function summarizeTrades(trades: TradeRecord[]) {
  const allTimePnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const closed = trades.filter((trade) => trade.status === "filled");
  const wins = closed.filter((trade) => trade.pnl > 0);
  const averageRR =
    closed.length === 0 ? 0 : closed.reduce((sum, trade) => sum + trade.rr, 0) / closed.length;

  return {
    allTimePnl,
    tradeCount: trades.length,
    winRate: closed.length === 0 ? 0 : (wins.length / closed.length) * 100,
    averageRR
  };
}
