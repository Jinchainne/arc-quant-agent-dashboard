import { tradeStore } from "@/lib/trading/tradeStore";
import type { ActivityLogEntry, AgentTriggerSource, ChainActivityStatus, MarketSymbol } from "@/lib/trading/types";

export function appendActivityLog(input: {
  source: AgentTriggerSource;
  kind: ActivityLogEntry["kind"];
  status: ChainActivityStatus;
  message: string;
  market?: MarketSymbol;
  txHash?: string;
}) {
  tradeStore.activityLog = [
    {
      id: crypto.randomUUID(),
      source: input.source,
      kind: input.kind,
      status: input.status,
      message: input.message,
      market: input.market,
      txHash: input.txHash,
      timestamp: Date.now()
    },
    ...tradeStore.activityLog
  ].slice(0, 40);
}
