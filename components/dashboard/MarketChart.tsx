"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/Card";
import type { MarketSymbol, SimulationState } from "@/lib/trading/types";
import { formatCompactNumber } from "@/lib/utils/format";

export function MarketChart({
  market,
  state
}: {
  market: MarketSymbol;
  state: SimulationState | null;
}) {
  const data = state?.markets[market]?.map((entry) => ({
    time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    price: Number(entry.price.toFixed(4))
  })) ?? [];
  const last = data.at(-1)?.price ?? 0;
  const prev = data.at(-2)?.price ?? last;
  const delta = last - prev;

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Market Chart</h2>
        <div className="text-right">
          <p className="text-xs text-terminal-muted">{market} / 5-MIN</p>
          <p className={delta >= 0 ? "text-sm text-terminal-positive" : "text-sm text-terminal-negative"}>
            {formatCompactNumber(last)} {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}
          </p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" stroke="#73806f" tick={{ fontSize: 10 }} minTickGap={24} />
            <YAxis stroke="#73806f" tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={60} />
            <Tooltip contentStyle={{ background: "#f4efdc", border: "1px solid #bdb39a", fontSize: 12 }} />
            <Line type="monotone" dataKey="price" stroke="#b9d3ad" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
