"use client";

import { useEffect, useMemo, useState } from "react";

import { AgentConsole } from "@/components/dashboard/AgentConsole";
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
import { TradeControls } from "@/components/dashboard/TradeControls";
import { WalletPanel } from "@/components/dashboard/WalletPanel";
import { ARC_CHAIN_ID, ARC_MARKETS, SIM_TICK_MS } from "@/lib/arc/constants";
import { connectInjectedWallet, ensureArcNetwork, getInjectedChainId } from "@/lib/arc/wallet";
import type { MarketSymbol, SimulationState } from "@/lib/trading/types";
import { formatAddress, formatCurrency } from "@/lib/utils/format";
import { formatRelativeMs, formatUtc } from "@/lib/utils/time";

export default function Page() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketSymbol>("BTC/USDC-SIM");
  const [walletAddress, setWalletAddress] = useState("0x0000000000000000000000000000000000000000");
  const [walletConnected, setWalletConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState("ollama");
  const [startedAt] = useState(Date.now());

  async function refreshDashboard(nextAddress?: string) {
    const activeAddress = nextAddress ?? walletAddress;
    const response = await fetch(`/api/market?address=${activeAddress}`);
    const payload = (await response.json()) as SimulationState;
    setState(payload);
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

  useEffect(() => {
    const storedAddress =
      typeof window !== "undefined" ? window.localStorage.getItem("arc.walletAddress") : null;
    const storedMarket =
      typeof window !== "undefined" ? window.localStorage.getItem("arc.selectedMarket") : null;
    if (storedMarket && ARC_MARKETS.includes(storedMarket as MarketSymbol)) {
      setSelectedMarket(storedMarket as MarketSymbol);
    }
    if (storedAddress) {
      setWalletAddress(storedAddress);
      setWalletConnected(true);
      refreshDashboard(storedAddress).catch(() => undefined);
    } else {
      refreshDashboard().catch(() => undefined);
    }
    getInjectedChainId().then(setChainId).catch(() => setChainId(null));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("arc.selectedMarket", selectedMarket);
    }
  }, [selectedMarket]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshDashboard().catch(() => undefined);
      getInjectedChainId().then(setChainId).catch(() => undefined);
    }, SIM_TICK_MS);

    return () => window.clearInterval(timer);
  }, [walletAddress]);

  const metrics = useMemo(
    () => [
      { label: "Testnet Wallet", value: formatAddress(state?.stats.walletAddress ?? walletAddress), hint: "Injected or placeholder" },
      { label: "ERC-20 USDC Balance", value: state?.stats.erc20Balance ?? "0.00", hint: "6 decimals", accent: "neutral" as const },
      { label: "Native USDC Gas", value: state?.stats.nativeBalance ?? "0.00", hint: "18 decimals", accent: "neutral" as const },
      {
        label: "All-time PnL",
        value: formatCurrency(state?.stats.allTimePnl ?? 0),
        hint: "Simulated only",
        accent: (state?.stats.allTimePnl ?? 0) >= 0 ? ("positive" as const) : ("negative" as const)
      },
      { label: "Simulated Trades", value: `${state?.stats.tradeCount ?? 0}`, hint: "Last 200 capped" },
      { label: "Win Rate", value: `${(state?.stats.winRate ?? 0).toFixed(1)}%`, hint: "Filled trades only" },
      { label: "Average R/R", value: `${(state?.stats.averageRR ?? 0).toFixed(2)}`, hint: "Reward to risk" },
      { label: "Risk Score", value: `${state?.stats.riskScore ?? 0}`, hint: "Higher is safer" },
      { label: "Current Phase", value: state?.stats.currentPhase ?? "Scan", hint: "Execution cycle" },
      { label: "Last Tx Hash", value: state?.stats.lastTxHash ? `${state.stats.lastTxHash.slice(0, 12)}...` : "None", hint: "Optional testnet intent" }
    ],
    [state, walletAddress]
  );

  const biggestWin = formatCurrency(state?.stats.biggestWin ?? 0);

  return (
    <main className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <TerminalHeader
          walletConnected={walletConnected}
          chainId={chainId}
          rpcHealthy={state?.stats.rpcHealthy ?? false}
          modelProvider={provider}
          utcTime={formatUtc()}
          uptime={formatRelativeMs(Date.now() - startedAt)}
          pace={state?.stats.pace ?? 0}
          globalRank={state?.stats.globalRank ?? 0}
          outperformDelta={state?.stats.outperformDelta ?? 0}
        />

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_1fr]">
          <div className="border border-terminal-border bg-terminal-panel p-4 shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-terminal-muted">
                  {formatAddress(state?.stats.walletAddress ?? walletAddress)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-terminal-muted">Arc / Polygon / On-chain</p>
              </div>
              <span className="border border-terminal-positive/30 bg-[#dcefd9] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-terminal-positive">
                Verified
              </span>
            </div>
            <div className="mt-4 text-5xl font-semibold tracking-[0.08em] text-terminal-positive">
              {formatCurrency(state?.stats.allTimePnl ?? 0, 0)}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-terminal-muted">
              <span>All-time PnL • simulated</span>
              <span>{state?.trades.length ?? 0} cycles</span>
              <span>{(state?.stats.winRate ?? 0).toFixed(1)}% win</span>
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
              <PanelRow label="Market" value={state?.stats.currentMarket ?? "BTC/USDC-SIM"} />
              <PanelRow label="Model" value={provider.toUpperCase()} />
              <PanelRow label="Pace" value={`$${(state?.stats.pace ?? 0).toFixed(0)}/hr`} />
              <PanelRow label="Next Tick" value={`${state?.stats.nextTickSeconds ?? 3}s`} />
              <PanelRow label="Horizon" value={`${state?.stats.horizonScore ?? 0}/100`} />
              <PanelRow label="In Flight" value={`${state?.stats.inFlight ?? 0}`} />
            </div>
          </div>

          <MarketChart market={selectedMarket} state={state} />
        </div>

        <ExecutionCycle currentPhase={state?.stats.currentPhase ?? "Scan"} />

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
            <StrategyDecisionTree state={state} />
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <RobustnessMatrix state={state} />
              <PnlGrowthChart state={state} />
            </div>
          </div>

          <div className="space-y-4">
            <WalletPanel
              address={walletAddress}
              nativeBalance={state?.stats.nativeBalance ?? "0.00"}
              erc20Balance={state?.stats.erc20Balance ?? "0.00"}
              chainId={chainId}
              walletConnected={walletConnected}
              onConnect={connectWallet}
              onSwitch={switchToArc}
            />
            <RiskPanel state={state} />
            <ModelStatus provider={provider} />
            <TradeControls
              onRefresh={() => refreshDashboard()}
              lastSignalMarket={state?.lastSignal?.market}
              signal={
                state?.lastSignal
                  ? {
                      action: state.lastSignal.action,
                      confidence: state.lastSignal.confidence,
                      reason: state.lastSignal.reason
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
          <MonteCarloPanel state={state} />
          <LiveFeed state={state} />
        </div>

        <RecentTrades state={state} />

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

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border border-terminal-border px-3 py-2">
      <span className="text-terminal-muted">{label}</span>
      <span className="text-terminal-text">{value}</span>
    </div>
  );
}
