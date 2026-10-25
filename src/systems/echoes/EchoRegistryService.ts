import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionId, EchoDiscoveryState, EchoCatalogEntry, WorldRegionDefinition } from '../../data/types';
import type { SaveGame } from '../../state/GameState';

export class EchoRegistryService {
  /** Regional game roster, not every planned champion in the global catalogue. */
  static regionalCatalog(regionId: string): EchoCatalogEntry[] {
    const ids = new Set(DataRegistry.appearances().filter(entry => entry.regionId === regionId).map(entry => entry.championId));
    for (const character of DataRegistry.characters()) {
      const primaryRegionId = character.primaryRegionId === 'jonia' ? 'ionia' : character.primaryRegionId;
      if (primaryRegionId === regionId && character.contentStatus !== 'planeado') ids.add(character.id);
    }
    for (const map of DataRegistry.maps().filter(map => map.regionId === regionId)) {
      const tableIds = [...map.encounterZones.map(zone => zone.encounterTableId), map.tiled?.encounterTableId].filter(Boolean) as string[];
      for (const tableId of tableIds) for (const entry of DataRegistry.encounter(tableId).entries) ids.add(entry.championId);
    }
    return DataRegistry.echoCatalog().filter(entry => ids.has(entry.id)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  static unlockedRegionalCatalogs(save: SaveGame): WorldRegionDefinition[] {
    const unlocked = new Set([...save.worldProgress.unlockedRegions, save.worldProgress.currentRegionId]);
    return DataRegistry.worldRegions().filter(region => unlocked.has(region.id) && this.regionalCatalog(region.id).length > 0)
      .sort((a, b) => (a.id === 'bandle-city' ? -1 : b.id === 'bandle-city' ? 1 : a.name.localeCompare(b.name, 'es')));
  }

  static state(save: SaveGame, championId: ChampionId): EchoDiscoveryState {
    return save.echoRegistry[championId] ?? 'unknown';
  }

  static markSeen(save: SaveGame, championId: ChampionId): void {
    if (DataRegistry.isCombatant(championId)) return;
    if (this.state(save, championId) === 'linked') return;
    save.echoRegistry[championId] = 'seen';
  }

  static markLinked(save: SaveGame, championId: ChampionId): void {
    if (DataRegistry.isCombatant(championId)) return;
    save.echoRegistry[championId] = 'linked';
  }

  static syncOwned(save: SaveGame): void {
    for (const champion of [...save.party, ...save.storage]) {
      if (!champion || typeof champion.championId !== 'string') continue;
      this.markLinked(save, champion.championId);
    }
  }

  static counts(save: SaveGame, regionId?: string): { seen: number; linked: number; discovered: number; total: number } {
    const catalog = regionId ? this.regionalCatalog(regionId)
      : [...new Map(this.unlockedRegionalCatalogs(save).flatMap(region => this.regionalCatalog(region.id)).map(entry => [entry.id, entry])).values()];
    let seen = 0;
    let linked = 0;
    for (const entry of catalog) {
      const state = this.state(save, entry.id);
      if (state === 'seen') seen += 1;
      if (state === 'linked') linked += 1;
    }
    return { seen, linked, discovered: seen + linked, total: catalog.length };
  }
}
