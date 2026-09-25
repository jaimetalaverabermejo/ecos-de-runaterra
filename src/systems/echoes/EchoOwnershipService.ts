import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionId, ChampionInstance } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { ProgressionService } from '../progression/ProgressionService';
import { EchoRegistryService } from './EchoRegistryService';

export class EchoOwnershipService {
  static owns(save: SaveGame, championId: ChampionId): boolean {
    return [...save.party, ...save.storage].some((echo) => echo.championId === championId);
  }

  static create(championId: ChampionId, mastery = 1): ChampionInstance {
    const definition = DataRegistry.echo(championId);
    const normalizedMastery = Math.max(1, Math.min(ProgressionService.maxMastery(), Math.round(mastery)));
    const maxHp = Math.max(
      1,
      Math.round(definition.baseStats.hp + definition.growthStats.hp * Math.max(0, normalizedMastery - 1))
    );

    return ProgressionService.normalizeChampion({
      instanceId: crypto.randomUUID(),
      championId,
      mastery: normalizedMastery,
      masteryExperience: 0,
      skillRanks: ProgressionService.defaultSkillRanks(normalizedMastery),
      unspentSkillPoints: ProgressionService.earnedManualSkillPoints(normalizedMastery),
      currentHp: maxHp,
      runeTraits: [],
      equippedItems: []
    });
  }

  static grant(save: SaveGame, championId: ChampionId, mastery = 1): ChampionInstance | undefined {
    if (this.owns(save, championId)) return undefined;

    const echo = this.create(championId, mastery);
    if (save.party.length < 5) save.party.push(echo);
    else save.storage.push(echo);

    EchoRegistryService.markLinked(save, championId);
    return echo;
  }
}
