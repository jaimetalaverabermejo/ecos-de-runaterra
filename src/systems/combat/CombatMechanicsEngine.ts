import { DataRegistry } from '../../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance, SkillDefinition, SkillEffectDefinition } from '../../data/types';
import type { CombatAction } from './BattleEngine';
import { SpecialEffectEngine, type BattleFormStore } from './SpecialEffectEngine';
import { StatusEngine, type CombatStatusInstance } from './StatusEngine';

export type SkillCategory = 'offensive' | 'defensive' | 'utility';

export interface CombatMarkState {
  markId: string;
  sourceInstanceId: string;
  sourceSkillId: string;
  stacks: number;
  remainingTurns: number;
}

export interface CombatRecastState {
  slot: ActiveSkillSlot;
  baseSkillId: string;
  recastSkillId: string;
  remainingTurns: number;
}

export interface CombatSkillOverrideState {
  sourceSkillId: string;
  replacements: Partial<Record<ActiveSkillSlot, string>>;
}

export interface CombatWindowState {
  id: string;
  remainingTurns: number;
  power: number;
  params: Record<string, string | number | boolean>;
}

export interface CombatantMechanicsState {
  counters: Record<string, number>;
  recasts: Partial<Record<ActiveSkillSlot, CombatRecastState>>;
  windows: Record<string, CombatWindowState>;
  skillOverride?: CombatSkillOverrideState;
  lastCategory?: SkillCategory;
}

export interface CombatSummonState {
  id: string;
  name: string;
  ownerInstanceId: string;
  hp: number;
  maxHp: number;
  remainingTurns: number;
  interceptRatio: number;
  endTurnDamage: number;
  sourceSkillId: string;
}

export interface CombatMechanicsStore {
  combatants: Record<string, CombatantMechanicsState>;
  marks: Record<string, CombatMarkState[]>;
  summons: Record<string, CombatSummonState>;
  teamFlags: Record<string, boolean>;
}

export interface MechanicsActionResult {
  messages: string[];
  extraHitTriggered: boolean;
}

export interface MechanicsTurnResult {
  messages: string[];
  expiredRecastSkillIds: string[];
  summonAttack?: { name: string; damage: number };
}

export interface DamageInterceptResult {
  ownerDamage: number;
  intercepted: number;
  summonName?: string;
  summonBroken?: boolean;
}

export interface ShieldEndEffect {
  damage: number;
  slowPower: number;
  slowTurns: number;
}

export class CombatMechanicsEngine {
  static createStore(): CombatMechanicsStore {
    return { combatants: {}, marks: {}, summons: {}, teamFlags: {} };
  }

  static initialize(champion: ChampionInstance, store: CombatMechanicsStore): CombatantMechanicsState {
    return store.combatants[champion.instanceId] ?? (store.combatants[champion.instanceId] = {
      counters: {},
      recasts: {},
      windows: {}
    });
  }

  static skillIds(champion: ChampionInstance, forms: BattleFormStore, store: CombatMechanicsStore): [string, string, string, string] {
    const ids = [...SpecialEffectEngine.skillIds(champion, forms)] as [string, string, string, string];
    const state = this.initialize(champion, store);
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];

    slots.forEach((slot, index) => {
      const recast = state.recasts[slot];
      if (recast) ids[index] = recast.recastSkillId;
      const override = state.skillOverride?.replacements[slot];
      if (override) ids[index] = override;
    });
    return ids;
  }

  static isPreActionSkill(skill: SkillDefinition): boolean {
    return skill.effects.some((effect) =>
      effect.type === 'custom' && ['accion-instantanea', 'armar-habilidades-potenciadas'].includes(effect.handlerId ?? '')
    );
  }

  static hasLockedSkillOverride(champion: ChampionInstance, store: CombatMechanicsStore): boolean {
    return Boolean(this.initialize(champion, store).skillOverride);
  }

  static activatePreAction(champion: ChampionInstance, skill: SkillDefinition, store: CombatMechanicsStore): string[] {
    const state = this.initialize(champion, store);
    const effect = this.customEffect(skill, 'armar-habilidades-potenciadas');
    if (!effect) return [];
    const replacements: Partial<Record<ActiveSkillSlot, string>> = {};
    for (const slot of ['q', 'w', 'e'] as ActiveSkillSlot[]) {
      const value = effect.params?.[slot + 'SkillId'];
      if (typeof value === 'string') replacements[slot] = value;
    }
    state.skillOverride = { sourceSkillId: skill.id, replacements };
    return Object.keys(replacements).length > 0
      ? ['Mantra está preparado. Elige la habilidad que quieres potenciar.']
      : [];
  }

  static shouldDeferCooldown(skill: SkillDefinition): boolean {
    return Boolean(this.customEffect(skill, 'abrir-reactivacion'));
  }

  static isCurrentRecast(champion: ChampionInstance, skill: SkillDefinition, store: CombatMechanicsStore): boolean {
    if (skill.slot === 'passive') return false;
    const state = this.initialize(champion, store);
    return state.recasts[skill.slot as ActiveSkillSlot]?.recastSkillId === skill.id;
  }

  static skillPowerMultiplier(
    champion: ChampionInstance,
    skill: SkillDefinition,
    targetInstanceId: string | undefined,
    store: CombatMechanicsStore,
    forms: BattleFormStore
  ): number {
    let multiplier = 1;
    const state = this.initialize(champion, store);
    const category = this.skillCategory(skill);

    const empower = Object.values(state.windows).find((window) =>
      window.params.tipo === 'potenciar-ofensiva' && category === 'offensive'
    );
    if (empower) multiplier *= Math.max(0.1, 1 + empower.power);

    const passive = SpecialEffectEngine.passive(champion, forms);
    const recastBonus = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'bonus-reactivacion');
    if (recastBonus && this.isCurrentRecast(champion, skill, store)) {
      multiplier *= Math.max(0.1, 1 + (recastBonus.power ?? 0.1));
    }

    const alternate = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'alternar-ofensiva-defensiva');
    if (alternate && state.lastCategory && category !== 'utility' && state.lastCategory !== 'utility' && state.lastCategory !== category) {
      multiplier *= Math.max(0.1, 1 + (alternate.power ?? 0.15));
    }

    const waitBoost = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'esperar-potencia-apoyo');
    if (countAction && waitBoost && category === 'defensive' && (state.counters['support-boost'] ?? 0) > 0) {
      multiplier *= Math.max(0.1, 1 + (waitBoost.power ?? 0.25));
    }

    const combo = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'combo-habilidad-distinta');
    if (combo && targetInstanceId && category === 'offensive') {
      const markId = this.stringParam(combo, 'markId') ?? 'combo';
      const mark = this.findMark(targetInstanceId, markId, champion.instanceId, store);
      if (mark && mark.sourceSkillId !== skill.id) multiplier *= Math.max(0.1, 1 + (combo.power ?? 0.15));
    }

    return multiplier;
  }

  static markStacksById(
    champion: ChampionInstance,
    targetInstanceId: string | undefined,
    skill: SkillDefinition,
    store: CombatMechanicsStore,
    forms: BattleFormStore
  ): Record<string, number> {
    if (!targetInstanceId) return {};
    const ids = new Set<string>();
    for (const effect of skill.effects) {
      const markId = effect.params?.markId;
      const requiredMarkId = effect.params?.requiredMarkId;
      if (typeof markId === 'string') ids.add(markId);
      if (typeof requiredMarkId === 'string') ids.add(requiredMarkId);
    }
    const passive = SpecialEffectEngine.passive(champion, forms);
    for (const effect of passive.effects) {
      const markId = effect.params?.markId;
      if (typeof markId === 'string') ids.add(markId);
    }
    const result: Record<string, number> = {};
    for (const id of ids) result[id] = this.markStacks(targetInstanceId, id, champion.instanceId, store);
    return result;
  }

  static extraHitRatio(
    champion: ChampionInstance,
    skill: SkillDefinition | null,
    store: CombatMechanicsStore,
    forms: BattleFormStore
  ): number {
    if (!skill || this.skillCategory(skill) !== 'offensive') return 0;
    const passive = SpecialEffectEngine.passive(champion, forms);
    const rule = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'contador-ofensivo-golpe-extra');
    if (!rule) return 0;
    const state = this.initialize(champion, store);
    const threshold = Math.max(1, Math.round(this.numberParam(rule, 'umbral', 3)));
    return (state.counters['offensive-chain'] ?? 0) >= threshold
      ? Math.max(0, this.numberParam(rule, 'multiplicadorGolpeExtra', 0.55))
      : 0;
  }

  static onActionResolved(
    champion: ChampionInstance,
    action: CombatAction,
    skill: SkillDefinition | null,
    hit: boolean,
    targetInstanceId: string | undefined,
    ownerMaxHp: number,
    store: CombatMechanicsStore,
    forms: BattleFormStore,
    countAction = true
  ): MechanicsActionResult {
    const result: MechanicsActionResult = { messages: [], extraHitTriggered: false };
    const state = this.initialize(champion, store);
    const passive = SpecialEffectEngine.passive(champion, forms);

    if (action.type === 'wait') {
      const waitBoost = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'esperar-potencia-apoyo');
      if (waitBoost) {
        state.counters['support-boost'] = 1;
        result.messages.push('Ivern cultiva una Arboleda: su próxima curación o escudo será más potente.');
      }
      return result;
    }

    if (!skill) return result;
    const category = this.skillCategory(skill);

    const override = state.skillOverride;
    if (countAction && override && Object.values(override.replacements).includes(skill.id)) {
      state.skillOverride = undefined;
    }

    if (countAction && skill.slot !== 'passive') {
      const recast = state.recasts[skill.slot as ActiveSkillSlot];
      if (recast?.recastSkillId === skill.id) delete state.recasts[skill.slot as ActiveSkillSlot];
    }

    const openRecast = countAction ? this.customEffect(skill, 'abrir-reactivacion') : undefined;
    if (openRecast && (!this.boolParam(openRecast, 'requiereImpacto', false) || hit) && skill.slot !== 'passive') {
      const recastSkillId = this.stringParam(openRecast, 'recastSkillId');
      if (recastSkillId) {
        state.recasts[skill.slot as ActiveSkillSlot] = {
          slot: skill.slot as ActiveSkillSlot,
          baseSkillId: skill.id,
          recastSkillId,
          remainingTurns: Math.max(2, Math.round(this.numberParam(openRecast, 'ventanaTurnos', 2)) + 1)
        };
        result.messages.push(`${skill.name} puede reactivarse.`);
      }
    }

    if (countAction) for (const effect of skill.effects) {
      if (effect.type !== 'custom') continue;
      if (effect.handlerId === 'potenciar-siguiente-ofensiva') {
        const id = this.stringParam(effect, 'windowId') ?? `${skill.id}:empower`;
        state.windows[id] = {
          id,
          remainingTurns: Math.max(2, Math.round(effect.durationTurns ?? 2) + 1),
          power: effect.power ?? 0.25,
          params: { ...(effect.params ?? {}), tipo: 'potenciar-ofensiva' }
        };
      }
      if (effect.handlerId === 'bono-marcas-temporal') {
        const id = this.stringParam(effect, 'windowId') ?? `${skill.id}:marks`;
        state.windows[id] = {
          id,
          remainingTurns: Math.max(2, Math.round(effect.durationTurns ?? 2) + 1),
          power: effect.power ?? 1,
          params: { ...(effect.params ?? {}), tipo: 'bono-marcas' }
        };
      }
      if (effect.handlerId === 'invocar' && hit) {
        const summonId = this.stringParam(effect, 'summonId') ?? 'summon';
        const name = this.stringParam(effect, 'nombre') ?? 'Invocación';
        const hpRatio = Math.max(0.1, this.numberParam(effect, 'vidaRatio', 0.7));
        const maxHp = Math.max(1, Math.round(ownerMaxHp * hpRatio));
        store.summons[champion.instanceId] = {
          id: summonId,
          name,
          ownerInstanceId: champion.instanceId,
          hp: maxHp,
          maxHp,
          remainingTurns: Math.max(1, Math.round(this.numberParam(effect, 'duracionTurnos', effect.durationTurns ?? 3))),
          interceptRatio: Math.max(0, Math.min(0.95, this.numberParam(effect, 'intercepta', 0.75))),
          endTurnDamage: Math.max(1, Math.round(this.numberParam(effect, 'dañoFinTurno', effect.power ?? 6))),
          sourceSkillId: skill.id
        };
        result.messages.push(`${name} entra al combate.`);
      }
    }

    if (hit && targetInstanceId) {
      for (const effect of skill.effects) {
        if (effect.type === 'custom' && effect.handlerId === 'añadir-marca') {
          const markId = this.stringParam(effect, 'markId');
          if (!markId) continue;
          this.addMark(
            targetInstanceId,
            markId,
            champion.instanceId,
            skill.id,
            Math.max(1, Math.round(effect.power ?? this.numberParam(effect, 'cantidad', 1))),
            Math.max(1, Math.round(effect.durationTurns ?? this.numberParam(effect, 'duracionTurnos', 4))),
            Math.max(1, Math.round(this.numberParam(effect, 'maxAcumulaciones', 12))),
            store
          );
        }
      }

      for (const effect of skill.effects) {
        if (effect.handlerId !== 'damage-per-mark' || effect.params?.consumeMarks !== true) continue;
        const markId = this.stringParam(effect, 'markId');
        if (markId) this.consumeMarks(targetInstanceId, markId, champion.instanceId, store);
      }

      const combo = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'combo-habilidad-distinta');
      if (combo && category === 'offensive') {
        const markId = this.stringParam(combo, 'markId') ?? 'combo';
        this.consumeMarks(targetInstanceId, markId, champion.instanceId, store);
        this.addMark(
          targetInstanceId,
          markId,
          champion.instanceId,
          skill.id,
          1,
          Math.max(1, Math.round(this.numberParam(combo, 'duracionTurnos', 2))),
          1,
          store
        );
      }

      const passiveMark = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'marca-por-habilidad-ofensiva');
      if (passiveMark && category === 'offensive' && !this.excludedSlot(passiveMark, skill.slot)) {
        const markId = this.stringParam(passiveMark, 'markId') ?? 'mark';
        this.addMark(
          targetInstanceId,
          markId,
          champion.instanceId,
          skill.id,
          Math.max(1, Math.round(passiveMark.power ?? 1)),
          Math.max(1, Math.round(this.numberParam(passiveMark, 'duracionTurnos', 5))),
          Math.max(1, Math.round(this.numberParam(passiveMark, 'maxAcumulaciones', 12))),
          store
        );
      }

      for (const window of Object.values(state.windows)) {
        if (window.params.tipo !== 'bono-marcas' || category !== 'offensive') continue;
        const excluded = typeof window.params.excluirRanuras === 'string'
          ? window.params.excluirRanuras.split(',').map((value) => value.trim())
          : [];
        if (excluded.includes(skill.slot)) continue;
        const markId = typeof window.params.markId === 'string' ? window.params.markId : undefined;
        if (!markId) continue;
        this.addMark(
          targetInstanceId,
          markId,
          champion.instanceId,
          skill.id,
          Math.max(1, Math.round(window.power)),
          Math.max(1, Math.round(typeof window.params.duracionMarca === 'number' ? window.params.duracionMarca : 5)),
          Math.max(1, Math.round(typeof window.params.maxAcumulaciones === 'number' ? window.params.maxAcumulaciones : 12)),
          store
        );
      }
    }

    const offensiveCounter = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'contador-ofensivo-golpe-extra');
    if (countAction && offensiveCounter && hit && category === 'offensive') {
      const threshold = Math.max(1, Math.round(this.numberParam(offensiveCounter, 'umbral', 3)));
      if ((state.counters['offensive-chain'] ?? 0) >= threshold) {
        state.counters['offensive-chain'] = 0;
        result.extraHitTriggered = true;
        result.messages.push('¡Golpe doble!');
      } else {
        state.counters['offensive-chain'] = (state.counters['offensive-chain'] ?? 0) + 1;
      }
    }

    const waitBoost = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'esperar-potencia-apoyo');
    if (waitBoost && category === 'defensive' && (state.counters['support-boost'] ?? 0) > 0) {
      state.counters['support-boost'] = 0;
    }

    const alternate = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'alternar-ofensiva-defensiva');
    if (countAction && alternate && category !== 'utility') state.lastCategory = category;

    if (countAction && category === 'offensive') {
      for (const [id, window] of Object.entries(state.windows)) {
        if (window.params.tipo === 'potenciar-ofensiva') delete state.windows[id];
      }
    }

    return result;
  }

  static finishTurn(
    champion: ChampionInstance,
    selfStatuses: CombatStatusInstance[],
    store: CombatMechanicsStore,
    forms: BattleFormStore
  ): MechanicsTurnResult {
    const result: MechanicsTurnResult = { messages: [], expiredRecastSkillIds: [] };
    const state = this.initialize(champion, store);

    for (const slot of ['q', 'w', 'e', 'r'] as ActiveSkillSlot[]) {
      const recast = state.recasts[slot];
      if (!recast) continue;
      recast.remainingTurns -= 1;
      if (recast.remainingTurns <= 0) {
        result.expiredRecastSkillIds.push(recast.baseSkillId);
        delete state.recasts[slot];
      }
    }

    for (const [id, window] of Object.entries(state.windows)) {
      window.remainingTurns -= 1;
      if (window.remainingTurns <= 0) delete state.windows[id];
    }

    const targetMarks = store.marks[champion.instanceId] ?? [];
    for (const mark of targetMarks) mark.remainingTurns -= 1;
    store.marks[champion.instanceId] = targetMarks.filter((mark) => mark.remainingTurns > 0);

    const passive = SpecialEffectEngine.passive(champion, forms);
    const periodicShield = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'escudo-periodico');
    if (periodicShield) {
      const every = Math.max(1, Math.round(this.numberParam(periodicShield, 'cadaTurnos', 3)));
      const current = (state.counters['periodic-shield'] ?? 0) + 1;
      if (current >= every) {
        state.counters['periodic-shield'] = 0;
        StatusEngine.applyShield(
          selfStatuses,
          `${champion.championId}-periodic-shield`,
          this.stringParam(periodicShield, 'nombre') ?? 'Escudo feérico',
          Math.max(1, Math.round(periodicShield.power ?? 10)),
          Math.max(1, Math.round(periodicShield.durationTurns ?? 2)),
          passive.id
        );
        result.messages.push(`${DataRegistry.champion(champion.championId).name} renueva su escudo.`);
      } else state.counters['periodic-shield'] = current;
    }

    const summon = store.summons[champion.instanceId];
    if (summon) {
      result.summonAttack = { name: summon.name, damage: summon.endTurnDamage };
      summon.remainingTurns -= 1;
      if (summon.remainingTurns <= 0 || summon.hp <= 0) {
        delete store.summons[champion.instanceId];
        result.messages.push(`${summon.name} abandona el combate.`);
      }
    }

    return result;
  }

  static interceptDamage(owner: ChampionInstance, incomingDamage: number, store: CombatMechanicsStore): DamageInterceptResult {
    const summon = store.summons[owner.instanceId];
    if (!summon || incomingDamage <= 0 || summon.hp <= 0) return { ownerDamage: Math.max(0, incomingDamage), intercepted: 0 };
    const intercepted = Math.min(summon.hp, Math.max(0, Math.round(incomingDamage * summon.interceptRatio)));
    summon.hp = Math.max(0, summon.hp - intercepted);
    const ownerDamage = Math.max(0, incomingDamage - intercepted);
    const broken = summon.hp <= 0;
    const name = summon.name;
    if (broken) delete store.summons[owner.instanceId];
    return { ownerDamage, intercepted, summonName: name, summonBroken: broken };
  }

  static summon(champion: ChampionInstance, store: CombatMechanicsStore): CombatSummonState | undefined {
    return store.summons[champion.instanceId];
  }

  static summonLabel(champion: ChampionInstance, store: CombatMechanicsStore): string | null {
    const summon = this.summon(champion, store);
    return summon ? `${summon.name.toUpperCase()} ${summon.hp}/${summon.maxHp} · ${summon.remainingTurns}T` : null;
  }

  static teamHealAmount(skill: SkillDefinition, rank: number): number {
    const effect = this.customEffect(skill, 'curar-equipo-al-impactar');
    if (!effect) return 0;
    return Math.max(0, Math.round(this.effectPower(effect, rank)));
  }

  static secondaryCollision(skill: SkillDefinition, rank: number): { damage: number; airborneTurns: number } | null {
    const effect = this.customEffect(skill, 'colision-secundaria');
    if (!effect) return null;
    return {
      damage: Math.max(0, Math.round(this.effectPower(effect, rank))),
      airborneTurns: Math.max(1, Math.round(this.numberParam(effect, 'airborneTurns', 1)))
    };
  }

  static shieldEndEffect(status: CombatStatusInstance): ShieldEndEffect | null {
    if (status.kind !== 'shield' || status.params?.explotaAlTerminar !== true) return null;
    return {
      damage: Math.max(1, Math.round(typeof status.params.dañoExplosion === 'number' ? status.params.dañoExplosion : 5)),
      slowPower: typeof status.params.ralentizacion === 'number' ? status.params.ralentizacion : -3,
      slowTurns: Math.max(1, Math.round(typeof status.params.turnosRalentizacion === 'number' ? status.params.turnosRalentizacion : 1))
    };
  }

  static canUseFreePairSwitch(active: ChampionInstance[], side: 'player' | 'enemy', store: CombatMechanicsStore): boolean {
    const ids = new Set(active.map((champion) => champion.championId));
    for (const champion of active) {
      const passive = DataRegistry.skill(DataRegistry.echo(champion.championId).passiveSkillId);
      const effect = passive.effects.find((entry) => entry.type === 'custom' && entry.handlerId === 'cambio-gratis-pareja');
      const partnerId = effect ? this.stringParam(effect, 'partnerId') : undefined;
      if (!partnerId || !ids.has(partnerId)) continue;
      const key = this.pairSwitchKey(side, champion.championId, partnerId);
      if (!store.teamFlags[key]) return true;
    }
    return false;
  }

  static actorEligibleForFreePairSwitch(
    actor: ChampionInstance,
    active: ChampionInstance[],
    side: 'player' | 'enemy',
    store: CombatMechanicsStore
  ): boolean {
    if (!this.canUseFreePairSwitch(active, side, store)) return false;
    const ids = new Set(active.map((champion) => champion.championId));
    for (const champion of active) {
      const passive = DataRegistry.skill(DataRegistry.echo(champion.championId).passiveSkillId);
      const effect = passive.effects.find((entry) => entry.type === 'custom' && entry.handlerId === 'cambio-gratis-pareja');
      const partnerId = effect ? this.stringParam(effect, 'partnerId') : undefined;
      if (!partnerId || !ids.has(partnerId)) continue;
      if (actor.championId === champion.championId || actor.championId === partnerId) return true;
    }
    return false;
  }

  static consumeFreePairSwitch(active: ChampionInstance[], side: 'player' | 'enemy', store: CombatMechanicsStore): void {
    const ids = new Set(active.map((champion) => champion.championId));
    for (const champion of active) {
      const passive = DataRegistry.skill(DataRegistry.echo(champion.championId).passiveSkillId);
      const effect = passive.effects.find((entry) => entry.type === 'custom' && entry.handlerId === 'cambio-gratis-pareja');
      const partnerId = effect ? this.stringParam(effect, 'partnerId') : undefined;
      if (!partnerId || !ids.has(partnerId)) continue;
      store.teamFlags[this.pairSwitchKey(side, champion.championId, partnerId)] = true;
      return;
    }
  }

  static shouldResetBasicCooldownsOnKnockout(statuses: CombatStatusInstance[]): boolean {
    return statuses.some((status) => status.params?.reiniciaBasicasAlDerrotar === true);
  }

  static clearOnBench(champion: ChampionInstance, store: CombatMechanicsStore): void {
    const state = store.combatants[champion.instanceId];
    if (!state) return;
    state.recasts = {};
    state.skillOverride = undefined;
    state.windows = {};
  }

  static resourceLabel(champion: ChampionInstance, store: CombatMechanicsStore, forms: BattleFormStore): string | null {
    const state = this.initialize(champion, store);
    const passive = SpecialEffectEngine.passive(champion, forms);
    const offensiveCounter = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'contador-ofensivo-golpe-extra');
    if (offensiveCounter) {
      const threshold = Math.max(1, Math.round(this.numberParam(offensiveCounter, 'umbral', 3)));
      const value = Math.min(threshold, state.counters['offensive-chain'] ?? 0);
      return value >= threshold ? 'GOLPE DOBLE LISTO' : `GOLPE DOBLE ${value}/${threshold}`;
    }
    if (state.skillOverride) return 'MANTRA · ELIGE Q/W/E';
    const recast = Object.values(state.recasts).find(Boolean);
    if (recast) return `REACTIVACIÓN ${recast.slot.toUpperCase()} · ${Math.max(1, recast.remainingTurns - 1)}T`;
    return this.summonLabel(champion, store);
  }

  static skillCategory(skill: SkillDefinition): SkillCategory {
    const offensive = skill.effects.some((effect) => {
      const target = effect.target ?? (effect.type === 'buff' || effect.type === 'heal' ? 'self' : 'enemy');
      return ['enemy', 'any-enemy', 'all-enemies', 'random-enemy'].includes(target)
        && ['damage', 'debuff', 'status', 'custom'].includes(effect.type);
    });
    if (offensive) return 'offensive';

    const defensive = skill.effects.some((effect) => {
      const target = effect.target ?? (effect.type === 'buff' || effect.type === 'heal' ? 'self' : 'enemy');
      return ['self', 'ally', 'any-ally', 'all-allies'].includes(target)
        && ['heal', 'buff', 'status', 'custom'].includes(effect.type);
    });
    return defensive ? 'defensive' : 'utility';
  }

  static markStacks(targetInstanceId: string, markId: string, sourceInstanceId: string, store: CombatMechanicsStore): number {
    return (store.marks[targetInstanceId] ?? [])
      .filter((mark) => mark.markId === markId && mark.sourceInstanceId === sourceInstanceId)
      .reduce((sum, mark) => sum + mark.stacks, 0);
  }

  private static addMark(
    targetInstanceId: string,
    markId: string,
    sourceInstanceId: string,
    sourceSkillId: string,
    stacks: number,
    remainingTurns: number,
    maxStacks: number,
    store: CombatMechanicsStore
  ): void {
    const list = store.marks[targetInstanceId] ?? (store.marks[targetInstanceId] = []);
    const existing = list.find((mark) => mark.markId === markId && mark.sourceInstanceId === sourceInstanceId);
    if (existing) {
      existing.stacks = Math.min(maxStacks, existing.stacks + stacks);
      existing.remainingTurns = Math.max(existing.remainingTurns, remainingTurns);
      existing.sourceSkillId = sourceSkillId;
      return;
    }
    list.push({
      markId,
      sourceInstanceId,
      sourceSkillId,
      stacks: Math.min(maxStacks, stacks),
      remainingTurns
    });
  }

  private static consumeMarks(targetInstanceId: string, markId: string, sourceInstanceId: string, store: CombatMechanicsStore): number {
    const list = store.marks[targetInstanceId] ?? [];
    let consumed = 0;
    store.marks[targetInstanceId] = list.filter((mark) => {
      if (mark.markId === markId && mark.sourceInstanceId === sourceInstanceId) {
        consumed += mark.stacks;
        return false;
      }
      return true;
    });
    return consumed;
  }

  private static findMark(targetInstanceId: string, markId: string, sourceInstanceId: string, store: CombatMechanicsStore): CombatMarkState | undefined {
    return (store.marks[targetInstanceId] ?? []).find((mark) => mark.markId === markId && mark.sourceInstanceId === sourceInstanceId);
  }

  private static pairSwitchKey(side: 'player' | 'enemy', a: string, b: string): string {
    return `${side}:pair-switch:${[a, b].sort().join('+')}`;
  }

  private static excludedSlot(effect: SkillEffectDefinition, slot: SkillDefinition['slot']): boolean {
    const value = effect.params?.excluirRanuras;
    if (typeof value !== 'string') return false;
    return value.split(',').map((entry) => entry.trim()).includes(slot);
  }

  private static customEffect(skill: SkillDefinition, handlerId: string): SkillEffectDefinition | undefined {
    return skill.effects.find((effect) => effect.type === 'custom' && effect.handlerId === handlerId);
  }

  private static numberParam(effect: SkillEffectDefinition, key: string, fallback: number): number {
    const value = effect.params?.[key];
    return typeof value === 'number' ? value : fallback;
  }

  private static stringParam(effect: SkillEffectDefinition, key: string): string | undefined {
    const value = effect.params?.[key];
    return typeof value === 'string' ? value : undefined;
  }

  private static boolParam(effect: SkillEffectDefinition, key: string, fallback: boolean): boolean {
    const value = effect.params?.[key];
    return typeof value === 'boolean' ? value : fallback;
  }

  private static effectPower(effect: SkillEffectDefinition, rank: number): number {
    if (effect.powerByRank?.length) {
      const index = Math.max(0, Math.min(effect.powerByRank.length - 1, rank - 1));
      return effect.powerByRank[index] ?? effect.power ?? 0;
    }
    return effect.power ?? 0;
  }
}
