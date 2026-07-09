import fs from "node:fs/promises";
import path from "node:path";

const targets = [
  path.join(process.cwd(), "docs", "arc", "arc-llms-latest.txt"),
  path.join(
    process.cwd(),
    ".agents",
    "skills",
    "use-arc-quant-dashboard",
    "references",
    "arc-llms-latest.txt"
  )
];

try {
  const response = await fetch("https://docs.arc.io/llms.txt");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const text = await response.text();
  await Promise.all(targets.map((target) => fs.writeFile(target, text, "utf8")));
  for (const target of targets) {
    console.log(`Updated ${target}`);
  }
} catch (error) {
  console.log(`WARN: Unable to refresh Arc docs. ${error instanceof Error ? error.message : error}`);
}
