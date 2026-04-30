type ClobToken = {
  t?: string;
  token_id?: string;
  tokenId?: string;
  o?: string;
  outcome?: string;
  winner?: boolean;
};

type ClobMarketResponse = {
  condition_id?: string;
  conditionId?: string;
  tokens?: ClobToken[];
  t?: ClobToken[];
};

type GammaMarket = {
  id?: string | number;
  conditionId?: string;
  condition_id?: string;
  question?: string;
  title?: string;
  slug?: string;
  outcomes?: string | string[];
  clobTokenIds?: string | string[];
  outcomePrices?: string | string[];
  closed?: boolean;
  archived?: boolean;
  active?: boolean;
  resolvedBy?: string;
  winner?: string;
  winningOutcome?: string;
  winning_outcome?: string;
  winningTokenId?: string;
  winning_token_id?: string;
  umaResolutionStatus?: string;
};

export type PolymarketResolution =
  | {
      resolved: false;
      reason: string;
    }
  | {
      resolved: true;
      conditionId: string;
      winningTokenId: string;
      winningOutcome: string;
    };

const CLOB_BASE_URL = "https://clob.polymarket.com";
const GAMMA_BASE_URL = "https://gamma-api.polymarket.com";

function logPolymarket(message: string, data?: Record<string, unknown>) {
  console.log(`[polymarket-sync] ${message}`, data ?? "");
}

function normalizeTokenId(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeConditionId(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeOutcome(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }

  return [];
}

function getTokenId(token: ClobToken) {
  return normalizeTokenId(token.t ?? token.token_id ?? token.tokenId);
}

function getTokenOutcome(token: ClobToken) {
  return normalizeOutcome(token.o ?? token.outcome);
}

function getGammaConditionId(market: GammaMarket) {
  return normalizeConditionId(market.conditionId ?? market.condition_id);
}

function getGammaWinningOutcome(market: GammaMarket) {
  return normalizeOutcome(
    market.winningOutcome ?? market.winning_outcome ?? market.winner
  );
}

function getGammaWinningTokenId(market: GammaMarket) {
  return normalizeTokenId(market.winningTokenId ?? market.winning_token_id);
}

function getGammaTokenOutcomePairs(market: GammaMarket) {
  const outcomes = parseStringArray(market.outcomes);
  const tokenIds = parseStringArray(market.clobTokenIds);

  return outcomes.map((outcome, index) => ({
    outcome: normalizeOutcome(outcome),
    tokenId: normalizeTokenId(tokenIds[index]),
  }));
}

function getGammaWinningTokenFromOutcome(market: GammaMarket) {
  const winningOutcome = getGammaWinningOutcome(market);

  if (!winningOutcome) return null;

  const pairs = getGammaTokenOutcomePairs(market);

  const match = pairs.find(
    (pair) => pair.outcome.toLowerCase() === winningOutcome.toLowerCase()
  );

  if (!match?.tokenId) return null;

  return {
    winningTokenId: match.tokenId,
    winningOutcome: match.outcome,
  };
}

function getGammaWinningTokenFromOutcomePrices(market: GammaMarket) {
  const outcomes = parseStringArray(market.outcomes);
  const tokenIds = parseStringArray(market.clobTokenIds);
  const prices = parseStringArray(market.outcomePrices);

  const rows = outcomes.map((outcome, index) => ({
    outcome: normalizeOutcome(outcome),
    tokenId: normalizeTokenId(tokenIds[index]),
    price: Number(prices[index]),
  }));

  logPolymarket("Gamma outcome price rows", {
    marketId: market.id ?? null,
    closed: market.closed ?? null,
    umaResolutionStatus: market.umaResolutionStatus ?? null,
    rows,
  });

  const exactWinner = rows.find(
    (row) => row.tokenId && Number.isFinite(row.price) && row.price >= 0.99
  );

  if (exactWinner) {
    return {
      winningTokenId: exactWinner.tokenId,
      winningOutcome: exactWinner.outcome,
    };
  }

  if (market.closed === true) {
    const sortedRows = rows
      .filter((row) => row.tokenId && Number.isFinite(row.price))
      .sort((a, b) => b.price - a.price);

    const top = sortedRows[0];
    const second = sortedRows[1];

    if (top && (!second || top.price > second.price)) {
      return {
        winningTokenId: top.tokenId,
        winningOutcome: top.outcome,
      };
    }
  }

  return null;
}

async function getClobMarketByConditionId(conditionId: string) {
  const url = new URL(
    `/clob-markets/${encodeURIComponent(conditionId)}`,
    CLOB_BASE_URL
  );

  logPolymarket("Trying CLOB market lookup", {
    conditionId,
    url: url.toString(),
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  logPolymarket("CLOB market lookup response", {
    conditionId,
    status: response.status,
    ok: response.ok,
  });

  if (response.status === 404) {
    logPolymarket("CLOB market lookup returned 404", {
      conditionId,
    });

    return null;
  }

  if (!response.ok) {
    throw new Error(`Polymarket CLOB request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ClobMarketResponse;

  const tokens = Array.isArray(payload.tokens)
    ? payload.tokens
    : Array.isArray(payload.t)
      ? payload.t
      : [];

  logPolymarket("CLOB market lookup parsed", {
    conditionId,
    returnedConditionId: payload.condition_id ?? payload.conditionId ?? null,
    tokenCount: tokens.length,
    hasWinner: tokens.some((token) => token.winner === true),
  });

  return payload;
}

async function fetchGammaMarketByConditionId(
  conditionId: string,
  options?: { closed?: boolean; label?: string }
) {
  const url = new URL("/markets", GAMMA_BASE_URL);
  url.searchParams.set("condition_ids", conditionId);

  if (typeof options?.closed === "boolean") {
    url.searchParams.set("closed", String(options.closed));
  }

  const label = options?.label ?? "gamma";

  logPolymarket("Trying Gamma market lookup", {
    conditionId,
    label,
    closed: options?.closed ?? "unset",
    url: url.toString(),
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  logPolymarket("Gamma market lookup response", {
    conditionId,
    label,
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    throw new Error(`Polymarket Gamma request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GammaMarket[];
  const market = Array.isArray(payload) ? payload[0] ?? null : null;

  logPolymarket("Gamma market lookup parsed", {
    conditionId,
    label,
    resultCount: Array.isArray(payload) ? payload.length : 0,
    found: Boolean(market),
    marketId: market?.id ?? null,
    returnedConditionId: market
      ? market.conditionId ?? market.condition_id ?? null
      : null,
    closed: market?.closed ?? null,
    active: market?.active ?? null,
    archived: market?.archived ?? null,
    umaResolutionStatus: market?.umaResolutionStatus ?? null,
    question: market?.question ?? market?.title ?? null,
  });

  return market;
}

async function getGammaMarketByConditionId(conditionId: string) {
  const openMarket = await fetchGammaMarketByConditionId(conditionId, {
    closed: false,
    label: "closed=false",
  });

  if (openMarket) {
    logPolymarket("Gamma market found with closed=false", {
      conditionId,
      marketId: openMarket.id ?? null,
    });

    return openMarket;
  }

  const closedMarket = await fetchGammaMarketByConditionId(conditionId, {
    closed: true,
    label: "closed=true",
  });

  if (closedMarket) {
    logPolymarket("Gamma market found with closed=true", {
      conditionId,
      marketId: closedMarket.id ?? null,
    });

    return closedMarket;
  }

  const anyMarket = await fetchGammaMarketByConditionId(conditionId, {
    label: "unfiltered",
  });

  if (anyMarket) {
    logPolymarket("Gamma market found with unfiltered lookup", {
      conditionId,
      marketId: anyMarket.id ?? null,
    });

    return anyMarket;
  }

  logPolymarket("Gamma market not found in any lookup", {
    conditionId,
  });

  return null;
}

export async function getPolymarketResolutionByConditionId(
  conditionId: string
): Promise<PolymarketResolution> {
  const normalizedConditionId = normalizeConditionId(conditionId);

  logPolymarket("Starting resolution lookup", {
    conditionId: normalizedConditionId,
  });

  if (!normalizedConditionId) {
    return {
      resolved: false,
      reason: "Missing condition id.",
    };
  }

  const clobMarket = await getClobMarketByConditionId(normalizedConditionId);

  if (clobMarket) {
    const tokens = Array.isArray(clobMarket.tokens)
      ? clobMarket.tokens
      : Array.isArray(clobMarket.t)
        ? clobMarket.t
        : [];

    const winningToken = tokens.find((token) => token.winner === true);

    if (winningToken) {
      const winningTokenId = getTokenId(winningToken);
      const winningOutcome = getTokenOutcome(winningToken);

      logPolymarket("Winning token found from CLOB", {
        conditionId: normalizedConditionId,
        winningTokenId,
        winningOutcome,
      });

      if (!winningTokenId) {
        return {
          resolved: false,
          reason: "Market resolved, but winning token id is missing.",
        };
      }

      return {
        resolved: true,
        conditionId:
          clobMarket.condition_id ??
          clobMarket.conditionId ??
          normalizedConditionId,
        winningTokenId,
        winningOutcome,
      };
    }

    logPolymarket("CLOB market found but no winner flag yet", {
      conditionId: normalizedConditionId,
      tokenCount: tokens.length,
    });
  } else {
    logPolymarket("CLOB market not found, moving to Gamma fallback", {
      conditionId: normalizedConditionId,
    });
  }

  const gammaMarket = await getGammaMarketByConditionId(normalizedConditionId);

  if (!gammaMarket) {
    return {
      resolved: false,
      reason:
        "Polymarket market not found after checking CLOB, Gamma closed=false, Gamma closed=true, and Gamma unfiltered. Check server logs for [polymarket-sync].",
    };
  }

  const gammaConditionId = getGammaConditionId(gammaMarket);
  const gammaWinningTokenId = getGammaWinningTokenId(gammaMarket);
  const gammaWinningOutcome = getGammaWinningOutcome(gammaMarket);
  const gammaWinnerFromOutcome = getGammaWinningTokenFromOutcome(gammaMarket);
  const gammaWinnerFromPrices =
    getGammaWinningTokenFromOutcomePrices(gammaMarket);

  logPolymarket("Gamma fallback found market", {
    requestedConditionId: normalizedConditionId,
    returnedConditionId: gammaConditionId,
    marketId: gammaMarket.id ?? null,
    closed: gammaMarket.closed ?? null,
    active: gammaMarket.active ?? null,
    archived: gammaMarket.archived ?? null,
    umaResolutionStatus: gammaMarket.umaResolutionStatus ?? null,
    directWinningTokenId: gammaWinningTokenId || null,
    directWinningOutcome: gammaWinningOutcome || null,
    derivedWinningTokenId: gammaWinnerFromOutcome?.winningTokenId ?? null,
    derivedWinningOutcome: gammaWinnerFromOutcome?.winningOutcome ?? null,
    priceWinningTokenId: gammaWinnerFromPrices?.winningTokenId ?? null,
    priceWinningOutcome: gammaWinnerFromPrices?.winningOutcome ?? null,
  });

  if (gammaWinningTokenId && gammaWinningOutcome) {
    logPolymarket("Winning token found directly from Gamma", {
      conditionId: normalizedConditionId,
      winningTokenId: gammaWinningTokenId,
      winningOutcome: gammaWinningOutcome,
    });

    return {
      resolved: true,
      conditionId: gammaConditionId || normalizedConditionId,
      winningTokenId: gammaWinningTokenId,
      winningOutcome: gammaWinningOutcome,
    };
  }

  if (gammaWinnerFromOutcome) {
    logPolymarket("Winning token derived from Gamma outcome + clobTokenIds", {
      conditionId: normalizedConditionId,
      winningTokenId: gammaWinnerFromOutcome.winningTokenId,
      winningOutcome: gammaWinnerFromOutcome.winningOutcome,
    });

    return {
      resolved: true,
      conditionId: gammaConditionId || normalizedConditionId,
      winningTokenId: gammaWinnerFromOutcome.winningTokenId,
      winningOutcome: gammaWinnerFromOutcome.winningOutcome,
    };
  }

  if (gammaWinnerFromPrices) {
    logPolymarket("Winning token derived from Gamma outcomePrices", {
      conditionId: normalizedConditionId,
      winningTokenId: gammaWinnerFromPrices.winningTokenId,
      winningOutcome: gammaWinnerFromPrices.winningOutcome,
    });

    return {
      resolved: true,
      conditionId: gammaConditionId || normalizedConditionId,
      winningTokenId: gammaWinnerFromPrices.winningTokenId,
      winningOutcome: gammaWinnerFromPrices.winningOutcome,
    };
  }

  if (gammaMarket.closed !== true) {
    return {
      resolved: false,
      reason: "Market found, but it is not closed/resolved yet.",
    };
  }

  return {
    resolved: false,
    reason:
      "Market is closed, but no winning token is available yet. Check server logs for [polymarket-sync].",
  };
}

export function doesBetMatchWinningToken({
  betTokenId,
  betOutcome,
  winningTokenId,
  winningOutcome,
}: {
  betTokenId: string | null;
  betOutcome: string | null;
  winningTokenId: string;
  winningOutcome: string;
}) {
  const normalizedBetTokenId = normalizeTokenId(betTokenId);
  const normalizedWinningTokenId = normalizeTokenId(winningTokenId);

  const tokenMatch =
    Boolean(normalizedBetTokenId && normalizedWinningTokenId) &&
    normalizedBetTokenId === normalizedWinningTokenId;

  const outcomeMatch =
    String(betOutcome ?? "").trim().toLowerCase() ===
    String(winningOutcome ?? "").trim().toLowerCase();

  logPolymarket("Comparing bet against winning token", {
    betTokenId: normalizedBetTokenId || null,
    betOutcome: betOutcome ?? null,
    winningTokenId: normalizedWinningTokenId || null,
    winningOutcome,
    tokenMatch,
    outcomeMatch,
  });

  if (normalizedBetTokenId && normalizedWinningTokenId) {
    return normalizedBetTokenId === normalizedWinningTokenId;
  }

  return outcomeMatch;
}