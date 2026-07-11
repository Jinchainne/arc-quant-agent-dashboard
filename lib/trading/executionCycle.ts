import { EXECUTION_PHASES, SIM_STARTING_USDC, SIM_TICK_MS } from "@/lib/arc/constants";
import { appendActivityLog } from "@/lib/agent/activityLog";
import { deriveAutoBotPlanner } from "@/lib/agent/autobotPlanner";
import { fromUsdc6, toUsdc6 } from "@/lib/arc/usdc";
import { submitTradeIntentWithBurner } from "@/lib/arc/serverExecutor";
import { advanceMarketState, createInitialMarketState } from "@/lib/trading/marketSimulator";
import { runMonteCarlo } from "@/lib/trading/monteCarlo";
import { persistTradeStore } from "@/lib/trading/persistence";
import { summarizeTrades } from "@/lib/trading/pnlEngine";
import { evaluateRisk, getConsecutiveLosses } from "@/lib/trading/riskEngine";
import { generateStrategySignal } from "@/lib/trading/strategyEngine";
import { tradeStore } from "@/lib/trading/tradeStore";
import type { AgentTriggerSource, ExecutionMode, SimulationState, TradeRecord } from "@/lib/trading/types";

function buildFeed(message: string, tone: "info" | "good" | "bad") {
  return {
    id: crypto.randomUUID(),
    message,
    tone,
    timestamp: Date.now()
  };
}

function buildAutoIntentReason(reason: string) {
  return `AUTO BOT: ${reason}`;
}

function buildDecision(signal: NonNullable<SimulationState["lastSignal"]>, riskApproved: boolean) {
  const nodes = [
    { id: "tick", label: "Tick", x: 22, y: 112, status: "success" },
    { id: "scan", label: "Scan", x: 146, y: 112, status: "success" },
    { id: "classify", label: "Classify", x: 282, y: 112, status: "success" },
    { id: "conf", label: `${signal.confidence.toFixed(1)}%`, x: 448, y: 24, status: "active" },
    { id: "misprice", label: signal.strategy, x: 476, y: 112, status: "active" },
    { id: "validate", label: "Validate", x: 664, y: 68, status: riskApproved ? "success" : "warning" },
    { id: "hold", label: signal.action === "HOLD" ? "Hold" : "Fill", x: 664, y: 156, status: riskApproved ? "success" : "warning" },
    { id: "settle", label: riskApproved ? "PnL" : "Reject", x: 820, y: 112, status: riskApproved ? "success" : "warning" }
  ] as SimulationState["decision"]["nodes"];

  const edges = [
    { from: "tick", to: "scan", active: true },
    { from: "scan", to: "classify", active: true },
    { from: "classify", to: "conf", label: "edge conf", active: true },
    { from: "classify", to: "misprice", label: signal.market, active: true },
    { from: "conf", to: "validate", label: signal.action, active: true },
    { from: "misprice", to: "hold", label: signal.reason.slice(0, 18), active: true },
    { from: "validate", to: "settle", active: riskApproved },
    { from: "hold", to: "settle", active: true }
  ] satisfies SimulationState["decision"]["edges"];

  return {
    nodes,
    edges,
    headline: signal.reason,
    edgeConfidence: signal.confidence
  };
}

export async function runExecutionCycle(input: {
  rpcHealthy: boolean;
  chainId: number | null;
  walletConnected: boolean;
  mode: ExecutionMode;
  address: string;
  nativeBalance: string;
  erc20Balance: string;
  lastTxHash: string | null;
  source: AgentTriggerSource;
}) {
  const markets = advanceMarketState(tradeStore.markets ?? createInitialMarketState());
  tradeStore.markets = markets;
  if (tradeStore.autoBot.mode === "burner-key" && input.address !== "0x0000000000000000000000000000000000000000") {
    tradeStore.autoBot.signerAddress = input.address;
  }

  const selectedMarket = Object.keys(markets)[Math.floor(Math.random() * Object.keys(markets).length)] as
    | keyof typeof markets
    | undefined;
  const market = selectedMarket ?? "BTC/USDC-SIM";
  const prices = markets[market].map((entry) => entry.price);
  const rawSignal = generateStrategySignal(market, prices, SIM_STARTING_USDC + tradeStore.allTimePnl);
  const signal = tradeStore.autoBot.enabled
    ? {
        ...rawSignal,
        notionalUsdc6: toUsdc6(tradeStore.autoBot.notionalUsdc || "250")
      }
    : rawSignal;
  const summary = summarizeTrades(tradeStore.trades);
  tradeStore.allTimePnl = summary.allTimePnl;

  const risk = evaluateRisk({
    signal,
    rpcHealthy: input.rpcHealthy,
    chainId: input.chainId,
    accountValue: SIM_STARTING_USDC + summary.allTimePnl,
    walletConnected: input.walletConnected,
    mode: input.mode,
    dailyPnl: summary.allTimePnl,
    consecutiveLosses: getConsecutiveLosses(tradeStore.trades)
  });

  let trade: TradeRecord | null = null;
  const currentPrice = prices.at(-1) ?? 0;

  if (risk.approved) {
    const exitPrice =
      signal.action === "BUY"
        ? currentPrice * (1 + (Math.random() - 0.42) * 0.02)
        : currentPrice * (1 - (Math.random() - 0.42) * 0.02);
    const pnl =
      signal.action === "BUY"
        ? (exitPrice - currentPrice) * Number(fromUsdc6(signal.notionalUsdc6)) / Math.max(currentPrice, 1)
        : (currentPrice - exitPrice) * Number(fromUsdc6(signal.notionalUsdc6)) / Math.max(currentPrice, 1);

    trade = {
      id: crypto.randomUUID(),
      market: signal.market,
      strategy: signal.strategy,
      side: signal.action,
      confidence: signal.confidence,
      notionalUsdc6: signal.notionalUsdc6,
      entryPrice: currentPrice,
      exitPrice,
      pnl: Number(pnl.toFixed(2)),
      rr: Number(((signal.takeProfit - currentPrice) / Math.max(currentPrice - signal.stopLoss, 0.0001)).toFixed(2)),
      reason: signal.reason,
      mode: input.mode,
      timestamp: Date.now(),
      status: input.mode === "paper" ? "filled" : input.lastTxHash ? "intent-logged" : "intent-pending",
      txHash: input.lastTxHash ?? undefined,
      chainStatus: input.mode === "paper" ? "confirmed" : input.lastTxHash ? "pending" : "prepared",
      submittedAt: input.lastTxHash ? Date.now() : undefined,
      runnerSource: input.source
    };
    tradeStore.trades = [...tradeStore.trades.slice(-199), trade];
  }

  if (trade && tradeStore.autoBot.enabled && tradeStore.autoBot.ledgerAddress) {
    const now = Date.now();
    const cooledDown =
      tradeStore.autoBot.lastRunAt === null || now - tradeStore.autoBot.lastRunAt >= tradeStore.autoBot.cooldownMs;

    if (cooledDown) {
      trade.mode = "testnet-contract";
      trade.reason = buildAutoIntentReason(trade.reason);
      tradeStore.autoBot.lastRunAt = now;

      if (tradeStore.autoBot.mode === "manual-wallet") {
        trade.status = "intent-pending";
        trade.chainStatus = "prepared";
        tradeStore.autoBot.totalPrepared += 1;
        tradeStore.autoBot.lastError = null;
        tradeStore.autoBot.lastMessage = `Prepared ${trade.market} ${trade.side} intent. Manual wallet confirmation is required.`;
        appendActivityLog({
          source: input.source,
          kind: "intent",
          status: "prepared",
          message: `Prepared ${trade.market} ${trade.side} for browser-wallet confirmation.`,
          market: trade.market
        });
      } else {
        try {
          const submitted = await submitTradeIntentWithBurner({
            ledgerAddress: tradeStore.autoBot.ledgerAddress as `0x${string}`,
            market: trade.market,
            side: trade.side,
            notionalUsdc6: trade.notionalUsdc6,
            confidence: trade.confidence,
            reason: trade.reason
          });
          trade.status = "intent-logged";
          trade.txHash = submitted.hash;
          trade.chainStatus = "confirmed";
          trade.submittedAt = Date.now();
          trade.confirmedAt = Date.now();
          tradeStore.autoBot.signerAddress = submitted.signerAddress;
          tradeStore.autoBot.totalPrepared += 1;
          tradeStore.autoBot.totalSubmitted += 1;
          tradeStore.autoBot.lastError = null;
          tradeStore.autoBot.lastMessage = `Burner submitted ${trade.market} ${trade.side} on Arc testnet.`;
          appendActivityLog({
            source: "burner-executor",
            kind: "tx",
            status: "confirmed",
            message: `Burner confirmed ${trade.market} ${trade.side} on Arc testnet.`,
            market: trade.market,
            txHash: submitted.hash
          });
        } catch (error) {
          trade.status = "intent-pending";
          trade.chainStatus = "error";
          tradeStore.autoBot.totalPrepared += 1;
          tradeStore.autoBot.lastError =
            error instanceof Error ? error.message : "Burner signer could not write to Arc testnet.";
          tradeStore.autoBot.lastMessage = "Burner mode prepared an intent but could not submit it on-chain.";
          appendActivityLog({
            source: "burner-executor",
            kind: "tx",
            status: "error",
            message: tradeStore.autoBot.lastError,
            market: trade.market
          });
        }
      }
    }
  }
  finalizeExecutionCycle({
    trade,
    market,
    signal,
    risk,
    rpcHealthy: input.rpcHealthy,
    walletAddress: input.address,
    nativeBalance: input.nativeBalance,
    erc20Balance: input.erc20Balance,
    chainId: input.chainId,
    lastTxHash: input.lastTxHash
  });
  await persistTradeStore();
  return buildSimulationStateSnapshot({
    walletAddress: input.address,
    nativeBalance: input.nativeBalance,
    erc20Balance: input.erc20Balance,
    rpcHealthy: input.rpcHealthy,
    chainId: input.chainId,
    lastTxHash: input.lastTxHash
  });
}

function finalizeExecutionCycle(input: {
  trade: TradeRecord | null;
  market: string;
  signal: NonNullable<SimulationState["lastSignal"]>;
  risk: SimulationState["risk"];
  rpcHealthy: boolean;
  walletAddress: string;
  nativeBalance: string;
  erc20Balance: string;
  chainId: number | null;
  lastTxHash: string | null;
}) {
  const finalSummary = summarizeTrades(tradeStore.trades);
  const pnlSeries = tradeStore.trades.map((entry, index) => ({
    index: index + 1,
    pnl: Number(
      tradeStore.trades.slice(0, index + 1).reduce((sum, item) => sum + item.pnl, 0).toFixed(2)
    )
  }));

  tradeStore.feed = [
    buildFeed(`Scan: ${input.market} tick processed against Arc RPC and local docs cache.`, "info"),
    buildFeed(`Detect: ${input.signal.strategy} -> ${input.signal.action} @ ${input.signal.confidence}% confidence.`, "good"),
    buildFeed(
      input.risk.approved
        ? "Validate: risk approved. Paper/testnet flow can proceed."
        : `Validate: trade rejected. ${input.risk.flags.join(" ")}`,
      input.risk.approved ? "good" : "bad"
    ),
    ...(input.trade
      ? [
          buildFeed(
            `Fill: ${input.trade.status} for ${input.trade.market} with ${fromUsdc6(input.trade.notionalUsdc6)} USDC.`,
            input.trade.status === "intent-pending" ? "info" : "good"
          )
        ]
      : []),
    ...(tradeStore.autoBot.lastMessage
      ? [buildFeed(`Auto Bot: ${tradeStore.autoBot.lastMessage}`, tradeStore.autoBot.lastError ? "bad" : "info")]
      : []),
    buildFeed(
      `Settle: simulated PnL ${finalSummary.allTimePnl.toFixed(2)} USDC. Phase ${
        input.risk.approved ? EXECUTION_PHASES[5] : EXECUTION_PHASES[2]
      }.`,
      input.risk.approved ? "good" : "info"
    ),
    ...tradeStore.feed
  ].slice(0, 16);

  tradeStore.lastSignal = input.signal;
  tradeStore.risk = input.risk;
  tradeStore.pnlSeries = pnlSeries;
  tradeStore.monteCarlo = runMonteCarlo(tradeStore.trades);
  const inFlight = tradeStore.trades.filter((entry) => entry.status === "intent-pending").length;
  tradeStore.autoBot.pendingCount = inFlight;

  const planner = deriveAutoBotPlanner({
    autoBot: tradeStore.autoBot,
    risk: input.risk,
    signal: input.signal,
    latestTrade: input.trade,
    signerReady: tradeStore.autoBot.mode === "burner-key" ? Boolean(tradeStore.autoBot.signerAddress) : true
  });
  tradeStore.autoBot.objective = planner.objective;
  tradeStore.autoBot.lastDecision = planner.lastDecision;
  tradeStore.autoBot.nextAction = planner.nextAction;
  tradeStore.autoBot.blockedReason = planner.blockedReason;
}

export function buildSimulationStateSnapshot(input: {
  walletAddress: string;
  nativeBalance: string;
  erc20Balance: string;
  rpcHealthy: boolean;
  chainId: number | null;
  lastTxHash: string | null;
}) {
  const signal = tradeStore.lastSignal ?? generateStrategySignal("BTC/USDC-SIM", [100000, 100030, 99960], SIM_STARTING_USDC);
  const risk = tradeStore.risk;
  const finalSummary = summarizeTrades(tradeStore.trades);
  const biggestWin = tradeStore.trades.reduce((max, entry) => Math.max(max, entry.pnl), 0);
  const pace = Math.max(
    0,
    Number((finalSummary.allTimePnl / Math.max(1, tradeStore.trades.length || 1) * 12).toFixed(2))
  );
  const horizonScore = Math.max(12, Math.min(99, Math.round((risk.score + signal.confidence) / 2)));
  const globalRank = Math.max(1, 5000 - tradeStore.trades.length * 7);
  const outperformDelta = Number((finalSummary.allTimePnl * 0.91).toFixed(0));
  const inFlight = tradeStore.trades.filter((entry) => entry.status === "intent-pending").length;

  return {
    markets: tradeStore.markets,
    lastSignal: tradeStore.lastSignal,
    risk,
    trades: tradeStore.trades,
    activityLog: tradeStore.activityLog,
    feed: tradeStore.feed,
    pnlSeries: tradeStore.pnlSeries,
    monteCarlo: tradeStore.monteCarlo,
    decision: buildDecision(signal, risk.approved),
    stats: {
      walletAddress: input.walletAddress,
      nativeBalance: input.nativeBalance,
      erc20Balance: input.erc20Balance,
      allTimePnl: finalSummary.allTimePnl,
      tradeCount: finalSummary.tradeCount,
      winRate: finalSummary.winRate,
      averageRR: finalSummary.averageRR,
      riskScore: risk.score,
      currentPhase: risk.approved ? EXECUTION_PHASES[5] : EXECUTION_PHASES[2],
      lastTxHash: input.lastTxHash ?? [...tradeStore.trades].reverse().find((entry) => entry.txHash)?.txHash ?? null,
      rpcHealthy: input.rpcHealthy,
      currentMarket: signal.market,
      pace,
      nextTickSeconds: Math.max(1, Math.floor(SIM_TICK_MS / 1000)),
      horizonScore,
      inFlight,
      biggestWin,
      globalRank,
      outperformDelta,
      lastRunnerAt: tradeStore.autoBot.lastCycleCompletedAt,
      lastRunnerSource: tradeStore.autoBot.lastTriggerSource,
      cycleCount: tradeStore.autoBot.cycleCount
    }
  } satisfies SimulationState;
}
