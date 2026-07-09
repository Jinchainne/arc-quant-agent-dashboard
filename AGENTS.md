## Arc Quant Agent Dashboard

This repository includes the `use-arc-quant-dashboard` skill at `.agents/skills/use-arc-quant-dashboard/SKILL.md`.

Use it for Arc Network / Arc Testnet / USDC gas / realtime dashboard / strategy simulation / paper trading / testnet trade-intent logging work.

Do not use it for Arc Browser, mainnet trading, real-money automation, or profit guarantees.

Before claiming Arc readiness, run:

```bash
npm run arc:check
npm run typecheck
npm run build
```

Implementation details:

1. Frontend:
- Use Next.js app router.
- Use React client components for realtime dashboard widgets.
- Use setInterval or requestAnimationFrame lightly.
- Keep performance suitable for 16GB RAM.
- No huge animations.
- No websocket required for MVP.
- Use simulated polling every 2-3 seconds.

2. Styling:
- Use Tailwind.
- Create a retro terminal dashboard style.
- Use monospace font stack.
- Use CSS variables for colors.
- Do not import paid fonts.
- Make layout responsive but optimize for desktop.

3. Charts:
- Use Recharts.
- One chart per panel.
- Keep chart data arrays small.
- Do not store unbounded history.

4. State:
- Keep local state simple.
- No Redux.
- Use React state/hooks and local modules.
- Keep trade history capped, e.g. last 200 trades.

5. API:
- `app/api/market/route.ts` returns simulated market state.
- `app/api/trade/route.ts` validates and returns simulated fill.
- `app/api/agent/route.ts` routes questions to Groq/Ollama.
- `app/api/arc/gas/route.ts` checks Arc RPC.
- `app/api/arc/balance/route.ts` supports balance query by address.
- `app/api/docs/route.ts` searches docs.

6. Security:
- Redact secrets before model calls.
- Never send full `.env` to model.
- Do not log secrets.
- Do not require private key.
- Do not include deployment automation that needs private key.
- On-chain testnet transaction uses browser wallet only.

7. Error handling:
- If Ollama is not running, show clear message: `Ollama unavailable. Start Ollama and pull qwen2.5-coder:7b.`
- If Groq rate-limits, fallback to Ollama and log in live feed.
- If Arc RPC fails, pause on-chain actions and continue simulation.
- If wrong chain, show switch prompt.

8. Testing/verification:
- Add simple unit-like helper tests where practical, or at least runnable validation functions.
- Verify decimal conversion helpers.
- Verify check-arc-config script catches obvious mistakes.
- Verify TypeScript passes.
