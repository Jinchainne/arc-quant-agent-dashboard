"use client";

import { useState } from "react";

import { logTradeIntentWithBrowserWallet } from "@/lib/arc/wallet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type TradeControlsProps = {
  onRefresh: () => Promise<void>;
  lastSignalMarket?: string;
  signal?: {
    action: "BUY" | "SELL" | "HOLD";
    confidence: number;
    reason: string;
  } | null;
};

export function TradeControls({ onRefresh, lastSignalMarket, signal }: TradeControlsProps) {
  const [mode, setMode] = useState<"paper" | "testnet-intent" | "testnet-contract">("paper");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState(
    "Paper mode is active by default. Any testnet mode requires explicit user confirmation."
  );
  const [notional, setNotional] = useState("250");
  const [pending, setPending] = useState(false);

  async function submitTrade() {
    setPending(true);
    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          mode,
          confirmed,
          market: lastSignalMarket,
          notionalUsdc: notional,
          side: signal?.action ?? "HOLD",
          confidence: signal?.confidence ?? 0,
          reason: signal?.reason ?? "Manual testnet intent."
        })
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message: string;
        intentId?: string;
        ledgerAddress?: `0x${string}`;
        intent?: {
          market: string;
          side: string;
          notionalUsdc6: string;
          confidence: number;
          reason: string;
        };
      };
      setMessage(payload.message);

      if (!payload.ok) {
        return;
      }

      if (mode === "testnet-contract") {
        if (!payload.ledgerAddress) {
          setMessage("Ledger address missing. Set NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS in .env.");
          return;
        }

        const txHash = await logTradeIntentWithBrowserWallet({
          ledgerAddress: payload.ledgerAddress,
          market: payload.intent?.market ?? lastSignalMarket ?? "BTC/USDC-SIM",
          side: payload.intent?.side ?? signal?.action ?? "HOLD",
          notionalUsdc6: BigInt(payload.intent?.notionalUsdc6 ?? "0"),
          confidence: payload.intent?.confidence ?? signal?.confidence ?? 0,
          reason: payload.intent?.reason ?? signal?.reason ?? "Manual testnet intent."
        });

        const confirmResponse = await fetch("/api/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            intentId: payload.intentId,
            txHash
          })
        });
        const confirmPayload = (await confirmResponse.json()) as { message: string; txHash?: string };
        setMessage(`${confirmPayload.message} ${confirmPayload.txHash ?? ""}`.trim());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Trade flow failed.");
    } finally {
      setPending(false);
      await onRefresh();
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Trade Controls</h2>
        <p className="text-xs text-terminal-negative">TESTNET / SIM ONLY</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select
          className="border border-terminal-border bg-terminal-panelAlt px-3 py-2 text-sm text-terminal-text outline-none"
          value={mode}
          onChange={(event) =>
            setMode(event.target.value as "paper" | "testnet-intent" | "testnet-contract")
          }
        >
          <option value="paper">paper mode</option>
          <option value="testnet-intent">testnet-intent mode</option>
          <option value="testnet-contract">testnet-contract mode</option>
        </select>
        <Input value={notional} onChange={(event) => setNotional(event.target.value)} placeholder="USDC notional" />
        <label className="flex items-center gap-2 border border-terminal-border px-3 py-2 text-xs text-terminal-muted">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          I confirm this is only a testnet trade intent, not real trading.
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={submitTrade} disabled={pending}>
          {pending ? "Awaiting..." : "Submit Mode Check"}
        </Button>
        <Button variant="ghost" onClick={onRefresh}>
          Run Cycle
        </Button>
      </div>
      <div className="mt-4 border border-terminal-border bg-terminal-panelAlt p-3 text-xs text-terminal-text">{message}</div>
    </Card>
  );
}
