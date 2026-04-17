import { NextResponse } from "next/server";
import { findEventBySlug } from "@/lib/polymarket-event";

export const dynamic = "force-dynamic";

type HistoryPoint = {
  t: number;
  p: number;
};

type PriceHistoryResponse = {
  updatedAt: string;
  away: {
    label: string;
    tokenId?: string;
    history: HistoryPoint[];
  };
  home: {
    label: string;
    tokenId?: string;
    history: HistoryPoint[];
  };
  error?: string;
};

const HISTORY_WINDOW_SECONDS = 4 * 60 * 60;
const STEP_SECONDS = 5 * 60;

async function fetchTokenHistory(tokenId?: string): Promise<HistoryPoint[]> {
  if (!tokenId) return [];

  const nowSeconds = Math.floor(Date.now() / 1000);
  const startTs = nowSeconds - HISTORY_WINDOW_SECONDS;

  const url = new URL("https://clob.polymarket.com/prices-history");
  url.searchParams.set("market", tokenId);
  url.searchParams.set("startTs", String(startTs));
  url.searchParams.set("endTs", String(nowSeconds));
  url.searchParams.set("interval", "max");
  url.searchParams.set("fidelity", "5");

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const history = Array.isArray(data?.history) ? data.history : [];

  return history
    .map((item: { t: unknown; p: unknown }) => ({
      t: Number(item?.t),
      p: Number(item?.p),
    }))
    .filter(
      (item: { t: number; p: number }) =>
        Number.isFinite(item.t) &&
        Number.isFinite(item.p) &&
        item.t >= startTs &&
        item.t <= nowSeconds
    )
    .sort((a: { t: number }, b: { t: number }) => a.t - b.t);
}

function buildTimeGrid(
  startTs: number,
  endTs: number,
  stepSeconds: number
): number[] {
  const grid: number[] = [];

  for (let t = startTs; t <= endTs; t += stepSeconds) {
    grid.push(t);
  }

  if (grid.length === 0 || grid[grid.length - 1] !== endTs) {
    grid.push(endTs);
  }

  return grid;
}

function normalizeHistoryToGrid(
  rawHistory: HistoryPoint[],
  grid: number[],
  fallbackPrice = 0.5
): HistoryPoint[] {
  if (grid.length === 0) return [];

  if (rawHistory.length === 0) {
    return grid.map((t) => ({ t, p: fallbackPrice }));
  }

  const sorted = [...rawHistory].sort((a, b) => a.t - b.t);

  let historyIndex = 0;
  let lastKnownPrice: number | null = null;
  const firstKnownPrice = sorted[0]?.p ?? fallbackPrice;

  return grid.map((gridTs) => {
    while (historyIndex < sorted.length && sorted[historyIndex].t <= gridTs) {
      lastKnownPrice = sorted[historyIndex].p;
      historyIndex += 1;
    }

    return {
      t: gridTs,
      p: lastKnownPrice ?? firstKnownPrice,
    };
  });
}

function deriveComplementHistory(history: HistoryPoint[]): HistoryPoint[] {
  return history.map((point) => ({
    t: point.t,
    p: Math.max(0, Math.min(1, 1 - point.p)),
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const game = await findEventBySlug(slug);

    if (!game) {
      return NextResponse.json(
        {
          updatedAt: new Date().toISOString(),
          away: { label: "Away", history: [] },
          home: { label: "Home", history: [] },
          error: "Event not found",
        } satisfies PriceHistoryResponse,
        { status: 404 }
      );
    }

    const awayTokenId = game.outcome_token_ids?.away;
    const homeTokenId = game.outcome_token_ids?.home;

    const [awayRawHistory, homeRawHistory] = await Promise.all([
      fetchTokenHistory(awayTokenId),
      fetchTokenHistory(homeTokenId),
    ]);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const startTs = nowSeconds - HISTORY_WINDOW_SECONDS;
    const grid = buildTimeGrid(startTs, nowSeconds, STEP_SECONDS);

    let awayHistory = normalizeHistoryToGrid(awayRawHistory, grid);
    let homeHistory = normalizeHistoryToGrid(homeRawHistory, grid);

    if (awayRawHistory.length > 0 && homeRawHistory.length === 0) {
      homeHistory = deriveComplementHistory(awayHistory);
    }

    if (homeRawHistory.length > 0 && awayRawHistory.length === 0) {
      awayHistory = deriveComplementHistory(homeHistory);
    }

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      away: {
        label: game.away_team,
        tokenId: awayTokenId,
        history: awayHistory,
      },
      home: {
        label: game.home_team,
        tokenId: homeTokenId,
        history: homeHistory,
      },
    } satisfies PriceHistoryResponse);
  } catch (error) {
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        away: { label: "Away", history: [] },
        home: { label: "Home", history: [] },
        error: error instanceof Error ? error.message : "Fetch failed",
      } satisfies PriceHistoryResponse,
      { status: 500 }
    );
  }
}