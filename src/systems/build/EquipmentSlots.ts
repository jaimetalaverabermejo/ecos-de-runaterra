import type { ChampionInstance } from '../../data/types';

/** Per-Echo mastery, not player progress. Shared by UI and combat. */
export function equipmentSlots(champion: Pick<ChampionInstance, 'mastery'>): number {
  return champion.mastery >= 20 ? 3 : champion.mastery >= 8 ? 2 : 1;
}

export function slotUnlockMastery(index: number): number {
  return [1, 8, 20][index] ?? 20;
}
