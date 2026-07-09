import type { TradeRecord } from "@/lib/trading/types";

export function runMonteCarlo(trades: TradeRecord[]) {
  const samples = trades.map((trade) => trade.pnl);
  const base = samples.length > 0 ? samples : [32, -18, 12, 26, -8];
  const runs = Array.from({ length: 48 }, () => {
    let pnl = 0;
    let peak = 0;
    let drawdown = 0;

    for (let index = 0; index < 24; index += 1) {
      pnl += base[Math.floor(Math.random() * base.length)];
      peak = Math.max(peak, pnl);
      drawdown = Math.min(drawdown, pnl - peak);
    }

    return { pnl, drawdown };
  }).sort((a, b) => a.pnl - b.pnl);

  const average = runs.reduce((sum, run) => sum + run.pnl, 0) / runs.length;
  const averageDrawdown = runs.reduce((sum, run) => sum + run.drawdown, 0) / runs.length;

  return {
    expectedReturn: average,
    expectedDrawdown: averageDrawdown,
    percentile5: runs[Math.floor(runs.length * 0.05)]?.pnl ?? average,
    percentile95: runs[Math.floor(runs.length * 0.95)]?.pnl ?? average,
    histogram: runs.map((run) => run.pnl)
  };
}
