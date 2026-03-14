import type { Ambassador, AmbassadorTier, DailyLog } from '../types';

export interface TierStatus {
  currentTier: AmbassadorTier;
  eligibleTier: AmbassadorTier;
  suggestUpgrade: boolean;
  monthsSinceJoined: number;
  referralsThisMonth: number;
  verifiedTransactions: number;
  honorarium: number;
  bonusPerTransaction: number;
  progressToNextTier: { referralsNeeded: number; tenureNeeded: number; transactionsNeeded: number; } | null;
}

const TIER_ORDER: AmbassadorTier[] = ['starter', 'active', 'star'];

const TIER_CONFIG: Record<AmbassadorTier, { minMonths: number; minReferrals: number; minTransactions: number; honorarium: number; bonusPerTx: number }> = {
  starter: { minMonths: 0,  minReferrals: 10, minTransactions: 0, honorarium: 200, bonusPerTx: 0  },
  active:  { minMonths: 4,  minReferrals: 20, minTransactions: 0, honorarium: 400, bonusPerTx: 50 },
  star:    { minMonths: 7,  minReferrals: 30, minTransactions: 5, honorarium: 600, bonusPerTx: 75 },
};

function tierIndex(t: AmbassadorTier): number { return TIER_ORDER.indexOf(t); }

export function computeTierStatus(ambassador: Ambassador, allLogs: DailyLog[]): TierStatus {
  const now = new Date();
  const joinDate = new Date(ambassador.joined_at);
  const monthsSinceJoined = Math.floor(
    (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth())
  );
  const myLogs = allLogs.filter(log => log.ambassador_id === ambassador.id);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const referralsThisMonth = myLogs.filter(log => new Date(log.created_at) >= startOfMonth).length;
  const verifiedTransactions = myLogs.filter(log => log.outcome === 'resolved').length;

  let eligibleTier: AmbassadorTier = 'starter';
  if (
    monthsSinceJoined >= TIER_CONFIG.star.minMonths &&
    referralsThisMonth >= TIER_CONFIG.star.minReferrals &&
    verifiedTransactions >= TIER_CONFIG.star.minTransactions
  ) {
    eligibleTier = 'star';
  } else if (
    monthsSinceJoined >= TIER_CONFIG.active.minMonths &&
    referralsThisMonth >= TIER_CONFIG.active.minReferrals
  ) {
    eligibleTier = 'active';
  }

  const suggestUpgrade = tierIndex(eligibleTier) > tierIndex(ambassador.tier);
  const cfg = TIER_CONFIG[ambassador.tier];

  let progressToNextTier: TierStatus['progressToNextTier'] = null;
  const nextIdx = tierIndex(ambassador.tier) + 1;
  if (nextIdx < TIER_ORDER.length) {
    const next = TIER_ORDER[nextIdx];
    const nc = TIER_CONFIG[next];
    progressToNextTier = {
      referralsNeeded:    Math.max(0, nc.minReferrals     - referralsThisMonth),
      tenureNeeded:       Math.max(0, nc.minMonths        - monthsSinceJoined),
      transactionsNeeded: Math.max(0, nc.minTransactions  - verifiedTransactions),
    };
  }

  return {
    currentTier: ambassador.tier, eligibleTier, suggestUpgrade,
    monthsSinceJoined, referralsThisMonth, verifiedTransactions,
    honorarium: cfg.honorarium, bonusPerTransaction: cfg.bonusPerTx,
    progressToNextTier,
  };
}

export function getTierLabel(tier: AmbassadorTier): string {
  return ({ starter: 'Starter', active: 'Active', star: 'Star' })[tier];
}
export function getTierColor(tier: AmbassadorTier): string {
  return ({ starter: 'bg-gray-100 text-gray-700', active: 'bg-blue-100 text-blue-700', star: 'bg-yellow-100 text-yellow-800' })[tier];
}
export function getTierBorderColor(tier: AmbassadorTier): string {
  return ({ starter: 'border-gray-300', active: 'border-blue-400', star: 'border-yellow-400' })[tier];
}
export function getTierShortLabel(tier: AmbassadorTier): string {
  return ({ starter: 'T1', active: 'T2', star: 'T3' })[tier];
}
export function nextTier(tier: AmbassadorTier): AmbassadorTier | null {
  const idx = tierIndex(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}
