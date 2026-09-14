import { createNewGame, type SaveGame } from '../../state/GameState';

const SAVE_KEY = 'ecos-de-runaterra.save.v1';

export class SaveService {
  static load(): SaveGame {
    const defaults = createNewGame();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaults;

    try {
      const parsed = JSON.parse(raw) as Partial<SaveGame>;
      if (parsed.version !== 1) return defaults;

      const isPreV9Save = parsed.unlockedRecipes === undefined;
      return {
        ...defaults,
        ...parsed,
        playerPosition: parsed.playerPosition ?? defaults.playerPosition,
        party: parsed.party ?? defaults.party,
        storage: parsed.storage ?? defaults.storage,
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
}
