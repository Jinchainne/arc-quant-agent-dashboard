import { Card } from "@/components/ui/Card";

export function ModelStatus({ provider }: { provider: string }) {
  const details =
    provider === "groq"
      ? "Groq path active for deeper reasoning requests."
      : provider === "fallback"
        ? "Groq or Ollama fallback path was used."
        : "Ollama local model path is active by default.";

  return (
    <Card className="p-4">
      <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Model Status</h2>
      <div className="mt-3 border border-terminal-border px-3 py-2 text-sm text-terminal-text">
        Provider: {provider.toUpperCase()}
      </div>
      <p className="mt-3 text-xs text-terminal-muted">{details}</p>
    </Card>
  );
}
