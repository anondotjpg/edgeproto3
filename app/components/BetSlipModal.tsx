"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type OwnedAccount = {
  id: string;
  plan_key: string;
  plan_size: number;
  one_time_fee: number;
  status: string;
  created_at: string;
};

type BetSlipModalProps = {
  team: string;
  gameId: string;
  league: string;
  market: string;
  odds: string;
  impliedPercent: string;
  matchup: string;

  polymarketEventId?: string | null;
  polymarketEventSlug?: string | null;
  polymarketMarketId?: string | null;
  polymarketConditionId?: string | null;
  polymarketMarketSlug?: string | null;
  polymarketOutcome?: string | null;
  polymarketOutcomeIndex?: number | null;
  polymarketTokenId?: string | null;
};

function parseAmount(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");
  if (parts.length <= 1) return normalized;
  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function parseOdds(value: string) {
  return Number(value.replace("+", ""));
}

function getPlanLabel(account: OwnedAccount) {
  return `$${Number(account.plan_size).toLocaleString()}`;
}

export default function BetSlipModal({
  team,
  gameId,
  league,
  market,
  odds,
  impliedPercent,
  matchup,

  polymarketEventId,
  polymarketEventSlug,
  polymarketMarketId,
  polymarketConditionId,
  polymarketMarketSlug,
  polymarketOutcome,
  polymarketOutcomeIndex,
  polymarketTokenId,
}: BetSlipModalProps) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState<OwnedAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericOdds = parseOdds(odds);

  const possiblePayout = useMemo(() => {
    const stake = Number(amount);

    if (!stake || Number.isNaN(stake)) return "—";
    if (!numericOdds || Number.isNaN(numericOdds)) return "—";

    const profit =
      numericOdds > 0
        ? stake * (numericOdds / 100)
        : stake * (100 / Math.abs(numericOdds));

    return `$${(stake + profit).toFixed(2)}`;
  }, [amount, numericOdds]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      if (!open || !ready || !authenticated) return;

      try {
        setIsLoadingAccounts(true);
        setError(null);

        const accessToken = await getAccessToken();

        const response = await fetch("/api/accounts/mine", {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {},
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load accounts.");
        }

        if (!cancelled) {
          const loadedAccounts = data.accounts ?? [];
          setAccounts(loadedAccounts);

          if (loadedAccounts.length === 1) {
            setSelectedAccountIds([loadedAccounts[0].id]);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load accounts."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      }
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [open, ready, authenticated, getAccessToken]);

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  }

  async function placeBet() {
    if (!ready) return;

    if (!authenticated) {
      login();
      return;
    }

    try {
      setIsPlacing(true);
      setError(null);

      const stake = Number(amount);

      if (!selectedAccountIds.length) {
        throw new Error("Select at least one account.");
      }

      if (!stake || stake <= 0) {
        throw new Error("Enter a valid bet amount.");
      }

      if (!polymarketConditionId || !polymarketTokenId) {
        throw new Error(
          "Missing Polymarket settlement data. Refresh and try again."
        );
      }

      const accessToken = await getAccessToken();

      const response = await fetch("/api/bets/place", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
        body: JSON.stringify({
          accountIds: selectedAccountIds,
          gameId,
          league,
          market,
          selection: team,
          odds: numericOdds,
          stake,

          polymarketEventId,
          polymarketEventSlug,
          polymarketMarketId,
          polymarketConditionId,
          polymarketMarketSlug,
          polymarketOutcome: polymarketOutcome ?? team,
          polymarketOutcomeIndex,
          polymarketTokenId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to place bet.");
      }

      setOpen(false);
      setAmount("");
      setSelectedAccountIds([]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsPlacing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[56px] min-w-[104px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 text-center transition-colors hover:bg-zinc-900"
      >
        <div className="text-[20px] font-semibold tracking-tight text-zinc-100">
          {odds}
        </div>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-4 pb-4 sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="Close bet slip"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Place Bet
                </div>

                <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-zinc-100">
                  {team}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">{matchup}</p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Moneyline
                </div>
                <div className="mt-1 text-xl font-semibold text-zinc-100">
                  {odds}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Implied
                </div>
                <div className="mt-1 text-xl font-semibold text-zinc-100">
                  {impliedPercent}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-medium text-zinc-300">
                Select account
              </div>

              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                {!authenticated ? (
                  <button
                    type="button"
                    onClick={login}
                    className="w-full rounded-2xl border border-zinc-800 bg-black/30 p-4 text-left text-sm text-zinc-300"
                  >
                    Sign in to select an account.
                  </button>
                ) : isLoadingAccounts ? (
                  <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
                    Loading accounts...
                  </div>
                ) : accounts.length ? (
                  accounts.map((account) => {
                    const selected = selectedAccountIds.includes(account.id);

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleAccount(account.id)}
                        className={[
                          "flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors",
                          selected
                            ? "border-zinc-500 bg-zinc-900"
                            : "border-zinc-800 bg-black/30 hover:border-zinc-700",
                        ].join(" ")}
                      >
                        <div>
                          <div className="text-sm font-semibold text-zinc-100">
                            {getPlanLabel(account)} Challenge
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {account.status}
                          </div>
                        </div>

                        <div
                          className={[
                            "h-4 w-4 rounded-full border",
                            selected
                              ? "border-zinc-100 bg-zinc-100"
                              : "border-zinc-700",
                          ].join(" ")}
                        />
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
                    No accounts found. Start a challenge first.
                  </div>
                )}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-zinc-300">
                Bet amount
              </span>

              <div className="mt-2 flex h-12 items-center rounded-2xl border border-zinc-800 bg-black/30 px-4 focus-within:border-zinc-600">
                <span className="text-zinc-500">$</span>
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(parseAmount(event.target.value))
                  }
                  placeholder="0.00"
                  inputMode="decimal"
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-lg font-semibold text-white outline-none placeholder:text-zinc-600"
                />
              </div>
            </label>

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-zinc-400">Possible payout</div>
                <div className="text-lg font-semibold text-zinc-100">
                  {possiblePayout}
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-950 bg-red-950/20 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={placeBet}
              disabled={
                isPlacing ||
                !amount ||
                Number(amount) <= 0 ||
                !selectedAccountIds.length
              }
              className="mt-5 h-12 w-full rounded-2xl bg-zinc-100 text-[15px] font-semibold text-zinc-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlacing ? "Placing..." : "Place Bet"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}