# Arc Cheatsheet

## Identity

Arc is a stablecoin-native Layer 1 built for onchain financial applications and agentic workflows.

## Arc Testnet config

- Network: Arc Testnet
- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com/

## USDC gas

- Native gas token is USDC
- Native USDC uses 18 decimals
- ERC-20 USDC interface uses 6 decimals
- Both interfaces refer to the same underlying asset

## Common mistakes

- Mixing native 18-decimal values with ERC-20 6-decimal values
- Using `parseEther` for ERC-20 USDC transfer amounts
- Assuming Arc uses ETH for fees
- Treating testnet simulation as real PnL
