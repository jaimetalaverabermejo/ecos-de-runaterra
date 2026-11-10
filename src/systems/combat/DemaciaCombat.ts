import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionInstance, SkillDefinition, StatBlock } from '../../data/types';
import { BattleEngine } from './BattleEngine';
import type { CombatMarkState } from './CombatMechanicsEngine';
import { CombatTempoEngine, type BattleTempoStore } from './CombatTempoEngine';
import type { RoundCombatant } from './RoundCombatEngine';
import { StatusEngine, type CombatStatusInstance } from './StatusEngine';
import { TypeEffectivenessService } from './TypeEffectivenessService';

type FighterState = {
  hits: number;
  casts: number;
  stacks: number;
  lastTarget?: string;
  marks: Map<string, number>;
  jarvanNextHit: Map<string, number>;
  flag?: number;
  charged?: boolean;
  protectedAt?: number;
  rangedGuardAt?: number;
  vayneWindow?: { from: number; champion: ChampionInstance };
  lockeRecovery?: { round: number; damage: number };
};

const rangedFamilies = new Set(['P1', 'P2', 'P3', 'P4', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14']);

export class DemaciaCombat {
  private readonly fighters = new Map<string, FighterState>();
  private readonly illumination = new Map<string, string>();
  private readonly controlledThisRound = new Map<string, number>();
  private readonly pools = new Map<string, { round: number; source: string; target: string; rank: number }>();
  private readonly arenas = new Map<string, { rival: string; through: number }>();

  private state(unit: RoundCombatant): FighterState {
    const id = unit.champion.instanceId;
    let state = this.fighters.get(id);
    if (!state) {
      state = { hits: 0, casts: 0, stacks: 0, marks: new Map(), jarvanNextHit: new Map() };
      this.fighters.set(id, state);
    }
    return state;
  }

  marksFor(targetId: string): CombatMarkState[] {
    const marks: CombatMarkState[] = [];
    const lightSource = this.illumination.get(targetId);
    if (lightSource) marks.push({ markId: 'lux-illumination', sourceInstanceId: lightSource, sourceSkillId: 'lux-passive', stacks: 1, remainingTurns: Infinity });
    for (const [sourceId, state] of this.fighters) {
      const stacks = state.marks.get(targetId) ?? 0;
      if (stacks > 0) marks.push({ markId: 'demacia-mark', sourceInstanceId: sourceId, sourceSkillId: '', stacks, remainingTurns: Infinity });
    }
    return marks;
  }

  static canTargetSkill(skill: SkillDefinition | null | undefined, target: ChampionInstance): boolean {
    return skill?.id !== 'sylas-r' || (target.championId !== 'sylas' && !DataRegistry.isCombatant(target.championId));
  }

  rememberControl(target: RoundCombatant, round: number): void {
    if (!this.pools.has(target.champion.instanceId)) return;
    if (target.statuses.some(status => status.kind === 'stun' || status.kind === 'root')) {
      this.controlledThisRound.set(target.champion.instanceId, round);
    }
  }

  static rule(skill: SkillDefinition | null, key: string): string | number | boolean | undefined {
    return skill?.effects.find(effect => effect.handlerId === 'demacia' && effect.params?.[key] !== undefined)?.params?.[key];
  }

  static independentHits(skill: SkillDefinition | null): boolean {
    return Boolean(skill?.effects.some(effect => typeof effect.params?.precisionImpacto === 'number'));
  }

  static hostile(skill: SkillDefinition | null): boolean {
    return skill === null || CombatTempoEngine.isOffensiveSkill(skill) || skill.id === 'fiora-r' || skill.id === 'sylas-r';
  }

  static hitChance(accuracy: number, source: CombatStatusInstance[], evasion: number, random = Math.random()): 'hit' | 'miss' | 'evade' {
    const base = Math.max(.05, Math.min(1, accuracy + StatusEngine.accuracyBonus(source))) * (1 - StatusEngine.blindMissChance(source));
    if (random >= base) return 'miss';
    return random >= base * (1 - evasion) ? 'evade' : 'hit';
  }

  static hitAccuracies(skill: SkillDefinition): number[] {
    return skill.effects.flatMap(effect => effect.type === 'damage'
      ? Array.from({ length: Math.max(1, effect.hits ?? 1) }, () => Number(effect.params?.precisionImpacto ?? skill.accuracy ?? 1))
      : []);
  }

  stats(unit: RoundCombatant, base: StatBlock, round: number): StatBlock {
    const from = this.fighters.get(unit.champion.instanceId)?.vayneWindow?.from;
    return from !== undefined && (round === from || round === from + 1)
      ? { ...base, attack: Math.round(base.attack * 1.25) }
      : base;
  }

  evasion(unit: RoundCombatant, round: number): number {
    const from = this.fighters.get(unit.champion.instanceId)?.vayneWindow?.from;
    return from !== undefined && round === from + 1 ? .30 : 0;
  }

  invisible(unit: RoundCombatant, round: number): boolean {
    return this.fighters.get(unit.champion.instanceId)?.vayneWindow?.from === round;
  }

  targetAllowed(actor: RoundCombatant, target: RoundCombatant, area: boolean, round: number): boolean {
    if (actor.side === target.side) return true;
    const actorId = actor.champion.instanceId;
    const targetId = target.champion.instanceId;
    const owner = this.arenas.get(actorId);
    if (owner && owner.through >= round && owner.rival !== targetId) return false;
    const rival = this.arenas.get(targetId);
    if (rival && rival.through >= round && rival.rival !== actorId) return false;
    return area || !this.invisible(target, round);
  }

  reconcileArena(instanceId: string): void {
    const arena = this.arenas.get(instanceId);
    if (!arena) return;
    this.arenas.delete(instanceId);
    this.arenas.delete(arena.rival);
  }

  inArena(instanceId: string, round: number): boolean {
    return (this.arenas.get(instanceId)?.through ?? 0) >= round;
  }

  protected(target: RoundCombatant, skill: SkillDefinition | null, round: number, family: string): boolean {
    const state = this.fighters.get(target.champion.instanceId);
    return state?.protectedAt === round || (state?.rangedGuardAt === round && DemaciaCombat.ranged(skill, family));
  }

  static ranged(skill: SkillDefinition | null, family: string): boolean {
    const explicit = DemaciaCombat.rule(skill, 'largaDistancia');
    return typeof explicit === 'boolean' ? explicit : rangedFamilies.has(family);
  }

  blocked(actor: RoundCombatant, target: RoundCombatant, block: CombatStatusInstance): void {
    const power = Number(block.params?.contraataque ?? 0);
    if (power > 0) this.secondaryDamage(target, actor, block.sourceSkillId, power, 'attack');
  }

  static fullBlock(statuses: CombatStatusInstance[]): CombatStatusInstance | null {
    const index = statuses.findIndex(status => status.kind === 'block' && status.params?.bloqueoCompleto === true);
    return index < 0 ? null : statuses.splice(index, 1)[0] ?? null;
  }

  onEvade(target: RoundCombatant, attacker: RoundCombatant): void {
    if (target.champion.championId === 'quinn' && target.statuses.some(status => status.kind === 'evasion' && status.sourceSkillId === 'quinn-w')) {
      this.state(target).marks.set(attacker.champion.instanceId, 1);
    }
  }

  skill(actor: RoundCombatant, skill: SkillDefinition, target?: RoundCombatant, targetForm?: string): SkillDefinition {
    if (skill.id === 'sylas-r' && target) return this.stolen(skill, target, targetForm);
    if (skill.id === 'kayle-q' && actor.champion.skillRanks.q >= 4) {
      return { ...skill, selectionTarget: 'all-enemies', effects: [
        ...skill.effects.map(effect => effect.type === 'damage' ? { ...effect, target: 'all-enemies' as const } : effect),
        ...(actor.champion.skillRanks.q >= 5 ? [{ type: 'status' as const, statusKind: 'burn' as const, statusId: 'kayle-burn', stat: 'power' as const, power: .06, scaleWithStat: true, durationTurns: 2, target: 'all-enemies' as const }] : [])
      ] };
    }
    if (skill.id === 'kayle-w' && actor.champion.mastery >= 12) {
      return { ...skill, selectionTarget: 'any-ally', effects: skill.effects.map(effect => ({ ...effect, target: 'any-ally' })) };
    }
    if (actor.champion.championId === 'galio' && this.state(actor).charged && skill.effects.some(effect => effect.type === 'damage')) {
      return { ...skill, selectionTarget: 'all-enemies', effects: skill.effects.map(effect =>
        ['enemy','any-enemy'].includes(effect.target ?? '') ? { ...effect, target: 'all-enemies' } : effect) };
    }
    return skill;
  }

  private stolen(skill: SkillDefinition, target: RoundCombatant, targetForm?: string): SkillDefinition {
    const id = target.champion.championId;
    if (!DemaciaCombat.canTargetSkill(skill, target.champion)) return skill;
    const currentSkills = targetForm && id !== 'shyvana' ? DataRegistry.form(id, targetForm).skillIds : undefined;
    const original = DataRegistry.skill(id === 'gnar' ? 'mega-gnar-ultimate' : (currentSkills ?? DataRegistry.battleDefinition(id).skillIds)[3]);
    const effects = original.effects.filter(effect => !effect.handlerId?.startsWith('transformar-forma'));
    if (id === 'shyvana') {
      effects.push({ type: 'custom', target: 'self', handlerId: 'transformar-forma', params: { formaId: 'dragon-prestado', duracionTurnosForma: 2 } });
    }
    if (id === 'gnar') effects.push({ type: 'custom', target: 'self', handlerId: 'demacia', params: { impactoMuro: true } });
    return { ...skill, name: `Apropiación · ${original.name}`, accuracy: original.accuracy, affinityId: original.affinityId,
      selectionTarget: original.selectionTarget ?? (effects.some(effect => effect.target === 'all-enemies') ? 'all-enemies' : 'enemy'), effects };
  }

  startAction(actor: RoundCombatant, skill: SkillDefinition, target: RoundCombatant, round: number): void {
    const id = actor.champion.championId;
    if (DemaciaCombat.rule(skill, 'invulnerable') === true) this.state(target).protectedAt = round;
    if (skill.id === 'xin-zhao-r') this.state(actor).rangedGuardAt = round;
    if (skill.id === 'vayne-r') this.state(actor).vayneWindow = { from: round + 1, champion: actor.champion };
    if (skill.id === 'locke-w') this.state(actor).lockeRecovery = { round, damage: 0 };
    if (skill.id === 'jarvan-iv-e') this.state(actor).flag = round + 1;
    if (id === 'sylas' && skill.id === 'sylas-e') {
      StatusEngine.applySimpleStatus(actor.statuses, 'evasion', 'sylas-e-evasion', 'Evasión', .20, 1, skill.id, actor.champion.instanceId, true);
    }
  }

  damageMultiplier(actor: RoundCombatant, target: RoundCombatant, skill: SkillDefinition | null, round: number): number {
    const actorId = actor.champion.championId;
    const targetId = target.champion.instanceId;
    let multiplier = 1;
    if (this.illumination.has(targetId)) multiplier *= 1.20;
    if (actorId === 'kayle') multiplier *= 1 + this.state(actor).stacks * .07;
    if (actorId === 'quinn' && this.state(actor).marks.has(targetId)) multiplier *= 1.25;
    if (actorId === 'locke' && skill?.id === 'locke-e') multiplier *= 1 + (this.state(actor).marks.get(targetId) ?? 0) * .20;
    if (actorId === 'jarvan-iv' && round >= (this.state(actor).jarvanNextHit.get(targetId) ?? 0)) multiplier *= 1.20;
    return multiplier;
  }

  onDamage(target: RoundCombatant, damage: number, round: number): void {
    if (target.champion.championId !== 'locke') return;
    const recovery = this.state(target).lockeRecovery;
    if (recovery?.round === round) recovery.damage += damage;
  }

  landed(actor: RoundCombatant, target: RoundCombatant, skill: SkillDefinition | null, hits: number, damage: number, round: number, rank: number, firstHit = true): { extra: number; heal: number } {
    const result = { extra: 0, heal: 0 };
    if (actor.side === target.side) return result;
    const targetId = target.champion.instanceId;
    const id = actor.champion.championId;
    if (hits > 0) this.illumination.delete(targetId);
    if (!['fiora','jarvan-iv','lux','morgana','lucian','xin-zhao','quinn','vayne','locke','sylas'].includes(id)) return result;
    const state = this.state(actor);

    switch (id) {
      case 'fiora': {
        if (skill?.id === 'fiora-r') state.marks.set(targetId, 3);
        if (hits === 0) break;
        if (state.lastTarget !== targetId) state.hits = 0;
        state.lastTarget = targetId;
        state.hits += hits;
        result.heal += Math.round(actor.maxHp * .05 * Math.floor(state.hits / 2));
        state.hits %= 2;
        const marks = state.marks.get(targetId);
        if (marks && (skill?.id === 'fiora-q' || skill?.id === 'fiora-e')) {
          if (marks > hits) state.marks.set(targetId, marks - hits);
          else { state.marks.delete(targetId); result.heal += Math.round(actor.maxHp * .30); }
        }
        break;
      }
      case 'jarvan-iv':
        if (hits > 0 && round >= (state.jarvanNextHit.get(targetId) ?? 0)) state.jarvanNextHit.set(targetId, round + 3);
        if (skill?.id === 'jarvan-iv-q' && state.flag !== undefined && state.flag >= round && hits > 0) {
          state.flag = undefined;
          StatusEngine.applySimpleStatus(target.statuses, 'airborne', 'jarvan-combo', 'Por los aires', 1, 1, skill.id, actor.champion.instanceId);
        }
        if (skill?.id === 'jarvan-iv-r' && hits > 0) {
          this.arenas.set(actor.champion.instanceId, { rival: targetId, through: round + 1 });
          this.arenas.set(targetId, { rival: actor.champion.instanceId, through: round + 1 });
        }
        break;
      case 'lux':
        if (hits > 0 && (skill?.id === 'lux-q' || skill?.id === 'lux-e')) this.illumination.set(targetId, actor.champion.instanceId);
        break;
      case 'morgana':
        if (skill?.id === 'morgana-w' && hits > 0) this.pools.set(targetId, { source: actor.champion.instanceId, target: targetId, round: round + 1, rank });
        break;
      case 'lucian':
        if (state.charged && hits > 0 && skill?.slot !== 'r') result.extra = Math.round(damage * .50);
        break;
      case 'xin-zhao':
        state.hits += hits;
        result.heal = Math.round(actor.maxHp * .08 * Math.floor(state.hits / 3));
        state.hits %= 3;
        if (skill?.id === 'xin-zhao-q' && hits === 3) StatusEngine.applySimpleStatus(target.statuses, 'airborne', 'xin-zhao-airborne', 'Por los aires', 1, 1, skill.id, actor.champion.instanceId);
        break;
      case 'quinn':
        if (hits > 0) state.marks.delete(targetId);
        if (hits > 0 && (skill?.id === 'quinn-e' || skill?.id === 'quinn-r')) state.marks.set(targetId, 1);
        break;
      case 'vayne': {
        if (hits === 0) break;
        const marks = (state.marks.get(targetId) ?? 0) + hits;
        state.marks.set(targetId, marks % 3);
        result.extra = Math.min(Math.round(target.maxHp * .10), Math.round(actor.stats.attack * 1.5)) * Math.floor(marks / 3);
        break;
      }
      case 'locke':
        if (skill?.id === 'locke-q' && hits > 0) {
          state.marks.set(targetId, Math.min(3, (state.marks.get(targetId) ?? 0) + hits));
          StatusEngine.applyStatModifier(target.statuses, 'locke-q-slow', 'Ralentización', 'speed', -Math.round(target.stats.speed * .10 * hits), 1, skill.id);
        }
        if (skill?.id === 'locke-e' && hits > 0) state.marks.delete(targetId);
        break;
      case 'sylas':
        if (skill?.id === 'sylas-q' && firstHit && hits > 0) StatusEngine.applyStatModifier(target.statuses, 'sylas-q-slow', 'Ralentización', 'speed', -Math.round(target.stats.speed * .15), 1, skill.id);
        if (skill?.id === 'sylas-w') result.heal = Math.round(damage * (actor.hp < actor.maxHp * .50 ? .60 : .30));
        break;
    }
    return result;
  }

  finishAction(actor: RoundCombatant, skill: SkillDefinition | null, hit: boolean, units: RoundCombatant[], samePlane: (a: string, b: string) => boolean): void {
    if (actor.hp <= 0) return;
    const id = actor.champion.championId;
    if (!skill) {
      if (id === 'lucian' || id === 'galio') this.state(actor).charged = false;
      return;
    }
    const eligible = (unit: RoundCombatant) => unit.hp > 0 && samePlane(actor.champion.instanceId, unit.champion.instanceId);
    if (id === 'sona') {
      const state = this.state(actor);
      if (++state.casts === 3) {
        state.casts = 0;
        const allies = units.filter(unit => unit.side === actor.side && eligible(unit));
        const other = allies.filter(unit => unit.champion.instanceId !== actor.champion.instanceId);
        const target = (other.length ? other : allies).sort((a,b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (target) target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * .10));
      }
    }
    if (id === 'kayle' && skill.slot === 'q' && hit) {
      const state = this.state(actor);
      state.stacks = Math.min(3, state.stacks + 1);
    }
    if (id === 'galio') {
      const state = this.state(actor);
      if (state.charged && skill.effects.some(effect => effect.type === 'damage')) { state.charged = false; state.casts = 0; }
      else if (!state.charged && ++state.casts >= 2) state.charged = true;
    }
    if (id === 'lucian') this.state(actor).charged = true;
    if ((skill.id === 'lucian-r' || skill.id === 'galio-r')
      && !actor.statuses.some(status => status.kind === 'recharge' && status.sourceSkillId === skill.id)) {
      StatusEngine.applyRecharge(actor.statuses, skill.id);
    }
    if (id === 'sylas' && skill.slot !== 'r' && hit) {
      for (const target of units.filter(unit => unit.side !== actor.side && eligible(unit))) {
        this.secondaryDamage(actor, target, 'sylas-passive', .8, 'power');
      }
    }
    for (const effect of skill.effects) {
      if (effect.statusKind !== 'shield' || effect.target !== 'all-allies') continue;
      for (const ally of units.filter(unit => unit.side === actor.side && eligible(unit))) {
        StatusEngine.applyShield(ally.statuses, effect.statusId ?? skill.id, skill.name, effect.power ?? 0,
          effect.durationTurns ?? 1, skill.id);
      }
    }
  }

  endRound(units: RoundCombatant[], round: number, tempo: BattleTempoStore | undefined, samePlane: (a: string, b: string) => boolean): string[] {
    const messages: string[] = [];
    const byId = new Map(units.map(unit => [unit.champion.instanceId, unit]));
    const drainedBySource = new Map<string, number>();
    for (const [key, pool] of this.pools) {
      if (pool.round > round) continue;
      this.pools.delete(key);
      const source = byId.get(pool.source), target = byId.get(pool.target);
      if (!source || !target || target.hp <= 0 || !samePlane(pool.source, pool.target)) continue;
      const controlled = this.controlledThisRound.get(pool.target) === round
        || target.statuses.some(status => status.kind === 'stun' || status.kind === 'root');
      if (Math.random() < (controlled ? 1 : .60)) {
        const dealt = this.secondaryDamage(source, target, 'morgana-w', 1.04 + .05 * (pool.rank - 1), 'power');
        if (dealt) messages.push(`Sombra atormentada inflige ${dealt} de daño.`);
        if (controlled) drainedBySource.set(pool.source, (drainedBySource.get(pool.source) ?? 0) + dealt);
      }
    }
    this.controlledThisRound.clear();
    for (const [id, drained] of drainedBySource) {
      const source = byId.get(id);
      if (!source || source.hp <= 0) continue;
      const heal = Math.min(source.maxHp - source.hp, Math.floor(source.maxHp * .06), Math.round(drained * .25));
      if (heal <= 0) continue;
      source.hp += heal;
      messages.push(`Sifón de alma recupera ${heal} de Vida.`);
    }
    for (const [id, state] of this.fighters) {
      const unit = byId.get(id);
      if (state.lockeRecovery?.round === round) {
        const heal = Math.round(state.lockeRecovery.damage * .60);
        state.lockeRecovery = undefined;
        if (unit && unit.hp > 0 && heal > 0) unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      }
      if (state.vayneWindow && state.vayneWindow.from + 1 === round) {
        if (tempo) CombatTempoEngine.startSkillCooldown(state.vayneWindow.champion, DataRegistry.skill('vayne-r'), tempo, true);
        state.vayneWindow = undefined;
      }
    }
    for (const [id, arena] of this.arenas) if (arena.through <= round) this.arenas.delete(id);
    return messages;
  }

  private secondaryDamage(source: RoundCombatant, target: RoundCombatant, skillId: string, power: number, stat: 'attack' | 'power'): number {
    const skill = DataRegistry.skill(skillId);
    const resolution = BattleEngine.resolveSkill({ ...skill, effects: [{ type: 'damage', stat, power, scaleWithStat: true }] },
      1, source.stats, target.stats, { affinityMultiplier: TypeEffectivenessService.forSkill(skill, target.champion).multiplier,
        stabMultiplier: TypeEffectivenessService.stabMultiplier(skill, source.champion) });
    const damage = Math.min(target.hp, StatusEngine.absorbDamage(target.statuses, resolution.damage).damage);
    target.hp -= damage;
    return damage;
  }
}
