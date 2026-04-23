import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_CONFIG, type PlanKey } from "@/lib/plans";

type CreateAccountBody = {
  planKey?: PlanKey;
  privyUserId?: string;
  email?: string | null;
  walletAddress?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateAccountBody;

    const { planKey, privyUserId, email, walletAddress } = body;

    if (!planKey || !(planKey in PLAN_CONFIG)) {
      return NextResponse.json(
        { error: "Invalid plan selected." },
        { status: 400 }
      );
    }

    if (!privyUserId) {
      return NextResponse.json(
        { error: "Missing Privy user ID." },
        { status: 400 }
      );
    }

    const selectedPlan = PLAN_CONFIG[planKey];

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (existingUserError) {
      throw existingUserError;
    }

    let userId = existingUser?.id as string | undefined;

    if (!userId) {
      const { data: insertedUser, error: insertUserError } = await supabaseAdmin
        .from("users")
        .insert({
          privy_user_id: privyUserId,
          email: email ?? null,
          wallet_address: walletAddress ?? null,
        })
        .select("id")
        .single();

      if (insertUserError) {
        throw insertUserError;
      }

      userId = insertedUser.id;
    } else {
      const { error: updateUserError } = await supabaseAdmin
        .from("users")
        .update({
          email: email ?? null,
          wallet_address: walletAddress ?? null,
        })
        .eq("id", userId);

      if (updateUserError) {
        throw updateUserError;
      }
    }

    const { data: insertedAccount, error: insertAccountError } =
      await supabaseAdmin
        .from("challenge_accounts")
        .insert({
          user_id: userId,
          plan_key: selectedPlan.planKey,
          plan_size: Number(selectedPlan.planKey),
          one_time_fee: selectedPlan.feeAmount,
          status: "active_dev",
        })
        .select("id")
        .single();

    if (insertAccountError) {
      throw insertAccountError;
    }

    const accountId = insertedAccount.id as string;

    const { error: eventError } = await supabaseAdmin.from("account_events").insert({
      account_id: accountId,
      type: "account_created",
      payload: {
        planKey: selectedPlan.planKey,
        feeAmount: selectedPlan.feeAmount,
      },
    });

    if (eventError) {
      throw eventError;
    }

    return NextResponse.json({
      ok: true,
      accountId,
    });
  } catch (error) {
    console.error("Create account error:", error);

    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}