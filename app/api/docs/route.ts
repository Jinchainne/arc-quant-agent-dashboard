import { NextRequest, NextResponse } from "next/server";

import { searchArcDocs } from "@/lib/docs/searchArcDocs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "Arc USDC gas";
  const results = await searchArcDocs(query);
  return NextResponse.json({ query, results });
}
