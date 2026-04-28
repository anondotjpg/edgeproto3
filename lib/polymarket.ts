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
  outcomes?: string | string[];
  clobTokenIds?: string | string[];
  closed?: boolean;
  archived?: boolean;
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

function normalizeTokenId(value: string | null | undefined) {
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
  return String(token.o ?? token.outcome ?? "").trim();
}

async function getClobMarketByConditionId(conditionId: string) {
  const url = new URL(
    `/clob-markets/${encodeURIComponent(conditionId)}`,
    CLOB_BASE_URL
  );

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Polymarket CLOB request failed: ${response.status}`);
  }

  return (await response.json()) as ClobMarketResponse;
}

async function getGammaMarketByConditionId(conditionId: string) {
  const url = new URL("/markets", GAMMA_BASE_URL);
  url.searchParams.set("condition_ids", conditionId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Polymarket Gamma request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GammaMarket[];

  return Array.isArray(payload) ? payload[0] ?? null : null;
}

export async function getPolymarketResolutionByConditionId(
  conditionId: string
): Promise<PolymarketResolution> {
  const normalizedConditionId = conditionId.trim();

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
  }

  /**
   * Fallback: Gamma can find market metadata by condition id.
   * This is useful because an unresolved market may not expose a winner flag yet.
   */
  const gammaMarket = await getGammaMarketByConditionId(normalizedConditionId);

  if (!gammaMarket) {
    return {
      resolved: false,
      reason:
        "Polymarket market not found for this condition id. The saved condition id may be wrong or the market may not be available from the current API.",
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
      "Market is closed, but no winning token is available yet. Try again later.",
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

  if (normalizedBetTokenId && normalizedWinningTokenId) {
    return normalizedBetTokenId === normalizedWinningTokenId;
  }

  return (
    String(betOutcome ?? "").trim().toLowerCase() ===
    String(winningOutcome ?? "").trim().toLowerCase()
  );
}