import { DataRegistry } from '../../data/DataRegistry';
import type { EncounterEntry, MapDefinition } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { ConditionService } from '../world/ConditionService';

const BANDLE_ENCOUNTER_ZONES: Record<string, string> = {
  clearing: 'portal-clearing', bandle_village: 'bandle-village', dark_forest: 'dark-forest',
  gnar_valley: 'gnar-valley', gnar_cave: 'gnar-cave', angar_corki: 'corki-hangar',
  portal_mountains: 'portal-mountains'
};

export function encounterLocation(map: MapDefinition): { regionId: string; zoneId: string } {
  return { regionId: map.regionId ?? 'bandle-city', zoneId: map.zoneId ?? BANDLE_ENCOUNTER_ZONES[map.id] ?? map.id };
}

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
      const eligible = this.entriesForZone(save, regionId, zoneId);
      if (eligible.length > 0 || regionId !== 'ionia') return eligible;
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
