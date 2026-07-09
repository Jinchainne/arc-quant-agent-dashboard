import { formatUnits, parseUnits } from "viem";

export function toUsdc6(amountString: string) {
  return parseUnits(amountString, 6);
}

export function fromUsdc6(raw: bigint) {
  return formatUnits(raw, 6);
}

export function toNativeUsdc18(amountString: string) {
  return parseUnits(amountString, 18);
}

export function fromNativeUsdc18(raw: bigint) {
  return formatUnits(raw, 18);
}

export function getUsdcExamples() {
  return {
    erc20OnePointFive: toUsdc6("1.5").toString(),
    nativeOnePointFive: toNativeUsdc18("1.5").toString(),
    erc20Back: fromUsdc6(1500000n),
    nativeBack: fromNativeUsdc18(1500000000000000000n)
  };
}
