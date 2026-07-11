import { ARC_EXPLORER_URL } from "@/lib/arc/constants";
import { Card } from "@/components/ui/Card";
import type { SimulationState } from "@/lib/trading/types";
import { formatAddress, formatCurrency, formatCompactNumber } from "@/lib/utils/format";
import { formatUtc } from "@/lib/utils/time";

export function RecentTrades({ state }: { state: SimulationState | null }) {
  const trades = [...(state?.trades ?? [])].reverse().slice(0, 8);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Recent Trades</h2>
        <p className="text-xs text-terminal-muted">Persisted local intent and fill log</p>
      </div>
      <div className="space-y-2 text-xs">
        {trades.length === 0 ? (
          <div className="border border-terminal-border px-3 py-3 text-terminal-muted">
            No trades yet. Run cycles or prepare a testnet intent.
          </div>
        ) : null}
        {trades.map((trade) => (
          <div key={trade.id} className="grid grid-cols-[72px_1.1fr_88px_88px_90px] gap-3 border border-terminal-border px-3 py-2">
            <div className="text-terminal-muted">{formatUtc(trade.timestamp).slice(11, 19)}</div>
            <div className="text-terminal-text">
              <div>
                {trade.market} {trade.side} {trade.status}
              </div>
              <div className="mt-1 text-[11px] text-terminal-muted">
                {trade.chainStatus ?? "simulated"}{trade.txHash ? ` • ${formatAddress(trade.txHash)}` : ""}
              </div>
            </div>
            <div className={trade.pnl >= 0 ? "text-terminal-positive" : "text-terminal-negative"}>
              {formatCurrency(trade.pnl)}
            </div>
            <div className="text-right text-terminal-muted">{formatCompactNumber(Number(trade.notionalUsdc6) / 1e6)} USDC</div>
            <div className="text-right text-terminal-muted">
              {trade.txHash ? (
                <a
                  className="text-terminal-accent underline-offset-2 hover:underline"
                  href={`${ARC_EXPLORER_URL}/tx/${trade.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open tx
                </a>
              ) : (
                "No tx"
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
