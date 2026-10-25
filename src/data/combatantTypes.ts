import type { ChampionDefinition, SkillDefinition } from './types';

/** Shared battle statistics; ordinary combatants never enter the Echo catalogue. */
export type BattleDefinition = Omit<ChampionDefinition, 'skillIds'> & { skillIds: string[] };
export interface CombatantDefinition extends BattleDefinition {
  actorId: string;
  capturable: false;
  skills: SkillDefinition[];
}
