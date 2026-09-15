import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionId, EchoDiscoveryState } from '../../data/types';
import type { SaveGame } from '../../state/GameState';

export class EchoRegistryService {
  static state(save: SaveGame, championId: ChampionId): EchoDiscoveryState {
    return save.echoRegistry[championId] ?? 'unknown';
  }

  static markSeen(save: SaveGame, championId: ChampionId): void {
    if (this.state(save, championId) === 'linked') return;
    save.echoRegistry[championId] = 'seen';
  }

  static markLinked(save: SaveGame, championId: ChampionId): void {
    save.echoRegistry[championId] = 'linked';
  }

  static syncOwned(save: SaveGame): void {
    for (const champion of [...save.party, ...save.storage]) {
      this.markLinked(save, champion.championId);
    }
  }

  static counts(save: SaveGame): { seen: number; linked: number; discovered: number; total: number } {
    const catalog = DataRegistry.echoCatalog();
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
