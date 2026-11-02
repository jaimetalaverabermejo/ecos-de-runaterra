import type { SaveGame, SanctuaryCheckpointState } from '../../state/GameState';
import { RoamingEchoService } from '../encounters/RoamingEchoService';
import { BattleEngine } from '../combat/BattleEngine';
import { DataRegistry } from '../../data/DataRegistry';
import noxusSites from '../../data/world/regions/noxus/sanctuaries.json';

export interface DefeatRecoveryResult {
  goldLost: number;
  checkpoint: SanctuaryCheckpointState;
}

export class SanctuaryService {
  /** Follow authored shrine moves without changing party, gold or story state. */
  static relocateRetiredCheckpoint(save: SaveGame): void {
    const site = noxusSites.find(site => site.id === save.checkpoint.sanctuaryId);
    if (!site) return;
    const bounds = site.reserveBounds;
    const checkpoint = save.checkpoint;
    if (checkpoint.mapId === site.mapId && checkpoint.x >= bounds.x && checkpoint.x < bounds.x + bounds.width
      && checkpoint.y >= bounds.y && checkpoint.y < bounds.y + bounds.height) return;
    save.checkpoint = {...checkpoint, mapId: site.mapId, ...site.arrival};
  }

  static healParty(save: SaveGame): void {
    for (const champion of [...save.party, ...save.storage]) {
      champion.currentHp = BattleEngine.statsFor(champion).hp;
    }
  }

  static activate(
    save: SaveGame,
    checkpoint: SanctuaryCheckpointState
  ): void {
    save.checkpoint = { ...checkpoint };
    RoamingEchoService.recoverDefeated(save);
    this.healParty(save);
  }

  static recoverAfterDefeat(save: SaveGame): DefeatRecoveryResult {
    this.relocateRetiredCheckpoint(save);
    const goldLost = Math.min(save.gold, Math.floor(save.gold * 0.1));
    save.gold -= goldLost;
    save.currentMapId = save.checkpoint.mapId;
    save.playerPosition = { x: save.checkpoint.x, y: save.checkpoint.y };
    const map = DataRegistry.map(save.checkpoint.mapId);
    save.worldProgress.currentRegionId = map.regionId ?? 'bandle-city';
    if (map.zoneId) {
      save.worldProgress.currentZoneId = map.zoneId;
      if (!save.worldProgress.unlockedZones.includes(map.zoneId)) save.worldProgress.unlockedZones.push(map.zoneId);
    }
    if (save.checkpoint.mapId === 'bandle_village') {
      save.worldProgress.currentZoneId = 'bandle-village';
      if (!save.worldProgress.unlockedZones.includes('bandle-village')) {
        save.worldProgress.unlockedZones.push('bandle-village');
      }
    }
    this.healParty(save);
    return { goldLost, checkpoint: { ...save.checkpoint } };
  }
}
