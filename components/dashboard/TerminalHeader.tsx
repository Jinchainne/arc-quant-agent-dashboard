import { Activity, Cpu, Link2, Timer, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type TerminalHeaderProps = {
  walletConnected: boolean;
  chainId: number | null;
  rpcHealthy: boolean;
  modelProvider: string;
  utcTime: string;
  uptime: string;
  pace: number;
  globalRank: number;
  outperformDelta: number;
};

export function TerminalHeader({
  walletConnected,
  chainId,
  rpcHealthy,
  modelProvider,
  utcTime,
  uptime,
  pace,
  globalRank,
  outperformDelta
}: TerminalHeaderProps) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-grid bg-[size:24px_24px] opacity-25" />
      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-terminal-border pb-3 text-[11px] uppercase tracking-[0.24em] text-terminal-muted">
        <div className="flex flex-wrap items-center gap-4">
          <span>Q Claude × Quant</span>
          <span>Markov • Kelly • Self-Learn</span>
          <span>Global Rank #{globalRank}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span>Pace ${pace.toFixed(0)}/hr</span>
          <span>Out-performing by ${outperformDelta.toFixed(0)}</span>
          <span>{utcTime.slice(11, 19)}</span>
        </div>
      </div>
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-terminal-muted">Arc USDC Testnet Agent Terminal</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[0.2em] text-terminal-text">ARC QUANT AGENT</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="negative">TESTNET</Badge>
            <Badge tone="neutral">SIMULATION</Badge>
            <Badge tone={walletConnected ? "positive" : "negative"}>
              {walletConnected ? "WALLET CONNECTED" : "WALLET DISCONNECTED"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3 xl:grid-cols-5">
          <StatusItem icon={Wallet} label="Wallet" value={walletConnected ? "Injected" : "Not Connected"} />
          <StatusItem icon={Link2} label="Chain" value={chainId ? `${chainId}` : "Unknown"} />
          <StatusItem icon={Activity} label="RPC" value={rpcHealthy ? "Healthy" : "Degraded"} />
          <StatusItem icon={Cpu} label="Model" value={modelProvider.toUpperCase()} />
          <StatusItem icon={Timer} label="Uptime" value={`${utcTime} | ${uptime}`} />
        </div>
      </div>
    </Card>
  );
}

function StatusItem({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[140px] border border-terminal-border bg-terminal-panelAlt/70 p-3">
      <div className="flex items-center gap-2 text-terminal-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="mt-2 text-sm text-terminal-text">{value}</div>
    </div>
  );
}
