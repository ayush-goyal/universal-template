export const PLAN_NAMES = {
  FREE: "free",
  PRO: "pro",
} as const;

export type PlanName = (typeof PLAN_NAMES)[keyof typeof PLAN_NAMES];

export interface PlanLimits {
  projects: number;
  storage: number;
  apiRequests: number;
}

export interface PlanDefinition {
  name: PlanName;
  displayName: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  limits: PlanLimits;
  features: string[];
  popular?: boolean;
  trialDays?: number;
}

export const FREE_LIMITS: PlanLimits = {
  projects: 3,
  storage: 1,
  apiRequests: 1000,
};

export const PRO_LIMITS: PlanLimits = {
  projects: 50,
  storage: 100,
  apiRequests: 100_000,
};

export const PLANS: Record<PlanName, PlanDefinition> = {
  [PLAN_NAMES.FREE]: {
    name: PLAN_NAMES.FREE,
    displayName: "Free",
    description: "Perfect for trying things out",
    monthlyPrice: 0,
    annualPrice: 0,
    limits: FREE_LIMITS,
    features: ["Up to 3 projects", "1 GB storage", "1,000 API requests/month", "Community support"],
  },
  [PLAN_NAMES.PRO]: {
    name: PLAN_NAMES.PRO,
    displayName: "Pro",
    description: "For professionals and growing teams",
    monthlyPrice: 20,
    annualPrice: 192,
    limits: PRO_LIMITS,
    popular: true,
    trialDays: 14,
    features: [
      "Up to 50 projects",
      "100 GB storage",
      "100,000 API requests/month",
      "Priority support",
      "Advanced analytics",
      "Custom integrations",
    ],
  },
};

export function getPlanByName(name: string): PlanDefinition | undefined {
  return PLANS[name as PlanName];
}

export function getLimitsForPlan(planName: string): PlanLimits {
  const plan = getPlanByName(planName);
  return plan?.limits ?? FREE_LIMITS;
}

export function isWithinLimit(
  planName: string,
  limitKey: keyof PlanLimits,
  currentUsage: number
): boolean {
  const limits = getLimitsForPlan(planName);
  return currentUsage < limits[limitKey];
}
