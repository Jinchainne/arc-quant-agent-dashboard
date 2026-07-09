import type { ExecutionPhase } from "@/lib/trading/types";

import { Card } from "@/components/ui/Card";

const phases: ExecutionPhase[] = ["Scan", "Detect", "Validate", "Size", "Fill", "Settle"];

export function ExecutionCycle({ currentPhase }: { currentPhase: ExecutionPhase }) {
  const activeIndex = phases.indexOf(currentPhase);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Execution Cycle</h2>
        <p className="text-xs text-terminal-muted">Scan → Detect → Validate → Size → Fill → Settle</p>
      </div>
      <div className="grid gap-3 md:grid-cols-6">
        {phases.map((phase, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          return (
            <div
              key={phase}
              className={[
                "border px-3 py-4 text-center text-xs uppercase tracking-[0.2em]",
                isActive && "animate-pulseLine border-terminal-positive bg-[#dff0de] text-terminal-positive",
                isPast && "border-terminal-border bg-terminal-panelAlt text-terminal-text",
                !isActive && !isPast && "border-terminal-border/60 bg-transparent text-terminal-muted"
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {phase}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
