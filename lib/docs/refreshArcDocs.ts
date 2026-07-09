import fs from "node:fs/promises";
import path from "node:path";

export async function refreshArcDocs() {
  const response = await fetch("https://docs.arc.io/llms.txt");
  if (!response.ok) {
    throw new Error(`Failed to fetch Arc docs index: ${response.status}`);
  }

  const text = await response.text();
  const docsPath = path.join(process.cwd(), "docs", "arc", "arc-llms-latest.txt");
  const skillPath = path.join(
    process.cwd(),
    ".agents",
    "skills",
    "use-arc-quant-dashboard",
    "references",
    "arc-llms-latest.txt"
  );

  await fs.writeFile(docsPath, text, "utf8");
  await fs.writeFile(skillPath, text, "utf8");
  return { docsPath, skillPath };
}
