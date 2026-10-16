import type { ChampionInstance } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { DataRegistry } from '../../data/DataRegistry';
import { ProgressionService } from '../progression/ProgressionService';

/** Unique wanderers are rolled separately: 1% means one in 100 eligible encounters. */
export class RoamingEchoService {
  static isRoamer(champion: ChampionInstance): boolean {
    return ['yasuo', 'yone'].includes(champion.championId) && champion.instanceId === `roaming:${champion.championId}`;
  }

  static encounter(save: SaveGame, zoneId: string, roll = Math.random()): ChampionInstance | null {
    if (!['jo04_rice_fields', 'jo06_estuary', 'jo08_peaks', 'jo09_forest_landing', 'jo10_oblivion_garden', 'jo11_omikayalan', 'jo12_roots', 'jo13_vastaya_refuge'].includes(zoneId)) return null;
    if (!save.worldProgress.flags.includes('story:yasuo-met') || save.echoRegistry.yasuo === 'linked'
      || [...save.party, ...save.storage].some(c => c.championId === 'yasuo') || roll >= 0.01) return null;
    const states = save.roamingEchoes ??= {};
    if (states.yasuo?.defeated) return null;
    if (!states.yasuo) {
      const mastery = 30;
      const definition = DataRegistry.champion('yasuo');
      states.yasuo = { defeated: false, champion: {
        instanceId: 'roaming:yasuo', championId: 'yasuo', mastery, masteryExperience: 0,
        skillRanks: ProgressionService.defaultSkillRanks(mastery),
        unspentSkillPoints: ProgressionService.earnedManualSkillPoints(mastery),
        currentHp: Math.round(definition.baseStats.hp + definition.growthStats.hp * (mastery - 1)),
        runeTraits: [], equippedItems: []
      } };
    }
    // Battle statuses belong to its session, never to this persistent snapshot.
    return structuredClone(states.yasuo.champion);
  }

  static remember(save: SaveGame, champion: ChampionInstance, hp: number): void {
    if (!this.isRoamer(champion)) return;
    const states = save.roamingEchoes ??= {};
    const snapshot = structuredClone(champion);
    const definition = DataRegistry.champion(champion.championId);
    const maximum = Math.round(definition.baseStats.hp + definition.growthStats.hp * (champion.mastery - 1));
    snapshot.currentHp = Math.max(0, Math.min(maximum, Math.round(hp)));
    states[champion.championId] = { champion: snapshot, defeated: snapshot.currentHp <= 0 };
  }

  static recoverDefeated(save: SaveGame): void {
    for (const state of Object.values(save.roamingEchoes ?? {})) {
      if (!state.defeated || save.echoRegistry[state.champion.championId] === 'linked') continue;
      const definition = DataRegistry.champion(state.champion.championId);
      state.champion.currentHp = Math.round(definition.baseStats.hp + definition.growthStats.hp * (state.champion.mastery - 1));
      state.defeated = false;
    }
  }

  static captured(save: SaveGame, champion: ChampionInstance): void {
    if (!this.isRoamer(champion)) return;
    save.echoRegistry[champion.championId] = 'linked';
    delete save.roamingEchoes?.[champion.championId];
  }
}
