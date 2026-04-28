import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  doesBetMatchWinningToken,
  getPolymarketResolutionByConditionId,
} from "@/lib/polymarket";

type OpenPolymarketBet = {
  id: string;
  user_id: string;
  status: string;
  polymarket_condition_id: string | null;
  polymarket_token_id: string | null;
  polymarket_outcome: string | null;
};

function isAuthorizedCronRequest(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: openBets, error: openBetsError } = await supabaseAdmin
      .from("bets")
      .select(
        `
        id,
        user_id,
        status,
        polymarket_condition_id,
        polymarket_token_id,
        polymarket_outcome
      `
      )
      .eq("status", "open")
      .not("polymarket_condition_id", "is", null)
      .limit(100);

    if (openBetsError) throw openBetsError;

    const results: Array<{
      betId: string;
      action: "settled" | "skipped" | "error";
      result?: "won" | "lost";
      reason?: string;
    }> = [];

    const resolutionCache = new Map<
      string,
      Awaited<ReturnType<typeof getPolymarketResolutionByConditionId>>
    >();

    for (const bet of (openBets ?? []) as OpenPolymarketBet[]) {
      try {
        const conditionId = bet.polymarket_condition_id;

        if (!conditionId) {
          results.push({
            betId: bet.id,
            action: "skipped",
            reason: "Missing condition id.",
          });
          continue;
        }

        let resolution = resolutionCache.get(conditionId);

        if (!resolution) {
          resolution = await getPolymarketResolutionByConditionId(conditionId);
          resolutionCache.set(conditionId, resolution);
        }

        if (!resolution.resolved) {
          await supabaseAdmin
            .from("bets")
            .update({
              polymarket_synced_at: new Date().toISOString(),
              polymarket_resolution_error: resolution.reason,
            })
            .eq("id", bet.id);

          results.push({
            betId: bet.id,
            action: "skipped",
            reason: resolution.reason,
          });
          continue;
        }

        const didWin = doesBetMatchWinningToken({
          betTokenId: bet.polymarket_token_id,
          betOutcome: bet.polymarket_outcome,
          winningTokenId: resolution.winningTokenId,
          winningOutcome: resolution.winningOutcome,
        });

        const settleResult = didWin ? "won" : "lost";

        const { error: settleError } = await supabaseAdmin.rpc(
          "settle_bet_for_user",
          {
            p_user_id: bet.user_id,
            p_bet_id: bet.id,
            p_result: settleResult,
            p_cashout_amount: null,
          }
        );

        if (settleError) throw settleError;

        const { error: updateError } = await supabaseAdmin
          .from("bets")
          .update({
            polymarket_synced_at: new Date().toISOString(),
            polymarket_resolution_source: "polymarket_clob_simplified_markets",
            polymarket_winning_token_id: resolution.winningTokenId,
            polymarket_winning_outcome: resolution.winningOutcome,
            polymarket_resolution_error: null,
          })
          .eq("id", bet.id);

        if (updateError) throw updateError;

        results.push({
          betId: bet.id,
          action: "settled",
          result: settleResult,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown sync error.";

        await supabaseAdmin
          .from("bets")
          .update({
            polymarket_synced_at: new Date().toISOString(),
            polymarket_resolution_error: message,
          })
          .eq("id", bet.id);

        results.push({
          betId: bet.id,
          action: "error",
          reason: message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: openBets?.length ?? 0,
      results,
    });
  } catch (error) {
    console.error("Polymarket settlement sync error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync Polymarket settlements.",
      },
      { status: 500 }
    );
  }
}