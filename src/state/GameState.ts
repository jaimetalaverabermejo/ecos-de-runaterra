import type { ChampionInstance, ItemId, QuestId, RecipeId } from '../data/types';

export interface WorldProgressState {
  currentRegionId: string;
  currentZoneId: string;
  unlockedRegions: string[];
  unlockedZones: string[];
}

export interface SanctuaryCheckpointState {
  sanctuaryId: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
}

export type QuestStatus = 'active' | 'ready' | 'completed';

export interface QuestProgressState {
  status: QuestStatus;
  objectiveProgress: Record<string, number>;
}

export interface SaveGame {
  version: 1;
  currentMapId: string;
  playerPosition: { x: number; y: number };
  party: ChampionInstance[];
  storage: ChampionInstance[];
  inventory: Record<ItemId, number>;
  artifactLevels: Record<ItemId, number>;
  quests: Partial<Record<QuestId, QuestProgressState>>;
  gold: number;
  unlockedRecipes: RecipeId[];
  checkpoint: SanctuaryCheckpointState;
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
        mastery: 1,
        masteryExperience: 0,
        skillRanks: { q: 1, w: 0, e: 0, r: 0 },
        unspentSkillPoints: 0,
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
    artifactLevels: {},
    quests: {},
    gold: 700,
    unlockedRecipes: ['recipe-lost-chapter', 'recipe-speed-core'],
    checkpoint: {
      sanctuaryId: 'bandle-soraka-shrine',
      name: 'Santuario de Soraka · Bandle',
      mapId: 'bandle-village',
      x: 512,
      y: 620
    },
    worldProgress: {
      currentRegionId: 'bandle-city',
      currentZoneId: 'portal-clearing',
      unlockedRegions: ['bandle-city'],
      unlockedZones: ['portal-clearing']
    }
  };
}
