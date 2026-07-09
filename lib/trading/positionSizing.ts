import { SIM_MAX_POSITION_PCT } from "@/lib/arc/constants";
import { toUsdc6 } from "@/lib/arc/usdc";

export function getPositionSizeUsdc6(accountValue: number, confidence: number) {
  const cap = accountValue * (SIM_MAX_POSITION_PCT / 100);
  const scaled = cap * Math.max(0.25, Math.min(1, confidence / 100));
  return toUsdc6(scaled.toFixed(2));
}
