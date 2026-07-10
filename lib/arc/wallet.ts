import { ARC_CHAIN_ID, ARC_EXPLORER_URL, ARC_RPC_URL } from "@/lib/arc/constants";
import { arcTestnet } from "@/lib/arc/chain";
import { arcTradeIntentLedgerArtifact } from "@/lib/arc/intentLedgerArtifact";
import { arcTradeIntentLedgerAbi } from "@/lib/arc/intentLedger";
import { createPublicClient, createWalletClient, custom, http, isAddress } from "viem";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
    };
  }
}

export async function connectInjectedWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Injected wallet not found.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts"
  })) as string[];

  return accounts[0] ?? null;
}

export async function getInjectedAccounts() {
  if (typeof window === "undefined" || !window.ethereum) {
    return [] as string[];
  }

  const accounts = (await window.ethereum.request({
    method: "eth_accounts"
  })) as string[];

  return accounts;
}

export async function getInjectedChainId() {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(chainIdHex, 16);
}

export async function ensureArcNetwork() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Injected wallet not found.");
  }

  const chainIdHex = `0x${ARC_CHAIN_ID.toString(16)}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }]
    });
  } catch {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: "Arc Testnet",
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
          rpcUrls: [ARC_RPC_URL],
          blockExplorerUrls: [ARC_EXPLORER_URL]
        }
      ]
    });
  }
}

export async function logTradeIntentWithBrowserWallet(input: {
  ledgerAddress: `0x${string}`;
  market: string;
  side: string;
  notionalUsdc6: bigint;
  confidence: number;
  reason: string;
}) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Injected wallet not found.");
  }

  if (!isAddress(input.ledgerAddress)) {
    throw new Error("Trade intent ledger address is not configured.");
  }

  await ensureArcNetwork();

  const account = await connectInjectedWallet();
  if (!account) {
    throw new Error("Wallet connection failed.");
  }

  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: custom(window.ethereum)
  });

  const hash = await walletClient.writeContract({
    account: account as `0x${string}`,
    chain: arcTestnet,
    address: input.ledgerAddress,
    abi: arcTradeIntentLedgerAbi,
    functionName: "createTradeIntent",
    args: [input.market, input.side, input.notionalUsdc6, BigInt(input.confidence), input.reason]
  });

  return hash;
}

export async function deployTradeIntentLedgerWithBrowserWallet(options?: {
  onSubmitted?: (hash: `0x${string}`) => void;
}) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Injected wallet not found.");
  }

  await ensureArcNetwork();

  const account = await connectInjectedWallet();
  if (!account) {
    throw new Error("Wallet connection failed.");
  }

  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: custom(window.ethereum)
  });

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_RPC_URL)
  });

  const gas = await publicClient.estimateGas({
    account: account as `0x${string}`,
    data: arcTradeIntentLedgerArtifact.bytecode
  });

  const hash = await walletClient.sendTransaction({
    account: account as `0x${string}`,
    chain: arcTestnet,
    data: arcTradeIntentLedgerArtifact.bytecode,
    gas
  });
  options?.onSubmitted?.(hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  if (!contractAddress) {
    throw new Error("Contract deployment receipt did not include a contract address.");
  }

  return {
    hash,
    contractAddress
  };
}
