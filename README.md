# Arc Quant Agent Dashboard

Arc Quant Agent Dashboard is a local-first Arc Testnet builder agent: a realtime terminal-style dashboard with an execution planner, persistent memory, browser-wallet mode, burner mode, and optional autonomous testnet intent submission.

This repo is designed for builders, demos, hackathons, and local prototyping. It is not a production trading bot.

## What this tool does

- Runs a live Arc Testnet dashboard with quant-terminal style panels
- Simulates strategy signals, risk checks, fills, PnL, and Monte Carlo outputs
- Connects to an injected browser wallet for Arc Testnet checks
- Routes agent questions to local Ollama or Groq
- Supports optional browser-wallet confirmation for testnet contract intent logging
- Supports auto bot execution on Arc testnet with either manual wallet confirmation or burner-key signing
- Supports a local 24/7 worker runner and a Vercel cron-driven runner path
- Persists local simulation state to disk
- Maintains an agent objective, planner output, blocker reason, and next action for each cycle

## What this tool does not do

- No mainnet trading
- No hidden auto-trading
- No centralized exchange execution
- No mainnet private key execution flow
- No promise of real profit
- No real-money automation

## Builder agent model

This repo now behaves as a small execution agent with four layers:

1. `Simulation layer`
- Always available
- Generates signals, fills, PnL, feed, chart activity
- Produces no blockchain transaction

2. `Intent layer`
- Stores an intent locally
- Useful for proving the workflow and UI state transitions
- Still does not produce an on-chain transaction by itself

3. `Contract layer`
- Requires browser wallet confirmation
- Requires Arc Testnet contract address
- Can produce a real Arc Testnet transaction hash

4. `Planner layer`
- Tracks the current objective
- Explains the latest decision
- Emits the next recommended action
- Surfaces blockers such as missing signer, missing ledger, pending intent, or risk rejection

If you are running the tool locally and do not see a tx hash, the most common reason is simple:

- you are still in `paper mode`, or
- contract mode is disabled by env, or
- no contract address is configured, or
- wallet has not confirmed the transaction

## Requirements

- Node.js 20+ or newer
- npm
- 16GB RAM recommended
- Ollama installed locally if you want local models
- Browser wallet such as MetaMask or Rabby for Arc Testnet flows

## Local model setup

Pull the recommended models:

```bash
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

Check Ollama:

```bash
curl http://localhost:11434/api/tags
```

On Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

## Environment setup

Copy:

```bash
cp .env.example .env.local
```

Important model envs:

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

How routing works:

- local app + reachable Ollama: prefers Ollama
- hosted app on Vercel: cannot use your local Ollama
- hosted app needs Groq env configured to answer model requests

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

To run the execution worker locally in a separate terminal:

```bash
npm run agent:runner
```

Single cycle smoke test:

```bash
npm run agent:once
```

## Verification commands

```bash
npm run typecheck
npm run arc:check
npm run build
```

## Core modes

### 1. Paper mode

- Default mode
- Creates simulated fills only
- Updates simulated PnL and feed
- Never creates a tx hash

Use this when you want the dashboard to feel active and demo-ready without touching chain state.

### 2. Testnet-intent mode

- Creates a local intent record
- Persists that record to `data/sim-state.json`
- Shows progression in feed and recent trades
- Still does not create an on-chain tx

Use this when you want a stronger demo of workflow progression without actually writing to chain.

### 3. Testnet-contract mode

- Prepares a local intent
- Prompts browser wallet confirmation
- Writes to `ArcTradeIntentLedger` if configured correctly
- Persists the returned tx hash locally

This is the only mode that can create a visible Arc Testnet transaction hash.

## Why you may not see a tx hash

If the UI is running but no tx appears, check these in order:

1. Are you still using `paper mode`?
2. Did you switch to `testnet-contract mode`?
3. Did you tick the confirmation checkbox?
4. Is wallet actually connected to Arc Testnet?
5. Did you set `NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS`?
6. Did you disable the safety gates below?
7. Did the wallet confirmation popup appear and did you confirm it?

Required env changes for contract mode:

```env
PAPER_TRADING_ONLY=false
REAL_TRADING_DISABLED=false
NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true
NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS=0x...
AUTO_BURNER_PRIVATE_KEY=0x...
```

After editing envs, restart the local dev server so Next.js reloads `.env.local`.

If any of those are missing, you should expect:

- no tx hash
- no on-chain write
- local simulation only

## Auto bot modes

The dashboard now supports two bot execution styles on Arc Testnet:

1. `Browser Wallet Mode`
- auto bot prepares testnet intents as signals are approved
- intents appear as pending
- you confirm the latest pending intent with your browser wallet

2. `Burner Mode`
- auto bot prepares and submits testnet intents directly from the server
- requires `AUTO_BURNER_PRIVATE_KEY`
- use only a disposable testnet wallet

## 24/7 runner model

There are now two real execution runner paths:

1. `Local worker`
- command: `npm run agent:runner`
- loops continuously using `AGENT_RUNNER_INTERVAL_MS`
- best choice when you want the bot to keep moving every few seconds on your own machine

2. `Vercel cron`
- configured in `vercel.json`
- calls `/api/runner?force=1`
- good for keeping the hosted demo alive
- practical cadence is cron-based, so it is slower than the local worker

Important behavior:

- when auto bot is armed, the background runner becomes the main execution source
- the dashboard still refreshes state, but runner metadata now shows whether cycles are really being executed
- the `On-chain Activity` panel shows runner starts, prepared intents, tx submissions, pending status, and confirmations

## Agent controls

The `Auto Bot` panel is the core builder-agent interface:

- `Objective`
  Agent goal for the next cycles
- `Planner`
  What the agent decided this cycle
- `Next Action`
  What the agent wants to do next
- `Blocked By`
  Current execution blocker, if any
- `Reset Strategy State`
  Clears loss streak and pending intent state so the planner can attempt fresh execution

## Arc Testnet config

- Network: `Arc Testnet`
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- ERC-20 USDC address: `0x3600000000000000000000000000000000000000`

## Decimals rule

This is the most important data rule in the repo:

- native USDC gas and `msg.value` use `18 decimals`
- ERC-20 USDC `balance / transfer / approve / allowance` use `6 decimals`

Never mix them.

Examples:

- native 1 USDC gas unit => `1e18`
- ERC-20 1 USDC => `1e6`

## Local persistence

The tool stores:

- simulation state in `data/sim-state.json`
- wallet address in browser `localStorage`
- selected market in browser `localStorage`

This means:

- recent trades survive app restart
- testnet intent records remain visible locally
- local dashboard state feels more like a persistent terminal

## How to use the agent

The `Agent Console` answers questions such as:

- Explain USDC decimals
- Explain current signal
- Why was this trade rejected?
- Check Arc config
- Review this simulated trade

Local behavior:

- if Ollama is running and reachable, the local app can answer through Ollama
- if Ollama fails and Groq is configured, it can fallback to Groq

Hosted behavior:

- Vercel cannot call your `localhost:11434`
- to make the online app answer, you must set Groq env vars in Vercel

## Recommended local demo flow

For a smooth demo:

1. Start Ollama
2. Run `npm run dev`
3. Open `http://localhost:3000`
4. Let the dashboard run for 10-20 seconds so feed/chart/pacing become lively
5. Open `Agent Console` and ask an explanation question
6. Connect wallet
7. Try `testnet-intent mode` first
8. If you have a deployed Arc Testnet ledger contract, switch to `testnet-contract mode`

## Recommended contract-mode test flow

1. Deploy `contracts/ArcTradeIntentLedger.sol` to Arc Testnet
2. Put the deployed address in:

```env
NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS=0x...
```

3. Set:

```env
PAPER_TRADING_ONLY=false
REAL_TRADING_DISABLED=false
NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true
```

4. Restart local dev server
5. Connect wallet
6. Switch wallet to Arc Testnet
7. Either use the env-provided ledger address or deploy one directly from the new `Contract Panel`
8. Choose `testnet-contract mode`
9. Tick the confirmation checkbox
10. Submit the mode check
11. Confirm the wallet transaction

Expected result:

- local intent is prepared
- ledger exists on Arc Testnet
- wallet popup opens
- tx hash is returned
- recent trades and KPI panel can show the tx hash

## Deploying to Vercel

Important:

- Vercel deployment cannot reach your local Ollama instance
- if you want hosted agent responses, configure Groq on Vercel

Set these Vercel envs:

```env
AI_API_KEY=...
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AGENT_PROVIDER=auto
CRON_SECRET=...
RUNNER_SECRET=...
```

Optional contract-mode envs for hosted demo:

```env
PAPER_TRADING_ONLY=false
REAL_TRADING_DISABLED=false
NEXT_PUBLIC_ENABLE_TESTNET_CONTRACT_MODE=true
NEXT_PUBLIC_TRADE_INTENT_LEDGER_ADDRESS=0x...
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run arc:check
npm run arc:refresh-docs
npm run arc:seed
npm run arc:embed-docs
```

## Troubleshooting

### The dashboard runs but I see no tx

Most likely you are still in a safe mode.

Check:

- `paper mode` does not create tx
- `testnet-intent mode` does not create tx
- only `testnet-contract mode` can create tx

### The online site says Ollama is unavailable

That is expected.

Vercel cannot access your local Ollama.

Use one of these:

- run locally with `npm run dev`
- configure Groq env on Vercel

### Wallet shows connected but data looks stale

Use `Clear Local State` in the wallet panel and reconnect.

### Agent answers incorrectly about decimals

Use local docs refresh and ask again:

```bash
npm run arc:refresh-docs
```

## Safety

- Testnet only
- Browser wallet confirmation required
- Optional burner-key mode is testnet-only and should use a disposable wallet
- No mainnet
- No real-profit claim
- Simulation-first by default
