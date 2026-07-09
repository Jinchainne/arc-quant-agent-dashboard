import { NextRequest, NextResponse } from "next/server";
import { formatUnits, isAddress } from "viem";

import { getArcBalances } from "@/lib/arc/rpc";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      {
        nativeBalance: "0.00",
        erc20Balance: "0.00",
        warning: "Provide a valid address query param."
      },
      { status: 200 }
    );
  }

  try {
    const balances = await getArcBalances(address);
    return NextResponse.json({
      nativeBalance: formatUnits(balances.nativeBalance, 18),
      erc20Balance: formatUnits(balances.erc20Balance, 6)
    });
  } catch (error) {
    return NextResponse.json(
      {
        nativeBalance: "0.00",
        erc20Balance: "0.00",
        warning: error instanceof Error ? error.message : "Balance lookup failed."
      },
      { status: 200 }
    );
  }
}
