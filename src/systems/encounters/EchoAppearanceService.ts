import { DataRegistry } from '../../data/DataRegistry';
import type { EncounterEntry } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { ConditionService } from '../world/ConditionService';

export class EchoAppearanceService {
  static entriesForZone(save: SaveGame, regionId: string, zoneId: string): EncounterEntry[] {
    return DataRegistry.appearances()
      .filter((appearance) => appearance.regionId === regionId && appearance.zoneId === zoneId)
      .filter((appearance) => ConditionService.matchesAll(save, appearance.conditions))
      .map((appearance) => ({
        championId: appearance.championId,
        weight: appearance.weight,
        minMastery: appearance.minMastery,
        maxMastery: appearance.maxMastery
      }));
  }

  static hasDefinitionsForZone(regionId: string, zoneId: string): boolean {
    return DataRegistry.appearances().some((appearance) => appearance.regionId === regionId && appearance.zoneId === zoneId);
  }

  static entriesForEncounter(save: SaveGame, encounterTableId: string, regionId: string, zoneId: string): EncounterEntry[] {
    if (this.hasDefinitionsForZone(regionId, zoneId)) {
      return this.entriesForZone(save, regionId, zoneId);
    }
    return DataRegistry.encounter(encounterTableId).entries;
  }

  static canAppear(save: SaveGame, championId: string, regionId: string, zoneId: string): boolean {
    return DataRegistry.appearances(championId).some((appearance) =>
      appearance.regionId === regionId
      && appearance.zoneId === zoneId
      && ConditionService.matchesAll(save, appearance.conditions)
    );
  }
}
