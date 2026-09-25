import type { ChampionId, ChampionInstance, EchoDiscoveryState, ItemId, QuestId, RecipeId } from '../data/types';

export interface WorldProgressState {
  currentRegionId: string;
  currentZoneId: string;
  unlockedRegions: string[];
  unlockedZones: string[];
  flags: string[];
  spokenNpcIds: string[];
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
  currentStepIndex?: number;
}

export interface PlayerProfileState {
  name: string;
}

export interface RuneCollectionState {
  unlockedIds: string[];
}

export interface SaveGame {
  version: 1;
  player: PlayerProfileState;
  currentMapId: string;
  playerPosition: { x: number; y: number };
  party: ChampionInstance[];
  storage: ChampionInstance[];
  echoRegistry: Partial<Record<ChampionId, EchoDiscoveryState>>;
  runes: RuneCollectionState;
  inventory: Record<ItemId, number>;
  artifactLevels: Record<ItemId, number>;
  quests: Partial<Record<QuestId, QuestProgressState>>;
  gold: number;
  unlockedRecipes: RecipeId[];
  checkpoint: SanctuaryCheckpointState;
  worldProgress: WorldProgressState;
}

export function createNewGame(playerName = 'Viajero'): SaveGame {
  return {
    version: 1,
    player: { name: playerName },
    currentMapId: 'bandle-debug',
    playerPosition: { x: 445, y: 438 },
    party: [],
    storage: [],
    echoRegistry: {},
    runes: { unlockedIds: [] },
    inventory: {},
    artifactLevels: {},
    quests: {},
    gold: 0,
    unlockedRecipes: [],
    checkpoint: {
      sanctuaryId: 'bandle-portal-clearing',
      name: 'Claro del Portal · Bandle',
      mapId: 'bandle-debug',
      x: 445,
      y: 438
    },
    worldProgress: {
      currentRegionId: 'bandle-city',
      currentZoneId: 'portal-clearing',
      unlockedRegions: ['bandle-city'],
      unlockedZones: ['portal-clearing'],
      flags: ['story:intro-pending', 'story:first-echo-pending', 'progression:bandle-cap-active'],
      spokenNpcIds: []
    }
  };
}
