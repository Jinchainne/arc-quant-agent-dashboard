"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { logTradeIntentWithBrowserWallet } from "@/lib/arc/wallet";
import { formatAddress } from "@/lib/utils/format";

type AutoBotConfig = {
  enabled: boolean;
  mode: "manual-wallet" | "burner-key";
  ledgerAddress: string;
  notionalUsdc: string;
  cooldownMs: number;
  lastRunAt: number | null;
  lastError: string | null;
  lastMessage: string;
  totalPrepared: number;
  totalSubmitted: number;
  signerAddress: string;
  pendingCount: number;
  latestPending: {
    id: string;
    market: string;
    side: string;
    notionalUsdc6: string;
    confidence: number;
    reason: string;
  } | null;
};

type AutoBotPanelProps = {
  defaultLedgerAddress: string;
  walletConnected: boolean;
  onRefresh: () => Promise<void>;
};

export function AutoBotPanel({ defaultLedgerAddress, walletConnected, onRefresh }: AutoBotPanelProps) {
  const [config, setConfig] = useState<AutoBotConfig | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Loading auto bot config...");

  async function loadConfig() {
    const response = await fetch("/api/autobot");
    const payload = (await response.json()) as AutoBotConfig;
    setConfig(payload);
    setMessage(payload.lastError ?? payload.lastMessage);
  }

  useEffect(() => {
    loadConfig().catch(() => undefined);
    const timer = window.setInterval(() => {
      loadConfig().catch(() => undefined);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!config || config.ledgerAddress || !defaultLedgerAddress) {
      return;
    }

    setConfig({
      ...config,
      ledgerAddress: defaultLedgerAddress
    });
  }, [config, defaultLedgerAddress]);

  async function save(nextEnabled = config?.enabled ?? false) {
    if (!config) {
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/autobot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          enabled: nextEnabled,
          mode: config.mode,
          ledgerAddress: config.ledgerAddress,
          notionalUsdc: config.notionalUsdc,
          cooldownMs: config.cooldownMs
        })
      });
      const payload = (await response.json()) as { ok: boolean; autoBot?: AutoBotConfig };
      if (payload.autoBot) {
        setConfig({
          ...config,
          ...payload.autoBot
        });
      }
      await loadConfig();
      await onRefresh();
    } finally {
      setPending(false);
    }
  }

  async function confirmLatestPending() {
    if (!config?.latestPending || !config.ledgerAddress) {
      setMessage("No pending auto intent is ready for manual wallet confirmation.");
      return;
    }

    setPending(true);
    try {
      const txHash = await logTradeIntentWithBrowserWallet({
        ledgerAddress: config.ledgerAddress as `0x${string}`,
        market: config.latestPending.market,
        side: config.latestPending.side,
        notionalUsdc6: BigInt(config.latestPending.notionalUsdc6),
        confidence: config.latestPending.confidence,
        reason: config.latestPending.reason
      });

      await fetch("/api/autobot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-pending",
          intentId: config.latestPending.id,
          txHash
        })
      });

      setMessage(`Manual wallet confirmed ${config.latestPending.market}.`);
      await loadConfig();
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Manual wallet confirmation failed.");
    } finally {
      setPending(false);
    }
  }

  if (!config) {
    return (
      <Card className="p-4 text-sm text-terminal-muted">
        Auto bot config is loading...
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Auto Bot</h2>
        <p className="text-xs text-terminal-accent">TESTNET EXECUTOR</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-xs uppercase tracking-[0.18em] text-terminal-muted">
          <span>Mode</span>
          <select
            className="w-full border border-terminal-border bg-terminal-panelAlt px-3 py-2 text-sm text-terminal-text outline-none"
            value={config.mode}
            onChange={(event) =>
              setConfig({
                ...config,
                mode: event.target.value as AutoBotConfig["mode"]
              })
            }
          >
            <option value="manual-wallet">Browser Wallet Mode</option>
            <option value="burner-key">Burner Mode</option>
          </select>
        </label>
        <label className="space-y-2 text-xs uppercase tracking-[0.18em] text-terminal-muted">
          <span>Cooldown Ms</span>
          <Input
            value={`${config.cooldownMs}`}
            onChange={(event) =>
              setConfig({
                ...config,
                cooldownMs: Number(event.target.value || "0")
              })
            }
          />
        </label>
        <label className="space-y-2 text-xs uppercase tracking-[0.18em] text-terminal-muted md:col-span-2">
          <span>Ledger Address</span>
          <Input
            value={config.ledgerAddress}
            onChange={(event) =>
              setConfig({
                ...config,
                ledgerAddress: event.target.value
              })
            }
            placeholder="0x..."
          />
        </label>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <Row label="Status" value={config.enabled ? "Armed" : "Paused"} />
        <Row label="Prepared" value={`${config.totalPrepared}`} />
        <Row label="Submitted" value={`${config.totalSubmitted}`} />
        <Row label="Pending" value={`${config.pendingCount}`} />
        <Row
          label="Signer"
          value={
            config.mode === "burner-key"
              ? config.signerAddress
                ? formatAddress(config.signerAddress)
                : "Set AUTO_BURNER_PRIVATE_KEY"
              : walletConnected
                ? "Browser wallet"
                : "Connect wallet to confirm"
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => save(!config.enabled)} disabled={pending}>
          {config.enabled ? "Pause Bot" : "Arm Bot"}
        </Button>
        <Button variant="ghost" onClick={() => save(config.enabled)} disabled={pending}>
          Save Config
        </Button>
        <Button
          variant="ghost"
          onClick={confirmLatestPending}
          disabled={pending || config.mode !== "manual-wallet" || !config.latestPending}
        >
          Confirm Latest Pending
        </Button>
      </div>
      <div className="mt-3 border border-terminal-border bg-terminal-panelAlt p-3 text-xs text-terminal-text">
        {message}
      </div>
      <div className="mt-3 grid gap-2 text-[11px] text-terminal-muted md:grid-cols-2">
        <div className="border border-terminal-border bg-terminal-panelAlt px-3 py-2">
          `Browser Wallet Mode`
          <br />
          Bot tự tạo testnet intent. Bạn chỉ xác nhận tx cuối cùng bằng ví trình duyệt.
        </div>
        <div className="border border-terminal-border bg-terminal-panelAlt px-3 py-2">
          `Burner Mode`
          <br />
          Bot tự ký và tự gửi tx testnet bằng `AUTO_BURNER_PRIVATE_KEY` trên server.
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-terminal-border px-3 py-2">
      <span className="text-terminal-muted">{label}</span>
      <span className="text-terminal-text">{value}</span>
    </div>
  );
}
