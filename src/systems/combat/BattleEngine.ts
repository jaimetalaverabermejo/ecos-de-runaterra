import { DataRegistry } from '../../data/DataRegistry';
import type {
  ChampionInstance,
  SkillDefinition,
  StatBlock
} from '../../data/types';

export type CombatAction =
  | { type: 'basic' }
  | { type: 'skill'; skillId: string };

export interface ActionResolution {
  label: string;
  damage: number;
  heal: number;
}

export class BattleEngine {
  static statsFor(champion: ChampionInstance): StatBlock {
    const definition = DataRegistry.champion(champion.championId);
    const stats: StatBlock = { ...definition.baseStats };

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
      .filter((skill) => champion.mastery >= skill.unlockMastery);
  }

  static passive(champion: ChampionInstance): SkillDefinition | null {
    const definition = DataRegistry.champion(champion.championId);
    const passive = DataRegistry.skill(definition.passiveSkillId);
    return champion.mastery >= passive.unlockMastery ? passive : null;
  }

  static resolveBasicAttack(
    attackerStats: StatBlock,
    defenderStats: StatBlock
  ): ActionResolution {
    const raw = attackerStats.attack - defenderStats.defense * 0.45;
    return {
      label: 'Ataque básico',
      damage: this.withVariance(Math.max(1, raw)),
      heal: 0
    };
  }

  static resolveSkill(
    skill: SkillDefinition,
    attackerStats: StatBlock,
    defenderStats: StatBlock
  ): ActionResolution {
    let damage = 0;
    let heal = 0;

    for (const effect of skill.effects) {
      if (effect.type === 'damage') {
        const scalingStat = effect.stat ?? 'attack';
        const sourceValue = attackerStats[scalingStat];
        const mitigation = scalingStat === 'power'
          ? defenderStats.resistance
          : defenderStats.defense;
        const raw = (effect.power ?? 0) + sourceValue * 0.65 - mitigation * 0.35;
        damage += this.withVariance(Math.max(1, raw));
      } else if (effect.type === 'heal') {
        heal += Math.max(0, Math.round(effect.power ?? 0));
      }
    }

    return {
      label: skill.name,
      damage,
      heal
    };
  }

  static passiveHealing(champion: ChampionInstance): number {
    const passive = this.passive(champion);
    if (!passive) return 0;

    return passive.effects.reduce((total, effect) => {
      if (effect.type !== 'heal') return total;
      return total + Math.max(0, Math.round(effect.power ?? 0));
    }, 0);
  }

  static chooseEnemyAction(champion: ChampionInstance): CombatAction {
    const skills = this.unlockedSkills(champion);
    if (skills.length > 0 && Math.random() < 0.7) {
      return { type: 'skill', skillId: skills[0].id };
    }
    return { type: 'basic' };
  }

  static playerActsFirst(
    player: ChampionInstance,
    enemy: ChampionInstance,
    playerAction: CombatAction,
    enemyAction: CombatAction
  ): boolean {
    const playerPriority = this.actionPriority(playerAction);
    const enemyPriority = this.actionPriority(enemyAction);

    if (playerPriority !== enemyPriority) return playerPriority > enemyPriority;

    const playerSpeed = this.statsFor(player).speed;
    const enemySpeed = this.statsFor(enemy).speed;
    if (playerSpeed !== enemySpeed) return playerSpeed > enemySpeed;

    return Math.random() >= 0.5;
  }

  static linkChance(currentHp: number, maxHp: number): number {
    if (maxHp <= 0) return 0.15;
    const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
    const missingHpRatio = 1 - hpRatio;
    return Math.max(0.15, Math.min(0.8, 0.15 + missingHpRatio * 0.65));
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
