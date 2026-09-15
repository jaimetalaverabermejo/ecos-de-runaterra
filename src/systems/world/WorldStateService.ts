import type { SaveGame } from '../../state/GameState';

function addUnique(values: string[], value: string): boolean {
  if (values.includes(value)) return false;
  values.push(value);
  return true;
}

export class WorldStateService {
  static recordNpcSpoken(save: SaveGame, npcId: string): boolean {
    return addUnique(save.worldProgress.spokenNpcIds, npcId);
  }

  static setFlag(save: SaveGame, flagId: string, enabled = true): boolean {
    const hasFlag = save.worldProgress.flags.includes(flagId);
    if (enabled && !hasFlag) {
      save.worldProgress.flags.push(flagId);
      return true;
    }
    if (!enabled && hasFlag) {
      save.worldProgress.flags = save.worldProgress.flags.filter((id) => id !== flagId);
      return true;
    }
    return false;
  }

  static unlockRegion(save: SaveGame, regionId: string): boolean {
    return addUnique(save.worldProgress.unlockedRegions, regionId);
  }

  static unlockZone(save: SaveGame, zoneId: string): boolean {
    return addUnique(save.worldProgress.unlockedZones, zoneId);
  }
}
