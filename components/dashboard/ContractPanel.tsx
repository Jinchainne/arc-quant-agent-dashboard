"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deployTradeIntentLedgerWithBrowserWallet } from "@/lib/arc/wallet";
import { getExplorerAddressUrl, getExplorerTxUrl } from "@/lib/arc/explorer";
import { formatAddress } from "@/lib/utils/format";
import { ARC_CHAIN_ID } from "@/lib/arc/constants";

type ContractPanelProps = {
  walletConnected: boolean;
  chainId: number | null;
  ledgerAddress: string;
  deploymentTxHash: string;
  onDeploySubmitted: (txHash: string) => void;
  onLedgerDeployed: (next: { ledgerAddress: string; txHash: string }) => void;
};

export function ContractPanel({
  walletConnected,
  chainId,
  ledgerAddress,
  deploymentTxHash,
  onDeploySubmitted,
  onLedgerDeployed
}: ContractPanelProps) {
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<"idle" | "switching" | "prompt" | "submitted" | "confirmed" | "error">("idle");
  const [message, setMessage] = useState(
    ledgerAddress
      ? "Ledger is ready for testnet-contract mode."
      : "Deploy a fresh ArcTradeIntentLedger with your browser wallet to enable real Arc testnet logging."
  );
  const diagnosticRows = useMemo(
    () => [
      { label: "Wallet", value: walletConnected ? "Connected" : "Missing", tone: walletConnected ? "ok" : "warn" },
      {
        label: "Chain",
        value: chainId === ARC_CHAIN_ID ? `Arc ${ARC_CHAIN_ID}` : chainId ? `Wrong (${chainId})` : "Unknown",
        tone: chainId === ARC_CHAIN_ID ? "ok" : "warn"
      },
      { label: "Deploy Tx", value: deploymentTxHash ? "Seen" : "Waiting", tone: deploymentTxHash ? "ok" : "warn" },
      { label: "Ledger", value: ledgerAddress ? "Live" : "Not deployed", tone: ledgerAddress ? "ok" : "warn" }
    ],
    [chainId, deploymentTxHash, ledgerAddress, walletConnected]
  );

  async function deployLedger() {
    setPending(true);
    setStage("switching");
    setMessage("Switching to Arc Testnet and preparing deploy transaction...");
    try {
      setStage("prompt");
      setMessage("Confirm the deploy transaction in your browser wallet. Tx hash will appear right after submit.");
      const deployed = await deployTradeIntentLedgerWithBrowserWallet({
        onSubmitted: (hash) => {
          setStage("submitted");
          onDeploySubmitted(hash);
          setMessage("Deploy transaction submitted. You can open Arc explorer while waiting for the receipt.");
        }
      });
      onLedgerDeployed({
        ledgerAddress: deployed.contractAddress,
        txHash: deployed.hash
      });
      setStage("confirmed");
      setMessage("Ledger deployed successfully. Contract mode can now write real testnet intents.");
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Contract deployment failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.24em] text-terminal-text">Contract Panel</h2>
        <p className="text-xs text-terminal-accent">ARC TESTNET LEDGER</p>
      </div>
      <div className="space-y-3 text-sm">
        <Row label="Wallet" value={walletConnected ? "Connected" : "Connect wallet first"} />
        <Row label="Ledger" value={ledgerAddress ? formatAddress(ledgerAddress) : "Not deployed yet"} />
        <Row label="Deploy Tx" value={deploymentTxHash ? `${deploymentTxHash.slice(0, 14)}...` : "None"} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={deployLedger} disabled={!walletConnected || pending}>
              {pending ? "Deploying..." : ledgerAddress ? "Redeploy Ledger" : "Deploy Ledger"}
            </Button>
            {ledgerAddress ? (
              <a
                href={getExplorerAddressUrl(ledgerAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-terminal-border px-3 py-2 text-xs uppercase tracking-[0.2em] text-terminal-muted hover:text-terminal-text"
              >
                Contract
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {deploymentTxHash ? (
              <a
                href={getExplorerTxUrl(deploymentTxHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-terminal-border px-3 py-2 text-xs uppercase tracking-[0.2em] text-terminal-muted hover:text-terminal-text"
              >
                Deploy Tx
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
          <div className="border border-terminal-border bg-terminal-panelAlt p-3 text-xs text-terminal-text">
            {message}
          </div>
        </div>
        <div className="grid gap-2 text-[11px] text-terminal-muted md:grid-cols-2">
          {diagnosticRows.map((entry) => (
            <div key={entry.label} className="border border-terminal-border bg-terminal-panelAlt px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted">{entry.label}</div>
              <div className={entry.tone === "ok" ? "mt-1 text-terminal-positive" : "mt-1 text-terminal-accent"}>
                {entry.value}
              </div>
            </div>
          ))}
          <div className="border border-terminal-border bg-terminal-panelAlt px-3 py-2 md:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted">Deploy Checklist</div>
            <div className="mt-1 space-y-1 text-terminal-text">
              <p>1. Connect wallet and hold Arc testnet gas.</p>
              <p>2. Switch to chain ID {ARC_CHAIN_ID}.</p>
              <p>3. Confirm deploy in wallet popup.</p>
              <p>4. Open explorer from `Deploy Tx` even before receipt finalizes.</p>
            </div>
          </div>
          <div className="border border-terminal-border bg-terminal-panelAlt px-3 py-2 md:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted">Deploy Stage</div>
            <div className="mt-1 text-terminal-text">{formatStage(stage)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatStage(stage: "idle" | "switching" | "prompt" | "submitted" | "confirmed" | "error") {
  switch (stage) {
    case "switching":
      return "Switching network and preparing bytecode deployment.";
    case "prompt":
      return "Waiting for wallet confirmation popup.";
    case "submitted":
      return "Transaction submitted. Waiting for contract receipt.";
    case "confirmed":
      return "Contract receipt confirmed on Arc testnet.";
    case "error":
      return "Deployment hit an error. Check wallet popup, chain, and explorer.";
    default:
      return "Ready to deploy a fresh ArcTradeIntentLedger.";
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-terminal-border px-3 py-2">
      <span className="text-terminal-muted">{label}</span>
      <span className="text-terminal-text">{value}</span>
    </div>
  );
}
