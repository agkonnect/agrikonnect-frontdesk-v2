import { Ambassador, DailyLog } from '../types';

export interface TierStatus {
  currentTier: 1 | 2 | 3;
  eligibleTier: 1 | 2 | 3;
  suggestUpgrade: boolean;
  monthsSinceJoined: number;
  referralsThisMonth: number;
  verifiedTransactions: number;
  honorarium: number;
  bonusPerTransaction: number;
  progressToNextTier: { referralsNeeded: number; tenureNeeded: number; transactionsNeeded: number; } | null;
}

const TIER_CONFIG = {
  1: { minMonths: 0, minReferrals: 10, minTransactions: 0, honorarium: 200, bonusPerTx: 0 },
  2: { minMonths: 4, minReferrals: 20, minTransactions: 0, honorarium: 400, bonusPerTx: 50 },
  3: { minMonths: 7, minReferrals: 30, minTransactions: 5, honorarium: 600, bonusPerTx: 75 },
} as const;

export function computeTierStatus(ambassador: Ambassador, allLogs: DailyLog[]): TierStatus {
  const now = new Date();
  const joinDate = new Date(ambassador.created_at);
  const monthsSinceJoined = Math.floor((now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()));
  const myLogs = allLogs.filter(log => log.ambassador_id === ambassador.id);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const referralsThisMonth = myLogs.filter(log => new Date(log.created_at) >= startOfMonth).length;
  const verifiedTransactions = myLogs.filter(log => log.outcome === 'resolved').length;
  let eligibleTier: 1 | 2 | 3 = 1;
  if (monthsSinceJoined >= TIER_CONFIG[3].minMonths && referralsThisMonth >= TIER_CONFIG[3].minReferrals && verifiedTransactions >= TIER_CONFIG[3].minTransactions) {
    eligibleTier = 3;
  } else if (monthsSinceJoined >= TIER_CONFIG[2].minMonths && referralsThisMonth >= TIER_CONFIG[2].minReferrals) {
    eligibleTier = 2;
  }
  const suggestUpgrade = eligibleTier > ambassador.tier;
  const cfg = TIER_CONFIG[ambassador.tier];
  let progressToNextTier: TierStatus['progressToNextTier'] = null;
  if (ambassador.tier < 3) {
    const next = (ambassador.tier + 1) as 2 | 3;
    const nc = TIER_CONFIG[next];
    progressToNextTier = { referralsNeeded: Math.max(0, nc.minReferrals - referralsThisMonth), tenureNeeded: Math.max(0, nc.minMonths - monthsSinceJoined), transactionsNeeded: Math.max(0, nc.minTransactions - verifiedTransactions) };
  }
  return { currentTier: ambassador.tier, eligibleTier, suggestUpgrade, monthsSinceJoined, referralsThisMonth, verifiedTransactions, honorarium: cfg.honorarium, bonusPerTransaction: cfg.bonusPerTx, progressToNextTier };
}

export function getTierLabel(tier: 1 | 2 | 3): string {
  return ({ 1: 'Starter', 2: 'Active', 3: 'Star' } as Record<1|2|3,string>)[tier];
}
export function getTierColor(tier: 1 | 2 | 3): string {
  return ({ 1: 'bg-gray-100 text-gray-700', 2: 'bg-blue-100 text-blue-700', 3: 'bg-yellow-100 text-yellow-800' } as Record<1|2|3,string>)[tier];
}
export function getTierBorderColor(tier: 1 | 2 | 3): string {
  return ({ 1: 'border-gray-300', 2: 'border-blue-400', 3: 'border-yellow-400' } as Record<1|2|3,string>)[tier];
}
