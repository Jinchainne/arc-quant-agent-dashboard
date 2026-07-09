import { redactSecrets } from "@/lib/agent/redactSecrets";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const model = process.env.LOCAL_CHAT_MODEL ?? "qwen2.5-coder:7b";

export async function runOllamaChat(prompt: string) {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt: redactSecrets(prompt),
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama unavailable. Start Ollama and pull ${model}.`);
  }

  const payload = (await response.json()) as { response?: string };
  return payload.response?.trim() || "No Ollama response received.";
}
