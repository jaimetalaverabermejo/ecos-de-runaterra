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
  affinityMultiplier?: number;
  stabMultiplier?: number;
}

export interface ActionResolution {
  label: string;
  damage: number;
  heal: number;
  notes: string[];
}

export class BattleEngine {
  static statsFor(champion: ChampionInstance, formId?: string): StatBlock {
    const definition = DataRegistry.champion(champion.championId);
    const baseStats: StatBlock = { ...definition.baseStats };
    const growthStats: StatBlock = { ...definition.growthStats };
    if (formId) {
      const form = DataRegistry.form(champion.championId, formId);
      Object.assign(baseStats, form.baseStatsOverride ?? {});
      Object.assign(growthStats, form.growthStatsOverride ?? {});
    }
    const masterySteps = Math.max(0, champion.mastery - 1);
    const stats: StatBlock = {
      hp: Math.round(baseStats.hp + growthStats.hp * masterySteps),
      attack: Math.round(baseStats.attack + growthStats.attack * masterySteps),
      power: Math.round(baseStats.power + growthStats.power * masterySteps),
      defense: Math.round(baseStats.defense + growthStats.defense * masterySteps),
      resistance: Math.round(baseStats.resistance + growthStats.resistance * masterySteps),
      speed: Math.round(baseStats.speed + growthStats.speed * masterySteps)
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

  static unlockedSkills(champion: ChampionInstance, formId?: string): SkillDefinition[] {
    const definition = DataRegistry.champion(champion.championId);
    const skillIds = formId ? (DataRegistry.form(champion.championId, formId).skillIds ?? definition.skillIds) : definition.skillIds;
    return skillIds
      .map((skillId) => DataRegistry.skill(skillId))
      .filter((skill) => skill.slot !== 'passive' && champion.skillRanks[skill.slot as ActiveSkillSlot] > 0);
  }

  static passive(champion: ChampionInstance, formId?: string): SkillDefinition | null {
    const definition = DataRegistry.champion(champion.championId);
    const passiveId = formId ? (DataRegistry.form(champion.championId, formId).passiveSkillId ?? definition.passiveSkillId) : definition.passiveSkillId;
    const passive = DataRegistry.skill(passiveId);
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
        raw *= effect.ignoreAffinity ? 1 : (context.affinityMultiplier ?? 1) * (context.stabMultiplier ?? 1);

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

  static passiveHealing(champion: ChampionInstance, formId?: string): number {
    const passive = this.passive(champion, formId);
    if (!passive) return 0;

    return passive.effects.reduce((total, effect) => {
      if (effect.type !== 'heal') return total;
      return total + Math.max(0, Math.round(this.effectPower(effect, 1)));
    }, 0);
  }

  static chooseEnemyAction(champion: ChampionInstance, formId?: string): CombatAction {
    const skills = this.unlockedSkills(champion, formId);
    if (skills.length > 0) {
      const skill = skills[Math.floor(Math.random() * skills.length)];
      return { type: 'skill', skillId: skill.id };
    }
    const fallbackSkillId = formId
      ? (DataRegistry.form(champion.championId, formId).skillIds ?? DataRegistry.champion(champion.championId).skillIds)[0]
      : DataRegistry.champion(champion.championId).skillIds[0];
    return { type: 'skill', skillId: fallbackSkillId };
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
