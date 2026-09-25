import type { EchoDiscoveryState, WorldActionDefinition } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { EchoOwnershipService } from '../echoes/EchoOwnershipService';
import { InventoryService } from '../inventory/InventoryService';
import { WorldStateService } from './WorldStateService';

const echoStateRank: Record<EchoDiscoveryState, number> = {
  unknown: 0,
  seen: 1,
  linked: 2
};

export class WorldActionService {
  static applyAll(save: SaveGame, actions: readonly WorldActionDefinition[] = []): boolean {
    let changed = false;
    for (const action of actions) changed = this.apply(save, action) || changed;
    return changed;
  }

  static apply(save: SaveGame, action: WorldActionDefinition): boolean {
    switch (action.type) {
      case 'set-flag':
        return WorldStateService.setFlag(save, action.id, action.value ?? true);
      case 'unlock-region':
        return WorldStateService.unlockRegion(save, action.regionId);
      case 'unlock-zone':
        return WorldStateService.unlockZone(save, action.zoneId);
      case 'set-echo-state': {
        const current = save.echoRegistry[action.championId] ?? 'unknown';
        if (echoStateRank[action.state] <= echoStateRank[current]) return false;
        save.echoRegistry[action.championId] = action.state;
        return true;
      }
      case 'add-item':
        InventoryService.add(save, action.itemId, Math.max(1, action.quantity));
        return true;
      case 'add-gold':
        if (action.amount === 0) return false;
        save.gold = Math.max(0, save.gold + action.amount);
        return true;
      case 'grant-echo':
        return Boolean(EchoOwnershipService.grant(save, action.championId, action.mastery ?? 1));
    }
  }
}
