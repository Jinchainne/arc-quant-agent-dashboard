import { NextResponse } from "next/server";

import { routeAgentQuestion } from "@/lib/agent/modelRouter";

export async function POST(request: Request) {
  const body = (await request.json()) as { question?: string; prompt?: string };
  const question = body.question?.trim() ?? body.prompt?.trim();

  if (!question) {
    return NextResponse.json({ answer: "Question is required.", provider: "fallback", docs: [], warnings: [] });
  }

  const result = await routeAgentQuestion(question);
  return NextResponse.json(result);
}
