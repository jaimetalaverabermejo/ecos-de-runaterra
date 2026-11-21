import { DataRegistry } from '../../data/DataRegistry';
import { atlasDefinitionId } from '../../data/MapAtlas';
import type { MapDefinition } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { EchoAppearanceService, encounterLocation } from './EchoAppearanceService';
import { RoamingEchoService } from './RoamingEchoService';

export type EncounterTerrain = Record<string, boolean>;

export class EncounterFieldGuide {
  constructor(private readonly terrain: EncounterTerrain) {}

  private tables(map: MapDefinition): string[] {
    if (map.tiled?.disableWildEncounters) return [];
    const grass = map.tiled && this.terrain[map.tiled.url];
    if (grass !== undefined && map.tiled) return grass ? [map.tiled.encounterTableId ?? 'bandle-meadow'] : [];
    return [...new Set(map.encounterZones.map(zone => zone.encounterTableId))];
  }

  private regularEchoes(map: MapDefinition, save?: SaveGame): Set<string> {
    const { regionId, zoneId } = encounterLocation(map);
    const tables = this.tables(map);
    if (save) return new Set(tables.flatMap(table => EchoAppearanceService.entriesForEncounter(save, table, regionId, zoneId).map(entry => entry.championId)));
    if (!tables.length) return new Set();
    const rules = DataRegistry.appearances().filter(rule => rule.regionId === regionId && rule.zoneId === zoneId);
    const fallback = rules.length === 0 || (regionId === 'ionia' && rules.every(rule => rule.conditions.length > 0));
    return new Set([
      ...rules.map(rule => rule.championId),
      ...(fallback ? tables.flatMap(table => DataRegistry.encounter(table).entries.map(entry => entry.championId)) : [])
    ]);
  }

  echoes(map: MapDefinition, save?: SaveGame): Set<string> {
    const result = this.regularEchoes(map, save);
    if (result.size) {
      const { zoneId } = encounterLocation(map);
      for (const id of RoamingEchoService.championsForZone(zoneId, save)) result.add(id);
    }
    return result;
  }

  locations(championId: string, save: SaveGame): string[] {
    return DataRegistry.maps().flatMap(map => {
      if (!this.echoes(map).has(championId)) return [];
      const { regionId, zoneId } = encounterLocation(map);
      const location = DataRegistry.regionMap(atlasDefinitionId(regionId)).points
        .find(point => point.targetMapId === map.id || point.id === zoneId)?.name ?? map.name;
      const availability = this.echoes(map, save).has(championId) ? '' : ' · Según el progreso o el estado del Eco';
      return [`${DataRegistry.worldRegion(regionId).name} · ${location}${availability}`];
    }).filter((row, index, rows) => rows.indexOf(row) === index);
  }

  sightings(maps: MapDefinition[], save: SaveGame): string[] {
    const potential = new Set(maps.flatMap(map => [...this.echoes(map)]));
    const active = new Set(maps.flatMap(map => [...this.echoes(map, save)]));
    return [...potential].map(id => {
      const name = DataRegistry.champion(id).name;
      return active.has(id) ? name : `${name} · Según el progreso o el estado del Eco`;
    }).sort((a, b) => a.localeCompare(b, 'es'));
  }
}
