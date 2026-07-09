import { NextRequest, NextResponse } from "next/server";

import { ARC_CHAIN_ID } from "@/lib/arc/constants";
import { getRpcHealth } from "@/lib/arc/rpc";
import { runExecutionCycle } from "@/lib/trading/executionCycle";
import { ensureTradeStoreLoaded } from "@/lib/trading/persistence";
import { formatUnits } from "viem";
import { getArcBalances } from "@/lib/arc/rpc";

export async function GET(request: NextRequest) {
  await ensureTradeStoreLoaded();

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

  const state = await runExecutionCycle({
    rpcHealthy,
    chainId: chainId ?? ARC_CHAIN_ID,
    walletConnected: address !== "0x0000000000000000000000000000000000000000",
    mode: "paper",
    address,
    nativeBalance,
    erc20Balance,
    lastTxHash: null
  });

  return NextResponse.json(state);
}
