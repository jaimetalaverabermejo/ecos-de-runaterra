import fs from 'node:fs';

function patchFile(path, patches) {
  let text = fs.readFileSync(path, 'utf8');
  for (const [from, to, label] of patches) {
    if (text.includes(to)) continue;
    if (!text.includes(from)) throw new Error(`No se encontró ${label} en ${path}`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(path, text);
}

patchFile('src/data/types.ts', [
  [
    "export type EchoRole = 'luchador' | 'tanque' | 'mago' | 'asesino' | 'tirador' | 'apoyo' | 'especialista';\nexport type ContentStatus",
    "export type EchoRole = 'luchador' | 'tanque' | 'mago' | 'asesino' | 'tirador' | 'apoyo' | 'especialista';\nexport type AffinityId = 'marcial' | 'arcano' | 'espiritual' | 'tecnologico' | 'primordial' | 'sombrio' | 'celestial' | 'vacio' | 'runico';\nexport interface AffinityDefinition {\n  id: AffinityId;\n  name: string;\n  short: string;\n  strongAgainst: AffinityId[];\n  weakAgainst: AffinityId[];\n}\nexport type ContentStatus",
    'tipos de afinidad'
  ],
  [
    "  params?: Record<string, string | number | boolean>;\n}",
    "  params?: Record<string, string | number | boolean>;\n  ignoreAffinity?: boolean;\n}",
    'ignorar afinidad por efecto'
  ],
  [
    "  priority?: number;\n  effects: SkillEffectDefinition[];",
    "  priority?: number;\n  affinityId?: AffinityId;\n  effects: SkillEffectDefinition[];",
    'tipo ofensivo de habilidad'
  ],
  [
    "  formIds?: string[];\n}",
    "  formIds?: string[];\n  affinityIds?: AffinityId[];\n}",
    'tipos defensivos del eco'
  ]
]);

patchFile('src/contenido/CatalogoContenido.ts', [
  [
    "  CharacterDefinition,\n  ChampionDefinition,",
    "  AffinityId,\n  CharacterDefinition,\n  ChampionDefinition,",
    'import AffinityId'
  ],
  [
    "  formas?: string[];\n}",
    "  formas?: string[];\n  tipos?: AffinityId[];\n}",
    'tipos en eco.json'
  ],
  [
    "  habilidadesIds?: [string, string, string, string];\n  visual?: VisualConfigJson;",
    "  habilidadesIds?: [string, string, string, string];\n  tipos?: AffinityId[];\n  visual?: VisualConfigJson;",
    'tipos de forma'
  ],
  [
    "  parametros?: Record<string, string | number | boolean>;\n}",
    "  parametros?: Record<string, string | number | boolean>;\n  ignoraAfinidad?: boolean;\n}",
    'ignora afinidad en efecto json'
  ],
  [
    "  prioridad?: number;\n  efectos: EfectoJson[];",
    "  prioridad?: number;\n  tipo?: AffinityId;\n  efectos: EfectoJson[];",
    'tipo de habilidad json'
  ],
  [
    "  skillIds?: [string, string, string, string];\n}",
    "  skillIds?: [string, string, string, string];\n  affinityIdsOverride?: AffinityId[];\n}",
    'override de tipos de forma'
  ],
  [
    "    params: effect.parametros\n  };",
    "    params: effect.parametros,\n    ignoreAffinity: effect.ignoraAfinidad\n  };",
    'mapeo ignoraAfinidad'
  ],
  [
    "        contentStatus: eco.estadoContenido ?? 'planeado',\n        formIds",
    "        contentStatus: eco.estadoContenido ?? 'planeado',\n        formIds,\n        affinityIds: [...(eco.tipos ?? [])]",
    'mapeo tipos Eco'
  ],
  [
    "      priority: skill.prioridad,\n      effects: skill.efectos.map(skillEffect)",
    "      priority: skill.prioridad,\n      affinityId: skill.tipo,\n      effects: skill.efectos.map(skillEffect)",
    'mapeo tipo habilidad'
  ],
  [
    "      passiveSkillId: data.pasivaId,\n      skillIds: data.habilidadesIds",
    "      passiveSkillId: data.pasivaId,\n      skillIds: data.habilidadesIds,\n      affinityIdsOverride: data.tipos ? [...data.tipos] : undefined",
    'mapeo tipos forma'
  ]
]);

patchFile('src/data/DataRegistry.ts', [
  [
    "import statDefinitionsJson from './stats/definitions.json';",
    "import statDefinitionsJson from './stats/definitions.json';\nimport affinityCatalogJson from '../contenido/catalogos/tipos-v1.json';",
    'import catálogo de tipos'
  ],
  [
    "  ChampionDefinition,\n  CharacterDefinition,",
    "  AffinityDefinition,\n  AffinityId,\n  ChampionDefinition,\n  CharacterDefinition,",
    'imports tipos DataRegistry'
  ],
  [
    "const statDefinitions = statDefinitionsJson as unknown as StatDefinition[];",
    "const statDefinitions = statDefinitionsJson as unknown as StatDefinition[];\nconst affinities = (affinityCatalogJson as unknown as Array<{ id: AffinityId; nombre: string; corto: string; fuerteContra: AffinityId[]; debilContra: AffinityId[] }>).map((entry): AffinityDefinition => ({\n  id: entry.id,\n  name: entry.nombre,\n  short: entry.corto,\n  strongAgainst: [...entry.fuerteContra],\n  weakAgainst: [...entry.debilContra]\n}));",
    'carga catálogo de tipos'
  ],
  [
    "  private static statIndex = indexById(statDefinitions);",
    "  private static statIndex = indexById(statDefinitions);\n  private static affinityIndex = indexById(affinities);",
    'índice de tipos'
  ],
  [
    "  static stats(): StatDefinition[] { return [...statDefinitions].sort((a,b)=>a.order-b.order); }",
    "  static stats(): StatDefinition[] { return [...statDefinitions].sort((a,b)=>a.order-b.order); }\n  static affinity(id: AffinityId): AffinityDefinition { const v=this.affinityIndex.get(id); if(!v) throw new Error(`Unknown affinity: ${id}`); return v; }\n  static affinities(): AffinityDefinition[] { return [...affinities]; }",
    'lectura de tipos'
  ],
  [
    "      ...duplicateIdErrors('Mapas', maps)\n    ];",
    "      ...duplicateIdErrors('Mapas', maps),\n      ...duplicateIdErrors('Tipos', affinities)\n    ];\n\n    const affinityIds = new Set(affinities.map((entry) => entry.id));",
    'validación base tipos'
  ],
  [
    "      const expectedSkills = [echo.passiveSkillId, ...echo.skillIds];",
    "      if ((echo.affinityIds ?? []).length > 2) errors.push(`Eco \"${echo.id}\": no puede tener más de dos tipos.`);\n      for (const affinityId of echo.affinityIds ?? []) {\n        if (!affinityIds.has(affinityId)) errors.push(`Eco \"${echo.id}\": tipo desconocido \"${affinityId}\".`);\n      }\n      const expectedSkills = [echo.passiveSkillId, ...echo.skillIds];",
    'validación tipos Eco'
  ],
  [
    "    for (const form of forms) {\n      if (!this.characterIndex.has(form.championId))",
    "    for (const skill of skills) {\n      if (skill.affinityId && !affinityIds.has(skill.affinityId)) errors.push(`Habilidad \"${skill.id}\": tipo desconocido \"${skill.affinityId}\".`);\n    }\n\n    for (const form of forms) {\n      if ((form.affinityIdsOverride ?? []).length > 2) errors.push(`Forma \"${form.championId}/${form.id}\": no puede tener más de dos tipos.`);\n      for (const affinityId of form.affinityIdsOverride ?? []) {\n        if (!affinityIds.has(affinityId)) errors.push(`Forma \"${form.championId}/${form.id}\": tipo desconocido \"${affinityId}\".`);\n      }\n      if (!this.characterIndex.has(form.championId))",
    'validación tipos habilidad y forma'
  ]
]);

patchFile('src/systems/combat/BattleEngine.ts', [
  [
    "  defenderMaxHp?: number;\n}",
    "  defenderMaxHp?: number;\n  affinityMultiplier?: number;\n}",
    'multiplicador de afinidad en contexto'
  ],
  [
    "        let raw = effectPower + sourceValue * 0.65 - mitigation * 0.35;",
    "        let raw = effectPower + sourceValue * 0.65 - mitigation * 0.35;\n        raw *= effect.ignoreAffinity ? 1 : (context.affinityMultiplier ?? 1);",
    'aplicar afinidad al daño'
  ]
]);

patchFile('src/systems/combat/StatusEngine.ts', [
  [
    "      .filter((status) => status.kind === 'poison')\n      .reduce((sum, status) => sum + Math.max(0, Math.round(status.power)), 0);",
    "      .filter((status) => status.kind === 'poison')\n      .reduce((sum, status) => sum + Math.max(0, Math.round(status.power * this.affinityMultiplier(status))), 0);",
    'afinidad en veneno'
  ],
  [
    "    const damage = Math.max(1, Math.round(status.power * (1 + stacks * bonus)));",
    "    const damage = Math.max(1, Math.round(status.power * (1 + stacks * bonus) * this.affinityMultiplier(status)));",
    'afinidad en explosión'
  ],
  [
    "  static absorbDamage(statuses: CombatStatusInstance[], incomingDamage: number): ShieldResult {",
    "  static setAffinityMultiplier(statuses: CombatStatusInstance[], ids: string[], multiplier: number): void {\n    if (!Number.isFinite(multiplier) || Math.abs(multiplier - 1) < 0.001) return;\n    const targets = new Set(ids);\n    for (const status of statuses) {\n      if (!targets.has(status.id)) continue;\n      if (status.kind !== 'poison' && status.kind !== 'explosive') continue;\n      status.params = { ...(status.params ?? {}), afinidadMultiplicador: multiplier };\n    }\n  }\n\n  static absorbDamage(statuses: CombatStatusInstance[], incomingDamage: number): ShieldResult {",
    'guardar afinidad en estados de daño'
  ],
  [
    "  private static removeEmptyShields(statuses: CombatStatusInstance[]): void {",
    "  private static affinityMultiplier(status: CombatStatusInstance): number {\n    const value = status.params?.afinidadMultiplicador;\n    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0.25, Math.min(4, value)) : 1;\n  }\n\n  private static removeEmptyShields(statuses: CombatStatusInstance[]): void {",
    'helper afinidad status'
  ]
]);

patchFile('src/scenes/BattleScene.ts', [
  [
    "import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';",
    "import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';\nimport { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';",
    'import TypeEffectivenessService'
  ],
  [
    "  text: Phaser.GameObjects.Text;\n  statusLayer:",
    "  text: Phaser.GameObjects.Text;\n  affinityText: Phaser.GameObjects.Text;\n  statusLayer:",
    'texto de afinidad en hp ui'
  ],
  [
    "      this.statsForChampion(this.wildChampion).hp,\n      false,\n      this.executionThresholdFor(this.playerChampion)",
    "      this.statsForChampion(this.wildChampion).hp,\n      false,\n      this.affinityLabelFor(this.wildChampion),\n      this.executionThresholdFor(this.playerChampion)",
    'tipo rival en panel'
  ],
  [
    "      this.statsForChampion(this.playerChampion).hp,\n      true\n    );",
    "      this.statsForChampion(this.playerChampion).hp,\n      true,\n      this.affinityLabelFor(this.playerChampion)\n    );",
    'tipo jugador en panel'
  ],
  [
    "    showNumbers: boolean,\n    executeThreshold?: number",
    "    showNumbers: boolean,\n    affinityLabel: string,\n    executeThreshold?: number",
    'firma createHpPanel'
  ],
  [
    "    const barY = y + 29;",
    "    const barY = y + 32;",
    'barra hp deja hueco a tipos'
  ],
  [
    "    UiKit.label(this, x + width - 10, y + 8, `M ${mastery}`, UI.font.small, UI.text.secondary, true).setOrigin(1, 0);\n    this.add.rectangle(x + 10, barY",
    "    UiKit.label(this, x + width - 10, y + 8, `M ${mastery}`, UI.font.small, UI.text.secondary, true).setOrigin(1, 0);\n    const affinityText = UiKit.label(this, x + 10, y + 19, affinityLabel, '7px', affinityLabel === 'TIPO PENDIENTE' ? UI.text.muted : UI.text.accent, true);\n    this.add.rectangle(x + 10, barY",
    'etiqueta afinidad panel'
  ],
  [
    "    return { fill, shieldFill, text, statusLayer, executeMarker, executeThreshold, maxWidth, maxHp, barX, barY, showNumbers };",
    "    return { fill, shieldFill, text, affinityText, statusLayer, executeMarker, executeThreshold, maxWidth, maxHp, barX, barY, showNumbers };",
    'retorno affinityText'
  ],
  [
    "      const unlocked = rank > 0;\n      const label = `${labels[i]} · ${rank}/${ProgressionService.maxRank(slot)}\\n${this.shortSkillName(skill.name)}`;",
    "      const unlocked = rank > 0;\n      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));\n      const glyph = TypeEffectivenessService.actionGlyph(effectiveness);\n      const label = `${labels[i]} · ${rank}/${ProgressionService.maxRank(slot)}\\n${this.shortSkillName(skill.name)}${glyph ? ` ${glyph}` : ''}`;",
    'preview efectividad botones'
  ],
  [
    "    const tags = new Set<string>();\n    for (const effect of skill.effects) {",
    "    const tags = new Set<string>();\n    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());\n    for (const effect of skill.effects) {",
    'tipo en info habilidad'
  ],
  [
    "    let skill: SkillDefinition | null = null;\n    let rank = 1;",
    "    let skill: SkillDefinition | null = null;\n    let rank = 1;\n    let effectiveness = TypeEffectivenessService.multiplier(undefined, []);",
    'estado efectividad de acción'
  ],
  [
    "      skill = DataRegistry.skill(action.skillId);\n      rank = BattleEngine.skillRank(attacker, skill);\n      resolution = BattleEngine.resolveSkill(skill, rank, attackerStats, defenderStats, {\n        defenderCurrentHp: defenderHp,\n        defenderMaxHp\n      });",
    "      skill = DataRegistry.skill(action.skillId);\n      rank = BattleEngine.skillRank(attacker, skill);\n      effectiveness = TypeEffectivenessService.forSkill(skill, defender, this.currentFormId(defender));\n      resolution = BattleEngine.resolveSkill(skill, rank, attackerStats, defenderStats, {\n        defenderCurrentHp: defenderHp,\n        defenderMaxHp,\n        affinityMultiplier: effectiveness.multiplier\n      });",
    'resolver daño con afinidad'
  ],
  [
    "    const transformed = skill\n      ? SpecialEffectEngine.applyTransformation(attacker, skill, this.ensureResourceStore(), this.ensureFormStore())\n      : null;",
    "    if (skill) StatusEngine.setAffinityMultiplier(defenderStatuses, application.enemyAppliedIds, effectiveness.multiplier);\n    const transformed = skill\n      ? SpecialEffectEngine.applyTransformation(attacker, skill, this.ensureResourceStore(), this.ensureFormStore())\n      : null;",
    'guardar afinidad estados persistentes'
  ],
  [
    "    if (actualDamage > 0) this.hitFeedback(targetSprite);\n    if (shield.absorbed > 0) {",
    "    if (actualDamage > 0) this.hitFeedback(targetSprite);\n    const effectivenessMessage = skill && actualDamage > 0 ? TypeEffectivenessService.battleMessage(effectiveness) : null;\n    if (effectivenessMessage) await this.awaitContinue(effectivenessMessage);\n    if (shield.absorbed > 0) {",
    'feedback efectividad'
  ],
  [
    "    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));\n    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));",
    "    this.playerHpUi.affinityText.setText(this.affinityLabelFor(this.playerChampion));\n    this.wildHpUi.affinityText.setText(this.affinityLabelFor(this.wildChampion));\n    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));\n    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));",
    'actualizar tipos al cambiar forma'
  ],
  [
    "  private executionThresholdFor(champion: ChampionInstance): number | undefined {",
    "  private affinityLabelFor(champion: ChampionInstance): string {\n    return TypeEffectivenessService.typeNames(TypeEffectivenessService.defenderTypes(champion, this.currentFormId(champion)), true);\n  }\n\n  private executionThresholdFor(champion: ChampionInstance): number | undefined {",
    'helper etiqueta tipo'
  ]
]);

patchFile('src/scenes/TeamScene.ts', [
  [
    "import { BattleEngine } from '../systems/combat/BattleEngine';",
    "import { BattleEngine } from '../systems/combat/BattleEngine';\nimport { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';",
    'import tipos TeamScene'
  ],
  [
    "    UiKit.label(this, x + 58, y + 23, this.roleLabel(definition.tags[0]), UI.font.small, UI.text.secondary);",
    "    const typeMeta = (definition.affinityIds ?? []).length > 0 ? ` · ${TypeEffectivenessService.typeNames(definition.affinityIds ?? [], true)}` : '';\n    UiKit.label(this, x + 58, y + 23, `${this.roleLabel(definition.tags[0])}${typeMeta}`, UI.font.small, UI.text.secondary);",
    'tipos en tarjetas de equipo'
  ]
]);

patchFile('src/scenes/ChampionDetailScene.ts', [
  [
    "import { BattleEngine } from '../systems/combat/BattleEngine';",
    "import { BattleEngine } from '../systems/combat/BattleEngine';\nimport { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';",
    'import tipos ChampionDetail'
  ],
  [
    "  private partyIndex = 0;",
    "  private partyIndex = 0;\n  private overlayLayer?: Phaser.GameObjects.Container;",
    'overlay afinidad ficha'
  ],
  [
    "    UiKit.label(this, 28, 216, this.roleLabel(definition.tags[0]), UI.font.small, UI.text.accent, true);",
    "    UiKit.label(this, 28, 211, this.roleLabel(definition.tags[0]), UI.font.small, UI.text.accent, true);\n    UiKit.label(this, 28, 224, `TIPOS · ${TypeEffectivenessService.typeNames(definition.affinityIds ?? [], true)}`, '7px', (definition.affinityIds ?? []).length ? UI.text.gold : UI.text.muted, true);",
    'tipos en ficha'
  ],
  [
    "    UiKit.button(this, 326, 256, 94, 24, 'HABILIDADES', () => {",
    "    UiKit.button(this, 226, 256, 82, 24, 'AFINIDAD', () => this.openAffinityInfo(champion), { accent: 'purple', fontSize: UI.font.tiny });\n    UiKit.button(this, 326, 256, 94, 24, 'HABILIDADES', () => {",
    'botón afinidad ficha'
  ],
  [
    "  private addChampionPortrait(championId: string, x: number, groundY: number): void {",
    "  private openAffinityInfo(champion: ChampionInstance): void {\n    this.overlayLayer?.destroy(true);\n    const definition = DataRegistry.champion(champion.championId);\n    const types = definition.affinityIds ?? [];\n    const strong = TypeEffectivenessService.offensiveStrengths(types);\n    const weak = TypeEffectivenessService.defensiveWeaknesses(types);\n    const resist = TypeEffectivenessService.defensiveResistances(types);\n    const objects: Phaser.GameObjects.GameObject[] = [];\n    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.78));\n    objects.push(this.add.rectangle(256, 142, 404, 190, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));\n    objects.push(UiKit.label(this, 72, 62, `AFINIDAD · ${definition.name.toUpperCase()}`, UI.font.title, UI.text.primary, true));\n    objects.push(UiKit.label(this, 72, 91, `TIPOS     ${TypeEffectivenessService.typeNames(types)}`, UI.font.small, types.length ? UI.text.gold : UI.text.muted, true));\n    objects.push(UiKit.label(this, 72, 116, `FUERTE    ${strong.length ? TypeEffectivenessService.typeNames(strong) : '—'}`, UI.font.small, UI.text.accent, true).setWordWrapWidth(360, true));\n    objects.push(UiKit.label(this, 72, 143, `DÉBIL     ${weak.length ? TypeEffectivenessService.typeNames(weak) : '—'}`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(360, true));\n    objects.push(UiKit.label(this, 72, 170, `RESISTE   ${resist.length ? TypeEffectivenessService.typeNames(resist) : '—'}`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(360, true));\n    const close = UiKit.button(this, 256, 215, 92, 24, 'CERRAR', () => { this.overlayLayer?.destroy(true); this.overlayLayer = undefined; }, { accent: 'blue', fontSize: UI.font.tiny });\n    objects.push(close.button, close.label);\n    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);\n  }\n\n  private addChampionPortrait(championId: string, x: number, groundY: number): void {",
    'overlay de fortalezas y debilidades'
  ]
]);

patchFile('src/scenes/PlayerScene.ts', [
  [
    "import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';",
    "import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';\nimport { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';",
    'import tipos registro'
  ],
  [
    "  private page = 0;",
    "  private page = 0;\n  private overlayLayer?: Phaser.GameObjects.Container;",
    'overlay registro'
  ],
  [
    "    this.add.rectangle(x, y, 88, 27, bg, 1).setOrigin(0).setStrokeStyle(linked ? 2 : 1, border);",
    "    const cell = this.add.rectangle(x, y, 88, 27, bg, 1).setOrigin(0).setStrokeStyle(linked ? 2 : 1, border);\n    if (state !== 'unknown') {\n      cell.setInteractive({ useHandCursor: true });\n      cell.on(Phaser.Input.Events.POINTER_UP, () => this.openRegistryAffinity(entry));\n    }",
    'registro interactivo'
  ],
  [
    "  private stateGlyph(state: EchoDiscoveryState): string {",
    "  private openRegistryAffinity(entry: EchoCatalogEntry): void {\n    this.overlayLayer?.destroy(true);\n    const definition = DataRegistry.echoes().find((eco) => eco.id === entry.id);\n    const types = definition?.affinityIds ?? [];\n    const strong = TypeEffectivenessService.offensiveStrengths(types);\n    const weak = TypeEffectivenessService.defensiveWeaknesses(types);\n    const resist = TypeEffectivenessService.defensiveResistances(types);\n    const objects: Phaser.GameObjects.GameObject[] = [];\n    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.82));\n    objects.push(this.add.rectangle(256, 142, 410, 188, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));\n    objects.push(UiKit.label(this, 72, 61, entry.name.toUpperCase(), UI.font.title, UI.text.primary, true));\n    objects.push(UiKit.label(this, 72, 90, `TIPOS     ${TypeEffectivenessService.typeNames(types)}`, UI.font.small, types.length ? UI.text.gold : UI.text.muted, true));\n    objects.push(UiKit.label(this, 72, 116, `FUERTE    ${strong.length ? TypeEffectivenessService.typeNames(strong) : '—'}`, UI.font.small, UI.text.accent, true).setWordWrapWidth(365, true));\n    objects.push(UiKit.label(this, 72, 142, `DÉBIL     ${weak.length ? TypeEffectivenessService.typeNames(weak) : '—'}`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(365, true));\n    objects.push(UiKit.label(this, 72, 168, `RESISTE   ${resist.length ? TypeEffectivenessService.typeNames(resist) : '—'}`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(365, true));\n    const close = UiKit.button(this, 256, 215, 92, 24, 'CERRAR', () => { this.overlayLayer?.destroy(true); this.overlayLayer = undefined; }, { accent: 'blue', fontSize: UI.font.tiny });\n    objects.push(close.button, close.label);\n    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);\n  }\n\n  private stateGlyph(state: EchoDiscoveryState): string {",
    'detalle de afinidad en registro'
  ]
]);

console.log('v15.2 affinity system applied');
