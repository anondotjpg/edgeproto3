import Link from "next/link";
import { headers } from "next/headers";
import Image from "next/image";
import { FiArrowUpRight } from "react-icons/fi";
import LastUpdatedAgo from "./components/LastUpdatedAgo";

type OddsOutcome = {
  name: string;
  price: number;
  point?: number;
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
  slug: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_team_info?: TeamInfo;
  away_team_info?: TeamInfo;
  bookmakers: Bookmaker[];
};

type LeagueBlock = {
  leagueKey: string;
  leagueLabel: string;
  games: Game[];
  error?: string;
};

type ApiResponse = {
  updatedAt: string;
  leagues: LeagueBlock[];
  error?: string;
};

const LEAGUES = [
  { label: "NBA", tag: 745, league: "nba" },
  { label: "NHL", tag: 899, league: "nhl" },
  { label: "MLB", tag: 100381, league: "mlb" },
] as const;

type LeagueKey = (typeof LEAGUES)[number]["league"];

async function getOdds(): Promise<ApiResponse> {
  const headerStore = await headers();
  const host = headerStore.get("host");

  if (!host) {
    throw new Error("Missing host header");
  }

  const protocol = host.includes("localhost") ? "http" : "https";

  const res = await fetch(`${protocol}://${host}/api/odds`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch odds");
  }

  return res.json();
}

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

function getEventHref(game: Game) {
  return `/event/${game.slug}`;
}

function OddsCell({
  value,
  href,
  isTop,
}: {
  value: string;
  href: string;
  isTop?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex min-h-[56px] items-center justify-center bg-transparent px-3 py-2 text-center transition-colors hover:bg-zinc-900",
        !isTop ? "border-t border-zinc-800" : "",
      ].join(" ")}
    >
      <div className="text-[14px] font-semibold tracking-tight text-zinc-100">
        {value}
      </div>
    </Link>
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
  sportKey,
}: {
  team: string;
  info?: TeamInfo;
  sportKey: string;
}) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-3 py-2">
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
  );
}

function GameCard({ game }: { game: Game }) {
  const bookmaker = game.bookmakers?.[0];
  const h2h = getMarket(bookmaker, "h2h")?.outcomes;

  const awayMoneyline = getOutcomeByName(h2h, game.away_team);
  const homeMoneyline = getOutcomeByName(h2h, game.home_team);
  const eventHref = getEventHref(game);

  return (
    <article className="relative rounded-[24px] border border-zinc-800 bg-zinc-950 p-4 pb-12">
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_96px] gap-0">
        <div className="pl-1 text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Teams
        </div>
        <div className="flex items-center justify-center text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          ML
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_96px]">
        <div>
          <TeamRow
            team={game.away_team}
            info={game.away_team_info}
            sportKey={game.sport_key}
          />
          <TeamRow
            team={game.home_team}
            info={game.home_team_info}
            sportKey={game.sport_key}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <OddsCell
            value={formatPrice(awayMoneyline?.price)}
            href={eventHref}
            isTop
          />
          <OddsCell
            value={formatPrice(homeMoneyline?.price)}
            href={eventHref}
          />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 text-[13px] text-zinc-400">
        {formatGameTime(game.commence_time)}
      </div>

      <Link
        href={eventHref}
        className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:text-white"
      >
        <span>View</span>
        <FiArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ league?: string }>;
}) {
  const data = await getOdds();
  const resolvedSearchParams = await searchParams;

  const requestedLeague = resolvedSearchParams?.league;
  const selectedLeague: LeagueKey = LEAGUES.some(
    (item) => item.league === requestedLeague
  )
    ? (requestedLeague as LeagueKey)
    : "nba";

  const league =
    data.leagues.find((item) => item.leagueKey === selectedLeague) ??
    data.leagues[0];

  const selectedLeagueMeta =
    LEAGUES.find((item) => item.league === selectedLeague) ?? LEAGUES[0];

  const totalGames = league?.games.length ?? 0;

  return (
    <>
      <style>{`
        @keyframes buttonShimmer {
          0% {
            transform: translateX(0) skewX(-20deg);
            opacity: 0;
          }
          8% {
            opacity: 0.42;
          }
          24% {
            opacity: 0.42;
          }
          38% {
            transform: translateX(520%) skewX(-20deg);
            opacity: 0;
          }
          100% {
            transform: translateX(520%) skewX(-20deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 sm:py-6 md:pb-6">
          <header>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="no-scrollbar flex items-center gap-4 overflow-x-auto sm:gap-2">
                  {LEAGUES.map((item) => {
                    const isActive = item.league === selectedLeague;

                    return (
                      <Link
                        key={item.league}
                        href={`/?league=${item.league}`}
                        className={
                          isActive
                            ? "shrink-0 text-[13px] font-semibold text-white sm:rounded-full sm:bg-white sm:px-4 sm:py-2 sm:text-black"
                            : "shrink-0 text-[13px] font-medium text-zinc-500 sm:rounded-full sm:bg-zinc-900 sm:px-4 sm:py-2 sm:text-zinc-300"
                        }
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="inline-block rounded-full"
                  style={{
                    background: "#0369a1",
                    paddingBottom: "2px",
                    lineHeight: 0,
                  }}
                >
                  <Link
                    href="/accounts"
                    className="relative inline-flex h-8 items-center overflow-hidden rounded-full bg-linear-to-br from-sky-300 via-sky-400 to-sky-500 px-4 text-[13px] font-bold text-sky-950 transition-transform duration-100 hover:translate-y-px active:translate-y-0"
                    style={{
                      transform: "translateY(-2px)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-white/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]"
                    />
                    <span className="relative z-10">Start Challenge</span>
                  </Link>
                </div>

                <Image
                  src="/pfp.jpg"
                  alt="Account"
                  width={40}
                  height={40}
                  priority
                  className="h-9 w-9 rounded-full border-[1px] border-zinc-800 object-cover"
                />
              </div>
            </div>
          </header>

          <div className="mt-4">
            <section className="space-y-4">
              <div className="grid grid-cols-[112px_minmax(0,1fr)_112px] items-end gap-3 bg-zinc-950">
                <LastUpdatedAgo updatedAt={data.updatedAt} />

                <div className="min-w-0 text-center">
                  <h2 className="text-[33px] font-semibold leading-none tracking-tight text-zinc-50">
                    {league?.leagueLabel ?? selectedLeagueMeta.label}
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-none text-zinc-400">
                    {totalGames} game{totalGames === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex w-[112px] justify-end">
                  {league?.error ? (
                    <div className="rounded-full border border-red-900/60 bg-red-950/60 px-3 py-1 text-[11px] font-medium text-red-400">
                      {league.error}
                    </div>
                  ) : null}
                </div>
              </div>

              {!league || league.games.length === 0 ? (
                <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-5 text-[13px] text-zinc-400">
                  No active {selectedLeagueMeta.label} markets right now.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {league.games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}