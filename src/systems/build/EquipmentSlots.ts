import type { ChampionInstance } from '../../data/types';

/** Per-Echo mastery, not player progress. Shared by UI and combat. */
export function equipmentSlots(champion: Pick<ChampionInstance, 'mastery'>): number {
  return champion.mastery >= 20 ? 3 : champion.mastery >= 10 ? 2 : 1;
}

export function slotUnlockMastery(index: number): number {
  return [1, 10, 20][index] ?? 20;
}

const exclusiveFamilies = [
  ['zhonyas-hourglass', 'guardian-angel'],
  ['steraks-gage', 'immortal-shieldbow']
] as const;

/** A loadout can hold one item from each defensive family. */
export function conflictsWithEquipment(equipped: readonly string[], itemId: string): boolean {
  return exclusiveFamilies.some(family => family.some(id => id === itemId)
    && equipped.some(other => family.some(id => id === other)));
}
