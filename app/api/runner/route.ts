import { NextRequest, NextResponse } from "next/server";

import { runAgentCycle } from "@/lib/agent/runner";
import { toJsonSafe } from "@/lib/utils/jsonResponse";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const runnerSecret = process.env.RUNNER_SECRET;

  if (!cronSecret && !runnerSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}` || authHeader === `Bearer ${runnerSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized runner invocation." }, { status: 401 });
  }

  const sourceHeader = request.headers.get("x-vercel-cron-schedule");
  const source = sourceHeader ? "vercel-cron" : "api";
  const address = request.nextUrl.searchParams.get("address") ?? undefined;
  const forceAdvance = request.nextUrl.searchParams.get("force") === "1";

  const state = await runAgentCycle({
    source,
    address,
    forceAdvance
  });

  return NextResponse.json(
    toJsonSafe({
      ok: true,
      source,
      cycleCount: state.stats.cycleCount,
      lastRunnerAt: state.stats.lastRunnerAt,
      currentPhase: state.stats.currentPhase,
      inFlight: state.stats.inFlight,
      lastTxHash: state.stats.lastTxHash,
      state
    })
  );
}
