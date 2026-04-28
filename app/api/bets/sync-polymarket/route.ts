import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { privyServer } from "@/lib/privy-server";
import {
  doesBetMatchWinningToken,
  getPolymarketResolutionByConditionId,
} from "@/lib/polymarket";

type SyncBetBody = {
  betId?: string;
};

export async function POST(req: Request) {
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verifiedClaims = await privyServer
      .utils()
      .auth()
      .verifyAuthToken(accessToken);

    const privyUserId = verifiedClaims.user_id;

    if (!privyUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SyncBetBody;

    if (!body.betId) {
      return NextResponse.json({ error: "Missing bet ID." }, { status: 400 });
    }

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (userError) throw userError;

    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { data: bet, error: betError } = await supabaseAdmin
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
      .eq("id", body.betId)
      .eq("user_id", dbUser.id)
      .maybeSingle();

    if (betError) throw betError;

    if (!bet) {
      return NextResponse.json({ error: "Bet not found." }, { status: 404 });
    }

    if (bet.status !== "open") {
      return NextResponse.json(
        { error: "Bet is already settled." },
        { status: 400 }
      );
    }

    if (!bet.polymarket_condition_id) {
      return NextResponse.json(
        { error: "Bet is missing Polymarket condition id." },
        { status: 400 }
      );
    }

    if (!bet.polymarket_token_id && !bet.polymarket_outcome) {
      return NextResponse.json(
        { error: "Bet is missing Polymarket token/outcome data." },
        { status: 400 }
      );
    }

    const resolution = await getPolymarketResolutionByConditionId(
      bet.polymarket_condition_id
    );

    if (!resolution.resolved) {
      await supabaseAdmin
        .from("bets")
        .update({
          polymarket_synced_at: new Date().toISOString(),
          polymarket_resolution_error: resolution.reason,
        })
        .eq("id", bet.id);

      return NextResponse.json(
        {
          ok: false,
          resolved: false,
          reason: resolution.reason,
        },
        { status: 409 }
      );
    }

    const didWin = doesBetMatchWinningToken({
      betTokenId: bet.polymarket_token_id,
      betOutcome: bet.polymarket_outcome,
      winningTokenId: resolution.winningTokenId,
      winningOutcome: resolution.winningOutcome,
    });

    const result = didWin ? "won" : "lost";

    const { error: settleError } = await supabaseAdmin.rpc(
      "settle_bet_for_user",
      {
        p_user_id: dbUser.id,
        p_bet_id: bet.id,
        p_result: result,
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

    return NextResponse.json({
      ok: true,
      resolved: true,
      result,
      winningTokenId: resolution.winningTokenId,
      winningOutcome: resolution.winningOutcome,
    });
  } catch (error) {
    console.error("Sync Polymarket bet error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync Polymarket bet.",
      },
      { status: 500 }
    );
  }
}