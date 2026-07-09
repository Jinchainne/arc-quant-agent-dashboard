import { EXECUTION_PHASES, SIM_STARTING_USDC, SIM_TICK_MS } from "@/lib/arc/constants";
import { fromUsdc6 } from "@/lib/arc/usdc";
import { advanceMarketState, createInitialMarketState } from "@/lib/trading/marketSimulator";
import { runMonteCarlo } from "@/lib/trading/monteCarlo";
import { persistTradeStore } from "@/lib/trading/persistence";
import { summarizeTrades } from "@/lib/trading/pnlEngine";
import { evaluateRisk, getConsecutiveLosses } from "@/lib/trading/riskEngine";
import { generateStrategySignal } from "@/lib/trading/strategyEngine";
import { tradeStore } from "@/lib/trading/tradeStore";
import type { ExecutionMode, SimulationState, TradeRecord } from "@/lib/trading/types";

function buildFeed(message: string, tone: "info" | "good" | "bad") {
  return {
    id: crypto.randomUUID(),
    message,
    tone,
    timestamp: Date.now()
  };
}

function buildDecision(signal: NonNullable<SimulationState["lastSignal"]>, riskApproved: boolean) {
  const nodes = [
    { id: "tick", label: "Tick", x: 18, y: 108, status: "success" },
    { id: "scan", label: "Scan", x: 114, y: 108, status: "success" },
    { id: "classify", label: "Classify", x: 234, y: 108, status: "success" },
    { id: "conf", label: `${signal.confidence.toFixed(1)}%`, x: 364, y: 28, status: "active" },
    { id: "misprice", label: signal.strategy, x: 392, y: 108, status: "active" },
    { id: "validate", label: "Validate", x: 544, y: 74, status: riskApproved ? "success" : "warning" },
    { id: "hold", label: signal.action === "HOLD" ? "Hold" : "Fill", x: 544, y: 146, status: riskApproved ? "success" : "warning" },
    { id: "settle", label: riskApproved ? "PnL" : "Reject", x: 666, y: 108, status: riskApproved ? "success" : "warning" }
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
}) {
  const markets = advanceMarketState(tradeStore.markets ?? createInitialMarketState());
  tradeStore.markets = markets;

  const selectedMarket = Object.keys(markets)[Math.floor(Math.random() * Object.keys(markets).length)] as
    | keyof typeof markets
    | undefined;
  const market = selectedMarket ?? "BTC/USDC-SIM";
  const prices = markets[market].map((entry) => entry.price);
  const signal = generateStrategySignal(market, prices, SIM_STARTING_USDC + tradeStore.allTimePnl);
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
      status: input.mode === "paper" ? "filled" : "intent-logged",
      txHash: input.lastTxHash ?? undefined
    };
    tradeStore.trades = [...tradeStore.trades.slice(-199), trade];
  }

  const finalSummary = summarizeTrades(tradeStore.trades);
  const biggestWin = tradeStore.trades.reduce((max, entry) => Math.max(max, entry.pnl), 0);
  const pnlSeries = tradeStore.trades.map((entry, index) => ({
    index: index + 1,
    pnl: Number(
      tradeStore.trades.slice(0, index + 1).reduce((sum, item) => sum + item.pnl, 0).toFixed(2)
    )
  }));

  tradeStore.feed = [
    buildFeed(`Scan: ${market} tick processed against Arc RPC and local docs cache.`, "info"),
    buildFeed(`Detect: ${signal.strategy} -> ${signal.action} @ ${signal.confidence}% confidence.`, "good"),
    buildFeed(
      risk.approved
        ? `Validate: risk approved. Paper/testnet flow can proceed.`
        : `Validate: trade rejected. ${risk.flags.join(" ")}`,
      risk.approved ? "good" : "bad"
    ),
    ...(trade
      ? [buildFeed(`Fill: ${trade.status} for ${trade.market} with ${fromUsdc6(trade.notionalUsdc6)} USDC.`, "good")]
      : []),
    buildFeed(
      `Settle: simulated PnL ${finalSummary.allTimePnl.toFixed(2)} USDC. Phase ${
        risk.approved ? EXECUTION_PHASES[5] : EXECUTION_PHASES[2]
      }.`,
      risk.approved ? "good" : "info"
    ),
    ...tradeStore.feed
  ].slice(0, 16);

  tradeStore.lastSignal = signal;
  tradeStore.risk = risk;
  tradeStore.pnlSeries = pnlSeries;
  tradeStore.monteCarlo = runMonteCarlo(tradeStore.trades);
  const decision = buildDecision(signal, risk.approved);
  const pace = Math.max(0, Number((finalSummary.allTimePnl / Math.max(1, tradeStore.trades.length || 1) * 12).toFixed(2)));
  const horizonScore = Math.max(12, Math.min(99, Math.round((risk.score + signal.confidence) / 2)));
  const globalRank = Math.max(1, 5000 - tradeStore.trades.length * 7);
  const outperformDelta = Number((finalSummary.allTimePnl * 0.91).toFixed(0));
  const inFlight = tradeStore.trades.filter((entry) => entry.status === "intent-pending").length;

  await persistTradeStore();

  return {
    markets,
    lastSignal: signal,
    risk,
    trades: tradeStore.trades,
    feed: tradeStore.feed,
    pnlSeries,
    monteCarlo: tradeStore.monteCarlo,
    decision,
    stats: {
      walletAddress: input.address,
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
      outperformDelta
    }
  } satisfies SimulationState;
}
