import { DataRegistry } from '../../data/DataRegistry';
import type {
  ActiveSkillSlot,
  ChampionInstance,
  SkillDefinition,
  SkillEffectDefinition,
  StatBlock
} from '../../data/types';

export type CombatAction =
  | { type: 'basic' }
  | { type: 'skill'; skillId: string };

export interface SkillResolutionContext {
  defenderCurrentHp?: number;
  defenderMaxHp?: number;
}

export interface ActionResolution {
  label: string;
  damage: number;
  heal: number;
  notes: string[];
}

export class BattleEngine {
  static statsFor(champion: ChampionInstance): StatBlock {
    const definition = DataRegistry.champion(champion.championId);
    const masterySteps = Math.max(0, champion.mastery - 1);
    const stats: StatBlock = {
      hp: Math.round(definition.baseStats.hp + definition.growthStats.hp * masterySteps),
      attack: Math.round(definition.baseStats.attack + definition.growthStats.attack * masterySteps),
      power: Math.round(definition.baseStats.power + definition.growthStats.power * masterySteps),
      defense: Math.round(definition.baseStats.defense + definition.growthStats.defense * masterySteps),
      resistance: Math.round(definition.baseStats.resistance + definition.growthStats.resistance * masterySteps),
      speed: Math.round(definition.baseStats.speed + definition.growthStats.speed * masterySteps)
    };

    for (const itemId of champion.equippedItems) {
      const item = DataRegistry.item(itemId);
      for (const [key, value] of Object.entries(item.statBonuses)) {
        if (typeof value !== 'number') continue;
        const stat = key as keyof StatBlock;
        stats[stat] += value;
      }
    }

    return stats;
  }

  static unlockedSkills(champion: ChampionInstance): SkillDefinition[] {
    const definition = DataRegistry.champion(champion.championId);
    return definition.skillIds
      .map((skillId) => DataRegistry.skill(skillId))
      .filter((skill) => skill.slot !== 'passive' && champion.skillRanks[skill.slot as ActiveSkillSlot] > 0);
  }

  static passive(champion: ChampionInstance): SkillDefinition | null {
    const definition = DataRegistry.champion(champion.championId);
    const passive = DataRegistry.skill(definition.passiveSkillId);
    return champion.mastery >= passive.unlockMastery ? passive : null;
  }

  static skillRank(champion: ChampionInstance, skill: SkillDefinition): number {
    if (skill.slot === 'passive') return 1;
    return champion.skillRanks[skill.slot as ActiveSkillSlot] ?? 0;
  }

  static actionHasDamage(action: CombatAction): boolean {
    if (action.type === 'basic') return true;
    return DataRegistry.skill(action.skillId).effects.some((effect) => effect.type === 'damage');
  }

  static resolveBasicAttack(
    attackerStats: StatBlock,
    defenderStats: StatBlock
  ): ActionResolution {
    const raw = attackerStats.attack - defenderStats.defense * 0.45;
    return {
      label: 'Ataque básico',
      damage: this.withVariance(Math.max(1, raw)),
      heal: 0,
      notes: []
    };
  }

  static resolveSkill(
    skill: SkillDefinition,
    rank: number,
    attackerStats: StatBlock,
    defenderStats: StatBlock,
    context: SkillResolutionContext = {}
  ): ActionResolution {
    let damage = 0;
    let heal = 0;
    const notes: string[] = [];

    for (const effect of skill.effects) {
      const effectPower = this.effectPower(effect, rank);
      if (effect.type === 'damage') {
        const scalingStat = effect.stat ?? 'attack';
        const sourceValue = attackerStats[scalingStat];
        const mitigation = scalingStat === 'power'
          ? defenderStats.resistance
          : defenderStats.defense;
        let raw = effectPower + sourceValue * 0.65 - mitigation * 0.35;

        if (effect.handlerId === 'execute-low-hp') {
          const maxHp = Math.max(1, context.defenderMaxHp ?? 1);
          const hpRatio = Math.max(0, Math.min(1, (context.defenderCurrentHp ?? maxHp) / maxHp));
          if (hpRatio <= 0.35) {
            raw *= 1.65;
            notes.push('EJECUCIÓN');
          }
        }

        damage += this.withVariance(Math.max(1, raw));
      } else if (effect.type === 'heal') {
        heal += Math.max(0, Math.round(effectPower));
      }
    }

    return {
      label: `${skill.name}${rank > 1 ? ` · R${rank}` : ''}`,
      damage,
      heal,
      notes
    };
  }

  static passiveHealing(champion: ChampionInstance): number {
    const passive = this.passive(champion);
    if (!passive) return 0;

    return passive.effects.reduce((total, effect) => {
      if (effect.type !== 'heal') return total;
      return total + Math.max(0, Math.round(this.effectPower(effect, 1)));
    }, 0);
  }

  static chooseEnemyAction(champion: ChampionInstance): CombatAction {
    const skills = this.unlockedSkills(champion);
    if (skills.length > 0 && Math.random() < 0.76) {
      const skill = skills[Math.floor(Math.random() * skills.length)];
      return { type: 'skill', skillId: skill.id };
    }
    return { type: 'basic' };
  }

  static playerActsFirst(
    player: ChampionInstance,
    enemy: ChampionInstance,
    playerAction: CombatAction,
    enemyAction: CombatAction,
    playerStats = this.statsFor(player),
    enemyStats = this.statsFor(enemy)
  ): boolean {
    const playerPriority = this.actionPriority(playerAction);
    const enemyPriority = this.actionPriority(enemyAction);

    if (playerPriority !== enemyPriority) return playerPriority > enemyPriority;

    if (playerStats.speed !== enemyStats.speed) return playerStats.speed > enemyStats.speed;

    return Math.random() >= 0.5;
  }

  static linkChance(currentHp: number, maxHp: number): number {
    if (maxHp <= 0) return 0.15;
    const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
    const missingHpRatio = 1 - hpRatio;
    return Math.max(0.15, Math.min(0.8, 0.15 + missingHpRatio * 0.65));
  }

  private static effectPower(effect: SkillEffectDefinition, rank: number): number {
    if (effect.powerByRank?.length) {
      const index = Math.max(0, Math.min(effect.powerByRank.length - 1, rank - 1));
      return effect.powerByRank[index] ?? effect.power ?? 0;
    }
    return effect.power ?? 0;
  }

  private static actionPriority(action: CombatAction): number {
    if (action.type !== 'skill') return 0;
    return DataRegistry.skill(action.skillId).priority ?? 0;
  }

  private static withVariance(value: number): number {
    const variance = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.round(value * variance));
  }
}
