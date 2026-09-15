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
  params?: Record<string, string | number | boolean>;
  stacks?: number;
}

export interface StatusApplicationResult {
  selfAppliedIds: string[];
  enemyAppliedIds: string[];
  messages: string[];
}

export interface ShieldResult {
  damage: number;
  absorbed: number;
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
    allowEnemyEffects = true
  ): StatusApplicationResult {
    const result: StatusApplicationResult = { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };

    for (const effect of skill.effects) {
      const customStatus = effect.type === 'custom' && ['aumento-evasion', 'transformacion-control', 'destierro-temporal', 'marca-explosiva'].includes(effect.handlerId ?? '');
      if (!['buff', 'debuff', 'status'].includes(effect.type) && !customStatus) continue;
      const target = effect.target ?? (effect.type === 'buff' ? 'self' : 'enemy');
      if (target === 'enemy' && !allowEnemyEffects) continue;
      if (Math.random() > (effect.chance ?? 1)) continue;

      const status = this.fromEffect(skill, effect, rank);
      if (!status) continue;
      const list = target === 'self' ? selfStatuses : enemyStatuses;
      this.applyOrRefresh(list, status);

      if (target === 'self') result.selfAppliedIds.push(status.id);
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
      .reduce((sum, status) => sum + Math.max(0, Math.round(status.power)), 0);
  }

  static blindMissChance(statuses: CombatStatusInstance[]): number {
    return Math.max(0, ...statuses
      .filter((status) => status.kind === 'blind')
      .map((status) => Math.max(0, Math.min(0.95, status.power))));
  }

  static evasionMissChance(statuses: CombatStatusInstance[]): number {
    return Math.max(0, ...statuses.filter((status) => status.kind === 'evasion').map((status) => Math.max(0, Math.min(0.95, status.power))));
  }

  static blockingKind(statuses: CombatStatusInstance[]): 'stun' | 'polymorph' | 'banish' | null {
    if (statuses.some((status) => status.kind === 'banish')) return 'banish';
    if (statuses.some((status) => status.kind === 'polymorph')) return 'polymorph';
    if (statuses.some((status) => status.kind === 'stun')) return 'stun';
    return null;
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
    const damage = Math.max(1, Math.round(status.power * (1 + stacks * bonus)));
    statuses.splice(index, 1);
    return { damage, stacks };
  }

  static absorbDamage(statuses: CombatStatusInstance[], incomingDamage: number): ShieldResult {
    let damage = Math.max(0, Math.round(incomingDamage));
    let absorbed = 0;
    for (const status of [...statuses]) {
      if (status.kind !== 'shield' || damage <= 0) continue;
      const block = Math.min(damage, Math.max(0, Math.round(status.power)));
      status.power -= block;
      damage -= block;
      absorbed += block;
    }
    this.removeEmptyShields(statuses);
    return { damage, absorbed };
  }

  static advanceTurn(statuses: CombatStatusInstance[], protectedIds: string[] = []): void {
    const protectedSet = new Set(protectedIds);
    for (const status of statuses) {
      if (protectedSet.has(status.id)) continue;
      status.remainingTurns -= 1;
    }
    for (let i = statuses.length - 1; i >= 0; i -= 1) {
      const expired = statuses[i].remainingTurns <= 0 && statuses[i].kind !== 'explosive';
      if (expired || (statuses[i].kind === 'shield' && statuses[i].power <= 0)) {
        statuses.splice(i, 1);
      }
    }
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
      if (status.kind === 'poison' || status.kind === 'stun') modifier += 0.09;
      else if (status.kind === 'blind') modifier += 0.06;
      else modifier += 0.04;
    }
    return Math.min(1.25, modifier);
  }

  private static fromEffect(skill: SkillDefinition, effect: SkillEffectDefinition, rank: number): CombatStatusInstance | null {
    const power = this.effectPower(effect, rank);
    const statusId = effect.statusId ?? `${skill.id}-${effect.type}-${effect.stat ?? 'generic'}`;
    const kind = effect.type === 'custom' ? this.customKind(effect.handlerId) : (effect.statusKind ?? this.inferKind(effect));
    if (!kind) return null;
    const durationTurns = Math.max(1, Math.round(effect.durationTurns ?? 1));
    const beneficial = (effect.target ?? (effect.type === 'buff' ? 'self' : 'enemy')) === 'self';

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
      params: effect.params,
      stacks: kind === 'explosive' ? 0 : undefined
    };
  }

  private static customKind(handlerId?: string): CombatStatusKind | null {
    if (handlerId === 'aumento-evasion') return 'evasion';
    if (handlerId === 'transformacion-control') return 'polymorph';
    if (handlerId === 'destierro-temporal') return 'banish';
    if (handlerId === 'marca-explosiva') return 'explosive';
    return null;
  }

  private static inferKind(effect: SkillEffectDefinition): CombatStatusKind {
    if (effect.type === 'buff' || effect.type === 'debuff') return 'stat';
    const id = effect.statusId ?? '';
    if (id.includes('poison')) return 'poison';
    if (id.includes('blind')) return 'blind';
    if (id.includes('stun')) return 'stun';
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
    if (kind === 'blind') return 'Ceguera';
    if (kind === 'stun') return 'Aturdimiento';
    if (kind === 'shield') return 'Escudo';
    if (kind === 'evasion') return 'Evasión';
    if (kind === 'polymorph') return 'Transformación';
    if (kind === 'banish') return 'Destierro';
    if (kind === 'explosive') return 'Carga explosiva';
    if (id === 'slow') return 'Ralentización';
    if (stat) return `${beneficial ? 'Mejora' : 'Reducción'} de ${STAT_SHORT[stat]}`;
    return skillName;
  }

  private static statusShort(id: string, kind: CombatStatusKind, stat: keyof StatBlock | undefined, beneficial: boolean): string {
    if (kind === 'poison') return 'VEN';
    if (kind === 'blind') return 'CEG';
    if (kind === 'stun') return 'ATD';
    if (kind === 'shield') return 'ESC';
    if (kind === 'evasion') return 'EVA';
    if (kind === 'polymorph') return 'TRA';
    if (kind === 'banish') return 'DES';
    if (kind === 'explosive') return 'BOM';
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
  }

  private static effectPower(effect: SkillEffectDefinition, rank: number): number {
    if (effect.powerByRank?.length) {
      const index = Math.max(0, Math.min(effect.powerByRank.length - 1, rank - 1));
      return effect.powerByRank[index] ?? effect.power ?? 0;
    }
    return effect.power ?? 0;
  }

  private static removeEmptyShields(statuses: CombatStatusInstance[]): void {
    for (let i = statuses.length - 1; i >= 0; i -= 1) {
      if (statuses[i].kind === 'shield' && statuses[i].power <= 0) statuses.splice(i, 1);
    }
  }
}
