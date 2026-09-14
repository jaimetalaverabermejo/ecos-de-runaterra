import type { ChampionInstance, ItemId, RecipeId } from '../data/types';

export interface WorldProgressState {
  currentRegionId: string;
  currentZoneId: string;
  unlockedRegions: string[];
  unlockedZones: string[];
}

export interface SaveGame {
  version: 1;
  currentMapId: string;
  playerPosition: { x: number; y: number };
  party: ChampionInstance[];
  storage: ChampionInstance[];
  inventory: Record<ItemId, number>;
  gold: number;
  unlockedRecipes: RecipeId[];
  worldProgress: WorldProgressState;
}

export function createNewGame(): SaveGame {
  return {
    version: 1,
    currentMapId: 'bandle-debug',
    playerPosition: { x: 160, y: 160 },
    party: [
      {
        instanceId: crypto.randomUUID(),
        championId: 'garen',
        level: 1,
        experience: 0,
        mastery: 1,
        masteryExperience: 0,
        currentHp: 120,
        runeTraits: [],
        equippedItems: []
      }
    ],
    storage: [],
    inventory: {
      'long-sword': 1,
      'ruby-crystal': 1,
      'amplifying-tome': 1
    },
    gold: 700,
    unlockedRecipes: ['recipe-lost-chapter', 'recipe-speed-core'],
    worldProgress: {
      currentRegionId: 'bandle-city',
      currentZoneId: 'portal-clearing',
      unlockedRegions: ['bandle-city'],
      unlockedZones: ['portal-clearing']
    }
  };
}
