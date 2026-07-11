"use client";

import { Card } from "@/components/ui/Card";
import { ARC_EXPLORER_URL } from "@/lib/arc/constants";
import type { SimulationState } from "@/lib/trading/types";
import { formatAddress } from "@/lib/utils/format";
import { formatUtc } from "@/lib/utils/time";

export function ChainActivityPanel({ state }: { state: SimulationState | null }) {
  const rows = state?.activityLog?.slice(0, 10) ?? [];

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">On-chain Activity</h2>
        <p className="text-xs text-terminal-muted">Runner, intents, tx confirmations</p>
      </div>
      <div className="space-y-2 text-xs">
        {rows.length === 0 ? (
          <div className="border border-terminal-border px-3 py-3 text-terminal-muted">
            No chain activity yet. Arm the bot or submit a testnet intent.
          </div>
        ) : null}
        {rows.map((entry) => (
          <div
            key={entry.id}
            className="grid grid-cols-[74px_74px_1fr_84px] items-start gap-3 border border-terminal-border px-3 py-2"
          >
            <div className={statusClassName(entry.status)}>{entry.status.toUpperCase()}</div>
            <div className="text-terminal-muted">{entry.source}</div>
            <div className="text-terminal-text">
              <div>{entry.message}</div>
              {entry.txHash ? (
                <a
                  className="mt-1 inline-block text-terminal-accent underline-offset-2 hover:underline"
                  href={`${ARC_EXPLORER_URL}/tx/${entry.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatAddress(entry.txHash)}
                </a>
              ) : null}
            </div>
            <div className="text-right text-terminal-muted">{formatUtc(entry.timestamp).slice(11, 19)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function statusClassName(status: NonNullable<SimulationState["activityLog"]>[number]["status"]) {
  if (status === "confirmed" || status === "submitted") {
    return "text-terminal-positive";
  }
  if (status === "error" || status === "reverted") {
    return "text-terminal-negative";
  }
  if (status === "prepared" || status === "pending") {
    return "text-terminal-accent";
  }
  return "text-terminal-muted";
}
