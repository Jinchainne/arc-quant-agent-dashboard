import fs from "node:fs/promises";
import path from "node:path";

import { createInitialMarketState } from "@/lib/trading/marketSimulator";
import { tradeStore } from "@/lib/trading/tradeStore";
import type { SimulationState, TradeRecord } from "@/lib/trading/types";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "sim-state.json");

type PersistedTradeRecord = Omit<TradeRecord, "notionalUsdc6"> & {
  notionalUsdc6: string;
};

type PersistedStore = {
  markets: typeof tradeStore.markets;
  trades: PersistedTradeRecord[];
  feed: typeof tradeStore.feed;
  pnlSeries: typeof tradeStore.pnlSeries;
  monteCarlo: SimulationState["monteCarlo"];
  autoBot: typeof tradeStore.autoBot;
  lastSignal: (Omit<NonNullable<typeof tradeStore.lastSignal>, "notionalUsdc6"> & {
    notionalUsdc6: string;
  }) | null;
  risk: typeof tradeStore.risk;
  allTimePnl: number;
};

let loaded = false;
let persistenceAvailable = true;

function serialize() {
  const payload: PersistedStore = {
    markets: tradeStore.markets,
    trades: tradeStore.trades.map((trade) => ({
      ...trade,
      notionalUsdc6: trade.notionalUsdc6.toString()
    })),
    feed: tradeStore.feed,
    pnlSeries: tradeStore.pnlSeries,
    monteCarlo: tradeStore.monteCarlo,
    autoBot: tradeStore.autoBot,
    lastSignal: tradeStore.lastSignal
      ? {
          ...tradeStore.lastSignal,
          notionalUsdc6: tradeStore.lastSignal.notionalUsdc6.toString()
        }
      : null,
    risk: tradeStore.risk,
    allTimePnl: tradeStore.allTimePnl
  };

  return payload;
}

async function loadTradeStore(force = false) {
  if (loaded && !force) {
    return;
  }

  try {
    const raw = await fs.readFile(storePath, "utf8");
    const payload = JSON.parse(raw) as PersistedStore;
    tradeStore.markets = payload.markets ?? createInitialMarketState();
    tradeStore.trades = (payload.trades ?? []).map((trade) => ({
      ...trade,
      notionalUsdc6: BigInt(trade.notionalUsdc6)
    }));
    tradeStore.feed = payload.feed ?? [];
    tradeStore.pnlSeries = payload.pnlSeries ?? [];
    tradeStore.monteCarlo = payload.monteCarlo ?? tradeStore.monteCarlo;
    tradeStore.autoBot = payload.autoBot ?? tradeStore.autoBot;
    tradeStore.lastSignal = payload.lastSignal
      ? {
          ...payload.lastSignal,
          notionalUsdc6: BigInt(payload.lastSignal.notionalUsdc6)
        }
      : null;
    tradeStore.risk = payload.risk ?? tradeStore.risk;
    tradeStore.allTimePnl = payload.allTimePnl ?? 0;
  } catch {
    tradeStore.markets = createInitialMarketState();
  }

  loaded = true;
}

export async function ensureTradeStoreLoaded() {
  await loadTradeStore(false);
}

export async function reloadTradeStore() {
  await loadTradeStore(true);
}

export async function persistTradeStore() {
  if (!persistenceAvailable) {
    return;
  }

  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.writeFile(storePath, JSON.stringify(serialize(), null, 2), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EROFS") {
      persistenceAvailable = false;
      return;
    }
    throw error;
  }
}
