import { createPublicClient, erc20Abi, http } from "viem";

import { arcTestnet } from "@/lib/arc/chain";
import { ARC_CHAIN_ID, ARC_USDC_ADDRESS } from "@/lib/arc/constants";

export const arcPublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(arcTestnet.rpcUrls.default.http[0])
});

export async function getRpcHealth() {
  const startedAt = Date.now();
  const [chainId, blockNumber] = await Promise.all([
    arcPublicClient.getChainId(),
    arcPublicClient.getBlockNumber()
  ]);

  return {
    healthy: chainId === ARC_CHAIN_ID,
    chainId,
    blockNumber: blockNumber.toString(),
    latencyMs: Date.now() - startedAt
  };
}

export async function getArcBalances(address: `0x${string}`) {
  const [nativeBalance, erc20Balance] = await Promise.all([
    arcPublicClient.getBalance({ address }),
    arcPublicClient.readContract({
      address: ARC_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address]
    })
  ]);

  return {
    nativeBalance,
    erc20Balance
  };
}
