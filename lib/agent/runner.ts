import { formatUnits } from "viem";

import { appendActivityLog } from "@/lib/agent/activityLog";
import { ARC_CHAIN_ID } from "@/lib/arc/constants";
import { getArcBalances, getRpcHealth } from "@/lib/arc/rpc";
import { getArcTxStatus, getBurnerSignerAddress } from "@/lib/arc/serverExecutor";
import { buildSimulationStateSnapshot, runExecutionCycle } from "@/lib/trading/executionCycle";
import { persistTradeStore, reloadTradeStore } from "@/lib/trading/persistence";
import { tradeStore } from "@/lib/trading/tradeStore";
import type { AgentTriggerSource, ChainActivityStatus, SimulationState } from "@/lib/trading/types";

let activeRun: Promise<SimulationState> | null = null;

function mapTxStatus(status: "missing" | "pending" | "confirmed" | "reverted"): ChainActivityStatus {
  if (status === "confirmed") {
    return "confirmed";
  }
  if (status === "reverted") {
    return "reverted";
  }
  if (status === "pending") {
    return "pending";
  }
  return "error";
}

function hasPendingRunnerWindow() {
  const startedAt = tradeStore.autoBot.lastCycleStartedAt;
  const completedAt = tradeStore.autoBot.lastCycleCompletedAt;

  if (!startedAt) {
    return false;
  }

  return completedAt === null || completedAt < startedAt;
}

async function resolveRuntimeContext(addressOverride?: string) {
  const requestedAddress = addressOverride ?? "0x0000000000000000000000000000000000000000";
  const burnerAddress = getBurnerSignerAddress();
  const autoActive = tradeStore.autoBot.enabled && Boolean(tradeStore.autoBot.ledgerAddress);
  const effectiveAddress =
    autoActive && tradeStore.autoBot.mode === "burner-key" && burnerAddress ? burnerAddress : requestedAddress;

  let rpcHealthy = false;
  let chainId: number | null = null;
  let nativeBalance = "0.00";
  let erc20Balance = "0.00";

  try {
    const health = await getRpcHealth();
    rpcHealthy = health.healthy;
    chainId = health.chainId;
  } catch {
    rpcHealthy = false;
    chainId = null;
  }

  try {
    if (effectiveAddress !== "0x0000000000000000000000000000000000000000") {
      const balances = await getArcBalances(effectiveAddress as `0x${string}`);
      nativeBalance = formatUnits(balances.nativeBalance, 18);
      erc20Balance = formatUnits(balances.erc20Balance, 6);
    }
  } catch {
    nativeBalance = "0.00";
    erc20Balance = "0.00";
  }

  return {
    rpcHealthy,
    chainId: chainId ?? ARC_CHAIN_ID,
    walletConnected:
      autoActive && tradeStore.autoBot.mode === "burner-key"
        ? Boolean(burnerAddress)
        : effectiveAddress !== "0x0000000000000000000000000000000000000000",
    effectiveAddress,
    nativeBalance,
    erc20Balance,
    autoActive
  };
}

async function syncLoggedTradeStatuses() {
  let changed = false;
  const candidates = tradeStore.trades.filter((trade) => trade.txHash).slice(-12);

  for (const trade of candidates) {
    const status = await getArcTxStatus(trade.txHash as `0x${string}`).catch(() => null);
    if (!status) {
      continue;
    }

    const nextChainStatus = mapTxStatus(status.status);
    if (trade.chainStatus === nextChainStatus) {
      continue;
    }

    trade.chainStatus = nextChainStatus;
    if (nextChainStatus === "confirmed" && !trade.confirmedAt) {
      trade.confirmedAt = Date.now();
    }

    appendActivityLog({
      source: trade.runnerSource ?? "api",
      kind: "tx",
      status: nextChainStatus,
      message:
        nextChainStatus === "confirmed"
          ? `Arc tx confirmed for ${trade.market} ${trade.side}.`
          : nextChainStatus === "pending"
            ? `Arc tx still pending for ${trade.market} ${trade.side}.`
            : nextChainStatus === "reverted"
              ? `Arc tx reverted for ${trade.market} ${trade.side}.`
              : `Arc tx missing for ${trade.market} ${trade.side}.`,
      market: trade.market,
      txHash: trade.txHash
    });
    changed = true;
  }

  if (changed) {
    await persistTradeStore();
  }
}

async function executeRunnerCycle(input: { source: AgentTriggerSource; address?: string; forceAdvance?: boolean }) {
  await reloadTradeStore();
  await syncLoggedTradeStatuses();

  const runtime = await resolveRuntimeContext(input.address);
  const shouldAdvance = input.forceAdvance ?? (!tradeStore.autoBot.enabled || runtime.autoActive);

  if (!shouldAdvance) {
    return buildSimulationStateSnapshot({
      walletAddress: runtime.effectiveAddress,
      nativeBalance: runtime.nativeBalance,
      erc20Balance: runtime.erc20Balance,
      rpcHealthy: runtime.rpcHealthy,
      chainId: runtime.chainId,
      lastTxHash: null
    });
  }

  tradeStore.autoBot.lastTriggerSource = input.source;
  tradeStore.autoBot.lastCycleStartedAt = Date.now();
  appendActivityLog({
    source: input.source,
    kind: "runner",
    status: "info",
    message: `Runner cycle started via ${input.source}.`
  });

  try {
    const state = await runExecutionCycle({
      rpcHealthy: runtime.rpcHealthy,
      chainId: runtime.chainId,
      walletConnected: runtime.walletConnected,
      mode: runtime.autoActive ? "testnet-contract" : "paper",
      address: runtime.effectiveAddress,
      nativeBalance: runtime.nativeBalance,
      erc20Balance: runtime.erc20Balance,
      lastTxHash: null,
      source: input.source
    });

    tradeStore.autoBot.cycleCount += 1;
    tradeStore.autoBot.lastCycleCompletedAt = Date.now();
    appendActivityLog({
      source: input.source,
      kind: "cycle",
      status: "confirmed",
      message: `Runner cycle completed. Phase ${state.stats.currentPhase}, in-flight ${state.stats.inFlight}.`,
      market: state.stats.currentMarket
    });
    await persistTradeStore();
    return buildSimulationStateSnapshot({
      walletAddress: runtime.effectiveAddress,
      nativeBalance: runtime.nativeBalance,
      erc20Balance: runtime.erc20Balance,
      rpcHealthy: runtime.rpcHealthy,
      chainId: runtime.chainId,
      lastTxHash: state.stats.lastTxHash
    });
  } catch (error) {
    tradeStore.autoBot.lastCycleCompletedAt = Date.now();
    tradeStore.autoBot.lastError = error instanceof Error ? error.message : "Runner cycle failed.";
    appendActivityLog({
      source: input.source,
      kind: "runner",
      status: "error",
      message: tradeStore.autoBot.lastError
    });
    await persistTradeStore();
    throw error;
  }
}

export async function runAgentCycle(input: {
  source: AgentTriggerSource;
  address?: string;
  forceAdvance?: boolean;
}) {
  if (activeRun) {
    return activeRun;
  }

  if (hasPendingRunnerWindow()) {
    await reloadTradeStore();
  }

  activeRun = executeRunnerCycle(input);

  try {
    return await activeRun;
  } finally {
    activeRun = null;
  }
}
