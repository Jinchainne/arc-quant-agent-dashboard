---
name: use-arc-quant-dashboard
description: Use this when building, reviewing, debugging, or extending a realtime Arc Network / Arc Testnet quant-style agent dashboard with USDC testnet simulation, wallet checks, Arc RPC, USDC gas, strategy engine, risk engine, paper trades, or testnet trade-intent logging. Do not use for Arc Browser or real-money trading.
---

# Scope

- Arc Network only, not Arc Browser
- Arc Testnet only
- No real money, no mainnet, no profit guarantee

# Arc Testnet config

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- Native currency symbol: `USDC`
- ERC-20 USDC testnet address: `0x3600000000000000000000000000000000000000`

# USDC native gas and decimals

- Native USDC gas and `msg.value` use 18 decimals
- ERC-20 USDC balance, transfer, approve, and allowance use 6 decimals
- Use `parseUnits(amount, 18)` for native USDC gas values
- Use `parseUnits(amount, 6)` for ERC-20 USDC values

# Dashboard UI requirements

- Retro terminal / institutional quant dashboard feel
- Dense but readable panels
- Off-white, pale green, muted black, muted gray palette
- Monospace typography and thin borders
- Realtime updates with SIM / TESTNET labels on all trading surfaces

# Trading engine workflow

1. Generate simulated market ticks
2. Run Momentum, Mean Reversion, and Volatility Breakout
3. Produce action, confidence, notional, stop loss, take profit, reason, and risk flags
4. Apply risk gates before any fill or intent logging
5. Default to paper fills and simulated PnL

# Execution cycle workflow

`Scan -> Detect -> Validate -> Size -> Fill -> Settle`

- Scan: Arc RPC, balances, simulated market, docs cache
- Detect: signal or config issue
- Validate: risk, wallet, decimals, chain ID, confirmation
- Size: USDC-denominated position sizing
- Fill: paper by default, optional user-confirmed testnet intent
- Settle: update PnL, feed, and risk state

# Risk rules

- Max position size percent
- Max daily loss
- Max consecutive losses
- Minimum confidence threshold
- Reject when RPC unhealthy
- Reject when chain ID is wrong
- Reject on USDC decimal ambiguity
- Reject non-paper flows without connected wallet and explicit confirmation
- Keep `REAL_TRADING_DISABLED=true`

# Wallet and RPC debug workflow

- Check injected wallet availability
- Verify chain ID is `5042002`
- Offer wallet network switch or add
- Check `eth_chainId` and `eth_blockNumber`
- Measure latency
- Read native balance with 18 decimals
- Read ERC-20 USDC balance with 6 decimals

# On-chain confirmation rule

Never auto-send transactions. Any Arc Testnet contract interaction must require explicit browser wallet confirmation and must be described as testnet intent logging, not real trading.

# Viem Arc Testnet config snippet

```ts
export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
  testnet: true
};
```

# USDC ERC-20 interface snippet

```solidity
interface IERC20USDC {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}
```

# Decimal helper examples

```ts
toUsdc6("1.5") // 1500000n
toNativeUsdc18("1.5") // 1500000000000000000n
fromUsdc6(1500000n) // "1.5"
fromNativeUsdc18(1500000000000000000n) // "1.5"
```

# Contract intent logging example

```ts
// This only logs a testnet trade intent. It is not real trading.
const data = encodeFunctionData({
  abi,
  functionName: "createTradeIntent",
  args: [market, side, notionalUsdc6, confidence, reason]
});
```

# Arc readiness checklist

- Correct chain ID, RPC, explorer, and USDC address
- Native 18 vs ERC-20 6 decimal helpers verified
- Dashboard labels say SIM / TESTNET
- No private key flow
- No mainnet or real-money automation
- `npm run arc:check`
- `npm run typecheck`
- `npm run build`
