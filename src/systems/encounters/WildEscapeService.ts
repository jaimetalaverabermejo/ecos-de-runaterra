import type { ChampionDefinition, CombatStatusKind } from '../../data/types';
import type { CombatStatusInstance } from '../combat/StatusEngine';

const RESTRAINTS = new Set<CombatStatusKind>([
  'root', 'stun', 'airborne', 'sleep', 'banish', 'polymorph', 'recharge', 'charm', 'taunt', 'trap'
]);

export class WildEscapeService {
  static canFlee(statuses: CombatStatusInstance[]): boolean {
    return !statuses.some(status => status.remainingTurns > 0 && RESTRAINTS.has(status.kind));
  }

  static wantsToFlee(definition: ChampionDefinition, statuses: CombatStatusInstance[], isTrainerBattle: boolean, roll = Math.random()): boolean {
    if (isTrainerBattle || !definition.wildBehavior || !this.canFlee(statuses)) return false;
    return roll < Math.max(0, Math.min(1, definition.wildBehavior.fleeChance));
  }
}
