# Arc EVM Differences

## Core differences from Ethereum

- USDC is the native gas token on Arc
- Native USDC, gas accounting, and `msg.value` use 18 decimals
- ERC-20 USDC transfers, balances, approvals, and allowances use 6 decimals
- Arc emits native Transfer-style events via EIP-7708 behavior
- Deterministic finality means a single confirmation is typically enough on testnet

## Wallet setup notes

- Wallets that do not fully understand custom gas tokens may still display ETH labels while signing
- The underlying gas asset is still USDC
- Always verify the chain ID is 5042002
