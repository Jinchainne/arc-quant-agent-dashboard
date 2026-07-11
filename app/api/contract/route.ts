import { NextRequest, NextResponse } from "next/server";

import {
  deployTradeIntentLedgerWithBurner,
  getArcTxStatus,
  getBurnerSignerAddress
} from "@/lib/arc/serverExecutor";

export async function GET(request: NextRequest) {
  const txHash = request.nextUrl.searchParams.get("txHash");

  if (txHash) {
    const status = await getArcTxStatus(txHash as `0x${string}`);
    return NextResponse.json({
      burnerAddress: getBurnerSignerAddress(),
      ...status
    });
  }

  return NextResponse.json({
    burnerAddress: getBurnerSignerAddress()
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "deploy-burner";
  };

  if (body.action !== "deploy-burner") {
    return NextResponse.json({ ok: false, message: "Unsupported contract action." }, { status: 400 });
  }

  try {
    const deployed = await deployTradeIntentLedgerWithBurner();
    return NextResponse.json({
      ok: true,
      txHash: deployed.hash,
      contractAddress: deployed.contractAddress,
      signerAddress: deployed.signerAddress
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Burner deployment failed."
      },
      { status: 500 }
    );
  }
}
