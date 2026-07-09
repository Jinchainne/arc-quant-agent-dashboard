import { ARC_MARKETS } from "@/lib/arc/constants";
import type { MarketCandle, MarketSymbol } from "@/lib/trading/types";

const basePrices: Record<MarketSymbol, number> = {
  "BTC/USDC-SIM": 108240,
  "ETH/USDC-SIM": 6040,
  "SOL/USDC-SIM": 214,
  "ARC-GAS/USDC-SIM": 1
};

function jitter(price: number, magnitude: number) {
  const drift = (Math.random() - 0.48) * magnitude;
  return Math.max(0.0001, price + drift);
}

export function createInitialMarketState() {
  const now = Date.now();
  return Object.fromEntries(
    ARC_MARKETS.map((market) => [
      market,
      Array.from({ length: 30 }, (_, index) => ({
        timestamp: now - (29 - index) * 60_000,
        price: jitter(basePrices[market], basePrices[market] * 0.01)
      }))
    ])
  ) as Record<MarketSymbol, MarketCandle[]>;
}

export function advanceMarketState(current: Record<MarketSymbol, MarketCandle[]>) {
  const now = Date.now();
  const next = { ...current };

  for (const market of ARC_MARKETS) {
    const series = next[market];
    const lastPrice = series[series.length - 1]?.price ?? basePrices[market];
    const amplitude = market === "ARC-GAS/USDC-SIM" ? 0.012 : lastPrice * 0.008;
    const price = jitter(lastPrice, amplitude);
    next[market] = [...series.slice(-59), { timestamp: now, price }];
  }

  return next;
}
