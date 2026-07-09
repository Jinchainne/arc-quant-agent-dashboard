# Arc Project Review Checklist

## Testnet-only warning

- Confirm no mainnet RPCs are present
- Confirm no private keys or seed phrases are required
- Confirm simulated PnL is labeled as simulated

## Arc readiness

- Arc Testnet chain ID is 5042002
- RPC is https://rpc.testnet.arc.network
- Explorer is https://testnet.arcscan.app
- Native gas token is USDC
- Native balance uses 18 decimals
- ERC-20 USDC uses 6 decimals
- Wallet connect supports browser injection
- On-chain actions require explicit confirmation

## Safety review

- `REAL_TRADING_DISABLED=true`
- `SIMULATION_ONLY=true`
- `PAPER_TRADING_ONLY=true`
- No auto-send transaction path
