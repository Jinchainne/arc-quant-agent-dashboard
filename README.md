# Arc Quant Agent Dashboard

Arc Quant Agent Dashboard is a local-first Arc Testnet builder agent: a realtime quant-terminal UI that can simulate signals, plan execution, persist state, prepare testnet intents, and optionally submit Arc testnet contract writes through either a browser wallet or a burner signer.

This project is built for builders, demos, hackathons, and testnet experimentation. It is not a mainnet trading system and it does not claim real profit.

## Overview

- Realtime Arc-style terminal dashboard
- Strategy engine with signal, risk, execution, and settlement phases
- Persistent local memory in `data/sim-state.json`
- Browser wallet flow for manual Arc testnet confirmation
- Burner mode for autonomous testnet-only submission
- Local 24/7 worker runner
- Hosted scheduler path using GitHub Actions -> Vercel `/api/runner`
- Agent console backed by Ollama locally or Groq in hosted mode
- On-chain activity tape for intents, tx submission, pending state, and confirmation

## Builder Value

This repo is designed to show a complete builder story on Arc:

- a visible dashboard
- a strategy loop
- a planner layer
- persistence
- wallet awareness
- contract deployment and write flow
- a background runner
- a hosted scheduler path

That makes it suitable for submissions where you need to show both product polish and working testnet interaction.

## What The Agent Does

The agent works in four layers:

1. `Simulation layer`
Generates market movement, signals, fills, feed motion, PnL, Monte Carlo, and execution-cycle state.

2. `Intent layer`
Stores a testnet intent locally so the workflow can be demonstrated even before an on-chain write.

3. `Contract layer`
Writes to `ArcTradeIntentLedger` on Arc Testnet when contract mode is enabled and the write path is configured.

4. `Planner layer`
Tracks objective, latest decision, next action, blockers, runner source, pending count, and recent cycle state.

## What This Is Not

- No mainnet execution
- No centralized exchange integration
- No hidden auto-trading
- No profit guarantee
- No claim that testnet behavior implies production readiness

## Tech Stack

- Next.js App Router
- React 19
- Tailwind CSS
- Recharts
- viem
- Ollama or Groq for agent responses
- GitHub Actions for hosted runner scheduling
- Vercel for hosted UI/API

## Arc Testnet Reference

- Network: `Arc Testnet`
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- ERC-20 USDC: `0x3600000000000000000000000000000000000000`

## Decimal Rules

This repo follows an important Arc convention:

- native USDC gas and `msg.value` use `18 decimals`
- ERC-20 USDC balances and token actions use `6 decimals`

Examples:

- native `1 USDC` gas unit => `1e18`
- ERC-20 `1 USDC` => `1e6`

Never mix them.

## Project Features

### Dashboard

- Terminal-style layout
- Ticker tape
- Market chart
- Execution cycle strip
- Strategy decision tree
- Robustness matrix
- PnL growth chart
- Monte Carlo panel
- Recent trades panel
- On-chain activity panel

### Agent

- Objective-driven auto bot
- Planner output
- Next-action suggestion
- Blocker reporting
- Manual reset of strategy state
- Local persistence across restarts

### Execution

- `paper` mode
- `testnet-intent` mode
- `testnet-contract` mode
- Browser Wallet Mode
- Burner Mode
- Local worker runner
- Hosted runner endpoint

## Requirements

- Node.js 20+
- npm
- 16GB RAM recommended for a smooth local experience
- MetaMask, Rabby, or another injected EVM wallet for browser-wallet mode
- Ollama if you want local model responses

## Local Model Setup

Recommended pulls:

```bash
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

Check Ollama:

```bash
curl http://localhost:11434/api/tags
```

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

## Environment Setup

Create a local env file:

```bash
cp .env.example .env.local
```

Core model envs:

```env
AI_API_KEY=
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile

GROQ_API_KEY=
GROQ_MODEL=qwen/qwen3-coder

OLLAMA_BASE_URL=http://localhost:11434
LOCAL_CHAT_MODEL=qwen2.5-coder:7b
LOCAL_EMBED_MODEL=nomic-embed-text
AGENT_PROVIDER=auto
```

Arc envs:

```env
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_EXPLORER_URL=https://testnet.arcscan.app
NEXT_PUBLIC_ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

Testnet execution envs:

```env
PAPER_TRADING_ONLY=false
REAL_TRADING_DISABLED=false
NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true
NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS=0x...
AUTO_BURNER_PRIVATE_KEY=0x...
RUNNER_SECRET=...
CRON_SECRET=...
AGENT_RUNNER_INTERVAL_MS=12000
```

Important notes:

- restart the dev server after changing `.env.local`
- use a disposable burner wallet for `AUTO_BURNER_PRIVATE_KEY`
- do not use a mainnet private key here

## Local Run

Install and start:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Local 24/7 Worker

Run the local worker in a second terminal:

```bash
npm run agent:runner
```

Single cycle smoke test:

```bash
npm run agent:once
```

This is the best path when you want the bot to keep executing locally like a live demo.

## Verification

Before claiming the agent is ready, run:

```bash
npm run arc:check
npm run typecheck
npm run build
```

## Execution Modes

### 1. `paper`

- simulation only
- no local intent record required
- no tx hash

### 2. `testnet-intent`

- persists a local testnet intent
- useful for showing execution flow
- still no on-chain tx

### 3. `testnet-contract`

- prepares a real contract write flow
- requires contract mode enabled
- requires ledger address
- can create a visible Arc testnet transaction hash

## Auto Bot Modes

### Browser Wallet Mode

- bot prepares pending testnet intents
- user confirms the latest pending intent using injected wallet
- good for demo safety and manual review

### Burner Mode

- bot signs and submits directly from the server
- requires `AUTO_BURNER_PRIVATE_KEY`
- testnet only
- use a disposable burner wallet only

## Runner Model

There are two practical runner paths in this repo:

### 1. Local worker

- command: `npm run agent:runner`
- loops continuously
- fastest and closest to a live trading-bot demo

### 2. Hosted scheduler

- GitHub Actions workflow: `.github/workflows/arc-runner.yml`
- calls `https://arc-quant-agent-dashboard.vercel.app/api/runner?force=1`
- good for keeping the hosted app active on a Vercel Hobby account

Important behavior:

- the dashboard UI is not the runner itself
- the background worker or scheduler is what advances real bot cycles
- the `On-chain Activity` panel shows whether the runner is actually doing work

## Contract Flow

The contract used here is:

```text
contracts/ArcTradeIntentLedger.sol
```

The contract panel supports:

- browser-wallet deployment
- burner deployment
- deployment tx status polling
- ledger-address persistence

## Recommended Local Demo Flow

1. Start Ollama
2. Run `npm run dev`
3. Run `npm run agent:runner` in another terminal
4. Open the dashboard
5. Wait a few cycles so feed, charts, and PnL become active
6. Connect your browser wallet if you want browser-wallet mode
7. Try `testnet-intent` first
8. Then move to `testnet-contract`
9. Use the `Contract Panel` to deploy or configure a ledger
10. Watch `Recent Trades` and `On-chain Activity`

## Recommended Contract Test Flow

1. Enable testnet contract mode in `.env.local`
2. Set `NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS`
3. Restart local dev server
4. Connect browser wallet and switch to Arc Testnet if using manual confirmation
5. Or configure burner mode for autonomous submission
6. Arm the bot
7. Observe:
   - `Auto Bot`
   - `Recent Trades`
   - `On-chain Activity`
   - explorer links in the UI

Expected result:

- local state advances
- planner updates
- pending or submitted intents appear
- tx hashes become visible when chain write succeeds

## Hosted Deployment

Hosted app:

- Vercel serves the UI and API routes
- Vercel cannot access your local Ollama
- hosted inference should use Groq or another reachable API provider

Recommended Vercel envs:

```env
AI_API_KEY=...
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AGENT_PROVIDER=auto
PAPER_TRADING_ONLY=false
REAL_TRADING_DISABLED=false
NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true
NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS=0x...
AUTO_BURNER_PRIVATE_KEY=0x...
RUNNER_SECRET=...
CRON_SECRET=...
```

## GitHub Actions Scheduler

The repo contains:

```text
.github/workflows/arc-runner.yml
```

Add these repository secrets:

```text
ARC_RUNNER_URL=https://arc-quant-agent-dashboard.vercel.app/api/runner?force=1
ARC_RUNNER_SECRET=<same value as RUNNER_SECRET on Vercel>
```

That gives you a hosted recurring runner without needing Vercel paid cron features.

## Persistence

State is persisted in:

```text
data/sim-state.json
```

This stores:

- trades
- feed
- Monte Carlo output
- planner state
- auto bot state
- activity log

The browser also stores:

- selected market
- wallet address
- ledger address
- deploy tx hash

## Main UI Panels

- `Terminal Header`: session, wallet, chain, RPC, model
- `Market Chart`: current selected market
- `Execution Cycle`: active phase
- `Strategy Decision Tree`: signal path and edge confidence
- `Wallet Panel`: injected wallet status
- `Contract Panel`: deploy and configure ledger
- `Auto Bot`: objective, mode, counts, planner, blocker, runner metadata
- `On-chain Activity`: tx lifecycle and runner activity
- `Recent Trades`: local and chain-aware trade log
- `Agent Console`: ask questions about config, risk, signals, and decimals

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run agent:once
npm run agent:runner
npm run arc:check
npm run arc:refresh-docs
npm run arc:seed
npm run arc:embed-docs
npm run arc:build-ledger
```

## Troubleshooting

### No tx hash appears

Check these first:

1. Are you still in `paper` mode?
2. Are safety envs still blocking contract writes?
3. Is `NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true`?
4. Is the ledger address set?
5. Did the browser wallet confirmation appear?
6. Is the burner key configured if using burner mode?

### Dashboard looks alive but bot is not really running

The UI has animation even without a background worker.

To make the bot actually advance cycles:

- locally: run `npm run agent:runner`
- hosted: verify GitHub Actions scheduler is active

### Wallet is disconnected but backend bot still works

That is expected in burner mode.

- browser wallet state belongs to the viewer
- burner signer belongs to the backend runner

The UI now keeps those two identities separate.

### Hosted app says Ollama is unavailable

That is expected.

Vercel cannot call your local Ollama instance.

Use:

- local app for Ollama
- Groq for hosted inference

### Strategy blocks every cycle

Open `Auto Bot` and check:

- `Planner`
- `Next Action`
- `Blocked By`

If needed:

- lower risk conditions in config
- confirm pending intents
- deploy/configure a ledger
- use `Reset Strategy State`

## Safety

- testnet only
- browser-wallet mode is confirmation-first
- burner mode is testnet-only
- use a disposable burner signer
- do not use mainnet keys
- do not treat simulation PnL as real performance

## Submission Note

If you are using this repo for a builder submission, the strongest demo sequence is:

1. show the live dashboard
2. show planner + blocker intelligence
3. show the contract panel
4. show the auto bot in burner or browser-wallet mode
5. show recent trades and on-chain activity
6. open Arc explorer links from the UI

That demonstrates both product UX and working Arc testnet interaction.
