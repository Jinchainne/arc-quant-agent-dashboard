import { runAgentCycle } from "@/lib/agent/runner";

const intervalMs = Number(process.env.AGENT_RUNNER_INTERVAL_MS ?? 12000);
const runOnce = process.argv.includes("--once");

let stopping = false;
let timer: NodeJS.Timeout | null = null;

async function tick(source: "local-runner") {
  try {
    const state = await runAgentCycle({
      source,
      forceAdvance: true
    });
    const lastTx = state.stats.lastTxHash ? state.stats.lastTxHash.slice(0, 14) : "none";
    console.log(
      `[agent-runner] cycle=${state.stats.cycleCount} phase=${state.stats.currentPhase} market=${state.stats.currentMarket} inFlight=${state.stats.inFlight} lastTx=${lastTx}`
    );
  } catch (error) {
    console.error("[agent-runner] cycle failed:", error instanceof Error ? error.message : error);
  }
}

async function start() {
  console.log(`[agent-runner] started. interval=${intervalMs}ms runOnce=${runOnce}`);
  await tick("local-runner");

  if (runOnce) {
    process.exit(0);
  }

  timer = setInterval(() => {
    if (stopping) {
      return;
    }
    tick("local-runner").catch(() => undefined);
  }, intervalMs);
}

function shutdown(signal: string) {
  stopping = true;
  if (timer) {
    clearInterval(timer);
  }
  console.log(`[agent-runner] received ${signal}, stopping.`);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  console.error("[agent-runner] fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
