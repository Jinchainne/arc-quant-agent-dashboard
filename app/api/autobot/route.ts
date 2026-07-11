import { NextResponse } from "next/server";

import { getBurnerSignerAddress } from "@/lib/arc/serverExecutor";
import { persistTradeStore, reloadTradeStore } from "@/lib/trading/persistence";
import { tradeStore } from "@/lib/trading/tradeStore";

export async function GET() {
  await reloadTradeStore();

  const latestPending = [...tradeStore.trades]
    .reverse()
    .find((trade) => trade.status === "intent-pending" && trade.mode === "testnet-contract");

  return NextResponse.json({
    ...tradeStore.autoBot,
    signerAddress: tradeStore.autoBot.mode === "burner-key" ? getBurnerSignerAddress() : "",
    pendingCount: tradeStore.trades.filter((trade) => trade.status === "intent-pending").length,
    latestPending: latestPending
      ? {
          id: latestPending.id,
          market: latestPending.market,
          side: latestPending.side,
          notionalUsdc6: latestPending.notionalUsdc6.toString(),
          confidence: latestPending.confidence,
          reason: latestPending.reason
        }
      : null
  });
}

export async function POST(request: Request) {
  await reloadTradeStore();

  const body = (await request.json()) as {
    action?: "save" | "confirm-pending" | "reset-stats" | "reset-strategy";
    enabled?: boolean;
    mode?: "manual-wallet" | "burner-key";
    ledgerAddress?: string;
    notionalUsdc?: string;
    cooldownMs?: number;
    intentId?: string;
    txHash?: string;
  };

  if (body.action === "confirm-pending") {
    const trade = tradeStore.trades.find((entry) => entry.id === body.intentId);
    if (!trade) {
      return NextResponse.json({ ok: false, message: "Pending auto intent not found." }, { status: 404 });
    }

    trade.status = "intent-logged";
    trade.txHash = body.txHash;
    tradeStore.autoBot.totalSubmitted += 1;
    tradeStore.autoBot.lastError = null;
    tradeStore.autoBot.lastMessage = `Manual wallet confirmed ${trade.market} ${trade.side} on Arc testnet.`;
    await persistTradeStore();

    return NextResponse.json({ ok: true, message: "Pending auto intent confirmed." });
  }

  if (body.action === "reset-stats") {
    tradeStore.autoBot.totalPrepared = 0;
    tradeStore.autoBot.totalSubmitted = 0;
    tradeStore.autoBot.lastError = null;
    tradeStore.autoBot.lastMessage = "Auto bot counters reset.";
    await persistTradeStore();
    return NextResponse.json({ ok: true, message: "Auto bot counters reset." });
  }

  if (body.action === "reset-strategy") {
    tradeStore.trades = tradeStore.trades.filter((trade) => trade.status === "intent-logged");
    tradeStore.autoBot.totalPrepared = 0;
    tradeStore.autoBot.totalSubmitted = 0;
    tradeStore.autoBot.lastRunAt = null;
    tradeStore.autoBot.lastError = null;
    tradeStore.autoBot.lastMessage = "Strategy state reset. Loss streak and pending intents cleared.";
    tradeStore.risk = {
      approved: false,
      score: 72,
      phase: "Scan",
      flags: []
    };
    await persistTradeStore();
    return NextResponse.json({ ok: true, message: "Strategy state reset." });
  }

  tradeStore.autoBot = {
    ...tradeStore.autoBot,
    enabled: body.enabled ?? tradeStore.autoBot.enabled,
    mode: body.mode ?? tradeStore.autoBot.mode,
    ledgerAddress: body.ledgerAddress ?? tradeStore.autoBot.ledgerAddress,
    notionalUsdc: body.notionalUsdc ?? tradeStore.autoBot.notionalUsdc,
    cooldownMs: body.cooldownMs ?? tradeStore.autoBot.cooldownMs,
    lastMessage:
      body.enabled ?? tradeStore.autoBot.enabled
        ? "Auto bot armed. Waiting for the next approved cycle."
        : "Auto bot paused."
  };
  await persistTradeStore();

  return NextResponse.json({ ok: true, autoBot: tradeStore.autoBot });
}
