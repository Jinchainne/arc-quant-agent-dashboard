import { Card } from "@/components/ui/Card";
import type { SimulationState } from "@/lib/trading/types";
import { formatUtc } from "@/lib/utils/time";

export function LiveFeed({ state }: { state: SimulationState | null }) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Live Feed</h2>
        <p className="text-xs text-terminal-muted">Polymarket bot style tape</p>
      </div>
      <div className="grid grid-cols-[56px_1fr_70px] gap-x-3 gap-y-2 text-xs">
        {state?.feed.map((entry) => (
          <>
            <div key={`${entry.id}-tone`} className="border border-terminal-border px-2 py-2 text-center">
              <span
                className={
                  entry.tone === "good"
                    ? "text-terminal-positive"
                    : entry.tone === "bad"
                      ? "text-terminal-negative"
                      : "text-terminal-accent"
                }
              >
                {entry.tone.toUpperCase()}
              </span>
            </div>
            <div key={`${entry.id}-msg`} className="border border-terminal-border px-3 py-2 text-terminal-text">
              {entry.message}
            </div>
            <div key={`${entry.id}-time`} className="border border-terminal-border px-2 py-2 text-right text-terminal-muted">
              {formatUtc(entry.timestamp).slice(11, 19)}
            </div>
          </>
        )) ?? <p className="text-terminal-muted">Waiting for first execution cycle.</p>}
      </div>
    </Card>
  );
}
