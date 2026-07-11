import { NextRequest, NextResponse } from "next/server";

import { ARC_CHAIN_ID } from "@/lib/arc/constants";
import { getBurnerSignerAddress } from "@/lib/arc/serverExecutor";
import { getRpcHealth } from "@/lib/arc/rpc";
import { runExecutionCycle } from "@/lib/trading/executionCycle";
import { reloadTradeStore } from "@/lib/trading/persistence";
import { tradeStore } from "@/lib/trading/tradeStore";
import { toJsonSafe } from "@/lib/utils/jsonResponse";
import { formatUnits } from "viem";
import { getArcBalances } from "@/lib/arc/rpc";

export async function GET(request: NextRequest) {
  try {
    await reloadTradeStore();

    const address =
      request.nextUrl.searchParams.get("address") ??
      "0x0000000000000000000000000000000000000000";

    let rpcHealthy = false;
    let chainId: number | null = null;
    let nativeBalance = "0.00";
    let erc20Balance = "0.00";

    try {
      const health = await getRpcHealth();
      rpcHealthy = health.healthy;
      chainId = health.chainId;
    } catch {
      rpcHealthy = false;
      chainId = null;
    }

    try {
      if (address !== "0x0000000000000000000000000000000000000000") {
        const balances = await getArcBalances(address as `0x${string}`);
        nativeBalance = formatUnits(balances.nativeBalance, 18);
        erc20Balance = formatUnits(balances.erc20Balance, 6);
      }
    } catch {
      nativeBalance = "0.00";
      erc20Balance = "0.00";
    }

    const autoActive = tradeStore.autoBot.enabled && Boolean(tradeStore.autoBot.ledgerAddress);
    const autoMode = autoActive ? "testnet-contract" : "paper";
    const burnerAddress = getBurnerSignerAddress();
    const effectiveAddress =
      autoActive && tradeStore.autoBot.mode === "burner-key" && burnerAddress ? burnerAddress : address;

    const state = await runExecutionCycle({
      rpcHealthy,
      chainId: chainId ?? ARC_CHAIN_ID,
      walletConnected:
        autoActive && tradeStore.autoBot.mode === "burner-key"
          ? Boolean(burnerAddress)
          : address !== "0x0000000000000000000000000000000000000000",
      mode: autoMode,
      address: effectiveAddress,
      nativeBalance,
      erc20Balance,
      lastTxHash: null
    });

    return NextResponse.json(toJsonSafe(state));
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Market route failed."
      },
      { status: 500 }
    );
  }
}
