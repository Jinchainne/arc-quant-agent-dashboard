import { Card } from "@/components/ui/Card";
import { ARC_MARKETS } from "@/lib/arc/constants";
import type { SimulationState } from "@/lib/trading/types";

const frames = ["1m", "5m", "15m", "1h"] as const;

function getCellTone(value: number) {
  if (value > 0.35) {
    return "bg-[#dff0de] text-terminal-positive";
  }
  if (value < -0.35) {
    return "bg-[#f3ddd8] text-terminal-negative";
  }
  return "bg-terminal-panelAlt text-terminal-muted";
}

export function RobustnessMatrix({ state }: { state: SimulationState | null }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Robustness Matrix</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-terminal-muted">
              <th className="border border-terminal-border px-3 py-2 text-left">Asset</th>
              {frames.map((frame) => (
                <th key={frame} className="border border-terminal-border px-3 py-2">
                  {frame}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ARC_MARKETS.map((market) => {
              const series = state?.markets[market] ?? [];
              return (
                <tr key={market}>
                  <td className="border border-terminal-border px-3 py-2 text-terminal-text">{market}</td>
                  {frames.map((frame, index) => {
                    const a = series[Math.max(0, series.length - 1 - index * 5)]?.price ?? 1;
                    const b = series[Math.max(0, series.length - 4 - index * 5)]?.price ?? a;
                    const score = (a - b) / Math.max(b, 1);
                    return (
                      <td
                        key={`${market}-${frame}`}
                        className={`border border-terminal-border px-3 py-2 text-center ${getCellTone(score)}`}
                      >
                        {(score * 100).toFixed(2)}%
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
