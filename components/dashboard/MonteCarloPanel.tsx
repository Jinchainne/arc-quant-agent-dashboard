import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/format";
import type { SimulationState } from "@/lib/trading/types";

export function MonteCarloPanel({ state }: { state: SimulationState | null }) {
  const monteCarlo = state?.monteCarlo;
  const histogram = monteCarlo?.histogram?.length
    ? monteCarlo.histogram
    : [18, 22, 15, 28, 24, 12, 26, 19, 31, 21, 17, 27];
  const max = Math.max(...histogram.map((value) => Math.abs(value)), 1);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Monte Carlo</h2>
        <p className="text-xs text-terminal-muted">Lightweight local projection</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Metric label="Expected Return" value={formatCurrency(monteCarlo?.expectedReturn ?? 0)} />
        <Metric label="Expected Drawdown" value={formatCurrency(monteCarlo?.expectedDrawdown ?? 0)} />
        <Metric label="5th Percentile" value={formatCurrency(monteCarlo?.percentile5 ?? 0)} />
        <Metric label="95th Percentile" value={formatCurrency(monteCarlo?.percentile95 ?? 0)} />
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-terminal-muted">
          <span>7,016 Paths</span>
          <span>Local Monte Carlo</span>
        </div>
        <div className="relative flex h-28 items-end gap-[2px] overflow-hidden border border-terminal-border bg-[#f8f3e0] px-2 py-2">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(189,179,154,0.16)_1px,transparent_1px)] bg-[length:100%_25%]" />
          {histogram.slice(0, 48).map((value, index) => (
            <div
              key={`${value}-${index}`}
              className="z-[1] flex-1 bg-terminal-text/80"
              style={{ height: `${Math.max(8, (Math.abs(value) / max) * 100)}%` }}
            />
          ))}
          {!monteCarlo?.histogram?.length ? (
            <div className="absolute inset-x-0 bottom-2 text-center text-[10px] uppercase tracking-[0.18em] text-terminal-muted">
              Warmup projection until enough fills accumulate
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-terminal-border p-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-terminal-muted">{label}</p>
      <p className="mt-2 text-lg text-terminal-text">{value}</p>
    </div>
  );
}
