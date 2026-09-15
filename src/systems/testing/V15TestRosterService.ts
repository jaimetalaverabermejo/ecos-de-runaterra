import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionId, ChampionInstance } from '../../data/types';
import type { SaveGame } from '../../state/GameState';

const TEST_ROSTER: ChampionId[] = ['teemo', 'poppy', 'lulu', 'tristana', 'gnar'];
const TEST_MASTERY = 8;

export class V15TestRosterService {
  static apply(save: SaveGame): void {
    const all = [...save.party, ...save.storage];
    const usedInstanceIds = new Set<string>();

    const roster = TEST_ROSTER.map((championId) => {
      const existing = all.find((entry) => entry.championId === championId && !usedInstanceIds.has(entry.instanceId));
      const champion = existing ?? this.createChampion(championId);
      usedInstanceIds.add(champion.instanceId);
      this.prepareForTesting(champion);
      save.echoRegistry[championId] = 'linked';
      return champion;
    });

    const preserved = all.filter((entry) => !usedInstanceIds.has(entry.instanceId) && !TEST_ROSTER.includes(entry.championId));
    save.party = roster;
    save.storage = preserved;
  }

  private static createChampion(championId: ChampionId): ChampionInstance {
    return {
      instanceId: crypto.randomUUID(),
      championId,
      mastery: TEST_MASTERY,
      masteryExperience: 0,
      skillRanks: { q: 1, w: 1, e: 1, r: 1 },
      unspentSkillPoints: 0,
      currentHp: this.maxHpAtTestMastery(championId),
      runeTraits: [],
      equippedItems: []
    };
  }

  private static prepareForTesting(champion: ChampionInstance): void {
    champion.mastery = Math.max(TEST_MASTERY, champion.mastery);
    champion.masteryExperience = Math.max(0, champion.masteryExperience ?? 0);
    champion.skillRanks = champion.skillRanks ?? { q: 1, w: 1, e: 1, r: 1 };
    champion.skillRanks.q = Math.max(1, champion.skillRanks.q ?? 0);
    champion.skillRanks.w = Math.max(1, champion.skillRanks.w ?? 0);
    champion.skillRanks.e = Math.max(1, champion.skillRanks.e ?? 0);
    champion.skillRanks.r = Math.max(1, champion.skillRanks.r ?? 0);
    champion.unspentSkillPoints = Math.max(0, champion.unspentSkillPoints ?? 0);
    champion.runeTraits = champion.runeTraits ?? [];
    champion.equippedItems = champion.equippedItems ?? [];
    champion.currentHp = this.maxHpAtTestMastery(champion.championId);
  }

  private static maxHpAtTestMastery(championId: ChampionId): number {
    const echo = DataRegistry.echo(championId);
    return Math.max(1, Math.round(echo.baseStats.hp + echo.growthStats.hp * (TEST_MASTERY - 1)));
  }
}
