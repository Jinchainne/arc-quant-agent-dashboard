import fs from "node:fs/promises";
import path from "node:path";

import { cosineSimilarity } from "@/lib/docs/cosine";
import { readVectorStore } from "@/lib/docs/vectorStore";

type SearchResult = {
  path: string;
  title: string;
  snippet: string;
};

function keywordScore(query: string, content: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = content.toLowerCase();
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

function cheapVector(query: string) {
  const counts = new Array(16).fill(0);
  for (const character of query) {
    counts[character.charCodeAt(0) % counts.length] += 1;
  }
  return counts;
}

export async function searchArcDocs(query: string) {
  const docsDir = path.join(process.cwd(), "docs", "arc");
  const vectors = await readVectorStore();
  const files = await fs.readdir(docsDir);
  const markdownFiles = files.filter((file) => file.endsWith(".md") || file.endsWith(".txt"));
  const docs = await Promise.all(
    markdownFiles.map(async (file) => {
      const fullPath = path.join(docsDir, file);
      const content = await fs.readFile(fullPath, "utf8");
      return { file, content };
    })
  );

  if (vectors.length > 0) {
    const queryVector = cheapVector(query);
    return vectors
      .map((entry) => ({
        path: entry.path,
        title: entry.title,
        snippet: entry.snippet,
        score: cosineSimilarity(queryVector, entry.vector)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  return docs
    .map<SearchResult & { score: number }>(({ file, content }) => ({
      path: `docs/arc/${file}`,
      title: file.replace(/[-.]/g, " "),
      snippet: content.slice(0, 260).replace(/\s+/g, " ").trim(),
      score: keywordScore(query, content)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}
