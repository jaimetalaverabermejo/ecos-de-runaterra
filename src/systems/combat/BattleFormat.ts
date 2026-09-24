import type { ChampionInstance, SkillTarget, StatBlock } from '../../data/types';
import type { CombatAction } from './BattleEngine';

export type BattleFormat = 'single' | 'double';
export type BattleSide = 'player' | 'enemy';

export interface BattleSideState {
  side: BattleSide;
  active: ChampionInstance[];
  reserves: ChampionInstance[];
}

export interface DoubleBattleSession {
  id: string;
  format: 'double';
  kind: 'sandbox' | 'duel';
  playerTeam: ChampionInstance[];
  enemyTeam: ChampionInstance[];
  trainerName?: string;
  rewardGold?: number;
  victoryFlag?: string;
  allowFlee: boolean;
  allowLink: boolean;
  persistPlayerState: boolean;
  returnScene: string;
}

export interface DoubleBattleChoice {
  actorInstanceId: string;
  actorSide: BattleSide;
  action: CombatAction;
  targetMode: SkillTarget;
  targetInstanceIds: string[];
}

export interface DoubleBattleTurnEntry extends DoubleBattleChoice {
  priority: number;
  speed: number;
  tieBreaker: number;
}

export interface DoubleCombatantRuntime {
  champion: ChampionInstance;
  side: BattleSide;
  slot: number;
  hp: number;
  maxHp: number;
  stats: StatBlock;
}

export function defaultSkillTarget(targets: SkillTarget[]): SkillTarget {
  if (targets.includes('all')) return 'all';
  if (targets.includes('all-enemies')) return 'all-enemies';
  if (targets.includes('all-allies')) return 'all-allies';
  if (targets.includes('any-enemy')) return 'any-enemy';
  if (targets.includes('enemy')) return 'enemy';
  if (targets.includes('random-enemy')) return 'random-enemy';
  if (targets.includes('any-ally')) return 'any-ally';
  if (targets.includes('ally')) return 'ally';
  return 'self';
}
