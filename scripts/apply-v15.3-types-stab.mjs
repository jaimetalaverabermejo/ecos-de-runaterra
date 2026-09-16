import fs from 'node:fs';

const ecoTypes = {
  teemo: ['primordial', 'marcial'],
  poppy: ['marcial', 'runico'],
  tristana: ['marcial'],
  lulu: ['espiritual'],
  gnar: ['primordial', 'marcial'],
  corki: ['tecnologico'],
  veigar: ['arcano', 'sombrio'],
  rumble: ['tecnologico', 'primordial'],
  kled: ['marcial'],
  kennen: ['primordial']
};

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function replaceOnce(path, before, after) {
  const text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`No se encontró patrón en ${path}: ${before.slice(0, 100)}`);
  const next = text.replace(before, after);
  fs.writeFileSync(path, next);
}

for (const [championId, tipos] of Object.entries(ecoTypes)) {
  const path = `src/contenido/campeones/${championId}/eco.json`;
  if (!fs.existsSync(path)) throw new Error(`Falta ${path}`);
  const eco = JSON.parse(fs.readFileSync(path, 'utf8'));
  eco.tipos = tipos;
  writeJson(path, eco);
}

const typeService = 'src/systems/combat/TypeEffectivenessService.ts';
replaceOnce(typeService,
`const MAX_MULTIPLIER = 1.5;\nconst MIN_MULTIPLIER = 0.67;`,
`const MAX_MULTIPLIER = 1.5;\nconst MIN_MULTIPLIER = 0.67;\nconst STAB_MULTIPLIER = 1.2;`
);
replaceOnce(typeService,
`  static multiplier(attackType: AffinityId | undefined, defenderTypes: AffinityId[]): TypeEffectivenessResult {`,
`  static attackerTypes(champion: ChampionInstance, formId?: string): AffinityId[] {\n    return this.defenderTypes(champion, formId);\n  }\n\n  static multiplier(attackType: AffinityId | undefined, defenderTypes: AffinityId[]): TypeEffectivenessResult {`
);
replaceOnce(typeService,
`      if (effect.type === 'damage') return true;\n      if (effect.statusKind === 'poison') return true;\n      return effect.type === 'custom' && effect.handlerId === 'marca-explosiva';`,
`      if (effect.type === 'damage') return true;\n      if (effect.statusKind === 'poison') return true;\n      return effect.type === 'custom' && ['marca-explosiva', 'daño-adicional-habilidad-ofensiva'].includes(effect.handlerId ?? '');`
);
replaceOnce(typeService,
`  static typeNames(ids: AffinityId[], short = false): string {`,
`  static hasStab(skill: SkillDefinition | null, attacker: ChampionInstance, attackerFormId?: string): boolean {\n    if (!skill?.affinityId || !this.skillUsesAffinity(skill)) return false;\n    return this.attackerTypes(attacker, attackerFormId).includes(skill.affinityId);\n  }\n\n  static stabMultiplier(skill: SkillDefinition | null, attacker: ChampionInstance, attackerFormId?: string): number {\n    return this.hasStab(skill, attacker, attackerFormId) ? STAB_MULTIPLIER : 1;\n  }\n\n  static stabLabel(): string {\n    return 'STAB ×1,20';\n  }\n\n  static typeNames(ids: AffinityId[], short = false): string {`
);

const battleEngine = 'src/systems/combat/BattleEngine.ts';
replaceOnce(battleEngine,
`  affinityMultiplier?: number;\n}`,
`  affinityMultiplier?: number;\n  stabMultiplier?: number;\n}`
);
replaceOnce(battleEngine,
`        raw *= effect.ignoreAffinity ? 1 : (context.affinityMultiplier ?? 1);`,
`        raw *= effect.ignoreAffinity ? 1 : (context.affinityMultiplier ?? 1) * (context.stabMultiplier ?? 1);`
);

const statusEngine = 'src/systems/combat/StatusEngine.ts';
replaceOnce(statusEngine,
`      .reduce((sum, status) => sum + Math.max(0, Math.round(status.power * this.affinityMultiplier(status))), 0);`,
`      .reduce((sum, status) => sum + Math.max(0, Math.round(status.power * this.damageMultiplier(status))), 0);`
);
replaceOnce(statusEngine,
`    const damage = Math.max(1, Math.round(status.power * (1 + stacks * bonus) * this.affinityMultiplier(status)));`,
`    const damage = Math.max(1, Math.round(status.power * (1 + stacks * bonus) * this.damageMultiplier(status)));`
);
replaceOnce(statusEngine,
`  static absorbDamage(statuses: CombatStatusInstance[], incomingDamage: number): ShieldResult {`,
`  static setStabMultiplier(statuses: CombatStatusInstance[], ids: string[], multiplier: number): void {\n    if (!Number.isFinite(multiplier) || Math.abs(multiplier - 1) < 0.001) return;\n    const targets = new Set(ids);\n    for (const status of statuses) {\n      if (!targets.has(status.id)) continue;\n      if (status.kind !== 'poison' && status.kind !== 'explosive') continue;\n      status.params = { ...(status.params ?? {}), stabMultiplicador: multiplier };\n    }\n  }\n\n  static absorbDamage(statuses: CombatStatusInstance[], incomingDamage: number): ShieldResult {`
);
replaceOnce(statusEngine,
`  private static affinityMultiplier(status: CombatStatusInstance): number {\n    const value = status.params?.afinidadMultiplicador;\n    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0.25, Math.min(4, value)) : 1;\n  }`,
`  private static affinityMultiplier(status: CombatStatusInstance): number {\n    const value = status.params?.afinidadMultiplicador;\n    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0.25, Math.min(4, value)) : 1;\n  }\n\n  private static stabMultiplier(status: CombatStatusInstance): number {\n    const value = status.params?.stabMultiplicador;\n    return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(2, value)) : 1;\n  }\n\n  private static damageMultiplier(status: CombatStatusInstance): number {\n    return this.affinityMultiplier(status) * this.stabMultiplier(status);\n  }`
);

const battleScene = 'src/scenes/BattleScene.ts';
replaceOnce(battleScene,
`      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));\n      const glyph = TypeEffectivenessService.actionGlyph(effectiveness);\n      const label = \`${'${labels[i]}'} · ${'${rank}'}/${'${ProgressionService.maxRank(slot)}'}\\n${'${this.shortSkillName(skill.name)}'}${'${glyph ? ` ${glyph}` : \'\'}'}\`;`,
`      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));\n      const stab = TypeEffectivenessService.stabMultiplier(skill, this.playerChampion, this.currentFormId(this.playerChampion));\n      const glyph = TypeEffectivenessService.actionGlyph(effectiveness);\n      const stabMark = stab > 1.001 ? ' ★' : '';\n      const label = \`${'${labels[i]}'} · ${'${rank}'}/${'${ProgressionService.maxRank(slot)}'}\\n${'${this.shortSkillName(skill.name)}'}${'${stabMark}'}${'${glyph ? ` ${glyph}` : \'\'}'}\`;`
);
replaceOnce(battleScene,
`    let effectiveness = TypeEffectivenessService.multiplier(undefined, []);`,
`    let effectiveness = TypeEffectivenessService.multiplier(undefined, []);\n    let stabMultiplier = 1;`
);
replaceOnce(battleScene,
`      effectiveness = TypeEffectivenessService.forSkill(skill, defender, this.currentFormId(defender));\n      resolution = BattleEngine.resolveSkill(skill, rank, attackerStats, defenderStats, {\n        defenderCurrentHp: defenderHp,\n        defenderMaxHp,\n        affinityMultiplier: effectiveness.multiplier\n      });`,
`      effectiveness = TypeEffectivenessService.forSkill(skill, defender, this.currentFormId(defender));\n      stabMultiplier = TypeEffectivenessService.stabMultiplier(skill, attacker, this.currentFormId(attacker));\n      resolution = BattleEngine.resolveSkill(skill, rank, attackerStats, defenderStats, {\n        defenderCurrentHp: defenderHp,\n        defenderMaxHp,\n        affinityMultiplier: effectiveness.multiplier,\n        stabMultiplier\n      });`
);
replaceOnce(battleScene,
`    if (resolution.damage > 0) resolution.damage += SpecialEffectEngine.bonusDamageFromPassive(attacker, this.ensureFormStore());`,
`    if (resolution.damage > 0) {\n      const passiveBonus = SpecialEffectEngine.bonusDamageFromPassive(attacker, this.ensureFormStore());\n      if (passiveBonus > 0) {\n        const passive = SpecialEffectEngine.passive(attacker, this.ensureFormStore());\n        const passiveEffectiveness = TypeEffectivenessService.forSkill(passive, defender, this.currentFormId(defender));\n        const passiveStab = TypeEffectivenessService.stabMultiplier(passive, attacker, this.currentFormId(attacker));\n        resolution.damage += Math.max(0, Math.round(passiveBonus * passiveEffectiveness.multiplier * passiveStab));\n      }\n    }`
);
replaceOnce(battleScene,
`    if (skill) StatusEngine.setAffinityMultiplier(defenderStatuses, application.enemyAppliedIds, effectiveness.multiplier);`,
`    if (skill) {\n      StatusEngine.setAffinityMultiplier(defenderStatuses, application.enemyAppliedIds, effectiveness.multiplier);\n      StatusEngine.setStabMultiplier(defenderStatuses, application.enemyAppliedIds, stabMultiplier);\n    }`
);
replaceOnce(battleScene,
`    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());`,
`    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());\n    if (TypeEffectivenessService.stabMultiplier(skill, this.playerChampion, this.currentFormId(this.playerChampion)) > 1.001) {\n      tags.add(TypeEffectivenessService.stabLabel());\n    }`
);

const detailScene = 'src/scenes/ChampionDetailScene.ts';
replaceOnce(detailScene,
`    objects.push(UiKit.label(this, 72, 170, \`RESISTE   ${'${resist.length ? TypeEffectivenessService.typeNames(resist) : \'—\'}'}\`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(360, true));\n    const close = UiKit.button(this, 256, 215, 92, 24, 'CERRAR', () => { this.overlayLayer?.destroy(true); this.overlayLayer = undefined; }, { accent: 'blue', fontSize: UI.font.tiny });`,
`    objects.push(UiKit.label(this, 72, 170, \`RESISTE   ${'${resist.length ? TypeEffectivenessService.typeNames(resist) : \'—\'}'}\`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(360, true));\n    objects.push(UiKit.label(this, 72, 194, \`${'${TypeEffectivenessService.stabLabel()}'} con movimientos ofensivos de tus tipos\`, UI.font.tiny, UI.text.gold, true).setWordWrapWidth(360, true));\n    const close = UiKit.button(this, 256, 220, 92, 24, 'CERRAR', () => { this.overlayLayer?.destroy(true); this.overlayLayer = undefined; }, { accent: 'blue', fontSize: UI.font.tiny });`
);

const boot = 'src/scenes/BootScene.ts';
replaceOnce(boot, `this.registry.set('app.version', '15.2.1 TEST');`, `this.registry.set('app.version', '15.3 TEST');`);

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.version = '0.15.3-test.0';
writeJson('package.json', packageJson);

console.log('v15.3: tipos de Eco + STAB x1.20 aplicados.');
