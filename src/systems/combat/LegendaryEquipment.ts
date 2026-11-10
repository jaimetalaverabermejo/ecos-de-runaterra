import { DataRegistry } from '../../data/DataRegistry';
import type { SkillDefinition, StatBlock } from '../../data/types';
import { equipmentSlots } from '../build/EquipmentSlots';
import { StatusEngine } from './StatusEngine';
import type { RoundCombatant } from './RoundCombatEngine';

type SamePlane = (a: string, b: string) => boolean;
type GearState = {
  used: Set<string>;
  stasis?: number;
  revive?: number;
  entered?: number;
  lastMagic?: number;
  received: number;
  receivedRounds: Set<number>;
  lastDamage?: number;
  momentum?: boolean;
  kraken: number;
  fragments: number;
  luden?: number;
  eclipse?: number;
  previous?: { round: number; skill: string; targets: Set<string> };
  navori?: { round: number; skill: string };
  haste?: number;
  trinity?: number;
  power?: number;
  slow?: number;
  wounds?: number;
  carve: { until: number; stacks: number };
};

type Impact = { target: RoundCombatant; physical: boolean; magical: boolean; close: boolean };
type Snapshot = { hp: number; shield: number };
type GearAction = {
  hits: Map<string, Impact>;
  threatened: Set<string>;
  damaged: Set<string>;
  before: Map<string, Snapshot>;
  threshold: Set<string>;
  critical: boolean;
};

const id = (unit: RoundCombatant) => unit.champion.instanceId;
const shieldPower = (unit: RoundCombatant) => unit.statuses
  .filter(status => status.kind === 'shield' && status.params?.magicOnly !== true).reduce((sum, status) => sum + status.power, 0);
const magic = (skill: SkillDefinition) => skill.effects.some(e => e.type === 'damage' && e.stat === 'power');
const physical = (skill: SkillDefinition) => skill.effects.some(e => e.type === 'damage' && e.stat !== 'power');
const activeSkill = (skill: SkillDefinition) => ['q', 'w', 'e', 'r'].includes(skill.slot);
const roundShield = (unit: RoundCombatant, key: string, label: string, amount: number) =>
  StatusEngine.applyShield(unit.statuses, key, label, Math.round(amount), 99, key);

export class LegendaryEquipment {
  private readonly fighters = new Map<string, GearState>();
  private readonly actions = new Map<string, GearAction>();
  private readonly heat = new Map<string, Map<string, RoundCombatant>>();
  private readonly zones = new Map<string, { source: string; target: string; until: number; amount: number; name: string }>();
  private readonly shields = new Map<string, Map<string, number>>();
  private messages: string[] = [];
  private units: RoundCombatant[] = [];
  private activeIds = new Set<string>();
  private samePlane: SamePlane = () => true;

  private state(unit: RoundCombatant): GearState {
    let state = this.fighters.get(id(unit));
    if (!state) {
      state = { used: new Set(), received: 0, receivedRounds: new Set(),
        kraken: 0, fragments: 0, carve: { until: 0, stacks: 0 } };
      this.fighters.set(id(unit), state);
    }
    return state;
  }

  private has(unit: RoundCombatant, item: string): boolean {
    const equipped = unit.champion.equippedItems.slice(0, equipmentSlots(unit.champion));
    if (item === 'guardian-angel' && equipped.includes('zhonyas-hourglass')) return false;
    if (item === 'immortal-shieldbow' && equipped.includes('steraks-gage')) return false;
    return equipped.includes(item);
  }

  private announce(unit: RoundCombatant, message: string): void {
    this.messages.push(`${DataRegistry.battleDefinition(unit.champion.championId).name} · ${message}`);
  }

  takeMessages(): string[] {
    const messages = this.messages;
    this.messages = [];
    return messages;
  }

  inStasis(unit: RoundCombatant, round: number): boolean {
    return this.state(unit).stasis === round;
  }

  pending(unit: RoundCombatant): boolean {
    return this.state(unit).revive !== undefined;
  }

  onFall(unit: RoundCombatant, round: number): boolean {
    if (unit.hp > 0) return false;
    const state = this.state(unit);
    if (this.pending(unit)) return true;
    for (const [key, zone] of this.zones) if (zone.target === id(unit)) this.zones.delete(key);
    if (!this.has(unit, 'guardian-angel') || state.used.has('revive')) return false;
    state.used.add('revive');
    state.revive = round + 1;
    this.announce(unit, 'Ángel de la guarda prepara la resurrección.');
    return true;
  }

  prepare(units: RoundCombatant[], round: number, samePlane: SamePlane): void {
    this.units = units;
    this.samePlane = samePlane;
    const previous = this.activeIds;
    this.activeIds = new Set(units.map(id));
    for (const unit of units) {
      const state = this.state(unit);
      if (state.revive === round) {
        delete state.revive;
        unit.hp = Math.max(1, Math.round(unit.maxHp * .30));
        this.announce(unit, 'Ángel de la guarda devuelve al Eco al combate.');
      }
      if (unit.hp <= 0) continue;
      if (!previous.has(id(unit))) {
        state.received = 0;
        state.receivedRounds.clear();
      }
      if (state.entered === undefined) {
        state.entered = round;
        if (this.has(unit, 'kaenic-rookern')) this.ward(unit);
      }
    }
  }

  stats(unit: RoundCombatant, base: StatBlock, round: number): StatBlock {
    const state = this.state(unit);
    const ready = this.has(unit, 'jaksho-the-protean') && state.receivedRounds.size >= 2;
    const chilled = this.units.some(other => other.side !== unit.side && other.hp > 0
      && !this.inStasis(other, round) && this.has(other, 'frozen-heart') && this.samePlane(id(other), id(unit)));
    const exposed = [...this.zones.values()].some(zone => zone.target === id(unit)
      && zone.name === 'Malignidad' && zone.until >= round && this.samePlane(zone.source, zone.target));
    return {
      ...base,
      defense: Math.round((base.defense + (ready ? 8 : 0)) * (1 - (state.carve.until >= round ? .05 * state.carve.stacks : 0))),
      resistance: base.resistance + (ready ? 8 : 0) - (exposed ? 6 : 0),
      power: base.power + (state.power === round ? 8 : 0),
      speed: base.speed + (state.entered === round && this.has(unit, 'youmuus-ghostblade') ? 12 : 0)
        + (state.haste === round ? 6 : 0) - (chilled ? 6 : 0) - (state.slow === round ? 6 : 0)
    };
  }

  begin(actor: RoundCombatant, units?: RoundCombatant[]): void {
    if (units) this.units = units;
    this.actions.set(id(actor), {
      hits: new Map(), damaged: new Set(), threatened: new Set(), threshold: new Set(),
      before: new Map(this.units.map(unit => [id(unit), { hp: unit.hp, shield: shieldPower(unit) }])),
      critical: (this.has(actor, 'infinity-edge') || this.has(actor, 'immortal-shieldbow'))
        && Math.random() < ((this.has(actor, 'infinity-edge') ? .15 : 0) + (this.has(actor, 'immortal-shieldbow') ? .10 : 0))
    });
  }

  skill(actor: RoundCombatant, skill: SkillDefinition): SkillDefinition {
    if (!this.has(actor, 'seryldas-grudge')) return skill;
    return { ...skill, effects: skill.effects.map(effect => effect.type === 'damage' && effect.stat !== 'power'
      ? { ...effect, params: { ...effect.params, penetrationRatio: Math.max(.15, Number(effect.params?.penetrationRatio ?? 0)) } }
      : effect) };
  }

  critical(actor: RoundCombatant, skill: SkillDefinition): { equipmentCritical?: boolean; equipmentCritBonus?: number } {
    return {
      equipmentCritical: skill.equipmentCanCrit === true && this.actions.get(id(actor))?.critical,
      equipmentCritBonus: this.has(actor, 'infinity-edge') ? .2 : 0
    };
  }

  private shield(unit: RoundCombatant, key: string, name: string, amount: number, until: number): void {
    if (amount <= 0) return;
    roundShield(unit, key, name, amount * (this.has(unit, 'spirit-visage') ? 1.2 : 1));
    const entries = this.shields.get(id(unit)) ?? new Map();
    entries.set(key, until);
    this.shields.set(id(unit), entries);
  }

  private ward(unit: RoundCombatant): void {
    roundShield(unit, 'gear-rookern', 'Escudo mágico', unit.maxHp * .12);
    const shield = unit.statuses.find(status => status.id === 'gear-rookern');
    if (shield) shield.params = { magicOnly: true };
  }

  private absorbMagic(target: RoundCombatant, amount: number, round: number): number {
    this.state(target).lastMagic = round;
    const index = target.statuses.findIndex(status => status.id === 'gear-rookern');
    const shield = target.statuses[index];
    if (!shield) return 0;
    const ward = Math.min(shield.power, amount);
    shield.power -= ward;
    if (shield.power <= 0) target.statuses.splice(index, 1);
    return ward;
  }

  private protect(target: RoundCombatant, damage: number, hp: number, round: number, direct = true) {
    const result = StatusEngine.absorbDamage(target.statuses, damage);
    const state = this.state(target);
    if (direct && hp > 0 && result.damage >= hp && this.has(target, 'zhonyas-hourglass') && !state.used.has('stasis')) {
      state.used.add('stasis');
      state.stasis = round;
      result.damage = 0;
      this.announce(target, 'Zhonya activa la estasis.');
    }
    return result;
  }

  packet(actor: RoundCombatant, target: RoundCombatant, skill: SkillDefinition | null, amount: number, hp: number, close: boolean, round: number, kind?: 'physical' | 'magical' | 'fixed') {
    if (amount <= 0 || this.inStasis(target, round) || this.pending(target)) return StatusEngine.absorbDamage(target.statuses, 0);
    if (!skill || !activeSkill(skill)) return this.protect(target, amount, hp, round);

    const action = this.actions.get(id(actor));
    const state = this.state(target);
    const targetId = id(target);
    const isMagic = kind ? kind === 'magical' : magic(skill) && !physical(skill);
    const isPhysical = kind ? kind === 'physical' : physical(skill) && !magic(skill);
    if (action && !action.threatened.has(targetId)) {
      action.threatened.add(targetId);
      state.received++;
      if (state.received === 2 && this.has(target, 'gargoyle-stoneplate') && !state.used.has('gargoyle')) {
        state.used.add('gargoyle');
        this.shield(target, 'gear-gargoyle', 'Protector pétreo de gárgola', target.maxHp * .25, round);
        this.announce(target, 'Protector pétreo de gárgola concede un escudo.');
      }
    }
    const ward = isMagic ? this.absorbMagic(target, amount, round) : 0;
    const remaining = amount - ward;
    if (hp - Math.max(0, remaining - shieldPower(target)) < target.maxHp * .30 && !state.used.has('lifeline')) {
      const sterak = this.has(target, 'steraks-gage');
      if (sterak || this.has(target, 'immortal-shieldbow')) {
        const bonusHp = target.champion.equippedItems.slice(0, equipmentSlots(target.champion))
          .reduce((sum, item) => sum + (DataRegistry.item(item).statBonuses.hp ?? 0), 0);
        state.used.add('lifeline');
        this.shield(target, 'gear-lifeline', 'Salvavidas', sterak ? bonusHp * .5 : target.maxHp * .15, round + 1);
        this.announce(target, 'Salvavidas concede un escudo.');
      }
    }

    const result = this.protect(target, remaining, hp, round);
    result.absorbed += ward;
    if (action && !this.inStasis(target, round)) {
      const previous = action.hits.get(targetId);
      action.hits.set(targetId, { target, physical: isPhysical || !!previous?.physical, magical: isMagic || !!previous?.magical, close });
      if (result.damage > 0) {
        action.damaged.add(targetId);
        state.receivedRounds.add(round);
        this.state(actor).lastDamage = round;
        if (hp >= target.maxHp * .4 && hp - result.damage < target.maxHp * .4) action.threshold.add(targetId);
      }
    }
    return result;
  }

  heal(unit: RoundCombatant, amount: number, round: number): number {
    const state = this.state(unit);
    return Math.round(amount * (this.has(unit, 'spirit-visage') ? 1.2 : 1) * ((state.wounds ?? 0) >= round ? .7 : 1));
  }

  private hurt(target: RoundCombatant, amount: number, round: number, direct = true): number {
    if (target.hp <= 0 || this.inStasis(target, round) || this.pending(target)) return 0;
    const damage = Math.min(target.hp, this.protect(target, Math.round(amount), target.hp, round, direct).damage);
    target.hp -= damage;
    this.onFall(target, round);
    return damage;
  }

  private extra(actor: RoundCombatant, target: RoundCombatant, amount: number, name: string, round: number, kind: 'physical' | 'magical'): number {
    if (amount <= 0 || !this.samePlane(id(actor), id(target))) return 0;
    if (target.hp <= 0 || this.inStasis(target, round) || this.pending(target)) return 0;
    const stats = this.stats(target, target.stats, round);
    const mitigation = kind === 'magical' ? stats.resistance : stats.defense;
    const raw = Math.max(1, Math.round(amount * 100 / (100 + Math.max(0, mitigation))));
    const damage = this.hurt(target, kind === 'magical' ? raw - this.absorbMagic(target, raw, round) : raw, round);
    if (damage > 0) this.announce(actor, `${name} causa ${damage} de daño.`);
    return damage;
  }

  finish(actor: RoundCombatant, skill: SkillDefinition | null, round: number): void {
    const action = this.actions.get(id(actor));
    this.actions.delete(id(actor));
    if (!action || !skill || !activeSkill(skill)) return;
    const state = this.state(actor);
    const hits = [...action.hits.values()];
    const primary = hits[0]?.target;
    const offensive = physical(skill) || magic(skill);
    const allies = this.units.filter(unit => unit.side === actor.side && unit.hp > 0
      && !this.inStasis(unit, round) && this.samePlane(id(actor), id(unit)));
    const foes = this.units.filter(unit => unit.side !== actor.side && unit.hp > 0
      && !this.inStasis(unit, round) && this.samePlane(id(actor), id(unit)));

    if (primary && offensive) {
      if (this.has(actor, 'kraken-slayer') && ++state.kraken === 3) {
        state.kraken = 0;
        this.extra(actor, primary, actor.stats.attack * (.15 + .20 * (1 - primary.hp / primary.maxHp)), 'Verdugo de krakens', round, 'physical');
      }
      if (this.has(actor, 'echoes-of-helia')) state.fragments = Math.min(2, state.fragments + 1);
      if (this.has(actor, 'eclipse') && state.previous?.round === round - 1 && state.previous.skill !== skill.id
        && hits.some(hit => state.previous?.targets.has(id(hit.target))) && (state.eclipse ?? 0) <= round) {
        this.shield(actor, 'gear-eclipse', 'Eclipse', actor.maxHp * .12, round + 1);
        state.eclipse = round + 3;
      }
      state.previous = { round, skill: skill.id, targets: new Set(action.hits.keys()) };
      if (this.has(actor, 'speed-legendary') && skill.slot !== 'r') {
        if (state.navori?.round === round - 1 && state.navori.skill !== skill.id) {
          state.haste = round + 1;
          delete state.navori;
        } else state.navori = { round, skill: skill.id };
      }
      if (physical(skill) && this.has(actor, 'blade-of-the-ruined-king')) {
        const damage = this.extra(actor, primary, primary.hp * .05, 'Hoja del Rey Arruinado', round, 'physical');
        if (actor.hp > 0) actor.hp = Math.min(actor.maxHp, actor.hp + this.heal(actor, damage * .5, round));
      }
      if (this.has(actor, 'trinity-force') && physical(skill) && (state.trinity ?? 0) >= round) {
        delete state.trinity;
        this.extra(actor, primary, actor.stats.attack * .25, 'Fuerza de la Trinidad', round, 'physical');
      }
      if (this.has(actor, 'nashors-tooth') && skill.slot !== 'r' && hits.length === 1
        && !['all', 'all-enemies', 'random-enemy'].includes(skill.selectionTarget ?? 'enemy')
        && !skill.effects.some(effect => effect.target === 'all-enemies' || effect.target === 'all' || effect.target === 'random-enemy')) {
        this.extra(actor, primary, actor.stats.power * .12, 'Diente de Nashor', round, 'magical');
      }
      if (this.has(actor, 'power-relic') && hits.some(hit => hit.magical) && (state.luden ?? 0) <= round) {
        state.luden = round + 3;
        this.extra(actor, primary, actor.stats.power * .18, 'Eco de Luden', round, 'magical');
        const second = foes.find(unit => unit !== primary && id(unit) !== id(primary));
        if (second) this.extra(actor, second, actor.stats.power * .12, 'Eco de Luden', round, 'magical');
      }
      const momentumTarget = hits.find(hit => hit.close)?.target;
      if (state.momentum && momentumTarget && this.has(actor, 'dead-mans-plate')) {
        state.momentum = false;
        this.extra(actor, momentumTarget, actor.stats.attack * .20, 'Coraza del muerto', round, 'physical');
      }
    }
    if (!offensive && skill.effects.some(effect => ['heal', 'buff', 'status', 'custom'].includes(effect.type))
      && this.has(actor, 'trinity-force')) {
      state.trinity = round + 1;
    }

    for (const hit of hits) {
      const target = hit.target;
      const targetState = this.state(target);
      if (target.hp > 0 && hit.physical && this.has(actor, 'black-cleaver')) {
        const current = targetState.carve;
        targetState.carve = { until: round + 1, stacks: Math.min(3, (current.until >= round ? current.stacks : 0) + 1) };
      }
      if (hit.physical && target.hp < target.maxHp * .5 && this.has(actor, 'seryldas-grudge')) targetState.slow = round + 1;
      if (hit.close && this.has(target, 'thornmail')) {
        state.wounds = round + 1;
        this.extra(target, actor, target.stats.defense * .15, 'Malla de espinas', round, 'physical');
      }
      if (hit.magical && this.has(actor, 'liandrys-torment')) this.zone(actor, target, 'Tormento de Liandry', target.maxHp * .02, round);
      if (skill.slot === 'r' && this.has(actor, 'malignance')) this.zone(actor, target, 'Malignidad', actor.stats.power * .10, round);
      if (action.damaged.has(id(target))) {
        if (this.has(actor, 'sunfire-aegis')) this.warm(actor, target);
        if (this.has(target, 'sunfire-aegis')) this.warm(target, actor);
      }
    }

    for (const targetId of action.threshold) {
      const target = action.hits.get(targetId)?.target;
      if (!target || target.hp <= 0) continue;
      const team = this.units.filter(unit => unit.side === target.side && unit.hp > 0 && !this.inStasis(unit, round)
        && this.samePlane(id(unit), targetId));
      const solari = team.find(unit => this.has(unit, 'locket-of-the-iron-solari') && !this.state(unit).used.has('solari'));
      if (!solari) continue;
      this.state(solari).used.add('solari');
      for (const ally of team) this.shield(ally, 'gear-solari', 'Medallón de los Solari', solari.maxHp * .12, round + 1);
      this.announce(solari, 'Medallón de los Solari protege al equipo.');
    }

    const supports = skill.effects.some(effect => effect.type === 'heal' || effect.statusKind === 'shield');
    if (!supports) return;
    const supported = allies.flatMap(ally => {
      const before = action.before.get(id(ally));
      return before ? [{ ally, hp: Math.max(0, ally.hp - before.hp), shield: Math.max(0, shieldPower(ally) - before.shield) }] : [];
    });
    for (const { ally, hp, shield } of supported) {
      if (hp <= 0 && shield <= 0) continue;
      if (shield > 0 && this.has(ally, 'spirit-visage')) {
        this.shield(ally, 'gear-visage', 'Rostro espiritual', shield / 6, round + 1);
      }
      if (id(ally) === id(actor)) {
        if (allies.length === 1 && this.has(actor, 'moonstone-renewer')) {
          actor.hp = Math.min(actor.maxHp, actor.hp + this.heal(actor, hp * .10, round));
          this.shield(actor, 'gear-moonstone', 'Renovación de piedra lunar', shield * .10, round + 1);
        }
        continue;
      }
      if (this.has(actor, 'staff-of-flowing-water')) {
        state.power = round + 1;
        this.state(ally).power = round + 1;
      }
      if (this.has(actor, 'echoes-of-helia') && state.fragments > 0) {
        const extra = actor.stats.power * .08 * state.fragments;
        state.fragments = 0;
        ally.hp = Math.min(ally.maxHp, ally.hp + this.heal(ally, extra, round));
        if (foes[0]) this.extra(actor, foes[0], extra, 'Ecos de Helia', round, 'magical');
      }
      if (this.has(actor, 'moonstone-renewer')) {
        const other = allies.find(unit => id(unit) !== id(ally));
        if (other) {
          other.hp = Math.min(other.maxHp, other.hp + this.heal(other, hp * .25, round));
          this.shield(other, 'gear-moonstone', 'Renovación de piedra lunar', shield * .25, round + 1);
        }
      }
    }
  }

  private zone(actor: RoundCombatant, target: RoundCombatant, name: string, amount: number, round: number): void {
    const source = id(actor), targetId = id(target);
    this.zones.set(`${name}:${source}:${targetId}`, { source, target: targetId, name, amount, until: round + 1 });
  }

  private warm(actor: RoundCombatant, target: RoundCombatant): void {
    const targets = this.heat.get(id(actor)) ?? new Map();
    targets.set(id(target), target);
    this.heat.set(id(actor), targets);
  }

  endRound(units: RoundCombatant[], round: number): void {
    for (const [key, zone] of this.zones) {
      const target = units.find(unit => id(unit) === zone.target);
      if (target && this.samePlane(zone.source, zone.target) && this.hurt(target, zone.amount, round, false) > 0) {
        this.announce(target, `recibe daño de ${zone.name}.`);
      }
      if (zone.until <= round) this.zones.delete(key);
    }
    for (const unit of units) {
      const state = this.state(unit);
      if (unit.hp > 0 && !this.inStasis(unit, round)) {
        for (const target of this.heat.get(id(unit))?.values() ?? []) {
          this.extra(unit, target, unit.maxHp * .02, 'Égida de fuego solar', round, 'magical');
        }
        if (this.has(unit, 'dead-mans-plate') && state.lastDamage !== round) state.momentum = true;
        if (this.has(unit, 'kaenic-rookern') && round - (state.lastMagic ?? round) >= 2) this.ward(unit);
      }
      const entries = this.shields.get(id(unit));
      if (!entries) continue;
      for (const [key, until] of entries) if (until <= round) {
        const index = unit.statuses.findIndex(status => status.id === key);
        if (index >= 0) unit.statuses.splice(index, 1);
        entries.delete(key);
      }
    }
    this.heat.clear();
  }
}
