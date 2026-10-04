import fs from 'node:fs';

function replaceOnce(path, from, to) {
  const text = fs.readFileSync(path, 'utf8');
  if (text.includes(to)) return;
  if (!text.includes(from)) throw new Error(`Patrón no encontrado en ${path}: ${from.slice(0, 80)}`);
  fs.writeFileSync(path, text.replace(from, to));
}

replaceOnce(
  'src/data/types.ts',
  "export type CombatStatusKind = 'poison' | 'blind' | 'stun' | 'shield' | 'stat';",
  "export type CombatStatusKind = 'poison' | 'blind' | 'stun' | 'shield' | 'stat' | 'evasion' | 'polymorph' | 'banish' | 'explosive';"
);

replaceOnce(
  'src/systems/combat/BattleEngine.ts',
  "  static statsFor(champion: ChampionInstance): StatBlock {\n    const definition = DataRegistry.champion(champion.championId);\n    const masterySteps = Math.max(0, champion.mastery - 1);\n    const stats: StatBlock = {\n      hp: Math.round(definition.baseStats.hp + definition.growthStats.hp * masterySteps),\n      attack: Math.round(definition.baseStats.attack + definition.growthStats.attack * masterySteps),\n      power: Math.round(definition.baseStats.power + definition.growthStats.power * masterySteps),\n      defense: Math.round(definition.baseStats.defense + definition.growthStats.defense * masterySteps),\n      resistance: Math.round(definition.baseStats.resistance + definition.growthStats.resistance * masterySteps),\n      speed: Math.round(definition.baseStats.speed + definition.growthStats.speed * masterySteps)\n    };",
  "  static statsFor(champion: ChampionInstance, formId?: string): StatBlock {\n    const definition = DataRegistry.champion(champion.championId);\n    const baseStats: StatBlock = { ...definition.baseStats };\n    const growthStats: StatBlock = { ...definition.growthStats };\n    if (formId) {\n      const form = DataRegistry.form(champion.championId, formId);\n      Object.assign(baseStats, form.baseStatsOverride ?? {});\n      Object.assign(growthStats, form.growthStatsOverride ?? {});\n    }\n    const masterySteps = Math.max(0, champion.mastery - 1);\n    const stats: StatBlock = {\n      hp: Math.round(baseStats.hp + growthStats.hp * masterySteps),\n      attack: Math.round(baseStats.attack + growthStats.attack * masterySteps),\n      power: Math.round(baseStats.power + growthStats.power * masterySteps),\n      defense: Math.round(baseStats.defense + growthStats.defense * masterySteps),\n      resistance: Math.round(baseStats.resistance + growthStats.resistance * masterySteps),\n      speed: Math.round(baseStats.speed + growthStats.speed * masterySteps)\n    };"
);

replaceOnce(
  'src/systems/combat/BattleEngine.ts',
  "  static unlockedSkills(champion: ChampionInstance): SkillDefinition[] {\n    const definition = DataRegistry.champion(champion.championId);\n    return definition.skillIds\n      .map((skillId) => DataRegistry.skill(skillId))",
  "  static unlockedSkills(champion: ChampionInstance, formId?: string): SkillDefinition[] {\n    const definition = DataRegistry.champion(champion.championId);\n    const skillIds = formId ? (DataRegistry.form(champion.championId, formId).skillIds ?? definition.skillIds) : definition.skillIds;\n    return skillIds\n      .map((skillId) => DataRegistry.skill(skillId))"
);

replaceOnce(
  'src/systems/combat/BattleEngine.ts',
  "  static passive(champion: ChampionInstance): SkillDefinition | null {\n    const definition = DataRegistry.champion(champion.championId);\n    const passive = DataRegistry.skill(definition.passiveSkillId);",
  "  static passive(champion: ChampionInstance, formId?: string): SkillDefinition | null {\n    const definition = DataRegistry.champion(champion.championId);\n    const passiveId = formId ? (DataRegistry.form(champion.championId, formId).passiveSkillId ?? definition.passiveSkillId) : definition.passiveSkillId;\n    const passive = DataRegistry.skill(passiveId);"
);

replaceOnce(
  'src/systems/combat/BattleEngine.ts',
  "  static passiveHealing(champion: ChampionInstance): number {\n    const passive = this.passive(champion);",
  "  static passiveHealing(champion: ChampionInstance, formId?: string): number {\n    const passive = this.passive(champion, formId);"
);

replaceOnce(
  'src/systems/combat/BattleEngine.ts',
  "  static chooseEnemyAction(champion: ChampionInstance): CombatAction {\n    const skills = this.unlockedSkills(champion);",
  "  static chooseEnemyAction(champion: ChampionInstance, formId?: string): CombatAction {\n    const skills = this.unlockedSkills(champion, formId);"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "  sourceSkillId: string;\n}",
  "  sourceSkillId: string;\n  params?: Record<string, string | number | boolean>;\n  stacks?: number;\n}"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "    for (const effect of skill.effects) {\n      if (!['buff', 'debuff', 'status'].includes(effect.type)) continue;",
  "    for (const effect of skill.effects) {\n      const customStatus = effect.type === 'custom' && ['aumento-evasion', 'transformacion-control', 'destierro-temporal', 'marca-explosiva'].includes(effect.handlerId ?? '');\n      if (!['buff', 'debuff', 'status'].includes(effect.type) && !customStatus) continue;"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "  static isStunned(statuses: CombatStatusInstance[]): boolean {\n    return statuses.some((status) => status.kind === 'stun');\n  }",
  "  static evasionMissChance(statuses: CombatStatusInstance[]): number {\n    return Math.max(0, ...statuses.filter((status) => status.kind === 'evasion').map((status) => Math.max(0, Math.min(0.95, status.power))));\n  }\n\n  static blockingKind(statuses: CombatStatusInstance[]): 'stun' | 'polymorph' | 'banish' | null {\n    if (statuses.some((status) => status.kind === 'banish')) return 'banish';\n    if (statuses.some((status) => status.kind === 'polymorph')) return 'polymorph';\n    if (statuses.some((status) => status.kind === 'stun')) return 'stun';\n    return null;\n  }\n\n  static isStunned(statuses: CombatStatusInstance[]): boolean {\n    return this.blockingKind(statuses) !== null;\n  }\n\n  static chargeExplosive(statuses: CombatStatusInstance[]): string[] {\n    const charged: string[] = [];\n    for (const status of statuses) {\n      if (status.kind !== 'explosive') continue;\n      const maxStacks = typeof status.params?.maxAcumulaciones === 'number' ? status.params.maxAcumulaciones : 5;\n      status.stacks = Math.min(maxStacks, (status.stacks ?? 0) + 1);\n      charged.push(status.id);\n    }\n    return charged;\n  }\n\n  static consumeExplosiveDetonation(statuses: CombatStatusInstance[]): { damage: number; stacks: number } | null {\n    const index = statuses.findIndex((status) => status.kind === 'explosive' && status.remainingTurns <= 1);\n    if (index < 0) return null;\n    const status = statuses[index];\n    const stacks = status.stacks ?? 0;\n    const bonus = typeof status.params?.bonificacionPorImpacto === 'number' ? status.params.bonificacionPorImpacto : 0;\n    const damage = Math.max(1, Math.round(status.power * (1 + stacks * bonus)));\n    statuses.splice(index, 1);\n    return { damage, stacks };\n  }"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "    const kind = effect.statusKind ?? this.inferKind(effect);",
  "    const kind = effect.type === 'custom' ? this.customKind(effect.handlerId) : (effect.statusKind ?? this.inferKind(effect));\n    if (!kind) return null;"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "      beneficial,\n      sourceSkillId: skill.id\n    };",
  "      beneficial,\n      sourceSkillId: skill.id,\n      params: effect.params,\n      stacks: kind === 'explosive' ? 0 : undefined\n    };"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "  private static inferKind(effect: SkillEffectDefinition): CombatStatusKind {",
  "  private static customKind(handlerId?: string): CombatStatusKind | null {\n    if (handlerId === 'aumento-evasion') return 'evasion';\n    if (handlerId === 'transformacion-control') return 'polymorph';\n    if (handlerId === 'destierro-temporal') return 'banish';\n    if (handlerId === 'marca-explosiva') return 'explosive';\n    return null;\n  }\n\n  private static inferKind(effect: SkillEffectDefinition): CombatStatusKind {"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "    if (kind === 'shield') return 'Escudo';\n    if (id === 'slow') return 'Ralentización';",
  "    if (kind === 'shield') return 'Escudo';\n    if (kind === 'evasion') return 'Evasión';\n    if (kind === 'polymorph') return 'Transformación';\n    if (kind === 'banish') return 'Destierro';\n    if (kind === 'explosive') return 'Carga explosiva';\n    if (id === 'slow') return 'Ralentización';"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "    if (kind === 'shield') return 'ESC';\n    if (id === 'slow') return 'RAL';",
  "    if (kind === 'shield') return 'ESC';\n    if (kind === 'evasion') return 'EVA';\n    if (kind === 'polymorph') return 'TRA';\n    if (kind === 'banish') return 'DES';\n    if (kind === 'explosive') return 'BOM';\n    if (id === 'slow') return 'RAL';"
);

replaceOnce(
  'src/systems/combat/StatusEngine.ts',
  "    existing.name = incoming.name;\n    existing.short = incoming.short;",
  "    existing.name = incoming.name;\n    existing.short = incoming.short;\n    existing.params = incoming.params;\n    existing.stacks = incoming.stacks;"
);

console.log('v15 runtime core patch applied');
