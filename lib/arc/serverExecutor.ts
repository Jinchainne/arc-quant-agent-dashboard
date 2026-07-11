import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";

import { arcTradeIntentLedgerAbi } from "@/lib/arc/intentLedger";
import { arcTradeIntentLedgerArtifact } from "@/lib/arc/intentLedgerArtifact";
import { arcTestnet } from "@/lib/arc/chain";
import { ARC_RPC_URL } from "@/lib/arc/constants";

function bumpBigInt(value: bigint, numerator = 12n, denominator = 10n) {
  return (value * numerator) / denominator;
}

function getBurnerPrivateKey() {
  const raw = process.env.AUTO_BURNER_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("AUTO_BURNER_PRIVATE_KEY is missing.");
  }

  const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (normalized.length !== 66) {
    throw new Error("AUTO_BURNER_PRIVATE_KEY must be a 32-byte hex string.");
  }

  return normalized as `0x${string}`;
}

export function getBurnerSignerAddress() {
  try {
    return privateKeyToAccount(getBurnerPrivateKey()).address;
  } catch {
    return "";
  }
}

export async function submitTradeIntentWithBurner(input: {
  ledgerAddress: `0x${string}`;
  market: string;
  side: string;
  notionalUsdc6: bigint;
  confidence: number;
  reason: string;
}) {
  if (!isAddress(input.ledgerAddress)) {
    throw new Error("Auto bot ledger address is invalid.");
  }

  const account = privateKeyToAccount(getBurnerPrivateKey());
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(ARC_RPC_URL)
  });
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_RPC_URL)
  });
  const fees = await publicClient.estimateFeesPerGas();

  const hash = await walletClient.writeContract({
    account,
    chain: arcTestnet,
    address: input.ledgerAddress,
    abi: arcTradeIntentLedgerAbi,
    functionName: "createTradeIntent",
    args: [input.market, input.side, input.notionalUsdc6, BigInt(input.confidence), input.reason],
    maxFeePerGas: fees.maxFeePerGas ? bumpBigInt(fees.maxFeePerGas, 14n, 10n) : undefined,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas ? bumpBigInt(fees.maxPriorityFeePerGas, 14n, 10n) : undefined
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return {
    hash,
    signerAddress: account.address
  };
}

export async function deployTradeIntentLedgerWithBurner() {
  const account = privateKeyToAccount(getBurnerPrivateKey());
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(ARC_RPC_URL)
  });
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_RPC_URL)
  });
  const fees = await publicClient.estimateFeesPerGas();
  const gas = await publicClient.estimateGas({
    account: account.address,
    data: arcTradeIntentLedgerArtifact.bytecode
  });

  const hash = await walletClient.sendTransaction({
    account,
    chain: arcTestnet,
    data: arcTradeIntentLedgerArtifact.bytecode,
    gas,
    maxFeePerGas: fees.maxFeePerGas ? bumpBigInt(fees.maxFeePerGas, 15n, 10n) : undefined,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas ? bumpBigInt(fees.maxPriorityFeePerGas, 15n, 10n) : undefined
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error("Burner deployment receipt did not include a contract address.");
  }

  return {
    hash,
    contractAddress: receipt.contractAddress,
    signerAddress: account.address
  };
}

export async function getArcTxStatus(hash: `0x${string}`) {
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_RPC_URL)
  });

  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash }).catch(() => null),
    publicClient.getTransactionReceipt({ hash }).catch(() => null)
  ]);

  if (!tx) {
    return {
      found: false,
      status: "missing" as const,
      contractAddress: null
    };
  }

  if (!receipt) {
    return {
      found: true,
      status: "pending" as const,
      contractAddress: null
    };
  }

  return {
    found: true,
    status: receipt.status === "success" ? ("confirmed" as const) : ("reverted" as const),
    contractAddress: receipt.contractAddress ?? null
  };
}
