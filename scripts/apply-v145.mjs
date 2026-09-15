import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(text, oldValue, newValue, label) {
  if (text.includes(newValue)) return text;
  if (!text.includes(oldValue)) throw new Error(`No se encontró el ancla: ${label}`);
  return text.replace(oldValue, newValue);
}
function replaceBetween(text, start, end, replacement, label) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`No se encontró el bloque: ${label}`);
  return text.slice(0, startIndex) + replacement + text.slice(endIndex);
}

// 1) Catálogo visual por personaje y forma.
{
  const path = 'src/contenido/CatalogoContenido.ts';
  let text = read(path);
  text = replaceOnce(text,
    "type BloqueEstadisticasParcialEs = Partial<BloqueEstadisticasEs>;\n\ninterface PersonajeJson {",
    "type BloqueEstadisticasParcialEs = Partial<BloqueEstadisticasEs>;\n\ninterface VisualConfigJson {\n  escalaOverworld?: number;\n  offsetY?: number;\n  anchoHitbox?: number;\n  altoHitbox?: number;\n}\n\ninterface PersonajeJson {",
    'VisualConfigJson');
  text = replaceOnce(text,
    "  estadoContenido?: ContentStatus;\n}\n\ninterface EcoJson {",
    "  estadoContenido?: ContentStatus;\n  visual?: VisualConfigJson;\n}\n\ninterface EcoJson {",
    'visual personaje');
  text = replaceOnce(text,
    "  habilidadesIds?: [string, string, string, string];\n}\n\ninterface EfectoJson {",
    "  habilidadesIds?: [string, string, string, string];\n  visual?: VisualConfigJson;\n}\n\ninterface EfectoJson {",
    'visual forma');
  text = replaceOnce(text,
    "export interface FormaEcoDescubierta {",
    "export interface VisualOverworldConfig {\n  overworldScale?: number;\n  offsetY?: number;\n  hitboxWidth?: number;\n  hitboxHeight?: number;\n}\n\nexport interface FormaEcoDescubierta {",
    'VisualOverworldConfig');
  text = replaceOnce(text,
    "const aparicionesPorId = byChampionId(aparicionesJson);",
    "const aparicionesPorId = byChampionId(aparicionesJson);\nconst formasPorClave = new Map(Object.entries(formasJson).map(([path, value]) => [\n  `${championIdFromPath(path)}:${formIdFromPath(path)}`,\n  value\n]));",
    'indice formas visuales');
  text = replaceOnce(text,
    "function statBlock(data: BloqueEstadisticasEs): StatBlock {",
    "function visualConfig(base?: VisualConfigJson, override?: VisualConfigJson): VisualOverworldConfig | undefined {\n  if (!base && !override) return undefined;\n  const merged = { ...(base ?? {}), ...(override ?? {}) };\n  return {\n    overworldScale: merged.escalaOverworld,\n    offsetY: merged.offsetY,\n    hitboxWidth: merged.anchoHitbox,\n    hitboxHeight: merged.altoHitbox\n  };\n}\n\nfunction statBlock(data: BloqueEstadisticasEs): StatBlock {",
    'normalizador visual');
  text = replaceOnce(text,
    "  static ecos(): ChampionDefinition[] {",
    "  static visualOverworld(championId: string, formId?: string): VisualOverworldConfig | undefined {\n    const base = personajesPorId.get(championId)?.visual;\n    const form = formId ? formasPorClave.get(`${championId}:${formId}`)?.visual : undefined;\n    return visualConfig(base, form);\n  }\n\n  static ecos(): ChampionDefinition[] {",
    'getter visual');
  write(path, text);
}

// 2) DataRegistry expone la configuración visual al gameplay.
{
  const path = 'src/data/DataRegistry.ts';
  let text = read(path);
  text = replaceOnce(text,
    "import { CatalogoContenido, type FormaEcoDescubierta } from '../contenido/CatalogoContenido';",
    "import { CatalogoContenido, type FormaEcoDescubierta, type VisualOverworldConfig } from '../contenido/CatalogoContenido';",
    'import visual');
  text = replaceOnce(text,
    "  static characters(): CharacterDefinition[] { return [...characters]; }",
    "  static characters(): CharacterDefinition[] { return [...characters]; }\n  static visualOverworld(championId: string, formId?: string): VisualOverworldConfig | undefined { return CatalogoContenido.visualOverworld(championId, formId); }",
    'registry visual');
  write(path, text);
}

// 3) WorldScene: movimiento NPC, escalas data-driven y limpieza de ayudas permanentes.
{
  const path = 'src/scenes/WorldScene.ts';
  let text = read(path);
  text = replaceOnce(text,
    "type NpcRuntime = { placement: NpcDefinition; body: PhysicsRectangle; visual: Phaser.GameObjects.Container };",
    "type NpcRuntime = {\n  placement: NpcDefinition;\n  body: PhysicsRectangle;\n  visual: Phaser.GameObjects.Container;\n  sprite?: Phaser.GameObjects.Sprite;\n  facing: Facing;\n  homeX: number;\n  homeY: number;\n  target?: { x: number; y: number };\n  patrolIndex: number;\n  pauseUntil: number;\n};",
    'NpcRuntime');
  text = replaceOnce(text,
    "const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.4, right: 1.43, up: 1.53, left: 1.5 };",
    "const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.68, right: 1.72, up: 1.82, left: 1.78 };",
    'escala protagonista');
  text = replaceOnce(text,
    "  private nearbyNpc?: NpcRuntime;\n  private interactionButton?: Phaser.GameObjects.Container;\n  private interactionLabel?: Phaser.GameObjects.Text;",
    "  private nearbyNpc?: NpcRuntime;\n  private worldColliders: Phaser.GameObjects.Rectangle[] = [];",
    'campos npc/ui');
  text = replaceOnce(text,
    "    this.npcs = [];\n    this.nearbyNpc = undefined;",
    "    this.npcs = [];\n    this.worldColliders = [];\n    this.nearbyNpc = undefined;",
    'reset colliders');

  const hintStart = "    const hint = this.inputManager.usesTouchControls";
  const hintEnd = "    this.createMenuButton();\n    this.createInteractionButton();";
  text = replaceBetween(text, hintStart, hintEnd,
    "    this.createMenuButton();\n",
    'ayudas mundo');

  text = replaceOnce(text,
    "    this.updatePlayerVisual(direction);\n    this.updateNearbyNpc();",
    "    this.updatePlayerVisual(direction);\n    this.updateNpcs();\n    this.updateNearbyNpc();",
    'update npcs');

  const createNpcsStart = "  private createNpcs(mapId: string): void {";
  const createNpcsEnd = "  private createInteractionButton(): void {";
  const newNpcBlock = `  private createNpcs(mapId: string): void {
    const placements = DataRegistry.npcs(mapId).filter((npc) => ConditionService.matchesAll(this.save, npc.conditions));
    for (const placement of placements) {
      const visualConfig = placement.championId ? DataRegistry.visualOverworld(placement.championId, placement.formId) : undefined;
      const bodyWidth = visualConfig?.hitboxWidth ?? 18;
      const bodyHeight = visualConfig?.hitboxHeight ?? 14;
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
          ? placement.formId
            ? \\`${'${placement.championId}'}-form-${'${placement.formId}'}-overworld\\`
            : \\`${'${placement.championId}'}-overworld\\`
          : null;
        if (textureKey && this.textures.exists(textureKey)) {
          const scale = placement.overworldScale ?? visualConfig?.overworldScale ?? 1.4;
          const offsetY = visualConfig?.offsetY ?? 0;
          const shadow = this.add.ellipse(0, 7, 28, 10, 0x07131e, 0.32);
          sprite = this.add.sprite(0, 7 + offsetY, textureKey, PLAYER_IDLE_FRAME[placement.facing])
            .setOrigin(0.5, 1)
            .setScale(scale);
          visual = this.add.container(placement.x, placement.y, [shadow, sprite]);
        } else {
          const shadow = this.add.ellipse(0, 7, 26, 10, 0x07131e, 0.32);
          const torso = this.add.rectangle(0, -5, 18, 22, placement.color, 1).setStrokeStyle(2, 0x132630);
          const head = this.add.circle(0, -20, 10, 0xe9c68d, 1).setStrokeStyle(2, 0x4a3229);
          visual = this.add.container(placement.x, placement.y, [shadow, torso, head]);
        }
      }
      visual.setDepth(100 + placement.y);

      this.npcs.push({
        placement,
        body: physicsBody,
        visual,
        sprite,
        facing: placement.facing,
        homeX: placement.x,
        homeY: placement.y,
        patrolIndex: 0,
        pauseUntil: this.time.now + Phaser.Math.Between(250, 900)
      });
    }
  }

  private updateNpcs(): void {
    const now = this.time.now;
    for (const npc of this.npcs) {
      const behavior = npc.placement.behavior;
      if (behavior.type === 'static') {
        this.stopNpc(npc);
        continue;
      }

      const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
      if (playerDistance < 46 || now < npc.pauseUntil) {
        this.stopNpc(npc);
        continue;
      }

      if (!npc.target) {
        if (behavior.type === 'patrol') {
          if (behavior.points.length === 0) {
            this.stopNpc(npc);
            continue;
          }
          npc.target = behavior.points[npc.patrolIndex % behavior.points.length];
        } else {
          npc.target = this.pickRandomNpcTarget(npc, behavior.radius);
          if (!npc.target) {
            npc.pauseUntil = now + (behavior.pauseMs ?? 1000);
            this.stopNpc(npc);
            continue;
          }
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
    if (!moving) {
      npc.sprite.setFrame(PLAYER_IDLE_FRAME[npc.facing]);
      return;
    }
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
      const blocked = map.collisions.some((rect) =>
        x >= rect.x - 12 && x <= rect.x + rect.width + 12 &&
        y >= rect.y - 12 && y <= rect.y + rect.height + 12
      );
      if (!blocked) return { x, y };
    }
    return undefined;
  }

`;
  text = replaceBetween(text, createNpcsStart, createNpcsEnd, newNpcBlock, 'createNpcs y movimiento');

  const interactionStart = "  private createInteractionButton(): void {";
  const interactionEnd = "  private beginNpcInteraction(npc: NpcRuntime): void {";
  const nearbyOnly = `  private updateNearbyNpc(): void {
    let best: NpcRuntime | undefined;
    let bestDistance = 54;
    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
      if (distance < bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    this.nearbyNpc = best;
  }

`;
  text = replaceBetween(text, interactionStart, interactionEnd, nearbyOnly, 'botón interacción');

  text = text.replaceAll("    this.interactionButton?.setVisible(false);\n", '');
  text = text.replaceAll("this.facePlayerToward(npc.placement.x, npc.placement.y);", "this.facePlayerToward(npc.body.x, npc.body.y);");
  text = replaceOnce(text,
    "      objects.push(this.add.text(x + 18, y + 94, 'Cruceta: elegir · A: confirmar · B: cancelar', {\n        fontFamily: UI.font.family, fontSize: UI.font.tiny, color: UI.text.muted\n      }));\n",
    "",
    'hint diálogo');
  text = replaceOnce(text,
    "      const text = this.add.text(x + 316, y + 88, atEnd ? 'A · CERRAR' : 'A · SIGUIENTE', {",
    "      const text = this.add.text(x + 316, y + 88, atEnd ? 'CERRAR' : 'SIGUIENTE', {",
    'botón diálogo');
  text = replaceOnce(text,
    "    this.physics.add.existing(collider, true);\n    this.physics.add.collider(this.player, collider);",
    "    this.physics.add.existing(collider, true);\n    this.worldColliders.push(collider);\n    this.physics.add.collider(this.player, collider);",
    'colliders mundo');
  write(path, text);
}

// 4) Ajustes visuales iniciales. Son datos, no excepciones del motor.
const visualByChampion = {
  'garen': { escalaOverworld: 1.30, anchoHitbox: 18, altoHitbox: 14 },
  'miss-fortune': { escalaOverworld: 1.30, anchoHitbox: 18, altoHitbox: 14 },
  'corki': { escalaOverworld: 1.13, anchoHitbox: 20, altoHitbox: 14 },
  'gnar': { escalaOverworld: 0.98, anchoHitbox: 15, altoHitbox: 12 },
  'kennen': { escalaOverworld: 1.02, anchoHitbox: 15, altoHitbox: 12 },
  'kled': { escalaOverworld: 1.13, anchoHitbox: 20, altoHitbox: 14 },
  'lulu': { escalaOverworld: 1.02, anchoHitbox: 15, altoHitbox: 12 },
  'poppy': { escalaOverworld: 1.03, anchoHitbox: 15, altoHitbox: 12 },
  'rumble': { escalaOverworld: 1.13, anchoHitbox: 20, altoHitbox: 14 },
  'teemo': { escalaOverworld: 1.02, anchoHitbox: 15, altoHitbox: 12 },
  'tristana': { escalaOverworld: 1.03, anchoHitbox: 15, altoHitbox: 12 },
  'veigar': { escalaOverworld: 1.02, anchoHitbox: 15, altoHitbox: 12 }
};
for (const [id, visual] of Object.entries(visualByChampion)) {
  const path = `src/contenido/campeones/${id}/personaje.json`;
  const data = JSON.parse(read(path));
  data.visual = visual;
  write(path, JSON.stringify(data, null, 2) + '\n');
}
{
  const path = 'src/contenido/campeones/gnar/formas/mega-gnar/forma.json';
  const data = JSON.parse(read(path));
  data.visual = { escalaOverworld: 1.52, offsetY: -1, anchoHitbox: 23, altoHitbox: 16 };
  write(path, JSON.stringify(data, null, 2) + '\n');
}

// 5) Los campeones de la galería pasan a caminar aleatoriamente. NPC puede sobrescribir escala si algún caso lo necesita.
{
  const path = 'src/contenido/mundo/npcs/bandle-village.json';
  const npcs = JSON.parse(read(path));
  for (const npc of npcs) {
    if (!npc.campeonId) continue;
    delete npc.escalaOverworld;
    const isMega = npc.formaId === 'mega-gnar';
    npc.comportamiento = {
      tipo: 'aleatorio',
      radio: isMega ? 20 : 28,
      velocidad: isMega ? 18 : 24,
      pausaMs: isMega ? 1200 : 850
    };
  }
  write(path, JSON.stringify(npcs, null, 2) + '\n');
}

// 6) Versión.
{
  const path = 'src/scenes/BootScene.ts';
  let text = read(path);
  text = text.replace("this.registry.set('app.version', '14.4');", "this.registry.set('app.version', '14.5');");
  write(path, text);
}
{
  const path = 'package.json';
  const data = JSON.parse(read(path));
  data.version = '0.14.5';
  write(path, JSON.stringify(data, null, 2) + '\n');
}

// 7) Documentación breve.
{
  const path = 'PROJECT_STRUCTURE.md';
  let text = read(path);
  const section = `\n## v14.5 — Movimiento y escala visual\n\nLos personajes pueden declarar en \`personaje.json\` un bloque \`visual\` con \`escalaOverworld\`, \`offsetY\`, \`anchoHitbox\` y \`altoHitbox\`. Las formas pueden sobrescribir esos valores desde \`forma.json\`. Un NPC puede seguir usando \`escalaOverworld\` como override puntual, pero por defecto hereda la configuración del personaje/forma.\n\nLos NPC ejecutan su \`comportamiento\` de forma genérica en \`WorldScene\`: \`estatico\`, \`patrulla\` o \`aleatorio\`. Al caminar actualizan orientación y frames del spritesheet; al acercarse el jugador se detienen para facilitar la interacción. Las coordenadas del JSON siguen siendo su posición/origen lógico, no un requisito narrativo.\n\nLas ayudas permanentes de interacción del mundo se han retirado. La interacción continúa disponible por los controles existentes y debe enseñarse de forma puntual mediante tutorial, no mediante carteles persistentes.\n`;
  if (!text.includes('## v14.5 — Movimiento y escala visual')) text += section;
  write(path, text);
}

console.log('v14.5 patch applied');
