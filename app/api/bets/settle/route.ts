import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { privyServer } from "@/lib/privy-server";

type SettleResult = "won" | "lost" | "void" | "cashed_out";

type SettleBetBody = {
  betId?: string;
  result?: SettleResult;
  cashoutAmount?: number | null;
};

const VALID_RESULTS: SettleResult[] = ["won", "lost", "void", "cashed_out"];

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

    const body = (await req.json()) as SettleBetBody;

    if (!body.betId) {
      return NextResponse.json({ error: "Missing bet ID." }, { status: 400 });
    }

    if (!body.result || !VALID_RESULTS.includes(body.result)) {
      return NextResponse.json({ error: "Invalid result." }, { status: 400 });
    }

    if (body.result === "cashed_out") {
      if (
        typeof body.cashoutAmount !== "number" ||
        Number.isNaN(body.cashoutAmount) ||
        body.cashoutAmount < 0
      ) {
        return NextResponse.json(
          { error: "Invalid cashout amount." },
          { status: 400 }
        );
      }
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

    const { error: settleError } = await supabaseAdmin.rpc(
      "settle_bet_for_user",
      {
        p_user_id: dbUser.id,
        p_bet_id: body.betId,
        p_result: body.result,
        p_cashout_amount:
          body.result === "cashed_out" ? body.cashoutAmount : null,
      }
    );

    if (settleError) throw settleError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Settle bet error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to settle bet.",
      },
      { status: 500 }
    );
  }
}