import fs from "node:fs/promises";
import path from "node:path";

import { chunkText } from "@/lib/docs/chunkText";
import { writeVectorStore } from "@/lib/docs/vectorStore";

type OllamaEmbedResponse = {
  embedding?: number[];
};

function cheapVector(text: string) {
  const counts = new Array(16).fill(0);
  for (const character of text) {
    counts[character.charCodeAt(0) % counts.length] += 1;
  }
  return counts;
}

async function embedWithOllama(text: string) {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.LOCAL_EMBED_MODEL ?? "nomic-embed-text";
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt: text
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OllamaEmbedResponse;
  return payload.embedding ?? cheapVector(text);
}

async function main() {
  const docsDir = path.join(process.cwd(), "docs", "arc");
  const files = (await fs.readdir(docsDir)).filter((file) => file.endsWith(".md") || file.endsWith(".txt"));
  const entries = [];

  for (const file of files) {
    const content = await fs.readFile(path.join(docsDir, file), "utf8");
    const chunks = chunkText(content, 220);
    const snippet = chunks[0]?.slice(0, 240) ?? "";

    let vector: number[];
    try {
      vector = await embedWithOllama(chunks.join("\n"));
    } catch {
      vector = cheapVector(chunks.join("\n"));
    }

    entries.push({
      path: `docs/arc/${file}`,
      title: file.replace(/[-.]/g, " "),
      snippet,
      vector
    });
  }

  await writeVectorStore(entries);
  console.log(`Embedded ${entries.length} Arc docs files.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
