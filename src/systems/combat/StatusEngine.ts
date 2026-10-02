import type { CombatStatusKind, SkillDefinition, SkillEffectDefinition, StatBlock } from '../../data/types';

export interface CombatStatusInstance {
  id: string;
  name: string;
  short: string;
  kind: CombatStatusKind;
  remainingTurns: number;
  power: number;
  stat?: keyof StatBlock;
  modifierMode?: 'flat' | 'percent';
  beneficial: boolean;
  sourceSkillId: string;
  sourceInstanceId?: string;
  params?: Record<string, string | number | boolean>;
  stacks?: number;
  ticks?: number;
}

export interface StatusApplicationResult {
  selfAppliedIds: string[];
  enemyAppliedIds: string[];
  messages: string[];
}

export interface ShieldResult {
  damage: number;
  absorbed: number;
  brokenStatuses: CombatStatusInstance[];
}

export interface StatusApplicationContext {
  selectedTargetIsAlly?: boolean;
  markStacksById?: Record<string, number>;
}

const STAT_SHORT: Record<keyof StatBlock, string> = {
  hp: 'VID',
  attack: 'ATQ',
  power: 'POD',
  defense: 'DEF',
  resistance: 'RES',
  speed: 'VEL'
};

export class StatusEngine {
  static applySkillEffects(
    skill: SkillDefinition,
    rank: number,
    selfStatuses: CombatStatusInstance[],
    enemyStatuses: CombatStatusInstance[],
    allowEnemyEffects = true,
    effectPowerMultiplier = 1,
    sourceInstanceId?: string,
    context: StatusApplicationContext = {}
  ): StatusApplicationResult {
    const result: StatusApplicationResult = { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };

    for (const effect of skill.effects) {
      const customStatus = effect.type === 'custom' && ['aumento-evasion', 'precision-habilidad', 'recarga', 'transformacion-control', 'destierro-temporal', 'marca-explosiva'].includes(effect.handlerId ?? '');
      if (!['buff', 'debuff', 'status'].includes(effect.type) && !customStatus) continue;
      const target = effect.target ?? (effect.type === 'buff' ? 'self' : 'enemy');
      const targetsEnemy = ['enemy', 'any-enemy', 'all-enemies', 'random-enemy'].includes(target);
      const targetsAlly = ['ally', 'any-ally', 'all-allies'].includes(target);
      if (targetsEnemy && !allowEnemyEffects) continue;
      if (context.selectedTargetIsAlly === true && targetsEnemy) continue;
      if (context.selectedTargetIsAlly === false && targetsAlly) continue;
      const requiredMarkId = typeof effect.params?.requiredMarkId === 'string' ? effect.params.requiredMarkId : undefined;
      const minimumMarks = typeof effect.params?.minimumMarks === 'number' ? effect.params.minimumMarks : 1;
      if (requiredMarkId && (context.markStacksById?.[requiredMarkId] ?? 0) < minimumMarks) continue;
      if (Math.random() > (effect.chance ?? 1)) continue;

      const status = this.fromEffect(skill, effect, rank, effectPowerMultiplier, sourceInstanceId);
      if (!status) continue;
      const appliesToSelf = target === 'self';
      const targetIsSelectedAlly = Boolean(context.selectedTargetIsAlly && targetsAlly);
      const list = targetIsSelectedAlly ? enemyStatuses : appliesToSelf ? selfStatuses : enemyStatuses;
      this.applyOrRefresh(list, status);

      if (list === selfStatuses) result.selfAppliedIds.push(status.id);
      else result.enemyAppliedIds.push(status.id);
      result.messages.push(`${status.name} · ${status.remainingTurns}t`);
    }

    return result;
  }

  static effectiveStats(base: StatBlock, statuses: CombatStatusInstance[]): StatBlock {
    const stats: StatBlock = { ...base };
    for (const status of statuses) {
      if (status.kind !== 'stat' || !status.stat) continue;
      if (status.modifierMode === 'percent') {
        stats[status.stat] = Math.max(1, Math.round(stats[status.stat] * (1 + status.power)));
      } else {
        stats[status.stat] = Math.max(1, Math.round(stats[status.stat] + status.power));
      }
    }
    return stats;
  }

  static poisonDamage(statuses: CombatStatusInstance[]): number {
    return statuses
      .filter((status) => status.kind === 'poison')
      .reduce((sum, status) => {
        const tick = Math.max(0, status.ticks ?? 0);
        const increment = typeof status.params?.incremento === 'number' ? Math.max(0, status.params.incremento) : 1;
        const defaultCap = Math.max(status.power, status.power * 2);
        const cap = typeof status.params?.tope === 'number' ? Math.max(status.power, status.params.tope) : defaultCap;
        const raw = Math.min(cap, status.power + tick * increment);
        status.ticks = tick + 1;
        return sum + Math.max(0, Math.round(raw * this.damageMultiplier(status)));
      }, 0);
  }

  static burnDamage(statuses: CombatStatusInstance[]): number {
    return statuses
      .filter((status) => status.kind === 'burn')
      .reduce((sum, status) => sum + Math.max(0, Math.round(status.power * this.damageMultiplier(status))), 0);
  }

  static accuracyBonus(statuses: CombatStatusInstance[]): number {
    return Math.max(0, ...statuses
      .filter((status) => status.kind === 'accuracy')
      .map((status) => Math.max(0, Math.min(1, status.power))));
  }

  static hasStatus(statuses: CombatStatusInstance[], id: string): boolean {
    return statuses.some((status) => status.id === id);
  }

  static charmFailureChance(statuses: CombatStatusInstance[]): number {
    return Math.max(0, ...statuses
      .filter((status) => status.kind === 'charm')
      .map((status) => Math.max(0, Math.min(0.95, status.power))));
  }

  static consumeDirectBlock(statuses: CombatStatusInstance[]): CombatStatusInstance | null {
    const index = statuses.findIndex((status) => status.kind === 'block');
    if (index < 0) return null;
    return statuses.splice(index, 1)[0] ?? null;
  }

  static consumeTrap(statuses: CombatStatusInstance[]): { damage: number; slowPower: number; sourceSkillId: string } | null {
    const index = statuses.findIndex((status) => status.kind === 'trap');
    if (index < 0) return null;
    const trap = statuses.splice(index, 1)[0];
    return {
      damage: Math.max(1, Math.round(trap.power)),
      slowPower: typeof trap.params?.ralentizacion === 'number' ? trap.params.ralentizacion : -4,
      sourceSkillId: trap.sourceSkillId
    };
  }

  static forcedTargetInstanceId(statuses: CombatStatusInstance[]): string | undefined {
    return statuses.find((status) => status.kind === 'taunt')?.sourceInstanceId;
  }

  static applySimpleStatus(
    statuses: CombatStatusInstance[],
    kind: CombatStatusKind,
    id: string,
    name: string,
    power: number,
    durationTurns: number,
    sourceSkillId: string,
    sourceInstanceId?: string,
    beneficial = false,
    params?: Record<string, string | number | boolean>
  ): string {
    this.applyOrRefresh(statuses, {
      id,
      name,
      short: this.statusShort(id, kind, undefined, beneficial),
      kind,
      power,
      remainingTurns: Math.max(1, Math.round(durationTurns)),
      sourceSkillId,
      sourceInstanceId,
      beneficial,
      params
    });
    return id;
  }

  static applyStatModifier(
    statuses: CombatStatusInstance[],
    id: string,
    name: string,
    stat: keyof StatBlock,
    power: number,
    durationTurns: number,
    sourceSkillId: string,
    beneficial = false
  ): string {
    this.applyOrRefresh(statuses, {
      id,
      name,
      short: `${STAT_SHORT[stat]}${beneficial ? '↑' : '↓'}`,
      kind: 'stat',
      remainingTurns: Math.max(1, Math.round(durationTurns)),
      power,
      stat,
      modifierMode: 'flat',
      beneficial,
      sourceSkillId
    });
    return id;
  }

  static applyShield(
    statuses: CombatStatusInstance[],
    id: string,
    name: string,
    power: number,
    durationTurns: number,
    sourceSkillId: string
  ): string {
    this.applyOrRefresh(statuses, {
      id,
      name,
      short: 'ESC',
      kind: 'shield',
      remainingTurns: Math.max(1, Math.round(durationTurns)),
      power: Math.max(0, power),
      beneficial: true,
      sourceSkillId
    });
    return id;
  }

  static applyRecharge(statuses: CombatStatusInstance[], sourceSkillId: string, durationTurns = 1): string {
    const id = 'recharge';
    this.applyOrRefresh(statuses, {
      id,
      name: 'Recarga',
      short: 'REC',
      kind: 'recharge',
      remainingTurns: Math.max(1, Math.round(durationTurns)),
      power: 1,
      beneficial: false,
      sourceSkillId
    });
    return id;
  }

  static blindMissChance(statuses: CombatStatusInstance[]): number {
    return Math.max(0, ...statuses
      .filter((status) => status.kind === 'blind')
      .map((status) => Math.max(0, Math.min(0.95, status.power))));
  }

  static evasionMissChance(statuses: CombatStatusInstance[]): number {
    return Math.max(0, ...statuses.filter((status) => status.kind === 'evasion').map((status) => Math.max(0, Math.min(0.95, status.power))));
  }

  static blockingKind(statuses: CombatStatusInstance[]): 'stun' | 'airborne' | 'recharge' | 'polymorph' | 'banish' | 'sleep' | null {
    if (statuses.some((status) => status.kind === 'banish')) return 'banish';
    if (statuses.some((status) => status.kind === 'polymorph')) return 'polymorph';
    if (statuses.some((status) => status.kind === 'recharge')) return 'recharge';
    if (statuses.some((status) => status.kind === 'airborne')) return 'airborne';
    if (statuses.some((status) => status.kind === 'sleep')) return 'sleep';
    if (statuses.some((status) => status.kind === 'stun')) return 'stun';
    return null;
  }

  static isRooted(statuses: CombatStatusInstance[]): boolean {
    return statuses.some((status) => status.kind === 'root');
  }

  static isStunned(statuses: CombatStatusInstance[]): boolean {
    return this.blockingKind(statuses) !== null;
  }

  static chargeExplosive(statuses: CombatStatusInstance[]): string[] {
    const charged: string[] = [];
    for (const status of statuses) {
      if (status.kind !== 'explosive') continue;
      const maxStacks = typeof status.params?.maxAcumulaciones === 'number' ? status.params.maxAcumulaciones : 5;
      status.stacks = Math.min(maxStacks, (status.stacks ?? 0) + 1);
      charged.push(status.id);
    }
    return charged;
  }

  static consumeExplosiveDetonation(statuses: CombatStatusInstance[]): { damage: number; stacks: number } | null {
    const index = statuses.findIndex((status) => status.kind === 'explosive' && status.remainingTurns <= 1);
    if (index < 0) return null;
    const status = statuses[index];
    const stacks = status.stacks ?? 0;
    const bonus = typeof status.params?.bonificacionPorImpacto === 'number' ? status.params.bonificacionPorImpacto : 0;
    const damage = Math.max(1, Math.round(status.power * (1 + stacks * bonus) * this.damageMultiplier(status)));
    statuses.splice(index, 1);
    return { damage, stacks };
  }

  static setAffinityMultiplier(statuses: CombatStatusInstance[], ids: string[], multiplier: number): void {
    if (!Number.isFinite(multiplier) || Math.abs(multiplier - 1) < 0.001) return;
    const targets = new Set(ids);
    for (const status of statuses) {
      if (!targets.has(status.id)) continue;
      if (status.kind !== 'poison' && status.kind !== 'burn' && status.kind !== 'explosive') continue;
      status.params = { ...(status.params ?? {}), afinidadMultiplicador: multiplier };
    }
  }

  static setStabMultiplier(statuses: CombatStatusInstance[], ids: string[], multiplier: number): void {
    if (!Number.isFinite(multiplier) || Math.abs(multiplier - 1) < 0.001) return;
    const targets = new Set(ids);
    for (const status of statuses) {
      if (!targets.has(status.id)) continue;
      if (status.kind !== 'poison' && status.kind !== 'burn' && status.kind !== 'explosive') continue;
      status.params = { ...(status.params ?? {}), stabMultiplicador: multiplier };
    }
  }

  static absorbDamage(statuses: CombatStatusInstance[], incomingDamage: number): ShieldResult {
    let damage = Math.max(0, Math.round(incomingDamage));
    let absorbed = 0;
    const brokenStatuses: CombatStatusInstance[] = [];
    for (const status of [...statuses]) {
      if (status.kind !== 'shield' || damage <= 0) continue;
      const block = Math.min(damage, Math.max(0, Math.round(status.power)));
      status.power -= block;
      damage -= block;
      absorbed += block;
      if (status.power <= 0) brokenStatuses.push({ ...status, params: status.params ? { ...status.params } : undefined });
    }
    this.removeEmptyShields(statuses);
    return { damage, absorbed, brokenStatuses };
  }

  static advanceTurn(statuses: CombatStatusInstance[], protectedIds: string[] = []): CombatStatusInstance[] {
    const protectedSet = new Set(protectedIds);
    for (const status of statuses) {
      if (protectedSet.has(status.id)) continue;
      status.remainingTurns -= 1;
    }
    const removed: CombatStatusInstance[] = [];
    for (let i = statuses.length - 1; i >= 0; i -= 1) {
      const expired = statuses[i].remainingTurns <= 0 && statuses[i].kind !== 'explosive';
      if (expired || (statuses[i].kind === 'shield' && statuses[i].power <= 0)) {
        removed.push({ ...statuses[i], params: statuses[i].params ? { ...statuses[i].params } : undefined });
        statuses.splice(i, 1);
      }
    }
    return removed;
  }

  static format(statuses: CombatStatusInstance[]): string {
    if (statuses.length === 0) return '';
    return statuses.slice(0, 4).map((status) => {
      if (status.kind === 'shield') return `${status.short} ${Math.max(0, Math.round(status.power))}`;
      return `${status.short}${status.remainingTurns}`;
    }).join(' · ');
  }

  static linkModifier(statuses: CombatStatusInstance[]): number {
    let modifier = 1;
    for (const status of statuses) {
      if (status.beneficial) continue;
      if (status.kind === 'poison' || status.kind === 'burn' || status.kind === 'stun' || status.kind === 'root' || status.kind === 'airborne') modifier += 0.09;
      else if (status.kind === 'blind') modifier += 0.06;
      else modifier += 0.04;
    }
    return Math.min(1.25, modifier);
  }

  private static fromEffect(skill: SkillDefinition, effect: SkillEffectDefinition, rank: number, effectPowerMultiplier = 1, sourceInstanceId?: string): CombatStatusInstance | null {
    const power = this.effectPower(effect, rank) * effectPowerMultiplier;
    const statusId = effect.statusId ?? `${skill.id}-${effect.type}-${effect.stat ?? 'generic'}`;
    const kind = effect.type === 'custom' ? this.customKind(effect.handlerId) : (effect.statusKind ?? this.inferKind(effect));
    if (!kind) return null;
    const durationTurns = Math.max(1, Math.round(effect.durationTurns ?? 1));
    const target = effect.target ?? (effect.type === 'buff' ? 'self' : 'enemy');
    const beneficial = kind === 'recharge' ? false : ['self', 'ally', 'any-ally', 'all-allies'].includes(target);

    if (kind === 'stat' && !effect.stat) return null;

    return {
      id: statusId,
      name: this.statusName(statusId, kind, skill.name, effect.stat, beneficial),
      short: this.statusShort(statusId, kind, effect.stat, beneficial),
      kind,
      remainingTurns: durationTurns,
      power,
      stat: effect.stat,
      modifierMode: effect.modifierMode ?? 'flat',
      beneficial,
      sourceSkillId: skill.id,
      sourceInstanceId,
      params: effect.params,
      stacks: kind === 'explosive' ? 0 : undefined,
      ticks: kind === 'poison' ? 0 : undefined
    };
  }

  private static customKind(handlerId?: string): CombatStatusKind | null {
    if (handlerId === 'aumento-evasion') return 'evasion';
    if (handlerId === 'precision-habilidad') return 'accuracy';
    if (handlerId === 'recarga') return 'recharge';
    if (handlerId === 'transformacion-control') return 'polymorph';
    if (handlerId === 'destierro-temporal') return 'banish';
    if (handlerId === 'marca-explosiva') return 'explosive';
    return null;
  }

  private static inferKind(effect: SkillEffectDefinition): CombatStatusKind {
    if (effect.type === 'buff' || effect.type === 'debuff') return 'stat';
    const id = effect.statusId ?? '';
    if (id.includes('poison')) return 'poison';
    if (id.includes('burn')) return 'burn';
    if (id.includes('blind')) return 'blind';
    if (id.includes('stun')) return 'stun';
    if (id.includes('root')) return 'root';
    if (id.includes('airborne')) return 'airborne';
    if (id.includes('shield')) return 'shield';
    return 'stat';
  }

  private static statusName(
    id: string,
    kind: CombatStatusKind,
    skillName: string,
    stat: keyof StatBlock | undefined,
    beneficial: boolean
  ): string {
    if (kind === 'poison') return 'Veneno';
    if (kind === 'burn') return 'Quemadura';
    if (kind === 'blind') return 'Ceguera';
    if (kind === 'stun') return 'Aturdimiento';
    if (kind === 'root') return 'Inmovilización';
    if (kind === 'airborne') return 'Por los aires';
    if (kind === 'shield') return 'Escudo';
    if (kind === 'evasion') return 'Evasión';
    if (kind === 'accuracy') return 'Precisión';
    if (kind === 'recharge') return 'Recarga';
    if (kind === 'polymorph') return 'Transformación';
    if (kind === 'banish') return 'Destierro';
    if (kind === 'explosive') return 'Carga explosiva';
    if (kind === 'charm') return 'Enamorado';
    if (kind === 'taunt') return 'Provocación';
    if (kind === 'block') return 'Refugio';
    if (kind === 'trap') return 'Trampa';
    if (kind === 'sleep') return 'Dormido';
    if (id === 'slow') return 'Ralentización';
    if (stat) return `${beneficial ? 'Mejora' : 'Reducción'} de ${STAT_SHORT[stat]}`;
    return skillName;
  }

  private static statusShort(id: string, kind: CombatStatusKind, stat: keyof StatBlock | undefined, beneficial: boolean): string {
    if (kind === 'poison') return 'VEN';
    if (kind === 'burn') return 'QUE';
    if (kind === 'blind') return 'CEG';
    if (kind === 'stun') return 'ATD';
    if (kind === 'root') return 'INM';
    if (kind === 'airborne') return 'AIRE';
    if (kind === 'shield') return 'ESC';
    if (kind === 'evasion') return 'EVA';
    if (kind === 'accuracy') return 'PRE';
    if (kind === 'recharge') return 'REC';
    if (kind === 'polymorph') return 'TRA';
    if (kind === 'banish') return 'DES';
    if (kind === 'explosive') return 'BOM';
    if (kind === 'charm') return 'AMO';
    if (kind === 'taunt') return 'PRO';
    if (kind === 'block') return 'BLQ';
    if (kind === 'trap') return 'TRA';
    if (kind === 'sleep') return 'SUE';
    if (id === 'slow') return 'RAL';
    if (stat) return `${STAT_SHORT[stat]}${beneficial ? '↑' : '↓'}`;
    return 'EST';
  }

  private static applyOrRefresh(statuses: CombatStatusInstance[], incoming: CombatStatusInstance): void {
    const existing = statuses.find((status) => status.id === incoming.id);
    if (!existing) {
      statuses.push(incoming);
      return;
    }
    existing.remainingTurns = Math.max(existing.remainingTurns, incoming.remainingTurns);
    existing.power = incoming.power;
    existing.stat = incoming.stat;
    existing.modifierMode = incoming.modifierMode;
    existing.beneficial = incoming.beneficial;
    existing.kind = incoming.kind;
    existing.name = incoming.name;
    existing.short = incoming.short;
    existing.params = incoming.params;
    existing.stacks = incoming.stacks;
    if (incoming.kind !== 'poison') existing.ticks = incoming.ticks;
    else existing.ticks = existing.ticks ?? 0;
  }

  private static effectPower(effect: SkillEffectDefinition, rank: number): number {
    if (effect.powerByRank?.length) {
      const index = Math.max(0, Math.min(effect.powerByRank.length - 1, rank - 1));
      return effect.powerByRank[index] ?? effect.power ?? 0;
    }
    return effect.power ?? 0;
  }

  private static affinityMultiplier(status: CombatStatusInstance): number {
    const value = status.params?.afinidadMultiplicador;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0.25, Math.min(4, value)) : 1;
  }

  private static stabMultiplier(status: CombatStatusInstance): number {
    const value = status.params?.stabMultiplicador;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(2, value)) : 1;
  }

  private static damageMultiplier(status: CombatStatusInstance): number {
    return this.affinityMultiplier(status) * this.stabMultiplier(status);
  }

  private static removeEmptyShields(statuses: CombatStatusInstance[]): void {
    for (let i = statuses.length - 1; i >= 0; i -= 1) {
      if (statuses[i].kind === 'shield' && statuses[i].power <= 0) statuses.splice(i, 1);
    }
  }
}
