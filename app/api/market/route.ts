import { NextRequest, NextResponse } from "next/server";

import { runAgentCycle } from "@/lib/agent/runner";
import { toJsonSafe } from "@/lib/utils/jsonResponse";

export async function GET(request: NextRequest) {
  try {
    const address =
      request.nextUrl.searchParams.get("address") ??
      "0x0000000000000000000000000000000000000000";
    const state = await runAgentCycle({
      source: "dashboard",
      address
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
