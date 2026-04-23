import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_CONFIG, type PlanKey } from "@/lib/plans";

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { id } = await params;

  const { data: account, error } = await supabaseAdmin
    .from("challenge_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!account) {
    notFound();
  }

  const plan = PLAN_CONFIG[account.plan_key as PlanKey];

  return (
    <div className="min-h-screen bg-[#09090b] px-5 pt-20 pb-24 text-white md:pb-0 md:pt-0">
      <div className="mx-auto w-full max-w-3xl md:flex md:min-h-screen md:items-center md:py-16">
        <div className="w-full rounded-[24px] border border-zinc-800 bg-zinc-950 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Account Created
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">
                {plan?.sizeLabel ?? `$${Number(account.plan_size).toLocaleString()}`}{" "}
                Challenge
              </h1>

              <p className="mt-2 text-zinc-400">
                Your account is live in dev mode.
              </p>
            </div>

            <Link
              href="/accounts"
              className="shrink-0 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              Back
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Status
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">
                {account.status}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Account Size
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">
                ${Number(account.plan_size).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Fee
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">
                ${Number(account.one_time_fee)}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Profit Target
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">
                {account.profit_target_percent}%
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Daily Drawdown
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">
                {account.daily_drawdown_percent}%
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Total Drawdown
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">
                {account.total_drawdown_percent}%
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Account ID
            </div>
            <div className="mt-2 break-all text-sm text-zinc-300">
              {account.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}