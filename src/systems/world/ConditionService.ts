import type { ConditionDefinition } from '../../data/types';
import type { SaveGame } from '../../state/GameState';

export class ConditionService {
  static matchesAll(save: SaveGame, conditions: readonly ConditionDefinition[] = []): boolean {
    return conditions.every((condition) => this.matches(save, condition));
  }

  static matches(save: SaveGame, condition: ConditionDefinition): boolean {
    switch (condition.type) {
      case 'flag': {
        const enabled = save.worldProgress.flags.includes(condition.id);
        return enabled === (condition.value ?? true);
      }
      case 'npc-spoken':
        return save.worldProgress.spokenNpcIds.includes(condition.npcId);
      case 'quest-status': {
        const status = save.quests[condition.questId]?.status ?? 'not-started';
        return status === condition.status;
      }
      case 'echo-state':
        return (save.echoRegistry[condition.championId] ?? 'unknown') === condition.state;
      case 'item-owned':
        return (save.inventory[condition.itemId] ?? 0) >= (condition.quantity ?? 1);
      case 'region-unlocked':
        return save.worldProgress.unlockedRegions.includes(condition.regionId);
      case 'zone-unlocked':
        return save.worldProgress.unlockedZones.includes(condition.zoneId);
      case 'mastery': {
        const owned = [...save.party, ...save.storage];
        if (condition.championId) {
          return owned.some((echo) => echo.championId === condition.championId && echo.mastery >= condition.minimum);
        }
        return owned.some((echo) => echo.mastery >= condition.minimum);
      }
      case 'all':
        return condition.conditions.every((entry) => this.matches(save, entry));
      case 'any':
        return condition.conditions.some((entry) => this.matches(save, entry));
      case 'not':
        return !this.matches(save, condition.condition);
    }
  }
}
