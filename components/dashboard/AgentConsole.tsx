"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type AgentConsoleProps = {
  onProviderUpdate: (provider: string) => void;
};

export function AgentConsole({ onProviderUpdate }: AgentConsoleProps) {
  const [question, setQuestion] = useState("Explain USDC decimals");
  const [answer, setAnswer] = useState("Ask the Arc agent about current signals, config, or risk decisions.");
  const [docs, setDocs] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function askAgent() {
    setLoading(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const payload = (await response.json()) as {
        answer: string;
        provider: string;
        docs: string[];
        warnings: string[];
      };
      setAnswer(payload.answer);
      setDocs(payload.docs);
      setWarnings(payload.warnings);
      onProviderUpdate(payload.provider);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "Agent request failed.");
      setWarnings([]);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Agent Console</h2>
        <p className="text-xs text-terminal-muted">Groq for hard reasoning, Ollama default fallback</p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row">
          <Input value={question} onChange={(event) => setQuestion(event.target.value)} />
          <Button onClick={askAgent} disabled={loading}>
            {loading ? "Thinking..." : "Ask Agent"}
          </Button>
        </div>
        <div className="border border-terminal-border bg-terminal-panelAlt p-3 text-sm leading-6 text-terminal-text">
          {answer}
        </div>
        {docs.length > 0 ? (
          <div className="text-xs text-terminal-muted">Docs: {docs.join(" | ")}</div>
        ) : null}
        {warnings.length > 0 ? (
          <div className="text-xs text-terminal-negative">Warnings: {warnings.join(" | ")}</div>
        ) : null}
      </div>
    </Card>
  );
}
