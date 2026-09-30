import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionInstance, SkillDefinition, SkillEffectDefinition, StatBlock } from '../../data/types';
import { StatusEngine, type CombatStatusInstance } from './StatusEngine';

export type BattleResourceStore = Record<string, Record<string, number>>;
export interface BattleFormState { formId: string; remainingTurns: number; }
export type BattleFormStore = Record<string, BattleFormState>;

export interface SkillUseCheck {
  allowed: boolean;
  message?: string;
}

export interface SkillResolvedSpecials {
  messages: string[];
  appliedStatusIds: string[];
}

export class SpecialEffectEngine {
  static formState(champion: ChampionInstance, forms: BattleFormStore): BattleFormState | undefined {
    return forms[champion.instanceId];
  }

  static formId(champion: ChampionInstance, forms: BattleFormStore): string | undefined {
    return this.formState(champion, forms)?.formId;
  }

  static skillIds(champion: ChampionInstance, forms: BattleFormStore): [string, string, string, string] {
    const formId = this.formId(champion, forms);
    if (formId) {
      const form = DataRegistry.form(champion.championId, formId);
      if (form.skillIds) return form.skillIds;
    }
    return DataRegistry.echo(champion.championId).skillIds;
  }

  static passive(champion: ChampionInstance, forms: BattleFormStore): SkillDefinition {
    const formId = this.formId(champion, forms);
    if (formId) {
      const form = DataRegistry.form(champion.championId, formId);
      if (form.passiveSkillId) return DataRegistry.skill(form.passiveSkillId);
    }
    return DataRegistry.skill(DataRegistry.echo(champion.championId).passiveSkillId);
  }

  static initializeResources(champion: ChampionInstance, resources: BattleResourceStore, forms: BattleFormStore): void {
    const rule = this.resourceRule(champion, forms);
    if (!rule) return;
    const resourceId = this.stringParam(rule, 'recursoId');
    if (!resourceId) return;
    const bucket = this.bucket(champion, resources);
    if (bucket[resourceId] !== undefined) return;
    const defaultInitial = rule.handlerId === 'recurso-furia' ? 1 : 0;
    bucket[resourceId] = this.numberParam(rule, 'inicial', defaultInitial);
  }

  static resourceValue(champion: ChampionInstance, resources: BattleResourceStore, resourceId: string): number {
    return this.bucket(champion, resources)[resourceId] ?? 0;
  }

  static resourceLabel(champion: ChampionInstance, resources: BattleResourceStore, forms: BattleFormStore): string | null {
    const rule = this.resourceRule(champion, forms);
    if (!rule) return null;
    const resourceId = this.stringParam(rule, 'recursoId');
    if (!resourceId) return null;
    const max = this.numberParam(rule, 'maximo', 999);
    const current = this.resourceValue(champion, resources, resourceId);
    const label = this.stringParam(rule, 'etiqueta') ?? resourceId.toUpperCase();
    return `${label} ${current}/${max}`;
  }

  static statsWithResources(
    champion: ChampionInstance,
    base: StatBlock,
    resources: BattleResourceStore,
    forms: BattleFormStore
  ): StatBlock {
    const stats = { ...base };
    const rule = this.resourceRule(champion, forms);
    if (!rule) return stats;

    if (rule.handlerId === 'recurso-maldad') {
      const resourceId = this.stringParam(rule, 'recursoId') ?? 'maldad';
      const bonusPerPoint = this.numberParam(rule, 'bonificacionPoder', 0);
      stats.power += Math.round(this.resourceValue(champion, resources, resourceId) * bonusPerPoint);
    }

    return stats;
  }

  static skillPowerMultiplier(
    champion: ChampionInstance,
    skill: SkillDefinition,
    resources: BattleResourceStore,
    forms: BattleFormStore
  ): number {
    let multiplier = 1;
    const rule = this.resourceRule(champion, forms);

    if (rule?.handlerId === 'recurso-calor' && ['q', 'w', 'e'].includes(skill.slot)) {
      const resourceId = this.stringParam(rule, 'recursoId') ?? 'calor';
      const dangerAt = this.numberParam(rule, 'zonaRiesgo', 50);
      if (this.resourceValue(champion, resources, resourceId) >= dangerAt) {
        multiplier *= this.numberParam(rule, 'multiplicadorZonaRiesgo', 1.2);
      }
    }

    const missile = this.customEffect(skill, 'contador-misil');
    if (missile) {
      const resourceId = this.stringParam(missile, 'recursoId') ?? 'misiles';
      const every = Math.max(2, Math.round(this.numberParam(missile, 'cada', 3)));
      const current = this.resourceValue(champion, resources, resourceId);
      if (current >= every - 1) multiplier *= this.numberParam(missile, 'multiplicadorGrande', 1.5);
    }

    return multiplier;
  }

  static onTurnFinished(champion: ChampionInstance, resources: BattleResourceStore, forms: BattleFormStore): void {
    if (this.formId(champion, forms)) return;
    const rule = this.resourceRule(champion, forms);
    if (!rule) return;
    const resourceId = this.stringParam(rule, 'recursoId');
    if (!resourceId) return;
    const defaultGain = rule.handlerId === 'recurso-furia' ? (rule.power ?? 0) : 0;
    const gain = this.numberParam(rule, 'porTurno', defaultGain);
    if (gain === 0) return;
    this.addResource(champion, resources, resourceId, gain, this.numberParam(rule, 'maximo', 999));
  }

  static onDamageTaken(champion: ChampionInstance, resources: BattleResourceStore, forms: BattleFormStore): void {
    if (this.formId(champion, forms)) return;
    const rule = this.resourceRule(champion, forms);
    if (!rule) return;
    const resourceId = this.stringParam(rule, 'recursoId');
    if (!resourceId) return;
    const gain = this.numberParam(rule, 'alRecibirImpacto', 0);
    if (gain <= 0) return;
    this.addResource(champion, resources, resourceId, gain, this.numberParam(rule, 'maximo', 999));
  }

  static canUseSkill(champion: ChampionInstance, skill: SkillDefinition, resources: BattleResourceStore): SkillUseCheck {
    const transform = skill.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'transformar-forma');
    if (!transform) return { allowed: true };
    const resourceId = this.stringParam(transform, 'recursoId');
    const cost = this.numberParam(transform, 'coste', transform.power ?? 0);
    if (!resourceId || cost <= 0) return { allowed: true };
    const current = this.resourceValue(champion, resources, resourceId);
    return current >= cost
      ? { allowed: true }
      : { allowed: false, message: `Furia ${current}/${cost}. Aún no puedes transformarte.` };
  }

  static applyTransformation(
    champion: ChampionInstance,
    skill: SkillDefinition,
    resources: BattleResourceStore,
    forms: BattleFormStore
  ): BattleFormState | null {
    const transform = skill.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'transformar-forma');
    if (!transform) return null;
    const formId = this.stringParam(transform, 'formaId') ?? transform.statusId;
    if (!formId) return null;
    const resourceId = this.stringParam(transform, 'recursoId');
    const cost = this.numberParam(transform, 'coste', transform.power ?? 0);
    if (resourceId && cost > 0) {
      const bucket = this.bucket(champion, resources);
      bucket[resourceId] = Math.max(0, (bucket[resourceId] ?? 0) - cost);
    }
    const state: BattleFormState = {
      formId,
      remainingTurns: Math.max(1, Math.round(this.numberParam(transform, 'duracionTurnosForma', transform.durationTurns ?? 3)))
    };
    forms[champion.instanceId] = state;
    return state;
  }

  static decrementFormAfterAction(champion: ChampionInstance, forms: BattleFormStore): void {
    const state = forms[champion.instanceId];
    if (!state) return;
    state.remainingTurns = Math.max(0, state.remainingTurns - 1);
  }

  static expireFormAtTurnStart(champion: ChampionInstance, forms: BattleFormStore): string | null {
    const state = forms[champion.instanceId];
    if (!state || state.remainingTurns > 0) return null;
    const expiredFormId = state.formId;
    delete forms[champion.instanceId];
    return expiredFormId;
  }

  static bonusDamageFromPassive(champion: ChampionInstance, forms: BattleFormStore): number {
    const passive = this.passive(champion, forms);
    const effect = passive.effects.find((entry) => entry.type === 'custom' && entry.handlerId === 'daño-adicional-habilidad-ofensiva');
    return effect?.power ?? 0;
  }

  static fixedBonusDamageFromPassive(champion: ChampionInstance, skill: SkillDefinition | null, forms: BattleFormStore): number {
    if (!skill || skill.effects.some((effect) => effect.handlerId === 'fixed-damage')) return 0;
    const passive = this.passive(champion, forms);
    const effect = passive.effects.find((entry) => entry.type === 'custom' && entry.handlerId === 'daño-fijo-adicional-habilidad-ofensiva');
    return effect?.power ?? 0;
  }

  static onSkillResolved(
    champion: ChampionInstance,
    skill: SkillDefinition,
    resources: BattleResourceStore,
    forms: BattleFormStore,
    selfStatuses: CombatStatusInstance[],
    hit: boolean
  ): SkillResolvedSpecials {
    const result: SkillResolvedSpecials = { messages: [], appliedStatusIds: [] };

    for (const effect of skill.effects) {
      if (effect.type !== 'custom' || effect.handlerId !== 'generar-recurso') continue;
      const requiresHit = effect.params?.requiereImpacto === true;
      if (requiresHit && !hit) continue;
      const resourceId = this.stringParam(effect, 'recursoId');
      if (!resourceId) continue;
      const max = this.numberParam(effect, 'maximo', this.resourceMax(champion, forms, resourceId));
      this.addResource(champion, resources, resourceId, effect.power ?? this.numberParam(effect, 'cantidad', 0), max);
    }

    const missile = this.customEffect(skill, 'contador-misil');
    if (missile) {
      const resourceId = this.stringParam(missile, 'recursoId') ?? 'misiles';
      const every = Math.max(2, Math.round(this.numberParam(missile, 'cada', 3)));
      const bucket = this.bucket(champion, resources);
      const current = bucket[resourceId] ?? 0;
      if (current >= every - 1) {
        bucket[resourceId] = 0;
        result.messages.push(hit ? '¡El Grande impacta con toda su carga!' : 'El Grande se consume sin impactar.');
      } else {
        bucket[resourceId] = current + 1;
      }
    }

    const rule = this.resourceRule(champion, forms);
    if (!rule) return result;
    const resourceId = this.stringParam(rule, 'recursoId');
    if (!resourceId) return result;
    const max = this.numberParam(rule, 'maximo', 999);

    if (rule.handlerId === 'recurso-maldad' && hit && this.hasDamage(skill)) {
      this.addResource(champion, resources, resourceId, this.numberParam(rule, 'porImpacto', 1), max);
    }

    if (rule.handlerId === 'recurso-coraje' && hit && this.hasDamage(skill) && !StatusEngine.hasStatus(selfStatuses, 'skaarl-shield')) {
      const courageEffect = this.customEffect(skill, 'generar-coraje');
      const gain = courageEffect?.power ?? 1;
      this.addResource(champion, resources, resourceId, gain, max);
      if (this.resourceValue(champion, resources, resourceId) >= max) {
        this.bucket(champion, resources)[resourceId] = 0;
        const shield = this.numberParam(rule, 'escudoSkaarl', 30);
        const id = StatusEngine.applyShield(selfStatuses, 'skaarl-shield', 'Skaarl', shield, 99, skill.id);
        result.appliedStatusIds.push(id);
        result.messages.push('¡Skaarl reúne el valor para volver junto a Kled!');
      }
    }

    if (rule.handlerId === 'recurso-calor' && this.resourceValue(champion, resources, resourceId) >= max) {
      this.bucket(champion, resources)[resourceId] = 0;
      const id = StatusEngine.applyRecharge(selfStatuses, skill.id, 1);
      result.appliedStatusIds.push(id);
      result.messages.push('¡Rumble se sobrecalienta y tendrá que enfriar su mecha!');
    }

    return result;
  }

  private static resourceRule(champion: ChampionInstance, forms: BattleFormStore): SkillEffectDefinition | undefined {
    return this.passive(champion, forms).effects.find((effect) =>
      effect.type === 'custom' && Boolean(effect.handlerId?.startsWith('recurso-'))
    );
  }

  private static resourceMax(champion: ChampionInstance, forms: BattleFormStore, resourceId: string): number {
    const rule = this.resourceRule(champion, forms);
    if (!rule || this.stringParam(rule, 'recursoId') !== resourceId) return 999;
    return this.numberParam(rule, 'maximo', 999);
  }

  private static hasDamage(skill: SkillDefinition): boolean {
    return skill.effects.some((effect) => effect.type === 'damage');
  }

  private static customEffect(skill: SkillDefinition, handlerId: string): SkillEffectDefinition | undefined {
    return skill.effects.find((effect) => effect.type === 'custom' && effect.handlerId === handlerId);
  }

  private static bucket(champion: ChampionInstance, resources: BattleResourceStore): Record<string, number> {
    return resources[champion.instanceId] ?? (resources[champion.instanceId] = {});
  }

  private static addResource(champion: ChampionInstance, resources: BattleResourceStore, id: string, amount: number, max: number): void {
    const bucket = this.bucket(champion, resources);
    bucket[id] = Math.max(0, Math.min(max, (bucket[id] ?? 0) + amount));
  }

  private static numberParam(effect: SkillEffectDefinition, key: string, fallback: number): number {
    const value = effect.params?.[key];
    return typeof value === 'number' ? value : fallback;
  }

  private static stringParam(effect: SkillEffectDefinition, key: string): string | undefined {
    const value = effect.params?.[key];
    return typeof value === 'string' ? value : undefined;
  }
}
