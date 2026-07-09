import type { Chain } from "viem";

import { ARC_CHAIN_ID, ARC_EXPLORER_URL, ARC_RPC_URL } from "@/lib/arc/constants";

export const arcTestnet: Chain = {
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  },
  rpcUrls: {
    default: { http: [ARC_RPC_URL], webSocket: ["wss://rpc.testnet.arc.network"] },
    public: { http: [ARC_RPC_URL], webSocket: ["wss://rpc.testnet.arc.network"] }
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: ARC_EXPLORER_URL
    }
  },
  testnet: true
};
