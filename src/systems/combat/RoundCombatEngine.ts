import { BattleEngine } from './BattleEngine';
import { TypeEffectivenessService } from './TypeEffectivenessService';
import type { ChampionInstance, SkillDefinition, StatBlock } from '../../data/types';
import { StatusEngine, type CombatStatusInstance } from './StatusEngine';

export interface RoundCombatant {
  champion: ChampionInstance;
  hp: number;
  maxHp: number;
  stats: StatBlock;
  statuses: CombatStatusInstance[];
  side: string;
}

type Periodic = { kind: 'bleed' | 'poison' | 'burn' | 'fall' | 'venom-fall'; source: string; target: string; amount: number; last: number; first: number };
type Plague = { source: string; targets: Set<string>; first: number; last: number; damage: number };
type FighterState = {
  mimic?: boolean;
  blockedAction?: boolean;
  wounds: Map<string, { count: number; until: number }>;
  sigils: Map<string, number>;
  reduced?: number;
  cover?: { until: number; ratio: number };
  frenzyUntil?: number;
  untouchable?: number;
  evasion?: number;
  spiderlings?: number;
  charges?: number;
  stunWithAction?: boolean;
  zombieAt?: number;
  decoyUsed?: boolean;
  decoy?: { until: number; hp: number };
  tibbers?: { first: number; last: number; intercepted: boolean; damage: number };
};

export class RoundCombatEngine {
  round = 1;
  private fighters = new Map<string, FighterState>();
  private periodic: Periodic[] = [];
  private plagues: Plague[] = [];

  private state(unit: RoundCombatant): FighterState {
    const id = unit.champion.instanceId;
    let state = this.fighters.get(id);
    if (!state) {
      state = { wounds: new Map(), sigils: new Map() };
      this.fighters.set(id, state);
    }
    return state;
  }

  isZombie(unit: RoundCombatant): boolean {
    return this.state(unit).zombieAt !== undefined;
  }

  revive(unit: RoundCombatant): boolean {
    if (unit.champion.championId !== 'sion' || unit.hp > 0 || this.isZombie(unit)) return false;
    this.state(unit).zombieAt = this.round + 1;
    unit.hp = 1;
    return true;
  }

  canZombieAct(unit: RoundCombatant): boolean {
    return this.state(unit).zombieAt === this.round;
  }

  frenzy(unit: RoundCombatant): boolean {
    const until = this.state(unit).frenzyUntil;
    return until !== undefined && until >= this.round;
  }

  stats(unit: RoundCombatant, base: StatBlock): StatBlock {
    const id = unit.champion.championId;
    if (id === 'sion' && this.isZombie(unit)) return { ...base, attack: base.attack * 2 };
    if (id === 'briar' && this.frenzy(unit)) return { ...base, attack: Math.round(base.attack * 1.4) };
    if (id === 'vladimir') {
      const steps = Math.floor((unit.maxHp - unit.hp) * 10 / Math.max(1, unit.maxHp));
      return { ...base, power: Math.round(base.power * (1 + Math.min(8, steps) * .05)) };
    }
    if (id === 'cassiopeia') {
      const bonus = unit.statuses.filter(status => status.kind === 'stat' && status.stat === 'speed' && status.power > 0)
        .reduce((sum, status) => sum + (status.modifierMode === 'percent' ? status.power * base.speed : status.power), 0);
      return { ...base, speed: Math.round(base.speed + bonus * .25) };
    }
    return base;
  }

  cost(unit: RoundCombatant, skill: SkillDefinition): number {
    const effect = skill.effects.find(entry => entry.handlerId === 'noxus-hp-cost');
    return effect ? Math.ceil(unit.maxHp * (effect.power ?? 0)) : 0;
  }

  startAction(unit: RoundCombatant, skill: SkillDefinition | null): void {
    const state = this.state(unit);
    state.stunWithAction = false;
    if (unit.champion.championId === 'annie' && skill?.effects.some(effect => effect.type === 'damage')) {
      state.stunWithAction = (state.charges ?? 0) === 3;
      state.charges = state.stunWithAction ? 0 : (state.charges ?? 0) + 1;
    }
    if (skill?.id === 'briar-e') delete state.frenzyUntil;
    if (skill?.id === 'briar-w' || skill?.id === 'briar-r') state.frenzyUntil = this.round + 2;
    if (skill?.effects.some(effect => effect.handlerId === 'noxus-untouchable')) state.untouchable = this.round;
    if (skill?.id === 'talon-e' || skill?.id === 'briar-q') state.evasion = this.round;
    if (skill?.id === 'alistar-r') state.cover = { ratio: .60, until: this.round + 1 };
    if (skill?.id === 'annie-r') {
      state.tibbers = { first: this.round + 1, last: this.round + 2, intercepted: false, damage: unit.stats.power * .2 };
    }
  }

  evasion(unit: RoundCombatant): number {
    return this.state(unit).evasion === this.round ? (unit.champion.championId === 'briar' ? .2 : .9) : 0;
  }

  untouchable(unit: RoundCombatant): boolean {
    return this.state(unit).untouchable === this.round;
  }

  private poisoned(target: RoundCombatant): boolean {
    return target.statuses.some(status => status.kind === 'poison') ||
      this.periodic.some(event => event.target === target.champion.instanceId && event.kind === 'poison');
  }

  targetSkill(actor: RoundCombatant, target: RoundCombatant, skill: SkillDefinition): SkillDefinition {
    const marked = (this.state(actor).sigils.get(target.champion.instanceId) ?? 0) >= this.round;
    let ratio: number | undefined;
    let packets: number[] | undefined;
    switch (skill.id) {
      case 'leblanc-w': if (marked) packets = [.50, .50, .30]; break;
      case 'leblanc-e': if (marked) packets = [.40, .30]; break;
      case 'cassiopeia-e': if (this.poisoned(target)) ratio = 1; break;
      case 'elise-q': ratio = .60 + Math.floor(target.hp * 10 / target.maxHp) * .05; break;
      case 'elise-spider-q': ratio = .50 + Math.floor((target.maxHp - target.hp) * 10 / target.maxHp) * .05; break;
      default: break;
    }
    const spiders = skill.id.startsWith('elise-spider-') ? (this.state(actor).spiderlings ?? 0) * .1 : 0;
    if (ratio === undefined && spiders === 0 && !packets) return skill;
    return { ...skill, effects: skill.effects.flatMap(effect => effect.type === 'damage'
      ? (packets ?? [(ratio ?? effect.power ?? 0) + spiders]).map(power => ({ ...effect, power })) : [effect]) };
  }

  packet(_actor: RoundCombatant, target: RoundCombatant, amount: number, area: boolean, intercept = true): number {
    if (amount <= 0 || this.untouchable(target)) return 0;
    const state = this.state(target);
    const interceptable = !area && intercept;
    if (interceptable && state.blockedAction) return 0;
    if (interceptable && state.tibbers && !state.tibbers.intercepted) {
      state.tibbers.intercepted = true;
      state.blockedAction = true;
      return 0;
    }
    if (intercept && state.decoy && state.decoy.until >= this.round) {
      const redirected = Math.min(state.decoy.hp, amount);
      state.decoy.hp -= redirected;
      if (state.decoy.hp <= 0) delete state.decoy;
      if (!area) amount -= redirected;
    }
    return this.adjustDamage(target, amount, intercept);
  }

  adjustDamage(target: RoundCombatant, amount: number, countsAsHit = false): number {
    if (amount <= 0 || this.untouchable(target) || this.isZombie(target)) return 0;
    const state = this.state(target);
    const first = countsAsHit && target.champion.championId === 'alistar' && state.reduced !== this.round;
    if (first) state.reduced = this.round;
    const cover = state.cover && state.cover.until >= this.round ? state.cover.ratio : 0;
    const plague = this.plagues.some(effect => effect.targets.has(target.champion.instanceId) && this.round >= effect.first && this.round <= effect.last);
    return Math.round(amount * (1 - Math.max(cover, first ? .20 : 0)) * (plague ? 1.20 : 1));
  }

  record(actor: RoundCombatant, target: RoundCombatant, amount: number, before: number): void {
    if (amount <= 0) return;
    const state = this.state(target);
    if (target.champion.championId === 'leblanc' && !state.decoyUsed && before >= target.maxHp * .3 && before - amount < target.maxHp * .3 && before > amount) {
      state.decoyUsed = true;
      state.decoy = { until: this.round + 1, hp: Math.max(1, Math.round(target.maxHp * .25)) };
    }
    for (const plague of this.plagues) {
      if (plague.source === actor.champion.instanceId && plague.targets.has(target.champion.instanceId) && plague.first <= this.round && this.round <= plague.last) {
        plague.damage += amount;
      }
    }
  }

  private schedule(actor: RoundCombatant, target: RoundCombatant, kind: Periodic['kind'], amount: number, rounds: number): void {
    const sourceId = actor.champion.instanceId, targetId = target.champion.instanceId;
    this.periodic = this.periodic.filter(event => !(event.kind === kind && event.source === sourceId && event.target === targetId));
    this.periodic.push({ kind, source: sourceId, target: targetId, amount, first: this.round, last: this.round + rounds - 1 });
  }

  landed(actor: RoundCombatant, target: RoundCombatant, skill: SkillDefinition | null, damage: number): { extra: number; heal: number } {
    const actorId = actor.champion.championId, targetId = target.champion.instanceId;
    const state = this.state(actor);
    const id = skill?.id;
    let extra = 0;
    let heal = 0;
    const applyStun = () => StatusEngine.applySimpleStatus(target.statuses, 'stun', `${id}-stun`, 'Aturdimiento', 1, 1, id ?? '', actor.champion.instanceId);

    if (actorId === 'briar' && (skill === null || skill.effects.some(effect => effect.type === 'damage'))) {
      const attack = id === 'briar-r' ? actor.stats.attack : this.stats(actor, actor.stats).attack;
      this.schedule(actor, target, 'bleed', attack * .10, 2);
    }
    if ((id === 'briar-r' || id === 'vladimir-q') && damage > 0) heal = damage * .50;
    if (id === 'vladimir-r') {
      let plague = this.plagues.find(entry => entry.source === actor.champion.instanceId && entry.first === this.round + 1);
      if (!plague) {
        plague = { source: actor.champion.instanceId, targets: new Set(), first: this.round + 1, last: this.round + 2, damage: 0 };
        this.plagues.push(plague);
      }
      plague.targets.add(targetId);
    }
    if (id === 'alistar-e' && actor.side === target.side && actor.champion.instanceId !== targetId) {
      const ally = this.state(target);
      if (!ally.cover || ally.cover.until < this.round || ally.cover.ratio < .30) {
        ally.cover = { ratio: .30, until: this.round };
      }
    }
    if (id === 'cassiopeia-q') this.schedule(actor, target, 'poison', actor.stats.power * .10, 2);
    if (id === 'cassiopeia-w' && this.poisoned(target)) {
      extra += actor.stats.power * .30;
      this.periodic = this.periodic.filter(event => event.kind !== 'poison' || event.target !== targetId);
      for (let i = target.statuses.length - 1; i >= 0; i--) if (target.statuses[i].kind === 'poison') target.statuses.splice(i, 1);
    }
    if (id === 'cassiopeia-e' && this.poisoned(target)) heal = damage * .20;
    if (id === 'cassiopeia-r') {
      if (this.poisoned(target)) applyStun();
      else StatusEngine.applyStatModifier(target.statuses, 'cassiopeia-petrify-slow', 'Ralentización', 'speed', -Math.round(target.stats.speed * .25), 2, id);
    }
    if (id === 'leblanc-q') state.sigils.set(targetId, this.round + 1);
    if ((id === 'leblanc-e' || id === 'leblanc-w') && (state.sigils.get(targetId) ?? 0) >= this.round) {
      state.sigils.delete(targetId);
      if (id === 'leblanc-e') applyStun();
    }
    if (id === 'elise-q' || id === 'elise-w') state.spiderlings = Math.min(3, (state.spiderlings ?? 0) + 1);
    if (id === 'elise-w') this.schedule(actor, target, 'fall', actor.stats.power * .30, 1);
    if (id === 'elise-spider-w') this.schedule(actor, target, 'poison', actor.stats.attack * .10, 2);
    if (id === 'elise-spider-e') this.schedule(actor, target, 'venom-fall', actor.stats.attack * (.20 + (state.spiderlings ?? 0) * .10), 1);
    if (id === 'annie-w' || id === 'annie-r') this.schedule(actor, target, 'burn', actor.stats.power * .10, 2);
    if (actorId === 'annie' && state.stunWithAction && skill?.effects.some(effect => effect.type === 'damage')) applyStun();
    return { extra: Math.round(extra), heal: Math.round(heal) };
  }

  woundDamage(actor: RoundCombatant, target: RoundCombatant, skill: SkillDefinition | null, attack: number): number {
    if (actor.champion.championId !== 'talon' || !skill) return 0;
    const state = this.state(actor);
    const id = target.champion.instanceId;
    const wounds = state.wounds.get(id);
    const count = (wounds && wounds.until >= this.round ? wounds.count : 0) + (skill.id === 'talon-r' ? 2 : 1);
    if (count % 3) state.wounds.set(id, { count: count % 3, until: this.round + 2 });
    else state.wounds.delete(id);
    return count >= 3 ? Math.round(attack * .60) : 0;
  }

  summon(unit: RoundCombatant) {
    const tibbers = this.state(unit).tibbers;
    if (!tibbers || unit.hp <= 0) return undefined;
    return {
      id: 'tibbers', name: 'Tibbers', hp: tibbers.intercepted ? 0 : 1, maxHp: 1,
      remainingTurns: Math.min(2, tibbers.last - this.round + 1)
    };
  }

  sigilTurns(targetId: string): number {
    return Math.max(0, ...[...this.fighters.values()].map(state => {
      const until = state.sigils.get(targetId);
      return until !== undefined && until >= this.round ? until - this.round + 1 : 0;
    }));
  }

  beginTarget(target: RoundCombatant): void {
    this.state(target).blockedAction = false;
  }

  armMimic(actor: RoundCombatant): void {
    this.state(actor).mimic = true;
  }

  mimicArmed(actor: RoundCombatant): boolean {
    return this.state(actor).mimic === true;
  }

  mimic(actor: RoundCombatant, target: RoundCombatant, skill: SkillDefinition, targetForm?: string, retarget?: () => RoundCombatant | undefined): string {
    this.state(actor).mimic = false;
    let dealt = 0;
    let markApplied = false;
    let stunApplied = false;
    for (let cast = 0; cast < 2; cast++) {
      if (target.hp <= 0) {
        const next = retarget?.();
        if (!next) break;
        target = next;
        targetForm = undefined;
        markApplied = false;
        stunApplied = false;
      }
      this.beginTarget(target);
      const hitChance = (1 - StatusEngine.blindMissChance(actor.statuses)) *
        (1 - Math.max(StatusEngine.evasionMissChance(target.statuses), this.evasion(target)));
      if (this.untouchable(target) || Math.random() > hitChance || StatusEngine.consumeDirectBlock(target.statuses)) continue;
      const rank = BattleEngine.skillRank(actor.champion, skill);
      const resolution = BattleEngine.resolveSkill(this.targetSkill(actor, target, skill), rank, actor.stats, target.stats, {
        defenderCurrentHp: target.hp,
        defenderMaxHp: target.maxHp,
        affinityMultiplier: TypeEffectivenessService.forSkill(skill, target.champion, targetForm).multiplier,
        stabMultiplier: TypeEffectivenessService.stabMultiplier(skill, actor.champion)
      });
      const hp = target.hp;
      for (const packet of resolution.damageInstances) {
        if (target.hp <= 0) break;
        target.hp = Math.max(0, target.hp - StatusEngine.absorbDamage(target.statuses, this.packet(actor, target, packet, false)).damage);
      }
      dealt += hp - target.hp;
      this.record(actor, target, hp - target.hp, hp);
      if (target.hp < hp && (skill.id !== 'leblanc-q' || !markApplied) && (skill.id !== 'leblanc-e' || !stunApplied)) {
        stunApplied = skill.id === 'leblanc-e' && (this.state(actor).sigils.get(target.champion.instanceId) ?? 0) >= this.round;
        this.landed(actor, target, skill, hp - target.hp);
        markApplied = skill.id === 'leblanc-q';
      }
    }
    this.revive(target);
    return `Mímica repite ${skill.name} e inflige ${dealt} de daño.`;
  }

  startRound(units: RoundCombatant[], samePlane: (a: string, b: string) => boolean): void {
    if (this.round % 3 !== 0) return;
    for (const actor of units) {
      if (actor.hp <= 0 || actor.champion.championId !== 'alistar') continue;
      const target = this.lowestEnemy(actor, units, samePlane);
      if (target) StatusEngine.applySimpleStatus(target.statuses, 'taunt', 'alistar-trample', 'Provocación', 1, 1, 'alistar-passive', actor.champion.instanceId);
    }
  }

  finishRound(units: RoundCombatant[], samePlane: (a: string, b: string) => boolean): string[] {
    const messages: string[] = [];
    const find = (id: string) => units.find(unit => unit.champion.instanceId === id);
    const hurt = (source: RoundCombatant | undefined, target: RoundCombatant, raw: number, label: string) => {
      const before = target.hp;
      const amount = this.adjustDamage(target, Math.max(1, Math.round(raw)));
      const dealt = Math.min(before, StatusEngine.absorbDamage(target.statuses, amount).damage);
      target.hp -= dealt;
      this.revive(target);
      if (source) this.record(source, target, dealt, before);
      if (dealt) messages.push(`${label} causa ${dealt} de daño.`);
      return dealt;
    };

    for (const event of this.periodic) {
      const source = find(event.source), target = find(event.target);
      if (!target || target.hp <= 0 || this.round < event.first || !samePlane(event.source, event.target)) continue;
      if (this.round > event.last) continue;
      const label = { bleed: 'Hemorragia', poison: 'Veneno', burn: 'Quemadura', fall: 'Araña volátil', 'venom-fall': 'Rápel' }[event.kind];
      const dealt = hurt(source, target, event.amount, label);
      if (event.kind === 'bleed' && source && source.hp > 0) source.hp = Math.min(source.maxHp, source.hp + Math.round(dealt * .50));
      if (event.kind === 'venom-fall' && source && target.hp > 0) {
        this.schedule(source, target, 'poison', source.stats.attack * .10, 2);
        this.periodic[this.periodic.length - 1].first += 1;
        this.periodic[this.periodic.length - 1].last += 1;
      }
    }
    this.periodic = this.periodic.filter(event => event.last > this.round);

    for (const actor of units) {
      const state = this.state(actor);
      const tibbers = state.tibbers;
      if (actor.hp > 0 && tibbers && this.round >= tibbers.first) {
        const target = this.lowestEnemy(actor, units, samePlane);
        if (target) hurt(actor, target, tibbers.damage, 'Tibbers');
        if (this.round >= tibbers.last) delete state.tibbers;
      }
      if (state.frenzyUntil === this.round && actor.hp > 0) {
        delete state.frenzyUntil;
        StatusEngine.applySimpleStatus(actor.statuses, 'stun', 'briar-exhausted', 'Agotamiento', 1, 1, 'briar-w');
      }
      if (state.zombieAt === this.round) actor.hp = 0;
      else this.revive(actor);
    }
    for (const plague of this.plagues) {
      const source = find(plague.source);
      if (plague.last === this.round && source && source.hp > 0) source.hp = Math.min(source.maxHp, source.hp + Math.round(plague.damage * .30));
    }
    this.plagues = this.plagues.filter(plague => plague.last > this.round);
    this.round++;
    return messages;
  }

  private lowestEnemy(actor: RoundCombatant, units: RoundCombatant[], samePlane: (a: string, b: string) => boolean): RoundCombatant | undefined {
    return units.filter(unit => unit.hp > 0 && unit.side !== actor.side && samePlane(actor.champion.instanceId, unit.champion.instanceId))
      .sort((a, b) => a.hp - b.hp)[0];
  }
}
