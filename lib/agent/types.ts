export type AgentProvider = "groq" | "ollama" | "fallback";

export type AgentResponse = {
  answer: string;
  provider: AgentProvider;
  fallbackUsed: boolean;
  docs: string[];
  warnings: string[];
};
