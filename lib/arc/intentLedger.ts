export const arcTradeIntentLedgerAbi = [
  {
    type: "function",
    name: "createTradeIntent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "market", type: "string" },
      { name: "side", type: "string" },
      { name: "notionalUsdc6", type: "uint256" },
      { name: "confidence", type: "uint256" },
      { name: "reason", type: "string" }
    ],
    outputs: []
  }
] as const;
