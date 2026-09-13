import type { ChampionInstance, ItemId } from '../data/types';

export interface SaveGame {
  version: 1;
  currentMapId: string;
  playerPosition: { x: number; y: number };
  party: ChampionInstance[];
  storage: ChampionInstance[];
  inventory: Record<ItemId, number>;
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
    }
  };
}
