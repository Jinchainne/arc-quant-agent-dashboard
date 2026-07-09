import { getPositionSizeUsdc6 } from "@/lib/trading/positionSizing";
import type { MarketSymbol, StrategySignal } from "@/lib/trading/types";

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function generateStrategySignal(
  market: MarketSymbol,
  prices: number[],
  accountValue: number
): StrategySignal {
  const latest = prices.at(-1) ?? 0;
  const prev = prices.at(-2) ?? latest;
  const mean = prices.reduce((sum, value) => sum + value, 0) / Math.max(1, prices.length);
  const variance =
    prices.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, prices.length);
  const stdev = Math.sqrt(variance);
  const momentum = ((latest - prev) / Math.max(prev, 0.0001)) * 100;
  const zScore = stdev === 0 ? 0 : (latest - mean) / stdev;

  const candidates: StrategySignal[] = [
    {
      market,
      strategy: "Momentum",
      action: momentum > 0.25 ? "BUY" : momentum < -0.25 ? "SELL" : "HOLD",
      confidence: clampConfidence(Math.abs(momentum) * 170),
      notionalUsdc6: 0n,
      stopLoss: latest * 0.988,
      takeProfit: latest * 1.018,
      reason: `Momentum spread ${momentum.toFixed(2)}% versus prior tick.`,
      riskFlags: []
    },
    {
      market,
      strategy: "Mean Reversion",
      action: zScore < -1.2 ? "BUY" : zScore > 1.2 ? "SELL" : "HOLD",
      confidence: clampConfidence(Math.abs(zScore) * 42),
      notionalUsdc6: 0n,
      stopLoss: latest * 0.985,
      takeProfit: latest * 1.014,
      reason: `Price deviation z-score ${zScore.toFixed(2)} against rolling mean.`,
      riskFlags: []
    },
    {
      market,
      strategy: "Volatility Breakout",
      action: stdev / Math.max(mean, 1) > 0.01 && latest > mean ? "BUY" : "HOLD",
      confidence: clampConfidence((stdev / Math.max(mean, 1)) * 6000),
      notionalUsdc6: 0n,
      stopLoss: latest * 0.981,
      takeProfit: latest * 1.022,
      reason: `Volatility ratio ${(stdev / Math.max(mean, 1)).toFixed(4)} with upside break.`,
      riskFlags: []
    }
  ];

  const chosen = candidates.sort((a, b) => b.confidence - a.confidence)[0];
  chosen.notionalUsdc6 = getPositionSizeUsdc6(accountValue, chosen.confidence);
  if (chosen.action === "HOLD") {
    chosen.riskFlags.push("No edge strong enough for execution.");
  }
  return chosen;
}
