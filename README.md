# Arc Quant Agent Dashboard

Arc Quant Agent Dashboard is a local realtime Arc Testnet and simulation terminal for USDC-denominated paper trading workflows, wallet checks, Arc RPC health, and model-assisted explanations.

## What this is

- A Next.js dashboard for Arc Testnet simulation and testnet intent logging
- A quant-style terminal UI with realtime simulated market and risk state
- A local-first MVP designed for 16GB RAM with Ollama and optional Groq

## What this is not

- Not real trading
- Not investment advice
- Not mainnet
- Not production automation
- Not a promise of profit or real PnL

## Hardware assumptions

- 16GB RAM
- Ollama with `qwen2.5-coder:7b`
- Ollama with `nomic-embed-text`

## Install

```bash
npm install
```

## Ollama setup

```bash
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

## Groq setup

Copy `.env.example` to `.env` and optionally set `GROQ_API_KEY`.

## Run

```bash
npm run dev
```

## Check

```bash
npm run arc:check
```

## Refresh docs

```bash
npm run arc:refresh-docs
```

## Embed docs

```bash
npm run arc:embed-docs
```

## Modes

- `paper mode`: executes simulated fills locally and updates simulated PnL only
- `testnet-intent mode`: records trade intents locally and can optionally mirror a confirmed wallet action
- `testnet-contract mode`: gated by `NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true` and always requires explicit browser wallet confirmation

To enable browser-wallet contract logging on Arc Testnet:

- set `PAPER_TRADING_ONLY=false`
- set `REAL_TRADING_DISABLED=false`
- set `NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true`
- deploy or configure `NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS`

The dashboard prepares the intent locally, asks the browser wallet to confirm, then persists the returned transaction hash locally.

## Local persistence

- Simulation state persists to `data/sim-state.json`
- Wallet address and selected market persist in browser `localStorage`
- Recent intents and fills survive app restarts on the same machine

## Safety model

- No automatic transactions
- Browser wallet confirmation required for any testnet transaction
- Testnet only
- Simulated PnL only
- No OpenAI API required

## Arc decimals

- Native USDC gas and `msg.value`: 18 decimals
- ERC-20 USDC interface: 6 decimals

Never mix these values directly.
