"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import type { PlanKey } from "@/lib/plans";

type ButtonStyle = "gold" | "silver" | "default";

function getButtonShellClassName(style: ButtonStyle) {
  if (style === "gold") return "bg-[#7b5a12]";
  if (style === "silver") return "bg-zinc-500";
  return "bg-zinc-800";
}

function getButtonFaceClassName(style: ButtonStyle) {
  if (style === "gold") {
    return "border border-[#6b5520] bg-linear-to-br from-[#e0b84b] via-[#cfa13a] to-[#b68b2d] text-[#120d02]";
  }

  if (style === "silver") {
    return "border border-zinc-400 bg-linear-to-br from-zinc-100 via-zinc-300 to-zinc-400 text-zinc-900";
  }

  return "border border-zinc-800 bg-zinc-900 text-zinc-100";
}

function getShimmerClassName(style: ButtonStyle) {
  if (style === "gold") {
    return "pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-[#fff6d5]/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]";
  }

  return "pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-white/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]";
}

export default function ChallengeCta({
  cta,
  buttonStyle,
  shimmerEnabled,
  planKey,
}: {
  cta: string;
  buttonStyle: ButtonStyle;
  shimmerEnabled: boolean;
  planKey: PlanKey;
}) {
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const [isLoading, setIsLoading] = useState(false);

  const sharedClassName = [
    "relative inline-flex h-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[16px] px-4 text-[15px] font-semibold transition-transform duration-100 hover:translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70",
    getButtonFaceClassName(buttonStyle),
  ].join(" ");

  const sharedStyle = {
    transform: "translateY(-2px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
  } as const;

  async function handleClick() {
    if (!ready || isLoading) return;

    if (!authenticated) {
      login();
      return;
    }

    try {
      setIsLoading(true);

      const privyUserId = user?.id;
      const email = user?.email?.address ?? null;
      const walletAddress =
        user?.wallet?.address ??
        user?.linkedAccounts?.find((account) => account.type === "wallet")
          ?.address ??
        null;

      if (!privyUserId) {
        throw new Error("Missing Privy user.");
      }

      const response = await fetch("/api/accounts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planKey,
          privyUserId,
          email,
          walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create account.");
      }

      router.push(`/accounts/${data.accountId}`);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={[
        "mt-4 inline-block w-full rounded-[16px]",
        getButtonShellClassName(buttonStyle),
      ].join(" ")}
      style={{ paddingBottom: "2px", lineHeight: 0 }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready || isLoading}
        className={sharedClassName}
        style={sharedStyle}
      >
        {shimmerEnabled ? (
          <span
            aria-hidden="true"
            className={getShimmerClassName(buttonStyle)}
          />
        ) : null}
        <span className="relative z-10">
          {isLoading ? "Starting..." : cta}
        </span>
      </button>
    </div>
  );
}