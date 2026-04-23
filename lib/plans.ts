export type PlanKey = "1000" | "2000" | "5000" | "10000";

export type PlanConfig = {
  planKey: PlanKey;
  sizeLabel: string;
  badge: string | null;
  feeLabel: string;
  feeAmount: number;
  cta: string;
};

export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  "1000": {
    planKey: "1000",
    sizeLabel: "$1,000",
    badge: null,
    feeLabel: "$49",
    feeAmount: 49,
    cta: "Start 1k Challenge",
  },
  "2000": {
    planKey: "2000",
    sizeLabel: "$2,000",
    badge: "Best for Beginners",
    feeLabel: "$89",
    feeAmount: 89,
    cta: "Start 2k Challenge",
  },
  "5000": {
    planKey: "5000",
    sizeLabel: "$5,000",
    badge: "Heating Up",
    feeLabel: "$179",
    feeAmount: 179,
    cta: "Start 5k Challenge",
  },
  "10000": {
    planKey: "10000",
    sizeLabel: "$10,000",
    badge: "33x Your Capital",
    feeLabel: "$299",
    feeAmount: 299,
    cta: "Start 10k Challenge",
  },
};

export const ACCOUNT_PLANS = [
  PLAN_CONFIG["10000"],
  PLAN_CONFIG["5000"],
  PLAN_CONFIG["2000"],
  PLAN_CONFIG["1000"],
];