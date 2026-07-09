import { NextResponse } from "next/server";

import { getRpcHealth } from "@/lib/arc/rpc";

export async function GET() {
  try {
    const health = await getRpcHealth();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        chainId: null,
        blockNumber: null,
        latencyMs: null,
        error: error instanceof Error ? error.message : "RPC check failed."
      },
      { status: 200 }
    );
  }
}
