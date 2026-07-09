import { runGroqChat } from "@/lib/agent/groqClient";
import { runOllamaChat } from "@/lib/agent/ollamaClient";
import { ARC_AGENT_SYSTEM_PROMPT } from "@/lib/agent/systemPrompt";
import type { AgentResponse } from "@/lib/agent/types";
import { searchArcDocs } from "@/lib/docs/searchArcDocs";

export async function routeAgentQuestion(question: string) {
  const docs = await searchArcDocs(question);
  const prompt = [
    ARC_AGENT_SYSTEM_PROMPT,
    "",
    "Local Arc docs context:",
    ...docs.map((entry) => `- ${entry.title}: ${entry.snippet}`),
    "",
    `User question: ${question}`
  ].join("\n");

  const preferGroq =
    Boolean(process.env.GROQ_API_KEY) &&
    /why|explain|review|validate|compare|decimal|risk|config/i.test(question);

  if (preferGroq) {
    try {
      const answer = await runGroqChat(prompt);
      return {
        answer,
        provider: "groq",
        fallbackUsed: false,
        docs: docs.map((entry) => entry.path),
        warnings: []
      } satisfies AgentResponse;
    } catch (error) {
      const answer = await runOllamaChat(prompt);
      return {
        answer,
        provider: "fallback",
        fallbackUsed: true,
        docs: docs.map((entry) => entry.path),
        warnings: [error instanceof Error ? error.message : "Groq failed."]
      } satisfies AgentResponse;
    }
  }

  try {
    const answer = await runOllamaChat(prompt);
    return {
      answer,
      provider: "ollama",
      fallbackUsed: false,
      docs: docs.map((entry) => entry.path),
      warnings: []
    } satisfies AgentResponse;
  } catch (error) {
    return {
      answer: "Ollama unavailable. Start Ollama and pull qwen2.5-coder:7b.",
      provider: "fallback",
      fallbackUsed: true,
      docs: docs.map((entry) => entry.path),
      warnings: [error instanceof Error ? error.message : "Ollama failed."]
    } satisfies AgentResponse;
  }
}
