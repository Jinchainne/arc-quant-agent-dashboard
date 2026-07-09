import { Card } from "@/components/ui/Card";
import type { SimulationState } from "@/lib/trading/types";

export function StrategyDecisionTree({ state }: { state: SimulationState | null }) {
  const decision = state?.decision;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Strategy Decision Tree</h2>
        <p className="text-xs text-terminal-muted">Every trade traced</p>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <p className="text-terminal-muted">{decision?.headline ?? "Waiting for signal route."}</p>
        <p className="text-terminal-accent">Edge Conf {decision?.edgeConfidence.toFixed(1) ?? "--"}%</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox="0 0 740 220" className="min-w-[720px]">
          {decision?.edges.map((edge) => {
            const from = decision.nodes.find((node) => node.id === edge.from);
            const to = decision.nodes.find((node) => node.id === edge.to);
            if (!from || !to) {
              return null;
            }
            const startX = from.x + 46;
            const startY = from.y + 18;
            const endX = to.x;
            const endY = to.y + 18;
            const midX = (startX + endX) / 2;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                  fill="none"
                  stroke={edge.active ? "#6ca66a" : "#a59d89"}
                  strokeWidth={edge.active ? 2.4 : 1.2}
                  strokeDasharray={edge.active ? "0" : "4 3"}
                />
                {edge.label ? (
                  <text x={midX} y={(startY + endY) / 2 - 6} textAnchor="middle" fontSize="10" fill="#7a725d">
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {decision?.nodes.map((node) => {
            const tone =
              node.status === "active"
                ? { fill: "#f4df98", stroke: "#a7770f", text: "#5f460a" }
                : node.status === "success"
                  ? { fill: "#dff0de", stroke: "#4f8b57", text: "#295932" }
                  : node.status === "warning"
                    ? { fill: "#f3ddd8", stroke: "#b56c5b", text: "#713f35" }
                    : { fill: "#f6f1de", stroke: "#b7ae93", text: "#5c5545" };
            return (
              <g key={node.id}>
                <rect x={node.x} y={node.y} width="92" height="36" rx="3" fill={tone.fill} stroke={tone.stroke} />
                <text x={node.x + 46} y={node.y + 22} textAnchor="middle" fontSize="11" fill={tone.text}>
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}
