import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionInstance, EchoRole, ItemId, StatBlock } from '../../data/types';
import { BattleEngine } from '../combat/BattleEngine';
import { conflictsWithEquipment, equipmentSlots } from './EquipmentSlots';

const keys = ['hp', 'attack', 'power', 'defense', 'resistance', 'speed'] as const;

const roleWeights: Record<EchoRole, { hp: number; offense: number; defense: number; speed: number }> = {
  tirador: { hp: .09, offense: 1, defense: .23, speed: .82 },
  mago: { hp: .08, offense: 1, defense: .22, speed: .57 },
  tanque: { hp: .28, offense: .24, defense: .8, speed: .29 },
  luchador: { hp: .18, offense: .85, defense: .5, speed: .47 },
  asesino: { hp: .08, offense: 1, defense: .2, speed: .73 },
  apoyo: { hp: .15, offense: .48, defense: .52, speed: .69 },
  especialista: { hp: .14, offense: .72, defense: .4, speed: .58 }
};

const legacyRoles: Record<string, EchoRole> = {
  alistar: 'tanque', annie: 'mago', briar: 'luchador', cassiopeia: 'mago',
  elise: 'mago', leblanc: 'asesino', sion: 'tanque', talon: 'asesino', vladimir: 'mago'
};

export interface OptimizedBuild {
  role: EchoRole;
  itemIds: ItemId[];
}

export function optimizeBuild(champion: ChampionInstance): OptimizedBuild {
  const definition = DataRegistry.echo(champion.championId);
  const role = definition.tags.find((tag): tag is EchoRole => Object.hasOwn(roleWeights, tag)) ??
    legacyRoles[definition.id] ?? 'especialista';
  const weights = roleWeights[role];
  const base = BattleEngine.statsFor({ ...champion, equippedItems: [] });
  const slots = equipmentSlots(champion);
  let physical = 0;
  let magical = 0;
  for (const skillId of definition.skillIds) {
    const skill = DataRegistry.skill(skillId);
    if (skill.slot === 'passive' || champion.skillRanks[skill.slot] <= 0) continue;
    for (const effect of skill.effects) {
      if (effect.type !== 'damage' && !effect.scaleWithStat) continue;
      const weight = Math.abs(BattleEngine.effectPower(effect, champion.skillRanks[skill.slot])) * (skill.accuracy ?? 1);
      if (effect.stat === 'power') magical += weight;
      else physical += weight;
    }
  }
  const physicalShare = physical + magical > 0 ? physical / (physical + magical) : base.attack >= base.power ? 1 : 0;
  const scoreWeights: StatBlock = {
    hp: weights.hp,
    attack: weights.offense * physicalShare,
    power: weights.offense * (1 - physicalShare),
    defense: weights.defense,
    resistance: weights.defense,
    speed: weights.speed
  };
  const pool = DataRegistry.items().filter(item => (item.category ?? 'equipment') === 'equipment')
    .sort((a, b) => a.id.localeCompare(b.id));
  const sums: StatBlock = { hp: 0, attack: 0, power: 0, defense: 0, resistance: 0, speed: 0 };
  const chosen: ItemId[] = [];
  let best: ItemId[] = [];
  let bestScore = -Infinity;
  let bestPrice = Infinity;

  // Repeated items are legal when the player has the corresponding copies.
  function search(first: number, price: number): void {
    if (chosen.length === slots) {
      const score = keys.reduce((sum, key) => sum + scoreWeights[key] *
        (key === 'hp' ? sums.hp : Math.min(100 - base[key], sums[key])), 0);
      if (score > bestScore + 1e-8 || (Math.abs(score - bestScore) < 1e-8 && price < bestPrice)) {
        bestScore = score;
        bestPrice = price;
        best = [...chosen];
      }
      return;
    }
    for (let i = first; i < pool.length; i++) {
      const item = pool[i];
      if (conflictsWithEquipment(chosen, item.id)) continue;
      chosen.push(item.id);
      for (const key of keys) sums[key] += item.statBonuses[key] ?? 0;
      search(i, price + (item.basePrice ?? 0));
      for (const key of keys) sums[key] -= item.statBonuses[key] ?? 0;
      chosen.pop();
    }
  }

  search(0, 0);
  return { role, itemIds: best };
}
