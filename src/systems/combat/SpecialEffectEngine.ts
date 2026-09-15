import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionInstance, SkillDefinition, SkillEffectDefinition } from '../../data/types';

export type BattleResourceStore = Record<string, Record<string, number>>;
export interface BattleFormState { formId: string; remainingTurns: number; }
export type BattleFormStore = Record<string, BattleFormState>;

export interface SkillUseCheck {
  allowed: boolean;
  message?: string;
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
    bucket[resourceId] = this.numberParam(rule, 'inicial', 1);
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
    return `${resourceId.toUpperCase()} ${current}/${max}`;
  }

  static onTurnFinished(champion: ChampionInstance, resources: BattleResourceStore, forms: BattleFormStore): void {
    if (this.formId(champion, forms)) return;
    const rule = this.resourceRule(champion, forms);
    if (!rule) return;
    const resourceId = this.stringParam(rule, 'recursoId');
    if (!resourceId) return;
    const gain = this.numberParam(rule, 'porTurno', rule.power ?? 0);
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

  private static resourceRule(champion: ChampionInstance, forms: BattleFormStore): SkillEffectDefinition | undefined {
    return this.passive(champion, forms).effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'recurso-furia');
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
