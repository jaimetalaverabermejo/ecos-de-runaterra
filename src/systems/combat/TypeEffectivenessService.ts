import { DataRegistry } from '../../data/DataRegistry';
import type { AffinityId, ChampionInstance, SkillDefinition } from '../../data/types';

export type TypeEffectivenessRelation = 'very-effective' | 'effective' | 'neutral' | 'resisted' | 'very-resisted';

export interface TypeEffectivenessResult {
  multiplier: number;
  relation: TypeEffectivenessRelation;
  attackType?: AffinityId;
  defenderTypes: AffinityId[];
}

const STRONG_MULTIPLIER = 1.25;
const RESISTED_MULTIPLIER = 0.8;
const MAX_MULTIPLIER = 1.5;
const MIN_MULTIPLIER = 0.67;

export class TypeEffectivenessService {
  static defenderTypes(champion: ChampionInstance, formId?: string): AffinityId[] {
    if (formId) {
      const override = DataRegistry.form(champion.championId, formId).affinityIdsOverride;
      if (override) return [...override];
    }
    return [...(DataRegistry.champion(champion.championId).affinityIds ?? [])];
  }

  static multiplier(attackType: AffinityId | undefined, defenderTypes: AffinityId[]): TypeEffectivenessResult {
    if (!attackType || defenderTypes.length === 0) {
      return { multiplier: 1, relation: 'neutral', attackType, defenderTypes: [...defenderTypes] };
    }

    const attack = DataRegistry.affinity(attackType);
    let raw = 1;
    for (const defenderType of defenderTypes) {
      if (attack.strongAgainst.includes(defenderType)) raw *= STRONG_MULTIPLIER;
      else if (attack.weakAgainst.includes(defenderType)) raw *= RESISTED_MULTIPLIER;
    }

    const multiplier = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, raw));
    let relation: TypeEffectivenessRelation = 'neutral';
    if (multiplier >= 1.45) relation = 'very-effective';
    else if (multiplier > 1.001) relation = 'effective';
    else if (multiplier <= 0.7) relation = 'very-resisted';
    else if (multiplier < 0.999) relation = 'resisted';

    return { multiplier, relation, attackType, defenderTypes: [...defenderTypes] };
  }

  static forSkill(skill: SkillDefinition | null, defender: ChampionInstance, defenderFormId?: string): TypeEffectivenessResult {
    const defenderTypes = this.defenderTypes(defender, defenderFormId);
    if (!skill || !this.skillUsesAffinity(skill)) return this.multiplier(undefined, defenderTypes);
    return this.multiplier(skill.affinityId, defenderTypes);
  }

  static skillUsesAffinity(skill: SkillDefinition): boolean {
    if (!skill.affinityId) return false;
    return skill.effects.some((effect) => {
      if (effect.ignoreAffinity) return false;
      if (effect.type === 'damage') return true;
      if (effect.statusKind === 'poison') return true;
      return effect.type === 'custom' && effect.handlerId === 'marca-explosiva';
    });
  }

  static typeNames(ids: AffinityId[], short = false): string {
    if (ids.length === 0) return 'TIPO PENDIENTE';
    return ids.map((id) => {
      const type = DataRegistry.affinity(id);
      return short ? type.short : type.name;
    }).join(' · ');
  }

  static battleMessage(result: TypeEffectivenessResult): string | null {
    if (result.relation === 'very-effective') return '¡Es muy eficaz!';
    if (result.relation === 'effective') return '¡Es eficaz!';
    if (result.relation === 'resisted') return 'El rival resiste el ataque.';
    if (result.relation === 'very-resisted') return 'El rival resiste con mucha fuerza.';
    return null;
  }

  static actionGlyph(result: TypeEffectivenessResult): string {
    if (result.relation === 'very-effective') return '▲▲';
    if (result.relation === 'effective') return '▲';
    if (result.relation === 'very-resisted') return '▼▼';
    if (result.relation === 'resisted') return '▼';
    return '';
  }

  static offensiveStrengths(ids: AffinityId[]): AffinityId[] {
    const result = new Set<AffinityId>();
    for (const id of ids) {
      for (const target of DataRegistry.affinity(id).strongAgainst) result.add(target);
    }
    return [...result];
  }

  static defensiveWeaknesses(ids: AffinityId[]): AffinityId[] {
    if (ids.length === 0) return [];
    return DataRegistry.affinities()
      .map((entry) => entry.id)
      .filter((attackType) => this.multiplier(attackType, ids).multiplier > 1.001);
  }

  static defensiveResistances(ids: AffinityId[]): AffinityId[] {
    if (ids.length === 0) return [];
    return DataRegistry.affinities()
      .map((entry) => entry.id)
      .filter((attackType) => this.multiplier(attackType, ids).multiplier < 0.999);
  }
}
