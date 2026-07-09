import fs from "node:fs/promises";
import path from "node:path";

const outputPath = path.join(process.cwd(), "docs", "arc", "seed-sim-data.json");
const markets = ["BTC/USDC-SIM", "ETH/USDC-SIM", "SOL/USDC-SIM", "ARC-GAS/USDC-SIM"];
const now = Date.now();

const data = markets.map((market, marketIndex) => ({
  market,
  ticks: Array.from({ length: 24 }, (_, index) => ({
    timestamp: now - (23 - index) * 60_000,
    price: Number((100 + marketIndex * 25 + Math.sin(index / 4) * 5 + index * 0.8).toFixed(4))
  }))
}));

await fs.writeFile(outputPath, JSON.stringify(data, null, 2), "utf8");
console.log(`Seeded ${outputPath}`);
