import { NextResponse } from "next/server";

import { appendActivityLog } from "@/lib/agent/activityLog";
import {
  ENABLE_TESTNET_CONTRACT_MODE,
  PAPER_TRADING_ONLY,
  REAL_TRADING_DISABLED
} from "@/lib/arc/constants";
import type { MarketSymbol } from "@/lib/trading/types";
import { toUsdc6 } from "@/lib/arc/usdc";
import { persistTradeStore, reloadTradeStore } from "@/lib/trading/persistence";
import { tradeStore } from "@/lib/trading/tradeStore";

export async function POST(request: Request) {
  await reloadTradeStore();

  const body = (await request.json()) as {
    action?: "prepare" | "confirm";
    mode?: "paper" | "testnet-intent" | "testnet-contract";
    confirmed?: boolean;
    market?: string;
    notionalUsdc?: string;
    confidence?: number;
    reason?: string;
    side?: "BUY" | "SELL" | "HOLD";
    ledgerAddress?: string;
    intentId?: string;
    txHash?: string;
  };

  const action = body.action ?? "prepare";
  const mode = body.mode ?? "paper";
  const market = body.market ?? "BTC/USDC-SIM";
  const notionalUsdc = body.notionalUsdc ?? "0";
  const side = body.side ?? "HOLD";
  const reason = body.reason ?? "Manual testnet intent.";
  const confidence = body.confidence ?? 0;

  if (action === "confirm") {
    const intent = tradeStore.trades.find((trade) => trade.id === body.intentId);
    if (!intent) {
      return NextResponse.json({ ok: false, message: "Intent record not found." }, { status: 404 });
    }

    intent.status = "intent-logged";
    intent.txHash = body.txHash;
    intent.chainStatus = "pending";
    intent.submittedAt = Date.now();
    intent.runnerSource = "manual-wallet";
    appendActivityLog({
      source: "manual-wallet",
      kind: "tx",
      status: "submitted",
      message: `Manual wallet submitted ${intent.market} ${intent.side} to Arc testnet.`,
      market: intent.market,
      txHash: body.txHash
    });
    await persistTradeStore();

    return NextResponse.json({
      ok: true,
      message: "Trade intent confirmed and persisted locally.",
      txHash: body.txHash
    });
  }

  if (mode === "paper") {
    return NextResponse.json({
      ok: true,
      message: `Paper mode accepted for ${market} with ${notionalUsdc} USDC simulated notional.`
    });
  }

  if (PAPER_TRADING_ONLY || REAL_TRADING_DISABLED) {
    return NextResponse.json({
      ok: false,
      message: "Non-paper execution is blocked because PAPER_TRADING_ONLY or REAL_TRADING_DISABLED is enabled."
    });
  }

  if (!body.confirmed) {
    return NextResponse.json({
      ok: false,
      message: "Explicit confirmation is required. This only logs a testnet trade intent. It is not real trading."
    });
  }

  if (mode === "testnet-contract" && !ENABLE_TESTNET_CONTRACT_MODE) {
    return NextResponse.json({
      ok: false,
      message: "NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE is false, so contract mode remains unavailable."
    });
  }

  const intentId = crypto.randomUUID();
  tradeStore.trades = [
    ...tradeStore.trades.slice(-199),
    {
      id: intentId,
      market: market as MarketSymbol,
      strategy: "Momentum",
      side,
      confidence,
      notionalUsdc6: toUsdc6(notionalUsdc),
      entryPrice: 0,
      exitPrice: null,
      pnl: 0,
      rr: 0,
      reason,
      mode,
      timestamp: Date.now(),
      status: "intent-pending",
      chainStatus: "prepared",
      runnerSource: "manual-trade"
    }
  ];
  appendActivityLog({
    source: "manual-trade",
    kind: "intent",
    status: "prepared",
    message: `Prepared ${market} ${side} intent for manual contract submission.`,
    market: market as MarketSymbol
  });
  tradeStore.feed = [
    {
      id: crypto.randomUUID(),
      tone: "info" as const,
      message: `Intent prepared for ${market} ${side} ${notionalUsdc} USDC. Awaiting browser wallet confirmation.`,
      timestamp: Date.now()
    },
    ...tradeStore.feed
  ].slice(0, 16);
  await persistTradeStore();

  return NextResponse.json({
    ok: true,
    message: `Testnet intent acknowledged for ${market}. Browser wallet confirmation is still required for any on-chain log.`,
    intentId,
    ledgerAddress: body.ledgerAddress ?? process.env.NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS ?? "",
    intent: {
      market,
      side,
      notionalUsdc6: toUsdc6(notionalUsdc).toString(),
      confidence,
      reason
    }
  });
}
