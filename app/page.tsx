"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { AgentConsole } from "@/components/dashboard/AgentConsole";
import { AutoBotPanel } from "@/components/dashboard/AutoBotPanel";
import { ContractPanel } from "@/components/dashboard/ContractPanel";
import { ExecutionCycle } from "@/components/dashboard/ExecutionCycle";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { MarketChart } from "@/components/dashboard/MarketChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ModelStatus } from "@/components/dashboard/ModelStatus";
import { MonteCarloPanel } from "@/components/dashboard/MonteCarloPanel";
import { PnlGrowthChart } from "@/components/dashboard/PnlGrowthChart";
import { RecentTrades } from "@/components/dashboard/RecentTrades";
import { RiskPanel } from "@/components/dashboard/RiskPanel";
import { RobustnessMatrix } from "@/components/dashboard/RobustnessMatrix";
import { StrategyDecisionTree } from "@/components/dashboard/StrategyDecisionTree";
import { TerminalHeader } from "@/components/dashboard/TerminalHeader";
import { TickerTape } from "@/components/dashboard/TickerTape";
import { TradeControls } from "@/components/dashboard/TradeControls";
import { WalletPanel } from "@/components/dashboard/WalletPanel";
import { ARC_CHAIN_ID, ARC_MARKETS, EXECUTION_PHASES, SIM_TICK_MS } from "@/lib/arc/constants";
import {
  connectInjectedWallet,
  ensureArcNetwork,
  getInjectedAccounts,
  getInjectedChainId
} from "@/lib/arc/wallet";
import type { MarketSymbol, SimulationState } from "@/lib/trading/types";
import { formatAddress, formatCurrency } from "@/lib/utils/format";
import { formatRelativeMs, formatUtc } from "@/lib/utils/time";

export default function Page() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [liveState, setLiveState] = useState<SimulationState | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketSymbol>("BTC/USDC-SIM");
  const [walletAddress, setWalletAddress] = useState("0x0000000000000000000000000000000000000000");
  const [walletConnected, setWalletConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [ledgerAddress, setLedgerAddress] = useState("");
  const [deploymentTxHash, setDeploymentTxHash] = useState("");
  const [provider, setProvider] = useState("ollama");
  const [startedAt] = useState(Date.now());
  const [beat, setBeat] = useState(0);

  async function refreshDashboard(nextAddress?: string) {
    const activeAddress = nextAddress ?? walletAddress;
    const response = await fetch(`/api/market?address=${activeAddress}`);
    const raw = await response.text();
    if (!raw) {
      throw new Error("Empty response from /api/market.");
    }

    let payload: SimulationState;
    try {
      payload = JSON.parse(raw) as SimulationState;
    } catch {
      throw new Error(`Invalid JSON from /api/market: ${raw.slice(0, 120)}`);
    }

    if (!response.ok) {
      const message = (payload as unknown as { error?: string }).error ?? "Market route returned an error.";
      throw new Error(message);
    }

    startTransition(() => {
      setState(payload);
      setLiveState(payload);
    });
    if (activeAddress !== "0x0000000000000000000000000000000000000000") {
      window.localStorage.setItem("arc.walletAddress", activeAddress);
    }
  }

  async function connectWallet() {
    const address = await connectInjectedWallet();
    if (address) {
      setWalletAddress(address);
      setWalletConnected(true);
      await refreshDashboard(address);
    }
    setChainId(await getInjectedChainId());
  }

  async function switchToArc() {
    await ensureArcNetwork();
    setChainId(await getInjectedChainId());
  }

  function resetLocalState() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("arc.walletAddress");
      window.localStorage.removeItem("arc.selectedMarket");
      window.localStorage.removeItem("arc.ledgerAddress");
      window.localStorage.removeItem("arc.ledgerDeployTxHash");
    }
    setWalletAddress("0x0000000000000000000000000000000000000000");
    setWalletConnected(false);
    setLedgerAddress("");
    setDeploymentTxHash("");
    refreshDashboard("0x0000000000000000000000000000000000000000").catch(() => undefined);
  }

  useEffect(() => {
    async function bootstrap() {
      const storedMarket =
        typeof window !== "undefined" ? window.localStorage.getItem("arc.selectedMarket") : null;
      if (storedMarket && ARC_MARKETS.includes(storedMarket as MarketSymbol)) {
        setSelectedMarket(storedMarket as MarketSymbol);
      }
      const storedLedgerAddress =
        typeof window !== "undefined" ? window.localStorage.getItem("arc.ledgerAddress") : null;
      const storedDeploymentTxHash =
        typeof window !== "undefined" ? window.localStorage.getItem("arc.ledgerDeployTxHash") : null;
      if (storedLedgerAddress) {
        setLedgerAddress(storedLedgerAddress);
      }
      if (storedDeploymentTxHash) {
        setDeploymentTxHash(storedDeploymentTxHash);
      }

      const accounts = await getInjectedAccounts().catch(() => []);
      const liveAddress = accounts[0] ?? null;

      if (liveAddress) {
        setWalletAddress(liveAddress);
        setWalletConnected(true);
        await refreshDashboard(liveAddress);
      } else {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("arc.walletAddress");
        }
        setWalletConnected(false);
        setWalletAddress("0x0000000000000000000000000000000000000000");
        await refreshDashboard("0x0000000000000000000000000000000000000000");
      }

      const detectedChainId = await getInjectedChainId().catch(() => null);
      setChainId(detectedChainId);
    }

    bootstrap().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("arc.selectedMarket", selectedMarket);
    }
  }, [selectedMarket]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (ledgerAddress) {
      window.localStorage.setItem("arc.ledgerAddress", ledgerAddress);
    } else {
      window.localStorage.removeItem("arc.ledgerAddress");
    }
  }, [ledgerAddress]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (deploymentTxHash) {
      window.localStorage.setItem("arc.ledgerDeployTxHash", deploymentTxHash);
    } else {
      window.localStorage.removeItem("arc.ledgerDeployTxHash");
    }
  }, [deploymentTxHash]);

  useEffect(() => {
    const motionTimer = window.setInterval(() => {
      setBeat((current) => {
        const nextBeat = current + 1;
        setLiveState((liveCurrent) => animateSimulationState(liveCurrent, nextBeat));
        return nextBeat;
      });
    }, 450);

    return () => window.clearInterval(motionTimer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshDashboard().catch(() => undefined);
      getInjectedChainId().then(setChainId).catch(() => undefined);
    }, SIM_TICK_MS);

    return () => window.clearInterval(timer);
  }, [walletAddress]);

  const metrics = useMemo(
    () => [
      { label: "Testnet Wallet", value: formatAddress(liveState?.stats.walletAddress ?? walletAddress), hint: "Injected or placeholder" },
      { label: "ERC-20 USDC Balance", value: liveState?.stats.erc20Balance ?? "0.00", hint: "6 decimals", accent: "neutral" as const },
      { label: "Native USDC Gas", value: liveState?.stats.nativeBalance ?? "0.00", hint: "18 decimals", accent: "neutral" as const },
      {
        label: "All-time PnL",
        value: formatCurrency(liveState?.stats.allTimePnl ?? 0),
        hint: "Simulated only",
        accent: (liveState?.stats.allTimePnl ?? 0) >= 0 ? ("positive" as const) : ("negative" as const)
      },
      { label: "Simulated Trades", value: `${liveState?.stats.tradeCount ?? 0}`, hint: "Last 200 capped" },
      { label: "Win Rate", value: `${(liveState?.stats.winRate ?? 0).toFixed(1)}%`, hint: "Filled trades only" },
      { label: "Average R/R", value: `${(liveState?.stats.averageRR ?? 0).toFixed(2)}`, hint: "Reward to risk" },
      { label: "Risk Score", value: `${liveState?.stats.riskScore ?? 0}`, hint: "Higher is safer" },
      { label: "Current Phase", value: liveState?.stats.currentPhase ?? "Scan", hint: "Execution cycle" },
      { label: "Last Tx Hash", value: liveState?.stats.lastTxHash ? `${liveState.stats.lastTxHash.slice(0, 12)}...` : "None", hint: "Optional testnet intent" }
    ],
    [liveState, walletAddress]
  );

  const biggestWin = formatCurrency(liveState?.stats.biggestWin ?? 0);

  return (
    <main className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <TickerTape state={liveState} selectedMarket={selectedMarket} />
        <TerminalHeader
          walletConnected={walletConnected}
          chainId={chainId}
          rpcHealthy={liveState?.stats.rpcHealthy ?? false}
          modelProvider={provider}
          utcTime={formatUtc()}
          uptime={formatRelativeMs(Date.now() - startedAt)}
          pace={liveState?.stats.pace ?? 0}
          globalRank={liveState?.stats.globalRank ?? 0}
          outperformDelta={liveState?.stats.outperformDelta ?? 0}
        />

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_1fr]">
          <div className="border border-terminal-border bg-terminal-panel p-4 shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-terminal-muted">
                  {formatAddress(liveState?.stats.walletAddress ?? walletAddress)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-terminal-muted">Arc / Polygon / On-chain</p>
              </div>
              <span className="border border-terminal-positive/30 bg-[#dcefd9] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-terminal-positive">
                Verified
              </span>
            </div>
            <div className="mt-4 text-5xl font-semibold tracking-[0.08em] text-terminal-positive">
              {formatCurrency(liveState?.stats.allTimePnl ?? 0, 0)}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-terminal-muted">
              <span>All-time PnL • simulated</span>
              <span>{liveState?.trades.length ?? 0} cycles</span>
              <span>{(liveState?.stats.winRate ?? 0).toFixed(1)}% win</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {metrics.slice(4, 8).map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </div>

          <div className="border border-terminal-border bg-terminal-panel p-4 shadow-terminal">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-terminal-muted">Biggest Win</p>
              <span className="border border-terminal-accent/30 bg-[#f3e7c5] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-terminal-accent">
                Verified
              </span>
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-[0.08em] text-terminal-text">{biggestWin}</div>
            <div className="mt-4 space-y-2 text-sm">
              <PanelRow label="Market" value={liveState?.stats.currentMarket ?? "BTC/USDC-SIM"} />
              <PanelRow label="Model" value={provider.toUpperCase()} />
              <PanelRow label="Pace" value={`$${(liveState?.stats.pace ?? 0).toFixed(0)}/hr`} />
              <PanelRow label="Next Tick" value={`${liveState?.stats.nextTickSeconds ?? 3}s`} />
              <PanelRow label="Horizon" value={`${liveState?.stats.horizonScore ?? 0}/100`} />
              <PanelRow label="In Flight" value={`${liveState?.stats.inFlight ?? 0}`} />
            </div>
          </div>

          <MarketChart market={selectedMarket} state={liveState} />
        </div>

        <ExecutionCycle currentPhase={liveState?.stats.currentPhase ?? "Scan"} beat={beat} />

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ARC_MARKETS.map((market) => (
                <button
                  key={market}
                  className={`border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                    selectedMarket === market
                      ? "border-terminal-positive bg-[#dff0de] text-terminal-positive"
                      : "border-terminal-border text-terminal-muted"
                  }`}
                  onClick={() => setSelectedMarket(market)}
                >
                  {market}
                </button>
              ))}
            </div>
            <StrategyDecisionTree state={liveState} beat={beat} />
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <RobustnessMatrix state={liveState} />
              <PnlGrowthChart state={liveState} />
            </div>
          </div>

          <div className="space-y-4">
            <WalletPanel
              address={walletAddress}
              nativeBalance={liveState?.stats.nativeBalance ?? "0.00"}
              erc20Balance={liveState?.stats.erc20Balance ?? "0.00"}
              chainId={chainId}
              walletConnected={walletConnected}
              onConnect={connectWallet}
              onSwitch={switchToArc}
              onReset={resetLocalState}
            />
            <RiskPanel state={liveState} />
            <ModelStatus provider={provider} />
            <ContractPanel
              walletConnected={walletConnected}
              chainId={chainId}
              ledgerAddress={ledgerAddress}
              deploymentTxHash={deploymentTxHash}
              onDeploySubmitted={(txHash) => {
                setDeploymentTxHash(txHash);
              }}
              onLedgerDeployed={({ ledgerAddress: nextLedgerAddress, txHash }) => {
                setLedgerAddress(nextLedgerAddress);
                setDeploymentTxHash(txHash);
              }}
            />
            <AutoBotPanel
              defaultLedgerAddress={ledgerAddress}
              walletConnected={walletConnected}
              onRefresh={() => refreshDashboard()}
            />
            <TradeControls
              onRefresh={() => refreshDashboard()}
              lastSignalMarket={liveState?.lastSignal?.market}
              ledgerAddress={ledgerAddress}
              signal={
                liveState?.lastSignal
                  ? {
                      action: liveState.lastSignal.action,
                      confidence: liveState.lastSignal.confidence,
                      reason: liveState.lastSignal.reason
                    }
                  : null
              }
            />
            <div className="grid gap-4 md:grid-cols-2">
              {metrics.slice(0, 4).map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
              {metrics.slice(8, 10).map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <MonteCarloPanel state={liveState} />
          <LiveFeed state={liveState} />
        </div>

        <RecentTrades state={liveState} />

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <AgentConsole onProviderUpdate={setProvider} />
          <div className="border border-terminal-border bg-terminal-panel p-4 text-sm leading-7 text-terminal-muted">
            <p>Arc chain target: {ARC_CHAIN_ID}</p>
            <p>Native USDC gas uses 18 decimals. ERC-20 USDC uses 6 decimals.</p>
            <p>All fills, PnL, and strategy outputs shown here are simulation-first and testnet-only.</p>
            <p>On-chain activity requires explicit wallet confirmation and never uses private keys.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function animateSimulationState(current: SimulationState | null, beat: number): SimulationState | null {
  if (!current) {
    return current;
  }

  const phase = EXECUTION_PHASES[beat % EXECUTION_PHASES.length];
  const markets = Object.fromEntries(
    Object.entries(current.markets).map(([market, series]) => {
      const clone = [...series];
      const last = clone.at(-1);
      if (!last) {
        return [market, clone];
      }
      const amp = Math.max(last.price * 0.0009, market.includes("ARC-GAS") ? 0.0008 : 0.02);
      clone[clone.length - 1] = {
        ...last,
        timestamp: Date.now(),
        price: Number((last.price + Math.sin(beat / 2 + clone.length) * amp).toFixed(6))
      };
      return [market, clone];
    })
  ) as SimulationState["markets"];

  const pulseMessages = [
    "Microtick rebased from local simulation engine.",
    "Spread watcher updated signal ladder.",
    "Latency bucket recalculated execution pace.",
    "Risk tape ingested another synthetic fill window."
  ];

  const extraFeed =
    beat % 2 === 0
      ? [
          {
            id: `pulse-${beat}-${Date.now()}`,
            tone: (beat % 4 === 0 ? "good" : "info") as "good" | "info",
            message: pulseMessages[beat % pulseMessages.length],
            timestamp: Date.now()
          }
        ]
      : [];

  const decision = current.decision
    ? {
        ...current.decision,
        nodes: current.decision.nodes.map((node, index) => ({
          ...node,
          status:
            node.id === "settle" && phase === "Settle"
              ? ("success" as const)
              : index === (beat % current.decision.nodes.length)
                ? ("active" as const)
                : node.status === "warning"
                  ? ("warning" as const)
                  : ("success" as const)
        })),
        edges: current.decision.edges.map((edge, index) => ({
          ...edge,
          active: index <= (beat % current.decision.edges.length)
        }))
      }
    : current.decision;

  return {
    ...current,
    markets,
    feed: [...extraFeed, ...current.feed].slice(0, 18),
    decision,
    stats: {
      ...current.stats,
      currentPhase: phase,
      pace: Number((current.stats.pace + Math.sin(beat / 2) * 4).toFixed(2))
    }
  };
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border border-terminal-border px-3 py-2">
      <span className="text-terminal-muted">{label}</span>
      <span className="text-terminal-text">{value}</span>
    </div>
  );
}
