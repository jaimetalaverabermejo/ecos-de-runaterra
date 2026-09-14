import masteryConfigJson from '../../data/progression/mastery.json';
import { DataRegistry } from '../../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance, SkillRanks } from '../../data/types';
import type { SaveGame } from '../../state/GameState';

interface MasteryConfig {
  maxMastery: number;
  benchExperienceShare: number;
  sameMasteryRewardFraction: number;
  xpCurve: { base: number; linear: number; quadratic: number };
  automaticUnlocks: Record<ActiveSkillSlot, number>;
  skillPointMasteries: number[];
  rankGates: Record<ActiveSkillSlot, number[]>;
}

export interface MasteryGainResult {
  instanceId: string;
  championId: string;
  experienceGained: number;
  fromMastery: number;
  toMastery: number;
  skillPointsGained: number;
  unlockedSlots: ActiveSkillSlot[];
}

const CONFIG = masteryConfigJson as MasteryConfig;
const ACTIVE_SLOTS: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];

export class ProgressionService {
  static maxMastery(): number {
    return CONFIG.maxMastery;
  }

  static benchExperienceShare(): number {
    return CONFIG.benchExperienceShare;
  }

  static experienceToNext(mastery: number): number {
    if (mastery >= CONFIG.maxMastery) return 0;
    const n = Math.max(0, mastery - 1);
    const { base, linear, quadratic } = CONFIG.xpCurve;
    return Math.max(1, Math.round(base + linear * n + quadratic * n * n));
  }

  static experienceRatio(champion: ChampionInstance): number {
    const required = this.experienceToNext(champion.mastery);
    if (required <= 0) return 1;
    return Math.max(0, Math.min(1, champion.masteryExperience / required));
  }

  static defaultSkillRanks(mastery: number): SkillRanks {
    return {
      q: mastery >= CONFIG.automaticUnlocks.q ? 1 : 0,
      w: mastery >= CONFIG.automaticUnlocks.w ? 1 : 0,
      e: mastery >= CONFIG.automaticUnlocks.e ? 1 : 0,
      r: mastery >= CONFIG.automaticUnlocks.r ? 1 : 0
    };
  }

  static earnedManualSkillPoints(mastery: number): number {
    return CONFIG.skillPointMasteries.filter((value) => value <= mastery).length;
  }

  static maxRank(slot: ActiveSkillSlot): number {
    return CONFIG.rankGates[slot].length;
  }

  static masteryRequiredForRank(slot: ActiveSkillSlot, rank: number): number | null {
    if (rank <= 0 || rank > this.maxRank(slot)) return null;
    return CONFIG.rankGates[slot][rank - 1] ?? null;
  }

  static canSpendSkillPoint(champion: ChampionInstance, slot: ActiveSkillSlot): boolean {
    if (champion.unspentSkillPoints <= 0) return false;
    const currentRank = champion.skillRanks[slot] ?? 0;
    const nextRank = currentRank + 1;
    if (nextRank <= 1 || nextRank > this.maxRank(slot)) return false;
    const masteryGate = this.masteryRequiredForRank(slot, nextRank);
    return masteryGate !== null && champion.mastery >= masteryGate;
  }

  static spendSkillPoint(champion: ChampionInstance, slot: ActiveSkillSlot): boolean {
    if (!this.canSpendSkillPoint(champion, slot)) return false;
    champion.skillRanks[slot] += 1;
    champion.unspentSkillPoints -= 1;
    return true;
  }

  static battleExperience(defeated: ChampionInstance, recipientMastery: number): number {
    const defeatedDefinition = DataRegistry.champion(defeated.championId);
    const base = this.experienceToNext(recipientMastery) * CONFIG.sameMasteryRewardFraction;
    const difference = defeated.mastery - recipientMastery;
    const differenceMultiplier = Math.max(0.4, Math.min(1.8, 1 + difference * 0.12));
    return Math.max(1, Math.round(base * defeatedDefinition.experienceYield * differenceMultiplier));
  }

  static awardPartyExperience(
    save: SaveGame,
    defeated: ChampionInstance,
    participatingInstanceIds: string[]
  ): MasteryGainResult[] {
    return save.party.map((champion) => {
      const fullReward = this.battleExperience(defeated, champion.mastery);
      const share = participatingInstanceIds.includes(champion.instanceId) ? 1 : CONFIG.benchExperienceShare;
      return this.awardExperience(champion, Math.max(1, Math.round(fullReward * share)));
    });
  }

  static awardExperience(champion: ChampionInstance, amount: number): MasteryGainResult {
    const fromMastery = champion.mastery;
    const unlockedSlots: ActiveSkillSlot[] = [];
    let skillPointsGained = 0;
    let remaining = Math.max(0, Math.round(amount));

    while (remaining > 0 && champion.mastery < CONFIG.maxMastery) {
      const required = this.experienceToNext(champion.mastery);
      const missing = required - champion.masteryExperience;
      if (remaining < missing) {
        champion.masteryExperience += remaining;
        remaining = 0;
        break;
      }

      const oldMaxHp = this.maxHp(champion);
      remaining -= missing;
      champion.mastery += 1;
      champion.masteryExperience = 0;

      for (const slot of ACTIVE_SLOTS) {
        if (champion.skillRanks[slot] === 0 && champion.mastery >= CONFIG.automaticUnlocks[slot]) {
          champion.skillRanks[slot] = 1;
          unlockedSlots.push(slot);
        }
      }

      if (CONFIG.skillPointMasteries.includes(champion.mastery)) {
        champion.unspentSkillPoints += 1;
        skillPointsGained += 1;
      }

      const newMaxHp = this.maxHp(champion);
      champion.currentHp = Math.min(newMaxHp, champion.currentHp + Math.max(0, newMaxHp - oldMaxHp));
    }

    if (champion.mastery >= CONFIG.maxMastery) champion.masteryExperience = 0;

    return {
      instanceId: champion.instanceId,
      championId: champion.championId,
      experienceGained: Math.max(0, Math.round(amount)),
      fromMastery,
      toMastery: champion.mastery,
      skillPointsGained,
      unlockedSlots
    };
  }

  static normalizeChampion(champion: ChampionInstance): ChampionInstance {
    champion.mastery = Math.max(1, Math.min(CONFIG.maxMastery, Math.round(champion.mastery || 1)));
    champion.masteryExperience = Math.max(0, Math.round(champion.masteryExperience || 0));
    champion.skillRanks = champion.skillRanks ?? this.defaultSkillRanks(champion.mastery);

    for (const slot of ACTIVE_SLOTS) {
      const automaticRank = champion.mastery >= CONFIG.automaticUnlocks[slot] ? 1 : 0;
      const max = this.maxRank(slot);
      champion.skillRanks[slot] = Math.max(automaticRank, Math.min(max, Math.round(champion.skillRanks[slot] ?? 0)));
    }

    champion.unspentSkillPoints = Math.max(0, Math.round(champion.unspentSkillPoints ?? 0));
    return champion;
  }

  private static maxHp(champion: ChampionInstance): number {
    const definition = DataRegistry.champion(champion.championId);
    let hp = definition.baseStats.hp + definition.growthStats.hp * Math.max(0, champion.mastery - 1);
    for (const itemId of champion.equippedItems) {
      hp += DataRegistry.item(itemId).statBonuses.hp ?? 0;
    }
    return Math.max(1, Math.round(hp));
  }
}
