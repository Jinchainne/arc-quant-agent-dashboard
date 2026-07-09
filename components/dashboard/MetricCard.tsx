import { Card } from "@/components/ui/Card";

export function MetricCard({
  label,
  value,
  accent,
  hint
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative" | "neutral";
  hint?: string;
}) {
  const accentClass =
    accent === "positive"
      ? "text-terminal-positive"
      : accent === "negative"
        ? "text-terminal-negative"
        : "text-terminal-text";

  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-terminal-muted">{label}</p>
      <p className={`mt-3 text-xl font-semibold ${accentClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-terminal-muted">{hint}</p> : null}
    </Card>
  );
}
