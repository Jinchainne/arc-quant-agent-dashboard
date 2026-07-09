import fs from "node:fs/promises";
import path from "node:path";

const vectorStorePath = path.join(process.cwd(), "docs", "arc", "vectors.json");

export type VectorEntry = {
  path: string;
  title: string;
  snippet: string;
  vector: number[];
};

export async function readVectorStore() {
  try {
    const raw = await fs.readFile(vectorStorePath, "utf8");
    return JSON.parse(raw) as VectorEntry[];
  } catch {
    return [];
  }
}

export async function writeVectorStore(entries: VectorEntry[]) {
  await fs.writeFile(vectorStorePath, JSON.stringify(entries, null, 2), "utf8");
}
