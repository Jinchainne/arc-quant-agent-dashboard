import { Card } from "@/components/ui/Card";
import type { SimulationState } from "@/lib/trading/types";

export function RiskPanel({ state }: { state: SimulationState | null }) {
  const risk = state?.risk;

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Risk Panel</h2>
        <p className={risk?.approved ? "text-xs text-terminal-positive" : "text-xs text-terminal-negative"}>
          {risk?.approved ? "APPROVED" : "CONSTRAINED"}
        </p>
      </div>
      <div className="border border-terminal-border px-3 py-2 text-sm text-terminal-text">
        Risk score: {risk?.score ?? "--"}
      </div>
      <div className="mt-3 space-y-2 text-xs">
        {risk?.flags.length ? (
          risk.flags.map((flag) => (
            <div key={flag} className="border border-terminal-border bg-[#f3ddd8] px-3 py-2 text-terminal-negative">
              {flag}
            </div>
          ))
        ) : (
          <div className="border border-terminal-border bg-[#dff0de] px-3 py-2 text-terminal-positive">
            No blocking risk flags in the latest cycle.
          </div>
        )}
      </div>
    </Card>
  );
}
