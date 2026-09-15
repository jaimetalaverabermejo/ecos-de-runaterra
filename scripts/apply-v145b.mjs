import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  const i = text.indexOf(from);
  if (i < 0) throw new Error('Anchor not found: ' + label);
  return text.slice(0, i) + to + text.slice(i + from.length);
}

function block(text, start, end, replacement, label) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('Block not found: ' + label);
  return text.slice(0, a) + replacement + text.slice(b);
}

// CatalogoContenido: visual config inherited by forms.
{
  const p = 'src/contenido/CatalogoContenido.ts';
  let s = read(p);
  s = once(s,
    'type BloqueEstadisticasParcialEs = Partial<BloqueEstadisticasEs>;\n\ninterface PersonajeJson {',
    'type BloqueEstadisticasParcialEs = Partial<BloqueEstadisticasEs>;\n\ninterface VisualConfigJson {\n  escalaOverworld?: number;\n  offsetY?: number;\n  anchoHitbox?: number;\n  altoHitbox?: number;\n}\n\ninterface PersonajeJson {',
    'visual json type');
  s = once(s,
    '  estadoContenido?: ContentStatus;\n}\n\ninterface EcoJson {',
    '  estadoContenido?: ContentStatus;\n  visual?: VisualConfigJson;\n}\n\ninterface EcoJson {',
    'personaje visual');
  s = once(s,
    '  habilidadesIds?: [string, string, string, string];\n}\n\ninterface EfectoJson {',
    '  habilidadesIds?: [string, string, string, string];\n  visual?: VisualConfigJson;\n}\n\ninterface EfectoJson {',
    'forma visual');
  s = once(s,
    'export interface FormaEcoDescubierta {',
    'export interface VisualOverworldConfig {\n  overworldScale?: number;\n  offsetY?: number;\n  hitboxWidth?: number;\n  hitboxHeight?: number;\n}\n\nexport interface FormaEcoDescubierta {',
    'visual export');
  s = once(s,
    'const aparicionesPorId = byChampionId(aparicionesJson);',
    'const aparicionesPorId = byChampionId(aparicionesJson);\nconst formasPorClave = new Map(Object.entries(formasJson).map(([path, value]) => [\n  championIdFromPath(path) + ":" + formIdFromPath(path),\n  value\n]));',
    'form visual index');
  s = once(s,
    'function statBlock(data: BloqueEstadisticasEs): StatBlock {',
    'function visualConfig(base?: VisualConfigJson, override?: VisualConfigJson): VisualOverworldConfig | undefined {\n  if (!base && !override) return undefined;\n  const merged = { ...(base ?? {}), ...(override ?? {}) };\n  return {\n    overworldScale: merged.escalaOverworld,\n    offsetY: merged.offsetY,\n    hitboxWidth: merged.anchoHitbox,\n    hitboxHeight: merged.altoHitbox\n  };\n}\n\nfunction statBlock(data: BloqueEstadisticasEs): StatBlock {',
    'visual normalizer');
  s = once(s,
    '  static ecos(): ChampionDefinition[] {',
    '  static visualOverworld(championId: string, formId?: string): VisualOverworldConfig | undefined {\n    const base = personajesPorId.get(championId)?.visual;\n    const form = formId ? formasPorClave.get(championId + ":" + formId)?.visual : undefined;\n    return visualConfig(base, form);\n  }\n\n  static ecos(): ChampionDefinition[] {',
    'visual getter');
  write(p, s);
}

// DataRegistry exposes visual metadata.
{
  const p = 'src/data/DataRegistry.ts';
  let s = read(p);
  s = once(s,
    "import { CatalogoContenido, type FormaEcoDescubierta } from '../contenido/CatalogoContenido';",
    "import { CatalogoContenido, type FormaEcoDescubierta, type VisualOverworldConfig } from '../contenido/CatalogoContenido';",
    'registry import');
  s = once(s,
    '  static characters(): CharacterDefinition[] { return [...characters]; }',
    '  static characters(): CharacterDefinition[] { return [...characters]; }\n  static visualOverworld(championId: string, formId?: string): VisualOverworldConfig | undefined { return CatalogoContenido.visualOverworld(championId, formId); }',
    'registry visual method');
  write(p, s);
}

// WorldScene: live NPCs and clean interaction UI.
{
  const p = 'src/scenes/WorldScene.ts';
  let s = read(p);
  s = once(s,
    'type NpcRuntime = { placement: NpcDefinition; body: PhysicsRectangle; visual: Phaser.GameObjects.Container };',
    String.raw`type NpcRuntime = {
  placement: NpcDefinition;
  body: PhysicsRectangle;
  visual: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Sprite;
  facing: Facing;
  homeX: number;
  homeY: number;
  target?: { x: number; y: number };
  patrolIndex: number;
  pauseUntil: number;
};`,
    'npc runtime');
  s = once(s,
    'const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.4, right: 1.43, up: 1.53, left: 1.5 };',
    'const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.68, right: 1.72, up: 1.82, left: 1.78 };',
    'player scale');
  s = once(s,
    '  private nearbyNpc?: NpcRuntime;\n  private interactionButton?: Phaser.GameObjects.Container;\n  private interactionLabel?: Phaser.GameObjects.Text;',
    '  private nearbyNpc?: NpcRuntime;\n  private worldColliders: Phaser.GameObjects.Rectangle[] = [];',
    'interaction fields');
  s = once(s,
    '    this.npcs = [];\n    this.nearbyNpc = undefined;',
    '    this.npcs = [];\n    this.worldColliders = [];\n    this.nearbyNpc = undefined;',
    'collider reset');

  s = block(s,
    '    const hint = this.inputManager.usesTouchControls',
    '    this.createMenuButton();\n    this.createInteractionButton();',
    '    this.createMenuButton();\n',
    'world control hints');

  s = once(s,
    '    this.updatePlayerVisual(direction);\n    this.updateNearbyNpc();',
    '    this.updatePlayerVisual(direction);\n    this.updateNpcs();\n    this.updateNearbyNpc();',
    'npc update call');

  const npcMethods = String.raw`  private createNpcs(mapId: string): void {
    const placements = DataRegistry.npcs(mapId).filter((npc) => ConditionService.matchesAll(this.save, npc.conditions));
    for (const placement of placements) {
      const config = placement.championId ? DataRegistry.visualOverworld(placement.championId, placement.formId) : undefined;
      const bodyWidth = config?.hitboxWidth ?? 18;
      const bodyHeight = config?.hitboxHeight ?? 14;
      const body = this.add.rectangle(placement.x, placement.y, bodyWidth, bodyHeight, 0xffffff, 0);
      this.physics.add.existing(body);
      const physicsBody = body as PhysicsRectangle;
      physicsBody.body.setSize(bodyWidth, bodyHeight);
      physicsBody.body.setCollideWorldBounds(true);
      physicsBody.body.setImmovable(true);
      this.physics.add.collider(this.player, physicsBody);
      for (const collider of this.worldColliders) this.physics.add.collider(physicsBody, collider);
      for (const other of this.npcs) this.physics.add.collider(physicsBody, other.body);

      let visual: Phaser.GameObjects.Container;
      let sprite: Phaser.GameObjects.Sprite | undefined;
      if (placement.visualType === 'merchant') {
        const shadow = this.add.ellipse(0, 8, 34, 11, 0x07131e, 0.34);
        const bodyShape = this.add.ellipse(0, -5, 30, 29, 0x725744, 1).setStrokeStyle(2, 0x3f3029);
        const scarf = this.add.rectangle(0, -12, 25, 6, UI.colors.goldDark, 1).setStrokeStyle(1, UI.colors.gold);
        const head = this.add.circle(0, -25, 12, 0x8a6a52, 1).setStrokeStyle(2, 0x3f3029);
        const muzzle = this.add.ellipse(0, -21, 18, 10, 0xc4a37f, 1).setStrokeStyle(1, 0x60483a);
        const nose = this.add.circle(0, -24, 2.5, 0x251b17, 1);
        const earLeft = this.add.circle(-9, -31, 4, 0x725744, 1).setStrokeStyle(1, 0x3f3029);
        const earRight = this.add.circle(9, -31, 4, 0x725744, 1).setStrokeStyle(1, 0x3f3029);
        const satchel = this.add.rectangle(13, 0, 10, 14, 0x6d4d22, 1).setStrokeStyle(1, UI.colors.goldDark);
        visual = this.add.container(placement.x, placement.y, [shadow, bodyShape, scarf, earLeft, earRight, head, muzzle, nose, satchel]);
      } else if (placement.visualType === 'sanctuary') {
        const shadow = this.add.ellipse(0, 9, 48, 14, 0x07131e, 0.28);
        const base = this.add.ellipse(0, 2, 42, 17, 0x49647a, 1).setStrokeStyle(2, 0xd7c7ff);
        const lower = this.add.rectangle(0, -8, 27, 22, 0x647f96, 1).setStrokeStyle(2, 0x2d4558);
        const pillar = this.add.rectangle(0, -27, 13, 28, 0x7892aa, 1).setStrokeStyle(2, 0x334d61);
        const halo = this.add.circle(0, -43, 15, 0x7a66c8, 0.22).setStrokeStyle(2, 0xcbbcff, 0.9);
        const star = this.add.star(0, -43, 8, 4, 10, 0xf2e6ff, 1).setStrokeStyle(1, 0x9b7ee8);
        const gem = this.add.circle(0, -21, 4, 0xc6a9ff, 1).setStrokeStyle(1, 0xf3eaff);
        visual = this.add.container(placement.x, placement.y, [shadow, base, lower, pillar, halo, star, gem]);
      } else {
        const textureKey = placement.championId
          ? (placement.formId
            ? placement.championId + '-form-' + placement.formId + '-overworld'
            : placement.championId + '-overworld')
          : null;
        if (textureKey && this.textures.exists(textureKey)) {
          const scale = placement.overworldScale ?? config?.overworldScale ?? 1.4;
          const offsetY = config?.offsetY ?? 0;
          const shadow = this.add.ellipse(0, 7, 28, 10, 0x07131e, 0.32);
          sprite = this.add.sprite(0, 7 + offsetY, textureKey, PLAYER_IDLE_FRAME[placement.facing]).setOrigin(0.5, 1).setScale(scale);
          visual = this.add.container(placement.x, placement.y, [shadow, sprite]);
        } else {
          const shadow = this.add.ellipse(0, 7, 26, 10, 0x07131e, 0.32);
          const torso = this.add.rectangle(0, -5, 18, 22, placement.color, 1).setStrokeStyle(2, 0x132630);
          const head = this.add.circle(0, -20, 10, 0xe9c68d, 1).setStrokeStyle(2, 0x4a3229);
          visual = this.add.container(placement.x, placement.y, [shadow, torso, head]);
        }
      }
      visual.setDepth(100 + placement.y);
      this.npcs.push({ placement, body: physicsBody, visual, sprite, facing: placement.facing, homeX: placement.x, homeY: placement.y, patrolIndex: 0, pauseUntil: this.time.now + Phaser.Math.Between(250, 900) });
    }
  }

  private updateNpcs(): void {
    const now = this.time.now;
    for (const npc of this.npcs) {
      const behavior = npc.placement.behavior;
      if (behavior.type === 'static') { this.stopNpc(npc); continue; }
      const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
      if (playerDistance < 46 || now < npc.pauseUntil) { this.stopNpc(npc); continue; }

      if (!npc.target) {
        if (behavior.type === 'patrol') {
          if (behavior.points.length === 0) { this.stopNpc(npc); continue; }
          npc.target = behavior.points[npc.patrolIndex % behavior.points.length];
        } else {
          npc.target = this.pickRandomNpcTarget(npc, behavior.radius);
          if (!npc.target) { npc.pauseUntil = now + (behavior.pauseMs ?? 1000); this.stopNpc(npc); continue; }
        }
      }

      const dx = npc.target.x - npc.body.x;
      const dy = npc.target.y - npc.body.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 3) {
        npc.body.setPosition(npc.target.x, npc.target.y);
        npc.target = undefined;
        if (behavior.type === 'patrol') npc.patrolIndex = (npc.patrolIndex + 1) % Math.max(1, behavior.points.length);
        npc.pauseUntil = now + (behavior.pauseMs ?? 900);
        this.stopNpc(npc);
        continue;
      }

      const speed = behavior.speed ?? 24;
      npc.body.body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
      npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      this.syncNpcVisual(npc, true);
    }
  }

  private stopNpc(npc: NpcRuntime): void {
    npc.body.body.setVelocity(0, 0);
    this.syncNpcVisual(npc, false);
  }

  private syncNpcVisual(npc: NpcRuntime, moving: boolean): void {
    npc.visual.setPosition(npc.body.x, npc.body.y).setDepth(100 + Math.round(npc.body.y));
    if (!npc.sprite) return;
    if (!moving) { npc.sprite.setFrame(PLAYER_IDLE_FRAME[npc.facing]); return; }
    const rowStart = PLAYER_IDLE_FRAME[npc.facing] - 1;
    const sequence = [0, 1, 2, 1];
    const phase = sequence[Math.floor(this.time.now / 150) % sequence.length];
    npc.sprite.setFrame(rowStart + phase);
  }

  private pickRandomNpcTarget(npc: NpcRuntime, radius: number): { x: number; y: number } | undefined {
    const map = DataRegistry.map(this.save.currentMapId);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.FloatBetween(radius * 0.35, radius);
      const x = Phaser.Math.Clamp(npc.homeX + Math.cos(angle) * distance, 24, map.width - 24);
      const y = Phaser.Math.Clamp(npc.homeY + Math.sin(angle) * distance, 24, map.height - 24);
      const blocked = map.collisions.some((rect) => x >= rect.x - 12 && x <= rect.x + rect.width + 12 && y >= rect.y - 12 && y <= rect.y + rect.height + 12);
      if (!blocked) return { x, y };
    }
    return undefined;
  }

`;
  s = block(s, '  private createNpcs(mapId: string): void {', '  private createInteractionButton(): void {', npcMethods, 'npc methods');

  const nearby = String.raw`  private updateNearbyNpc(): void {
    let best: NpcRuntime | undefined;
    let bestDistance = 54;
    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
      if (distance < bestDistance) { best = npc; bestDistance = distance; }
    }
    this.nearbyNpc = best;
  }

`;
  s = block(s, '  private createInteractionButton(): void {', '  private beginNpcInteraction(npc: NpcRuntime): void {', nearby, 'interaction button');
  s = s.replaceAll('    this.interactionButton?.setVisible(false);\n', '');
  s = s.replaceAll('this.facePlayerToward(npc.placement.x, npc.placement.y);', 'this.facePlayerToward(npc.body.x, npc.body.y);');
  s = once(s,
    "      objects.push(this.add.text(x + 18, y + 94, 'Cruceta: elegir · A: confirmar · B: cancelar', {\n        fontFamily: UI.font.family, fontSize: UI.font.tiny, color: UI.text.muted\n      }));\n",
    '',
    'dialog hint');
  s = once(s,
    "      const text = this.add.text(x + 316, y + 88, atEnd ? 'A · CERRAR' : 'A · SIGUIENTE', {",
    "      const text = this.add.text(x + 316, y + 88, atEnd ? 'CERRAR' : 'SIGUIENTE', {",
    'dialog button labels');
  s = once(s,
    '    this.physics.add.existing(collider, true);\n    this.physics.add.collider(this.player, collider);',
    '    this.physics.add.existing(collider, true);\n    this.worldColliders.push(collider);\n    this.physics.add.collider(this.player, collider);',
    'world colliders');
  write(p, s);
}

// Visual tuning as content data.
const visual = {
  garen: [1.30, 18, 14],
  'miss-fortune': [1.30, 18, 14],
  corki: [1.13, 20, 14],
  gnar: [0.98, 15, 12],
  kennen: [1.02, 15, 12],
  kled: [1.13, 20, 14],
  lulu: [1.02, 15, 12],
  poppy: [1.03, 15, 12],
  rumble: [1.13, 20, 14],
  teemo: [1.02, 15, 12],
  tristana: [1.03, 15, 12],
  veigar: [1.02, 15, 12]
};
for (const [id, values] of Object.entries(visual)) {
  const p = 'src/contenido/campeones/' + id + '/personaje.json';
  const data = JSON.parse(read(p));
  data.visual = { escalaOverworld: values[0], anchoHitbox: values[1], altoHitbox: values[2] };
  write(p, JSON.stringify(data, null, 2) + '\n');
}
{
  const p = 'src/contenido/campeones/gnar/formas/mega-gnar/forma.json';
  const data = JSON.parse(read(p));
  data.visual = { escalaOverworld: 1.52, offsetY: -1, anchoHitbox: 23, altoHitbox: 16 };
  write(p, JSON.stringify(data, null, 2) + '\n');
}

// All champion NPCs in the temporary gallery walk so sprites can be inspected.
{
  const p = 'src/contenido/mundo/npcs/bandle-village.json';
  const data = JSON.parse(read(p));
  for (const npc of data) {
    if (!npc.campeonId) continue;
    delete npc.escalaOverworld;
    const mega = npc.formaId === 'mega-gnar';
    npc.comportamiento = { tipo: 'aleatorio', radio: mega ? 20 : 28, velocidad: mega ? 18 : 24, pausaMs: mega ? 1200 : 850 };
  }
  write(p, JSON.stringify(data, null, 2) + '\n');
}

// Version.
{
  const p = 'src/scenes/BootScene.ts';
  write(p, read(p).replace("this.registry.set('app.version', '14.4');", "this.registry.set('app.version', '14.5');"));
}
{
  const p = 'package.json';
  const data = JSON.parse(read(p));
  data.version = '0.14.5';
  write(p, JSON.stringify(data, null, 2) + '\n');
}

// Documentation.
{
  const p = 'PROJECT_STRUCTURE.md';
  let s = read(p);
  if (!s.includes('## v14.5 — Movimiento y escala visual')) {
    s += '\n## v14.5 — Movimiento y escala visual\n\n`personaje.json` puede declarar `visual` con `escalaOverworld`, `offsetY`, `anchoHitbox` y `altoHitbox`. `forma.json` puede sobrescribir esos valores. El NPC conserva `escalaOverworld` como override opcional.\n\nLos comportamientos `estatico`, `patrulla` y `aleatorio` se ejecutan en el mundo. Los NPC cambian orientación/frame al caminar y se detienen al aproximarse el jugador para facilitar la interacción.\n\nLas ayudas permanentes del tipo “A / HABLAR” se eliminan del mundo; los controles se enseñarán puntualmente mediante tutorial.\n';
  }
  write(p, s);
}

console.log('v14.5 applied');
