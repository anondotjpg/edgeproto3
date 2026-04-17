"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OddsOutcome = {
  name: string;
  price: number;
  point?: number;
  asset_id?: string;
};

type OddsMarket = {
  key: string;
  outcomes: OddsOutcome[];
};

type Bookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
};

type TeamInfo = {
  name: string;
  abbreviation?: string;
  alias?: string;
  record?: string;
  logo?: string;
  league?: string;
};

type Game = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_team_info?: TeamInfo;
  away_team_info?: TeamInfo;
  bookmakers: Bookmaker[];
};

type MarketWsBookLevel = {
  price: string;
  size: string;
};

type MarketWsMessage =
  | {
      event_type: "book";
      asset_id: string;
      bids?: MarketWsBookLevel[];
      asks?: MarketWsBookLevel[];
      timestamp?: string;
    }
  | {
      event_type: "best_bid_ask";
      asset_id: string;
      best_bid?: string;
      best_ask?: string;
      spread?: string;
      timestamp?: string;
    }
  | {
      event_type: "last_trade_price";
      asset_id: string;
      price?: string;
      timestamp?: string;
    }
  | {
      event_type: "price_change";
      timestamp?: string;
      price_changes?: Array<{
        asset_id: string;
        price?: string;
        best_bid?: string;
        best_ask?: string;
        side?: string;
        size?: string;
      }>;
    }
  | Record<string, unknown>;

function getMarket(bookmaker: Bookmaker | undefined, marketKey: string) {
  return bookmaker?.markets?.find((market) => market.key === marketKey);
}

function formatPrice(price?: number) {
  if (price === undefined || price === null || price === 0) return "—";
  return price > 0 ? `+${price}` : `${price}`;
}

function formatGameTime(date: string) {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getOutcomeByName(
  outcomes: OddsOutcome[] | undefined,
  teamName: string
): OddsOutcome | undefined {
  return outcomes?.find((outcome) => outcome.name === teamName);
}

function probabilityToAmerican(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    return 0;
  }

  if (probability === 0.5) return 100;

  if (probability < 0.5) {
    return Math.round(((1 - probability) / probability) * 100);
  }

  return -Math.round((probability / (1 - probability)) * 100);
}

function chooseProbabilityFromBook(
  bids?: MarketWsBookLevel[],
  asks?: MarketWsBookLevel[]
): number | null {
  const bestBid =
    Array.isArray(bids) && bids.length > 0 ? Number(bids[0].price) : NaN;
  const bestAsk =
    Array.isArray(asks) && asks.length > 0 ? Number(asks[0].price) : NaN;

  if (Number.isFinite(bestBid)) return bestBid;
  if (Number.isFinite(bestAsk)) return bestAsk;

  return null;
}

function chooseProbabilityFromBestBidAsk(bestBid?: string, bestAsk?: string) {
  const bid = Number(bestBid);
  const ask = Number(bestAsk);

  if (Number.isFinite(bid)) return bid;
  if (Number.isFinite(ask)) return ask;

  return null;
}

function OddsCell({
  value,
  isLive,
}: {
  value: string;
  isLive?: boolean;
}) {
  return (
    <div className="flex min-h-[56px] items-center justify-center rounded-[18px] border border-zinc-800 bg-zinc-950 px-3 py-2 text-center">
      <div className="flex items-center gap-2">
        <div className="text-[14px] font-semibold tracking-tight text-zinc-100">
          {value}
        </div>
        {isLive ? (
          <span className="inline-flex h-2 w-2 rounded-full bg-green-400" />
        ) : null}
      </div>
    </div>
  );
}

function getLogoClassName(sportKey: string) {
  if (sportKey === "mlb") {
    return "h-8 w-8 object-contain";
  }

  return "h-8 w-8 rounded-sm object-contain bg-white/5";
}

function getLogoFallbackClassName(sportKey: string) {
  if (sportKey === "mlb") {
    return "h-9 w-9 bg-zinc-950";
  }

  return "h-9 w-9 rounded-sm border border-zinc-800 bg-zinc-950";
}

function TeamRow({
  team,
  info,
  price,
  sportKey,
  isLive,
}: {
  team: string;
  info?: TeamInfo;
  price: string;
  sportKey: string;
  isLive?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-2 py-2">
      <div className="flex min-h-[56px] items-center gap-3 px-1">
        {info?.logo ? (
          <img
            src={info.logo}
            alt={info.name}
            className={getLogoClassName(sportKey)}
          />
        ) : (
          <div className={getLogoFallbackClassName(sportKey)} />
        )}

        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-zinc-100">
            {info?.name || team}
          </div>

          <div className="truncate text-[12px] text-zinc-400">
            {info?.record || info?.abbreviation || info?.alias || "—"}
          </div>
        </div>
      </div>

      <OddsCell value={price} isLive={isLive} />
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const bookmaker = game.bookmakers?.[0];
  const h2h = getMarket(bookmaker, "h2h")?.outcomes;

  const awayMoneyline = getOutcomeByName(h2h, game.away_team);
  const homeMoneyline = getOutcomeByName(h2h, game.home_team);

  const awayIsLive = Boolean(awayMoneyline?.asset_id);
  const homeIsLive = Boolean(homeMoneyline?.asset_id);

  return (
    <article className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="min-w-0">
          <div className="mt-1 text-[13px] text-zinc-400">
            {formatGameTime(game.commence_time)}
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
          {bookmaker?.title ?? "Polymarket"}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_96px] gap-2 px-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Team
        </div>
        <div className="text-center text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          ML
        </div>
      </div>

      <div className="space-y-2">
        <TeamRow
          team={game.away_team}
          info={game.away_team_info}
          price={formatPrice(awayMoneyline?.price)}
          sportKey={game.sport_key}
          isLive={awayIsLive}
        />

        <TeamRow
          team={game.home_team}
          info={game.home_team_info}
          price={formatPrice(homeMoneyline?.price)}
          sportKey={game.sport_key}
          isLive={homeIsLive}
        />
      </div>
    </article>
  );
}

function updateGamesFromAssetPrice(
  games: Game[],
  assetId: string,
  probability: number
): Game[] {
  const nextAmerican = probabilityToAmerican(probability);
  let changedAnyGame = false;

  const nextGames = games.map((game) => {
    let changedGame = false;

    const nextBookmakers = game.bookmakers.map((bookmaker) => {
      let changedBookmaker = false;

      const nextMarkets = bookmaker.markets.map((market) => {
        if (market.key !== "h2h") return market;

        let changedMarket = false;

        const nextOutcomes = market.outcomes.map((outcome) => {
          if (outcome.asset_id !== assetId) return outcome;

          changedMarket = true;
          return {
            ...outcome,
            price: nextAmerican,
          };
        });

        if (!changedMarket) return market;

        changedBookmaker = true;
        return {
          ...market,
          outcomes: nextOutcomes,
        };
      });

      if (!changedBookmaker) return bookmaker;

      changedGame = true;
      return {
        ...bookmaker,
        last_update: new Date().toISOString(),
        markets: nextMarkets,
      };
    });

    if (!changedGame) return game;

    changedAnyGame = true;
    return {
      ...game,
      bookmakers: nextBookmakers,
    };
  });

  return changedAnyGame ? nextGames : games;
}

export default function OddsBoardClient({
  initialGames,
  initialUpdatedAt,
}: {
  initialGames: Game[];
  initialUpdatedAt: string;
}) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [updatedAt, setUpdatedAt] = useState<string>(initialUpdatedAt);
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const assetIds = useMemo(() => {
    const ids = new Set<string>();

    for (const game of initialGames) {
      const bookmaker = game.bookmakers?.[0];
      const h2h = getMarket(bookmaker, "h2h")?.outcomes ?? [];

      for (const outcome of h2h) {
        if (outcome.asset_id) {
          ids.add(outcome.asset_id);
        }
      }
    }

    return Array.from(ids);
  }, [initialGames]);

  useEffect(() => {
    if (assetIds.length === 0) return;

    const ws = new WebSocket(
      "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setIsSocketOpen(true);

      ws.send(
        JSON.stringify({
          assets_ids: assetIds,
          type: "market",
          custom_feature_enabled: true,
        })
      );
    };

    ws.onmessage = (event) => {
      let parsed: unknown;

      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      const messages: MarketWsMessage[] = Array.isArray(parsed)
        ? (parsed as MarketWsMessage[])
        : [parsed as MarketWsMessage];

      let nextGames = games;

      setGames((prevGames) => {
        nextGames = prevGames;

        for (const message of messages) {
          if (message.event_type === "book") {
            const probability = chooseProbabilityFromBook(
              message.bids,
              message.asks
            );

            if (probability !== null && message.asset_id) {
              nextGames = updateGamesFromAssetPrice(
                nextGames,
                message.asset_id,
                probability
              );
            }
          } else if (message.event_type === "best_bid_ask") {
            const probability = chooseProbabilityFromBestBidAsk(
              message.best_bid,
              message.best_ask
            );

            if (probability !== null && message.asset_id) {
              nextGames = updateGamesFromAssetPrice(
                nextGames,
                message.asset_id,
                probability
              );
            }
          } else if (message.event_type === "last_trade_price") {
            const probability = Number(message.price);

            if (Number.isFinite(probability) && message.asset_id) {
              nextGames = updateGamesFromAssetPrice(
                nextGames,
                message.asset_id,
                probability
              );
            }
          } else if (message.event_type === "price_change") {
            for (const change of message.price_changes ?? []) {
              const probability =
                chooseProbabilityFromBestBidAsk(
                  change.best_bid,
                  change.best_ask
                ) ??
                (Number.isFinite(Number(change.price))
                  ? Number(change.price)
                  : null);

              if (probability !== null && change.asset_id) {
                nextGames = updateGamesFromAssetPrice(
                  nextGames,
                  change.asset_id,
                  probability
                );
              }
            }
          }
        }

        return nextGames;
      });

      setUpdatedAt(new Date().toISOString());
    };

    ws.onerror = () => {
      setIsSocketOpen(false);
    };

    ws.onclose = () => {
      setIsSocketOpen(false);
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [assetIds, games]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              isSocketOpen ? "bg-green-400" : "bg-zinc-600"
            }`}
          />
          <span>
            {isSocketOpen ? "Live" : "Snapshot"} ·{" "}
            {new Date(updatedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}