import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionInstance, SkillDefinition, SkillEffectDefinition, StatBlock } from '../../data/types';
import type { CombatAction } from './BattleEngine';

export interface CombatantTempoState {
  turnsCompleted: number;
  cooldowns: Record<string, number>;
  ultimateReadyOnEntry: boolean;
  jhinAct: number;
  jhinReloadTurns: number;
  essence: number;
  fervorStacks: number;
  fervorTurns: number;
}

export interface DelayedDamageEvent {
  sourceInstanceId: string;
  targetInstanceId: string;
  skillId: string;
  label: string;
  power: number;
}

export interface BattleTempoStore {
  combatants: Record<string, CombatantTempoState>;
  delayedDamage: DelayedDamageEvent[];
}

export interface TempoUseCheck {
  allowed: boolean;
  message?: string;
  short?: string;
}

export interface TempoActionResult {
  messages: string[];
}

export class CombatTempoEngine {
  static createStore(): BattleTempoStore {
    return { combatants: {}, delayedDamage: [] };
  }

  static initialize(champion: ChampionInstance, store: BattleTempoStore, enteredFromBench = false): CombatantTempoState {
    const existing = store.combatants[champion.instanceId];
    if (existing) return existing;
    const state: CombatantTempoState = {
      turnsCompleted: 0,
      cooldowns: {},
      ultimateReadyOnEntry: enteredFromBench,
      jhinAct: 1,
      jhinReloadTurns: 0,
      essence: 0,
      fervorStacks: 0,
      fervorTurns: 0
    };
    store.combatants[champion.instanceId] = state;
    return state;
  }

  static markBenchEntry(champion: ChampionInstance, store: BattleTempoStore): void {
    const state = this.initialize(champion, store, true);
    state.ultimateReadyOnEntry = true;
  }

  static canUseSkill(champion: ChampionInstance, skill: SkillDefinition, store: BattleTempoStore): TempoUseCheck {
    const state = this.initialize(champion, store);
    const cooldown = state.cooldowns[skill.id] ?? 0;
    if (cooldown > 0) {
      return { allowed: false, message: `${skill.name} sigue en enfriamiento (${cooldown} turno${cooldown === 1 ? '' : 's'}).`, short: `CD ${cooldown}` };
    }
    if (skill.slot === 'r' && !state.ultimateReadyOnEntry && state.turnsCompleted < 2) {
      const remaining = 2 - state.turnsCompleted;
      return { allowed: false, message: `La definitiva necesita ${remaining} turno${remaining === 1 ? '' : 's'} más para estar lista.`, short: `R EN ${remaining}T` };
    }
    if (champion.championId === 'jhin' && state.jhinReloadTurns > 0 && this.isOffensiveSkill(skill)) {
      return { allowed: false, message: 'Jhin está recargando Susurro y no puede realizar una acción ofensiva este turno.', short: 'RECARGA' };
    }
    return { allowed: true };
  }

  static canUseBasic(champion: ChampionInstance, store: BattleTempoStore): TempoUseCheck {
    const state = this.initialize(champion, store);
    if (champion.championId === 'jhin' && state.jhinReloadTurns > 0) return { allowed: false, message: 'Jhin está recargando Susurro.', short: 'RECARGA' };
    return { allowed: true };
  }

  static startSkillCooldown(champion: ChampionInstance, skill: SkillDefinition, store: BattleTempoStore): void {
    const duration = this.cooldownTurns(skill);
    if (duration <= 0) return;
    const state = this.initialize(champion, store);
    state.cooldowns[skill.id] = Math.max(state.cooldowns[skill.id] ?? 0, duration + 1);
  }

  static cooldownTurns(skill: SkillDefinition): number {
    if (typeof skill.cooldownTurns === 'number') return Math.max(0, Math.round(skill.cooldownTurns));
    return skill.slot === 'r' ? 2 : skill.slot === 'passive' ? 0 : 1;
  }

  static finishTurn(champion: ChampionInstance, store: BattleTempoStore): void {
    const state = this.initialize(champion, store);
    for (const id of Object.keys(state.cooldowns)) {
      state.cooldowns[id] = Math.max(0, (state.cooldowns[id] ?? 0) - 1);
      if (state.cooldowns[id] <= 0) delete state.cooldowns[id];
    }
    state.turnsCompleted += 1;
    if (state.jhinReloadTurns > 0) state.jhinReloadTurns -= 1;
    if (state.fervorTurns > 0) {
      state.fervorTurns -= 1;
      if (state.fervorTurns <= 0) state.fervorStacks = 0;
    }
  }

  static applyStatBonuses(champion: ChampionInstance, stats: StatBlock, store: BattleTempoStore): StatBlock {
    const result = { ...stats };
    if (champion.championId !== 'irelia') return result;
    const state = this.initialize(champion, store);
    if (state.fervorStacks <= 0) return result;
    const effect = this.passiveEffect(champion, 'fervor-ataque');
    const bonusPerStack = effect?.power ?? 0.06;
    result.attack = Math.max(1, Math.round(result.attack * (1 + bonusPerStack * state.fervorStacks)));
    return result;
  }

  static isActionOffensive(action: CombatAction): boolean {
    if (action.type === 'basic') return true;
    if (action.type === 'wait') return false;
    return this.isOffensiveSkill(DataRegistry.skill(action.skillId));
  }

  static isOffensiveSkill(skill: SkillDefinition): boolean {
    if (skill.effects.some((effect) => effect.params?.noCuentaComoOfensiva === true)) return false;
    return skill.effects.some((effect) => {
      const target = effect.target ?? (effect.type === 'buff' ? 'self' : 'enemy');
      const enemyTarget = ['enemy', 'any-enemy', 'all-enemies', 'random-enemy'].includes(target);
      return enemyTarget && ['damage', 'debuff', 'status', 'custom'].includes(effect.type);
    });
  }

  static isJhinFourthAct(champion: ChampionInstance, action: CombatAction, store: BattleTempoStore): boolean {
    if (champion.championId !== 'jhin' || action.type === 'wait') return false;
    if (action.type === 'skill' && DataRegistry.skill(action.skillId).slot === 'r') return false;
    if (!this.isActionOffensive(action)) return false;
    return this.initialize(champion, store).jhinAct === 4;
  }

  static onActionResolved(champion: ChampionInstance, action: CombatAction, skill: SkillDefinition | null, hit: boolean, store: BattleTempoStore): TempoActionResult {
    const result: TempoActionResult = { messages: [] };
    const state = this.initialize(champion, store);
    if (champion.championId === 'jhin') {
      if (skill?.slot === 'r') {
        state.jhinAct = 1;
        result.messages.push('Abajo el telón completa sus cuatro disparos. Susurro vuelve al Acto I.');
      } else if (this.isActionOffensive(action)) {
        if (state.jhinAct >= 4) {
          state.jhinAct = 1;
          state.jhinReloadTurns = Math.max(state.jhinReloadTurns, 2);
          result.messages.push('¡CUATRO! Jhin debe recargar Susurro antes de volver a atacar.');
        } else state.jhinAct += 1;
      }
    }

    if (champion.championId === 'irelia' && skill && hit && this.isOffensiveSkill(skill)) {
      const effect = this.passiveEffect(champion, 'fervor-ataque');
      const maxStacks = typeof effect?.params?.maxAcumulaciones === 'number' ? effect.params.maxAcumulaciones : 3;
      const duration = typeof effect?.params?.duracionTurnos === 'number' ? effect.params.duracionTurnos : 3;
      state.fervorStacks = Math.min(maxStacks, state.fervorStacks + 1);
      state.fervorTurns = duration + 1;
      result.messages.push(`Fervor jonio: ${state.fervorStacks}/${maxStacks}.`);
    }
    return result;
  }

  static scheduleDelayedDamage(attacker: ChampionInstance, defender: ChampionInstance, skill: SkillDefinition, rank: number, store: BattleTempoStore): void {
    const effect = skill.effects.find((entry) => entry.type === 'custom' && entry.handlerId === 'delayed-fixed-damage');
    if (!effect) return;
    const power = this.effectPower(effect, rank);
    if (power <= 0) return;
    store.delayedDamage.push({
      sourceInstanceId: attacker.instanceId,
      targetInstanceId: defender.instanceId,
      skillId: skill.id,
      label: skill.name,
      power: Math.max(1, Math.round(power))
    });
  }

  static consumeDelayedDamage(champion: ChampionInstance, store: BattleTempoStore): DelayedDamageEvent[] {
    const due = store.delayedDamage.filter((event) => event.sourceInstanceId === champion.instanceId);
    if (due.length === 0) return [];
    store.delayedDamage = store.delayedDamage.filter((event) => event.sourceInstanceId !== champion.instanceId);
    return due;
  }

  static recordDamageInstances(champion: ChampionInstance, hitCount: number, maxHp: number, store: BattleTempoStore): number {
    if (champion.championId !== 'ahri' || hitCount <= 0) return 0;
    const effect = this.passiveEffect(champion, 'esencia-por-impacto');
    if (!effect) return 0;
    const threshold = Math.max(1, Math.round(typeof effect.params?.umbral === 'number' ? effect.params.umbral : 4));
    const healRatio = Math.max(0, effect.power ?? 0.1);
    const state = this.initialize(champion, store);
    state.essence += hitCount;
    let procs = 0;
    while (state.essence >= threshold) {
      state.essence -= threshold;
      procs += 1;
    }
    return procs > 0 ? Math.max(1, Math.round(maxHp * healRatio * procs)) : 0;
  }

  static resourceLabel(champion: ChampionInstance, store: BattleTempoStore): string | null {
    const state = this.initialize(champion, store);
    if (champion.championId === 'jhin') {
      const roman = ['I', 'II', 'III', 'IV'][Math.max(0, Math.min(3, state.jhinAct - 1))];
      return state.jhinReloadTurns > 0 ? `ACTO ${roman} · RECARGA` : `ACTO ${roman}`;
    }
    if (champion.championId === 'ahri') {
      const effect = this.passiveEffect(champion, 'esencia-por-impacto');
      const threshold = Math.max(1, Math.round(typeof effect?.params?.umbral === 'number' ? effect.params.umbral : 4));
      return `ESENCIA ${state.essence}/${threshold}`;
    }
    if (champion.championId === 'irelia') return state.fervorStacks > 0 ? `FERVOR ${state.fervorStacks}/3` : null;
    return null;
  }

  private static passiveEffect(champion: ChampionInstance, handlerId: string): SkillEffectDefinition | undefined {
    const passiveId = DataRegistry.echo(champion.championId).passiveSkillId;
    return DataRegistry.skill(passiveId).effects.find((effect) => effect.type === 'custom' && effect.handlerId === handlerId);
  }

  private static effectPower(effect: SkillEffectDefinition, rank: number): number {
    if (effect.powerByRank?.length) {
      const index = Math.max(0, Math.min(effect.powerByRank.length - 1, rank - 1));
      return effect.powerByRank[index] ?? effect.power ?? 0;
    }
    return effect.power ?? 0;
  }
}
