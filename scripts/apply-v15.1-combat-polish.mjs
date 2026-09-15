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

patchFile('src/contenido/CatalogoContenido.ts', [
  [
    'interface VisualConfigJson {\n  escalaOverworld?: number;',
    'interface VisualConfigJson {\n  escalaOverworld?: number;\n  escalaCombate?: number;',
    'escalaCombate en VisualConfigJson'
  ],
  [
    `  static visualOverworld(championId: string, formId?: string): VisualOverworldConfig | undefined {\n    const base = personajesPorId.get(championId)?.visual;\n    const form = formId ? formasPorClave.get(championId + ":" + formId)?.visual : undefined;\n    return visualConfig(base, form);\n  }`,
    `  static visualOverworld(championId: string, formId?: string): VisualOverworldConfig | undefined {\n    const base = personajesPorId.get(championId)?.visual;\n    const form = formId ? formasPorClave.get(championId + ":" + formId)?.visual : undefined;\n    return visualConfig(base, form);\n  }\n\n  static escalaCombate(championId: string, formId?: string): number {\n    const base = personajesPorId.get(championId)?.visual?.escalaCombate ?? 1;\n    const form = formId ? formasPorClave.get(championId + ":" + formId)?.visual?.escalaCombate : undefined;\n    return Math.max(0.5, form ?? base);\n  }`,
    'resolver escala de combate'
  ]
]);

patchFile('src/scenes/BattleScene.ts', [
  [
    `import Phaser from 'phaser';\nimport { DataRegistry } from '../data/DataRegistry';`,
    `import Phaser from 'phaser';\nimport { CatalogoContenido } from '../contenido/CatalogoContenido';\nimport { DataRegistry } from '../data/DataRegistry';`,
    'import CatalogoContenido'
  ],
  [
    `  private wildSprite!: Phaser.GameObjects.Image;\n  private actionObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];`,
    `  private wildSprite!: Phaser.GameObjects.Image;\n  private playerEffectLayer!: Phaser.GameObjects.Container;\n  private wildEffectLayer!: Phaser.GameObjects.Container;\n  private actionArmAt = 0;\n  private actionObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];`,
    'estado visual de combate'
  ],
  [
    `    this.createActions();\n    this.refreshUi();`,
    `    this.createActions();\n    this.actionArmAt = this.time.now + 300;\n    this.refreshUi();`,
    'armado de input inicial'
  ],
  [
    `  private createCombatants(): void {\n    const playerTexture = this.playerBattleTexture(this.playerChampion.championId, this.currentFormId(this.playerChampion));\n    const playerSize = this.playerChampion.championId === 'garen' ? { width: 132, height: 134 } : { width: 104, height: 116 };\n    this.playerSprite = this.add.image(126, 180, playerTexture).setOrigin(0.5, 1).setDisplaySize(playerSize.width, playerSize.height);\n    if (this.playerChampion.championId === 'teemo') this.playerSprite.setFlipX(true);\n\n    const wildTexture = this.wildBattleTexture(this.wildChampion.championId, this.currentFormId(this.wildChampion));\n    const wildSize = this.wildChampion.championId === 'garen' ? { width: 116, height: 120 } : { width: 104, height: 116 };\n    this.wildSprite = this.add.image(402, 121, wildTexture).setOrigin(0.5, 1).setDisplaySize(wildSize.width, wildSize.height);\n  }`,
    `  private createCombatants(): void {\n    const playerTexture = this.playerBattleTexture(this.playerChampion.championId, this.currentFormId(this.playerChampion));\n    this.playerSprite = this.add.image(126, 180, playerTexture).setOrigin(0.5, 1);\n    if (this.playerChampion.championId === 'teemo') this.playerSprite.setFlipX(true);\n\n    const wildTexture = this.wildBattleTexture(this.wildChampion.championId, this.currentFormId(this.wildChampion));\n    this.wildSprite = this.add.image(402, 121, wildTexture).setOrigin(0.5, 1);\n    this.playerEffectLayer = this.add.container(0, 0).setDepth(400);\n    this.wildEffectLayer = this.add.container(0, 0).setDepth(400);\n    this.syncCombatantVisual('player', false);\n    this.syncCombatantVisual('enemy', false);\n  }`,
    'createCombatants genérico'
  ],
  [
    `  private async handleCombatAction(playerAction: CombatAction): Promise<void> {\n    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;`,
    `  private async handleCombatAction(playerAction: CombatAction): Promise<void> {\n    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;\n    if (this.time.now < this.actionArmAt) return;`,
    'guard contra input heredado'
  ],
  [
    `      this.playerSprite.setTexture(this.playerBattleTexture(champion.championId, this.currentFormId(champion)));\n      this.rebuildActions();`,
    `      this.playerSprite.setTexture(this.playerBattleTexture(champion.championId, this.currentFormId(champion)));\n      this.syncCombatantVisual('player', true);\n      this.rebuildActions();`,
    'escala visual al cambiar forma jugador'
  ],
  [
    `      this.wildSprite.setTexture(this.wildBattleTexture(champion.championId, this.currentFormId(champion)));`,
    `      this.wildSprite.setTexture(this.wildBattleTexture(champion.championId, this.currentFormId(champion)));\n      this.syncCombatantVisual('enemy', true);`,
    'escala visual al cambiar forma rival'
  ],
  [
    `    this.playerChampion.currentHp = Math.max(0, this.playerHp);\n    this.wildChampion.currentHp = Math.max(0, this.wildHp);\n  }`,
    `    this.playerChampion.currentHp = Math.max(0, this.playerHp);\n    this.wildChampion.currentHp = Math.max(0, this.wildHp);\n    this.refreshCombatVisuals();\n  }`,
    'refresco visual junto a UI'
  ],
  [
    `  private renderStatusIcons(layer: Phaser.GameObjects.Container, statuses: CombatStatusInstance[]): void {\n    layer.removeAll(true);\n    statuses.slice(0, 6).forEach((status, index) => {`,
    `  private renderStatusIcons(layer: Phaser.GameObjects.Container, statuses: CombatStatusInstance[]): void {\n    layer.removeAll(true);\n    const visibleStatuses = statuses.filter((status) => status.kind !== 'explosive');\n    visibleStatuses.slice(0, 6).forEach((status, index) => {`,
    'bomba fuera de barra de estados'
  ],
  [
    `  private executionThresholdFor(champion: ChampionInstance): number | undefined {`,
    `  private refreshCombatVisuals(): void {\n    this.syncCombatantVisual('player', true);\n    this.syncCombatantVisual('enemy', true);\n  }\n\n  private syncCombatantVisual(actor: BattleActor, animate: boolean): void {\n    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;\n    const sprite = actor === 'player' ? this.playerSprite : this.wildSprite;\n    if (!sprite) return;\n    const base = this.baseBattleSize(champion.championId, actor);\n    const formScale = CatalogoContenido.escalaCombate(champion.championId, this.currentFormId(champion));\n    const statusScale = this.statusVisualScale(this.statusesFor(champion));\n    const scale = formScale * statusScale;\n    const width = Math.round(base.width * scale);\n    const height = Math.round(base.height * scale);\n    const baseY = actor === 'player' ? 180 : 121;\n    const targetY = actor === 'enemy' ? baseY + Math.max(0, height - base.height) : baseY;\n    const scaleX = width / Math.max(1, sprite.width);\n    const scaleY = height / Math.max(1, sprite.height);\n    const changed = Math.abs(sprite.scaleX - scaleX) > 0.01 || Math.abs(sprite.scaleY - scaleY) > 0.01 || Math.abs(sprite.y - targetY) > 0.5;\n\n    if (animate && changed) {\n      this.tweens.killTweensOf(sprite);\n      this.tweens.add({ targets: sprite, scaleX, scaleY, y: targetY, duration: 180, ease: 'Sine.easeOut' });\n    } else if (!animate || changed) {\n      sprite.setScale(scaleX, scaleY);\n      sprite.setY(targetY);\n    }\n\n    this.renderCombatantMarker(actor, width, height, targetY);\n  }\n\n  private baseBattleSize(championId: string, actor: BattleActor): { width: number; height: number } {\n    if (championId === 'garen') return actor === 'player' ? { width: 132, height: 134 } : { width: 116, height: 120 };\n    return { width: 104, height: 116 };\n  }\n\n  private statusVisualScale(statuses: CombatStatusInstance[]): number {\n    return Math.max(1, ...statuses.map((status) => {\n      const value = status.params?.escalaVisual;\n      return typeof value === 'number' ? Math.max(1, value) : 1;\n    }));\n  }\n\n  private renderCombatantMarker(actor: BattleActor, width: number, height: number, groundY: number): void {\n    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;\n    const sprite = actor === 'player' ? this.playerSprite : this.wildSprite;\n    const layer = actor === 'player' ? this.playerEffectLayer : this.wildEffectLayer;\n    if (!layer || !sprite) return;\n    layer.removeAll(true);\n    const explosive = this.statusesFor(champion).find((status) => status.kind === 'explosive');\n    if (!explosive) return;\n\n    layer.setPosition(sprite.x + width * 0.38, groundY - height * 0.7);\n    const body = this.add.circle(0, 0, 10, 0x111820, 0.98).setStrokeStyle(2, UI.colors.gold);\n    const fuse = this.add.rectangle(7, -9, 8, 3, UI.colors.gold, 1).setRotation(-0.65);\n    const spark = this.add.circle(11, -13, 2, 0xffd27a, 1);\n    const stacks = Math.max(0, explosive.stacks ?? 0);\n    const maxStacks = typeof explosive.params?.maxAcumulaciones === 'number' ? explosive.params.maxAcumulaciones : 5;\n    const counter = UiKit.label(this, 0, -1, String(stacks), UI.font.tiny, '#ffffff', true).setOrigin(0.5);\n    layer.add([body, fuse, spark, counter]);\n\n    const visiblePips = Math.min(5, Math.max(1, maxStacks));\n    for (let i = 0; i < visiblePips; i += 1) {\n      const filled = i < stacks;\n      const pip = this.add.circle(-10 + i * 5, 15, 2, filled ? UI.colors.gold : 0x2a3945, 1)\n        .setStrokeStyle(1, filled ? UI.colors.gold : UI.colors.borderSoft);\n      layer.add(pip);\n    }\n  }\n\n  private executionThresholdFor(champion: ChampionInstance): number | undefined {`,
    'helpers visuales de combate'
  ]
]);

console.log('v15.1 combat polish applied');
