import { redactSecrets } from "@/lib/agent/redactSecrets";

const groqModel = process.env.GROQ_MODEL ?? "qwen/qwen3-coder";

export async function runGroqChat(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Groq API key not configured.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: groqModel,
      messages: [{ role: "user", content: redactSecrets(prompt) }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() || "No Groq response received.";
}
