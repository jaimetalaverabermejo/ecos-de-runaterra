import { CombatTempoEngine, type BattleTempoStore } from './CombatTempoEngine';
import { animationProfile } from '../../ui/combat/CombatAnimationProfiles';
import { DataRegistry } from '../../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance, SkillDefinition, SkillEffectDefinition, StatBlock } from '../../data/types';
import { BattleEngine, type CombatAction } from './BattleEngine';
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
  realms?: Record<string, { targetId: string; remainingTurns: number; stolen: Partial<StatBlock> }>;

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
  /** Area damage to Wukong's clone does not redirect any damage from its owner. */
  areaSummonDamage?: number;
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

  static canUseSkill(champion: ChampionInstance, skill: SkillDefinition, tempo: BattleTempoStore, store: CombatMechanicsStore) {
    if (skill.id === 'mordekaiser-realm-of-death' && this.inRealm(champion.instanceId, store)) return {allowed:false,message:'Reino de la Muerte ya está activo.',short:'REINO'};
    const check = CombatTempoEngine.canUseSkill(champion, skill, tempo);
    if (!check.allowed) return check;
    if (skill.id === 'samira-inferno-trigger' && (this.initialize(champion, store).counters.style ?? 0) < 4) {
      return {allowed:false, message:'Gatillo infernal necesita al menos 4 cargas de Ímpetu.', short:'ÍMPETU 4'};
    }
    return check;
  }

  static outgoingSkill(champion: ChampionInstance, skill: SkillDefinition, store: CombatMechanicsStore): SkillDefinition {
    if (skill.id !== 'samira-inferno-trigger') return skill;
    const stacks = this.initialize(champion, store).counters.style ?? 0;
    return {...skill, effects:skill.effects.map(e => e.type === 'damage' ? {...e,power:1.6 + .4 * Math.max(0, stacks - 4)} : e)};
  }

  static incomingMultiplier(attacker: ChampionInstance, defender: ChampionInstance, skill: SkillDefinition | null, store: CombatMechanicsStore): number {
    if (!this.initialize(defender, store).windows['samira-block']) return 1;
    const family = animationProfile(skill, true, attacker.championId).family;
    return ['P1','P2','P3','P10'].includes(family) ? 0 : .5;
  }

  static prepareSkill(_champion: ChampionInstance, skill: SkillDefinition, statuses: CombatStatusInstance[], maxHp: number, _store: CombatMechanicsStore): string[] {
    const shield = skill.effects.find(e => e.handlerId === 'escudo-vida');
    if (!shield) return [];
    const id = skill.id + '-shield';
    StatusEngine.applyShield(statuses, id, skill.name, Math.round(maxHp * (shield.power ?? .2)), Number(shield.params?.duracionTurnos ?? 1), skill.id);
    return [id];
  }

  static targetEffects(champion: ChampionInstance, target: ChampionInstance, skill: SkillDefinition | null,
    damage: number, stats: StatBlock, selfStatuses: CombatStatusInstance[], targetStatuses: CombatStatusInstance[], store: CombatMechanicsStore, healingAlreadyApplied = 0): number {
    if (!skill) return 0;
    if (skill.effects.some(e => e.handlerId === 'romper-escudo')) {
      for (let i=targetStatuses.length-1;i>=0;i--) if (targetStatuses[i].kind === 'shield') targetStatuses.splice(i,1);
    }
    if (damage > 0 && champion.championId === 'darius') {
      const targetState = this.initialize(target, store), key = 'bleed:' + champion.instanceId;
      const stacks = Math.min(5, (targetState.windows[key]?.power ?? 0) + 1);
      targetState.windows[key] = {id:key,remainingTurns:3,power:stacks,params:{attack:stats.attack}};
    }
    if (damage > 0 && champion.championId === 'rell') {
      const state = this.initialize(champion, store), key='steal:' + target.instanceId;
      const stacks = Math.min(3, (state.windows[key]?.power ?? 0) + 1);
      state.windows[key] = {id:key,remainingTurns:4,power:stacks,params:{targetId:target.instanceId,defense:BattleEngine.statsFor(target).defense * .1}};
    }
    const lifesteal = skill.effects.find(e => e.handlerId === 'robo-vida');
    void selfStatuses;
    const heal = Math.round(damage * (lifesteal?.power ?? 0));
    const cap = lifesteal?.params?.maxHealRatio;
    return typeof cap === 'number' ? Math.min(heal, Math.max(0, Math.floor(stats.hp * cap) - healingAlreadyApplied)) : heal;
  }

  static bleedDamage(champion: ChampionInstance, store: CombatMechanicsStore): number {
    return Object.values(this.initialize(champion, store).windows).filter(w => w.id.startsWith('bleed:'))
      .reduce((sum,w) => sum + Math.max(1, Math.round(Number(w.params.attack) * .04 * w.power)),0);
  }

  static fieldMark(markId: string): boolean {
    return ['xayah-feather', 'katarina-dagger'].includes(markId);
  }

  private static markKey(targetId: string, markId: string, sourceId: string): string {
    return this.fieldMark(markId) ? `field:${sourceId}` : targetId;
  }

  static samePlane(a: string, b: string, store: CombatMechanicsStore): boolean {
    if (a === b) return true;
    for (const [ownerId, realm] of Object.entries(store.realms ?? {})) {
      const members = [ownerId, realm.targetId];
      if (members.includes(a) !== members.includes(b)) return false;
    }
    return true;
  }

  static inRealm(id: string, store: CombatMechanicsStore): boolean {
    return Object.entries(store.realms ?? {}).some(([owner, r]) => owner === id || r.targetId === id);
  }

  static reconcileRealms(aliveIds: string[], store: CombatMechanicsStore): string[] {
    const ended: string[] = [];
    for (const [owner, realm] of Object.entries(store.realms ?? {})) {
      if (!aliveIds.includes(owner) || !aliveIds.includes(realm.targetId)) {
        delete store.realms![owner]; ended.push(owner);
      }
    }
    return ended;
  }

  static advanceRealmRound(store: CombatMechanicsStore): string[] {
    const ended: string[] = [];
    for (const [owner, realm] of Object.entries(store.realms ?? {})) if (--realm.remainingTurns <= 0) {
      delete store.realms![owner]; ended.push(owner);
    }
    return ended;
  }

  static enterRealm(owner: ChampionInstance, target: ChampionInstance, targetStats: StatBlock,
    targetStatuses: CombatStatusInstance[], store: CombatMechanicsStore): boolean {
    const blocked = targetStatuses.findIndex(s => s.remainingTurns > 0 &&
      (s.params?.bloqueaHabilidades === true || s.params?.inmuneControl === true || s.params?.inmuneDestierro === true));
    if (blocked >= 0) {
      if (targetStatuses[blocked].params?.bloqueaHabilidades === true) targetStatuses.splice(blocked, 1);
      return false;
    }
    if (this.inRealm(owner.instanceId, store) || this.inRealm(target.instanceId, store)) return false;
    const stolen: Partial<StatBlock> = {};
    for (const stat of ['attack', 'power', 'defense', 'resistance', 'speed'] as const) stolen[stat] = targetStats[stat] * .1;
    (store.realms ??= {})[owner.instanceId] = {targetId: target.instanceId, remainingTurns: 3, stolen};
    this.initialize(owner, store).counters['storm-turns'] = 3;
    return true;
  }

  static applyStatBonuses(champion: ChampionInstance, stats: StatBlock, store: CombatMechanicsStore): StatBlock {
    const result = {...stats}, state = this.initialize(champion, store);
    if (champion.championId === 'ambessa') result.speed *= 1 + .05 * (state.counters.agility ?? 0);
    for (const [sourceId, source] of Object.entries(store.combatants)) for (const window of Object.values(source.windows)) {
      if (!window.id.startsWith('steal:')) continue;
      if (sourceId === champion.instanceId) result.defense += Number(window.params.defense) * window.power;
      if (window.params.targetId === champion.instanceId) result.defense -= Number(window.params.defense) * window.power;
    }
    if (champion.championId === 'draven') result.attack *= 1 + .15 * (state.counters.ego ?? 0);
    for (const [owner, realm] of Object.entries(store.realms ?? {})) {
      const direction = owner === champion.instanceId ? 1 : realm.targetId === champion.instanceId ? -1 : 0;
      for (const [key, value] of Object.entries(realm.stolen)) result[key as keyof StatBlock] += direction * value!;
    }
    return BattleEngine.capStats({ ...result, hp: Math.max(1, Math.round(result.hp)) });
  }

  static recordDamage(champion: ChampionInstance, damage: number, maxHp: number, store: CombatMechanicsStore): void {
    if (champion.championId !== 'mordekaiser' || damage <= 0) return;
    const state = this.initialize(champion, store);
    state.counters.reserve = Math.min(maxHp * .3, (state.counters.reserve ?? 0) + damage * .2);
  }

  static reserveShield(champion: ChampionInstance, statuses: CombatStatusInstance[], store: CombatMechanicsStore): void {
    const state = this.initialize(champion, store), reserve = Math.round(state.counters.reserve ?? 0);
    if (reserve > 0) StatusEngine.applyShield(statuses, 'mordekaiser-reserve', 'Indestructible', reserve, 2, 'mordekaiser-indestructible');
    state.counters.reserve = 0;
  }

  static onDirectKnockout(champion: ChampionInstance, _skill: SkillDefinition | null, store: CombatMechanicsStore): void {
    if (champion.championId === 'draven') {
      const state = this.initialize(champion, store);
      state.counters.ego = Math.min(3, (state.counters.ego ?? 0) + 1);
    }
  }

  static clearOnKnockout(champion: ChampionInstance, store: CombatMechanicsStore): void {
    delete store.combatants[champion.instanceId];
    delete store.marks[`field:${champion.instanceId}`];
  }

  static finishFieldAction(champion: ChampionInstance, skill: SkillDefinition | null, store: CombatMechanicsStore): void {
    if (!skill) return;
    for (const e of skill.effects) if (e.params?.consumeMarks === true && typeof e.params.markId === 'string' && this.fieldMark(e.params.markId)) {
      this.consumeMarks('', e.params.markId, champion.instanceId, store);
    }
  }

  static stormDamage(champion: ChampionInstance, stats: StatBlock, defender: StatBlock, store: CombatMechanicsStore): number {
    if (champion.championId !== 'mordekaiser' || (this.initialize(champion, store).counters['storm-turns'] ?? 0) <= 0) return 0;
    return BattleEngine.resolveSkill({id:'storm',championId:'mordekaiser',name:'Tormenta',slot:'passive',unlockMastery:1,
      effects:[{type:'damage',stat:'power',power:.3,handlerId:'stat-ratio'}]},1,stats,defender).damage;
  }

  static skillIds(champion: ChampionInstance, forms: BattleFormStore, store: CombatMechanicsStore): string[] {
    const ids = [...SpecialEffectEngine.skillIds(champion, forms)];
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

  /** Reflection is resolved directly, never recursively cast or allowed to bounce. */
  static consumeReflection(statuses: CombatStatusInstance[], skill: SkillDefinition | null): SkillDefinition | null {
    if (!skill) return null;
    const effects = skill.effects.filter(effect =>
      ['damage', 'debuff', 'status'].includes(effect.type)
      && ['enemy', 'any-enemy', 'all-enemies', 'random-enemy', 'all'].includes(effect.target ?? 'enemy')
    ).map(effect => ({ ...effect, target: 'enemy' as const }));
    if (effects.length === 0) return null;
    const index = statuses.findIndex(status => status.remainingTurns > 0 && status.params?.reflejarHabilidad === true);
    if (index < 0) return null;
    statuses.splice(index, 1);
    return { ...skill, effects };
  }

  static expireReflection(statuses: CombatStatusInstance[]): void {
    for (let i = statuses.length - 1; i >= 0; i--) if (statuses[i].params?.reflejarHabilidad === true) statuses.splice(i, 1);
  }

  static basicAttackMultiplier(champion: ChampionInstance, store: CombatMechanicsStore): number {
    if (champion.championId !== 'riven' || (this.initialize(champion, store).counters['runic-blade'] ?? 0) <= 0) return 1;
    const rule = DataRegistry.skill(DataRegistry.battleDefinition(champion.championId).passiveSkillId).effects.find(effect => effect.handlerId === 'cargas-hoja-runica');
    return 1 + (rule?.power ?? 0.3);
  }

  static fragmentHealing(champion: ChampionInstance, skill: SkillDefinition | null, maxHp: number): number {
    if (champion.championId !== 'swain' || !skill) return 0;
    const rule = DataRegistry.skill(DataRegistry.battleDefinition(champion.championId).passiveSkillId).effects.find(effect => effect.handlerId === 'curacion-fragmentos');
    const slots = String(rule?.params?.ranuras ?? 'w,e').split(',');
    return rule && slots.includes(skill.slot) ? Math.max(1, Math.round(maxHp * (rule.power ?? 0.05))) : 0;
  }

  static drainDamage(champion: ChampionInstance, stats: StatBlock, forms: BattleFormStore): number {
    if (champion.championId !== 'swain' || SpecialEffectEngine.formId(champion, forms) !== 'demonic-ascension') return 0;
    return Math.max(1, Math.round(6 + 2 * champion.skillRanks.r + stats.power * 0.1));
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
    return Boolean(this.customEffect(skill, 'abrir-reactivacion')) || Boolean(this.customEffect(skill, 'reino-muerte'));
  }

  static isCurrentRecast(champion: ChampionInstance, skill: SkillDefinition, store: CombatMechanicsStore): boolean {
    if (skill.slot === 'passive') return false;
    const state = this.initialize(champion, store);
    return state.recasts[skill.slot as ActiveSkillSlot]?.recastSkillId === skill.id;
  }

  static hasRecastForSlot(champion: ChampionInstance, slot: ActiveSkillSlot, store: CombatMechanicsStore): boolean {
    return Boolean(this.initialize(champion, store).recasts[slot]);
  }

  static skillPowerMultiplier(
    champion: ChampionInstance,
    skill: SkillDefinition,
    targetInstanceId: string | undefined,
    store: CombatMechanicsStore,
    forms: BattleFormStore
  ): number {
    let multiplier = 1;
    if (champion.championId === 'draven' && skill.slot === 'q') {
      multiplier *= (.7 + .25 * (this.initialize(champion, store).counters.axes ?? 0)) / .7;
    }
    const state = this.initialize(champion, store);
    const category = this.skillCategory(skill);
    if (champion.championId === 'samira' && ['q','e'].includes(skill.slot)) multiplier *= 1 + .04 * (state.counters.style ?? 0);

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
    if (waitBoost && category === 'defensive' && (state.counters['support-boost'] ?? 0) > 0) {
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
    if (skill.id === 'darius-noxian-guillotine') result['darius-hemorrhage'] = this.initialize({ ...champion, instanceId: targetInstanceId }, store).windows['bleed:' + champion.instanceId]?.power ?? 0;
    for (const id of ids) if (id !== 'darius-hemorrhage') result[id] = this.markStacks(targetInstanceId, id, champion.instanceId, store);
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

    if (countAction && champion.championId === 'draven' && skill?.slot === 'e') {
      state.counters['catch-turns'] = 3;
    }
    if (countAction && champion.championId === 'draven' && skill?.slot === 'q') {
      const axes = state.counters.axes ?? 0;
      const chance = (state.counters['catch-turns'] ?? 0) > 0 && axes < 2 ? .9 : .7;
      state.counters.axes = hit && Math.random() < chance ? Math.min(3, axes + 1) : 0;
      result.messages.push(`Hachas: ${state.counters.axes}/3.`);
    }
    if (countAction && champion.championId === 'mordekaiser' && hit && skill?.effects.some(e => e.type === 'damage')) {
      state.counters['storm-hits'] = (state.counters['storm-hits'] ?? 0) + 1;
      if (state.counters['storm-hits'] >= 3 || (state.counters['storm-turns'] ?? 0) > 0) {
        state.counters['storm-turns'] = 3;
        state.counters['storm-hits'] = 0;
      }
    }
    if (countAction && champion.championId === 'ambessa' && hit && skill?.effects.some(e => e.type === 'damage')) state.counters.agility = Math.min(5, (state.counters.agility ?? 0) + 1);
    if (countAction && champion.championId === 'samira' && skill) {
      if (hit && ['q','e'].includes(skill.slot)) state.counters.style = Math.min(6, (state.counters.style ?? 0) + 1);
      if (skill.slot === 'r') state.counters.style = 0;
      if (skill.slot === 'w') state.windows['samira-block'] = {id:'samira-block', remainingTurns:2, power:.5, params:{}};
    }
    if (action.type === 'wait') {
      const waitBoost = passive.effects.find((effect) => effect.type === 'custom' && effect.handlerId === 'esperar-potencia-apoyo');
      if (waitBoost) {
        state.counters['support-boost'] = 1;
        result.messages.push('Ivern cultiva una Arboleda: su próxima curación o escudo será más potente.');
      }
      return result;
    }

    if (champion.championId === 'riven' && countAction) {
      const charges = state.counters['runic-blade'] ?? 0;
      if (skill) {
        const rule = passive.effects.find(effect => effect.handlerId === 'cargas-hoja-runica');
        state.counters['runic-blade'] = Math.min(Number(rule?.params?.maxAcumulaciones ?? 3), charges + 1);
      }
      else if (action.type === 'basic' && hit && charges > 0) {
        state.counters['runic-blade'] = charges - 1;
        result.messages.push('Hoja rúnica potencia el ataque.');
      }
    }
    if (!skill) return result;
    const category = this.skillCategory(skill);

    const override = state.skillOverride;
    if (countAction && override && Object.values(override.replacements).includes(skill.id)) {
      state.skillOverride = undefined;
    }

    let wasRecast = false;
    if (countAction && skill.slot !== 'passive') {
      const recast = state.recasts[skill.slot as ActiveSkillSlot];
      wasRecast = recast?.recastSkillId === skill.id;
      if (wasRecast) delete state.recasts[skill.slot as ActiveSkillSlot];
    }

    const openRecast = countAction && !wasRecast ? this.customEffect(skill, 'abrir-reactivacion') : undefined;
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
        if (effect.type === 'custom' && effect.handlerId === 'añadir-marca' && (countAction || !this.fieldMark(String(effect.params?.markId)))) {
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
        if (effect.handlerId !== 'damage-per-mark' || effect.params?.consumeMarks !== true || this.fieldMark(String(effect.params?.markId))) continue;
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
      if (passiveMark && (countAction || !this.fieldMark(String(passiveMark.params?.markId))) && category === 'offensive' && !this.excludedSlot(passiveMark, skill.slot)) {
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
        if (window.params.tipo !== 'bono-marcas' || category !== 'offensive' || (!countAction && this.fieldMark(String(window.params.markId)))) continue;
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

    for (const key of ['storm-turns', 'catch-turns']) if ((state.counters[key] ?? 0) > 0) state.counters[key] -= 1;
    const fieldKey = `field:${champion.instanceId}`;
    for (const mark of store.marks[fieldKey] ?? []) mark.remainingTurns -= 1;
    store.marks[fieldKey] = (store.marks[fieldKey] ?? []).filter(mark => mark.remainingTurns > 0);
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
        result.messages.push(`${DataRegistry.battleDefinition(champion.championId).name} renueva su escudo.`);
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

  static interceptDamage(owner: ChampionInstance, incomingDamage: number, store: CombatMechanicsStore,
    context: { skill?: SkillDefinition | null; area?: boolean } = {}): DamageInterceptResult {
    const summon = store.summons[owner.instanceId];
    if (!summon || incomingDamage <= 0 || summon.hp <= 0) return { ownerDamage: Math.max(0, incomingDamage), intercepted: 0 };
    const area = context.area ?? context.skill?.effects.some(effect => effect.type === 'damage'
      && (effect.target === 'all-enemies' || effect.target === 'all')) ?? false;
    if (summon.id === 'wukong-clone' && area) {
      const damage = Math.min(summon.hp, incomingDamage);
      summon.hp = Math.max(0, summon.hp - incomingDamage);
      const broken = summon.hp <= 0;
      if (broken) delete store.summons[owner.instanceId];
      return { ownerDamage: incomingDamage, intercepted: 0, areaSummonDamage: damage,
        summonName: summon.name, summonBroken: broken };
    }
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

  static secondaryBounceDamage(skill: SkillDefinition, primaryDamage: number, primaryDefeated: boolean): number | null {
    const effect = this.customEffect(skill, 'rebote-jhin');
    if (!effect || primaryDamage <= 0) return null;
    const ratio = Math.max(0, this.numberParam(effect, 'dañoRebote', 0.7));
    const defeatBonus = primaryDefeated ? Math.max(0, this.numberParam(effect, 'bonusSiDerrota', 0.25)) : 0;
    return Math.max(1, Math.round(primaryDamage * ratio * (1 + defeatBonus)));
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
      const passive = DataRegistry.skill(DataRegistry.battleDefinition(champion.championId).passiveSkillId);
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
      const passive = DataRegistry.skill(DataRegistry.battleDefinition(champion.championId).passiveSkillId);
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
      const passive = DataRegistry.skill(DataRegistry.battleDefinition(champion.championId).passiveSkillId);
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
    if (champion.championId === 'riven') state.counters['runic-blade'] = 0;
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
    if (champion.championId === 'samira') return `ÍMPETU ${state.counters.style ?? 0}/6`;
    if (champion.championId === 'ambessa') return `PASO ${(state.counters.agility ?? 0) * 5}%`;
    if (champion.championId === 'katarina') return `DAGAS ${this.markStacks('', 'katarina-dagger', champion.instanceId, store)}/2`;
    if (champion.championId === 'xayah') return `PLUMAS ${this.markStacks('', 'xayah-feather', champion.instanceId, store)}`;
    if (champion.championId === 'draven') return `HACHAS ${state.counters.axes ?? 0}/3 · EGO ${(state.counters.ego ?? 0) * 15}%`;
    if (champion.championId === 'mordekaiser') return `TORMENTA ${state.counters['storm-turns'] ?? 0}T · RESERVA ${Math.round(state.counters.reserve ?? 0)}${this.inRealm(champion.instanceId, store) ? ' · REINO' : ''}`;
    if (champion.championId === 'riven') return `HOJA RÚNICA ${state.counters['runic-blade'] ?? 0}/3`;
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
    return (store.marks[this.markKey(targetInstanceId, markId, sourceInstanceId)] ?? [])
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
    targetInstanceId = this.markKey(targetInstanceId, markId, sourceInstanceId);
    const list = store.marks[targetInstanceId] ?? (store.marks[targetInstanceId] = []);
    const existing = list.find((mark) => mark.markId === markId && mark.sourceInstanceId === sourceInstanceId);
    if (existing) {
      existing.stacks = Math.min(maxStacks, existing.stacks + stacks);
      existing.remainingTurns = Math.max(existing.remainingTurns, remainingTurns + (this.fieldMark(markId) ? 1 : 0));
      existing.sourceSkillId = sourceSkillId;
      return;
    }
    list.push({
      markId,
      sourceInstanceId,
      sourceSkillId,
      stacks: Math.min(maxStacks, stacks),
      remainingTurns: remainingTurns + (this.fieldMark(markId) ? 1 : 0)
    });
  }

  private static consumeMarks(targetInstanceId: string, markId: string, sourceInstanceId: string, store: CombatMechanicsStore): number {
    targetInstanceId = this.markKey(targetInstanceId, markId, sourceInstanceId);
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
    return (store.marks[this.markKey(targetInstanceId, markId, sourceInstanceId)] ?? []).find((mark) => mark.markId === markId && mark.sourceInstanceId === sourceInstanceId);
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
