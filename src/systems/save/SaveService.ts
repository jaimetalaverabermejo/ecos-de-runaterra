import type { ActiveSkillSlot, ChampionInstance, SkillRanks } from '../../data/types';
import { createNewGame, type SaveGame } from '../../state/GameState';
import { ProgressionService } from '../progression/ProgressionService';

const SAVE_KEY = 'ecos-de-runaterra.save.v1';

type LegacyChampion = Partial<ChampionInstance> & {
  level?: number;
  experience?: number;
};

export class SaveService {
  static load(): SaveGame {
    const defaults = createNewGame();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaults;

    try {
      const parsed = JSON.parse(raw) as Partial<SaveGame>;
      if (parsed.version !== 1) return defaults;

      const isPreV9Save = parsed.unlockedRecipes === undefined;
      const party = Array.isArray(parsed.party)
        ? parsed.party.map((champion) => this.migrateChampion(champion as LegacyChampion))
        : defaults.party;
      const storage = Array.isArray(parsed.storage)
        ? parsed.storage.map((champion) => this.migrateChampion(champion as LegacyChampion))
        : defaults.storage;

      return {
        ...defaults,
        ...parsed,
        playerPosition: parsed.playerPosition ?? defaults.playerPosition,
        party,
        storage,
        inventory: parsed.inventory ?? defaults.inventory,
        gold: isPreV9Save ? Math.max(parsed.gold ?? 0, defaults.gold) : (parsed.gold ?? defaults.gold),
        unlockedRecipes: parsed.unlockedRecipes ?? defaults.unlockedRecipes,
        worldProgress: {
          ...defaults.worldProgress,
          ...(parsed.worldProgress ?? {}),
          unlockedRegions: parsed.worldProgress?.unlockedRegions ?? defaults.worldProgress.unlockedRegions,
          unlockedZones: parsed.worldProgress?.unlockedZones ?? defaults.worldProgress.unlockedZones
        }
      };
    } catch {
      return defaults;
    }
  }

  static save(state: SaveGame): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  static clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  private static migrateChampion(raw: LegacyChampion): ChampionInstance {
    const legacyLevel = Number(raw.level ?? 1);
    const savedMastery = Number(raw.mastery ?? 1);
    const mastery = Math.max(1, Math.min(ProgressionService.maxMastery(), Math.round(Math.max(savedMastery, legacyLevel))));
    const defaultRanks = ProgressionService.defaultSkillRanks(mastery);
    const ranks: SkillRanks = {
      q: raw.skillRanks?.q ?? defaultRanks.q,
      w: raw.skillRanks?.w ?? defaultRanks.w,
      e: raw.skillRanks?.e ?? defaultRanks.e,
      r: raw.skillRanks?.r ?? defaultRanks.r
    };

    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const manuallySpent = slots.reduce((total, slot) => total + Math.max(0, ranks[slot] - defaultRanks[slot]), 0);
    const inferredUnspent = Math.max(0, ProgressionService.earnedManualSkillPoints(mastery) - manuallySpent);

    const champion: ChampionInstance = {
      instanceId: raw.instanceId ?? crypto.randomUUID(),
      championId: raw.championId ?? 'garen',
      mastery,
      masteryExperience: Math.max(0, Math.round(Number(raw.masteryExperience ?? raw.experience ?? 0))),
      skillRanks: ranks,
      unspentSkillPoints: raw.unspentSkillPoints ?? inferredUnspent,
      currentHp: Math.max(0, Math.round(Number(raw.currentHp ?? 1))),
      runeTraits: raw.runeTraits ?? [],
      equippedItems: raw.equippedItems ?? []
    };

    return ProgressionService.normalizeChampion(champion);
  }
}
