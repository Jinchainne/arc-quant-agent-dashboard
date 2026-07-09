import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".sol", ".toml", ".json", ".md", ".example"]);
const ignoredDirs = new Set(["node_modules", ".git", "dist", "build", "out", ".next", "coverage"]);
const findings = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...(await walk(path.join(dir, entry.name))));
      }
      continue;
    }

    const ext = path.extname(entry.name);
    if (allowedExtensions.has(ext) || entry.name === ".env.example") {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

function push(level, message, file) {
  findings.push({ level, message, file });
}

function scanContent(file, content) {
  const isCodeFile = /\.(ts|tsx|js|jsx|sol|toml|json)$/i.test(file);

  if (/https:\/\/[^"'`\s]*mainnet|wallet_switchEthereumChain[^]*0x1/i.test(content)) {
    push("FAIL", "Possible mainnet execution path detected.", file);
  }
  if (/5042002/.test(content) === false && /Arc Testnet|arc\.network|arcscan/.test(content)) {
    push("WARN", "Arc reference present without explicit chain ID 5042002.", file);
  }
  if (/https:\/\/rpc\.testnet\.arc\.network/.test(content) === false && /Arc Testnet|arc\.network/.test(content)) {
    push("WARN", "Arc reference present without the expected Arc Testnet RPC.", file);
  }
  if (/nativeCurrency[^]{0,220}symbol\s*:\s*["'`]ETH["'`]/i.test(content)) {
    push("FAIL", "nativeCurrency appears to be set to ETH.", file);
  }
  if (isCodeFile && /(parseEther|formatEther)[^.\n]{0,80}(USDC|transfer|approve|allowance)/i.test(content)) {
    push("FAIL", "Ether helpers appear near USDC ERC-20 logic.", file);
  }
  if (/\bUSDC\b/.test(content) && /0x3600000000000000000000000000000000000000/.test(content) === false) {
    push("WARN", "USDC mentioned without the Arc ERC-20 USDC address.", file);
  }
  if (/private[_ -]?key\s*[:=]\s*["']?[a-z0-9/+]{16,}/i.test(content)) {
    push("FAIL", "Possible hardcoded private key detected.", file);
  }
  if (
    isCodeFile &&
    file.includes("redactSecrets") === false &&
    /\b(seed phrase|mnemonic)\b/i.test(content) &&
    /never|confirm no/i.test(content) === false
  ) {
    push("FAIL", "Seed phrase or mnemonic reference detected.", file);
  }
  if (/bearer\s+[a-z0-9._-]{12,}/i.test(content)) {
    push("FAIL", "Bearer token-like value detected.", file);
  }
  if (/(api[_ -]?key|token)\s*[:=]\s*["'][a-z0-9._-]{12,}["']/i.test(content)) {
    push("FAIL", "Possible committed API key or token detected.", file);
  }
  if (/real pnl|real profit|guaranteed profit/i.test(content) && /not real|simulat|do not/i.test(content) === false) {
    push("FAIL", "Real profit language detected.", file);
  }
  if (
    /auto[- ]?trade|auto[- ]?send|auto[- ]?execute/i.test(content) &&
    /never auto|no auto|does not auto|do not auto/i.test(content) === false
  ) {
    push("FAIL", "Automatic trading language detected.", file);
  }
}

const files = await walk(root);
for (const file of files) {
  const content = await fs.readFile(file, "utf8");
  scanContent(path.relative(root, file), content);
}

for (const finding of findings) {
  console.log(`${finding.level}: ${finding.file} -> ${finding.message}`);
}

if (findings.length === 0) {
  console.log("PASS: Arc config checks passed.");
  process.exit(0);
}

if (findings.some((finding) => finding.level === "FAIL")) {
  process.exit(1);
}

console.log("PASS: No FAIL findings detected.");
