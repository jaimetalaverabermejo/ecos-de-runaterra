import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, EncounterEntry, EncounterZoneDefinition, MapDefinition, RectDefinition, TransitionDefinition } from '../data/types';
import type { DialogueDefinition, DuelEchoDefinition, NpcDefinition } from '../data/narrativeTypes';
import type { SaveGame } from '../state/GameState';
import { InputManager, type MoveDirection } from '../input/InputManager';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { QuestService } from '../systems/quests/QuestService';
import { SanctuaryService } from '../systems/sanctuary/SanctuaryService';
import { SaveService } from '../systems/save/SaveService';
import { EchoAppearanceService } from '../systems/encounters/EchoAppearanceService';
import { ConditionService } from '../systems/world/ConditionService';
import { WorldActionService } from '../systems/world/WorldActionService';
import { SprintController } from '../systems/world/SprintController';
import { VeigarSecretController } from '../systems/world/VeigarSecretController';
import { EchoReleaseEffect } from '../systems/world/EchoReleaseEffect';
import { createNarrativeFrame, inferNarrativeMode } from '../ui/narrative/NarrativeUi';
import { UI } from '../ui/theme/UiTheme';

type PhysicsRectangle = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
type PhysicsZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body };
type Facing = 'up' | 'down' | 'left' | 'right';
type NpcRuntime = {
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
  alerted?: boolean;
  autoTalkTriggered?: boolean;
  guideArrivalTriggered?: boolean;
  playerCollider?: Phaser.Physics.Arcade.Collider;
};

type TiledInteractionRuntime = {
  id: string;
  name: string;
  action: string;
  x: number;
  y: number;
  width: number;
  height: number;
  requiresInteract: boolean;
  itemId?: string;
  quantity?: number;
  gold?: number;
  visual?: Phaser.GameObjects.Container;
  body?: PhysicsRectangle;
};

type TiledZoneRuntime = {
  id: string;
  action: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ellipse: boolean;
  trigger?: string;
  sanctuaryId?: string;
  healEchos: boolean;
  enableEchoReserve: boolean;
  setCheckpoint: boolean;
};

const PLAYER_TEXTURE_KEY = 'player-overworld';
const PLAYER_IDLE_FRAME: Record<Facing, number> = { down: 1, up: 4, left: 7, right: 10 };
const PLAYER_ANIMATIONS: Record<Facing, string> = {
  down: 'player-walk-down', up: 'player-walk-up', left: 'player-walk-left', right: 'player-walk-right'
};
const WORLD_PIXEL_ZOOM = 2;
const PLAYER_VISUAL_SIZE = 60;

export class WorldScene extends Phaser.Scene {
  private player!: PhysicsRectangle;
  private playerVisual!: Phaser.GameObjects.Sprite;
  private inputManager!: InputManager;
  private sprintController!: SprintController;
  private veigarSecrets!: VeigarSecretController;
  private save!: SaveGame;
  private transitioning = false;
  private transitionCooldownUntil = 0;
  private encounterCooldownUntil = 0;
  private encounterDistanceAccumulator = 0;
  private readonly moveSpeed = 112;
  private readonly encounterStepDistance = 52;
  private readonly encounterChancePerStep = 0.15;
  private lastFacing: Facing = 'down';
  private menuKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private npcs: NpcRuntime[] = [];
  private nearbyNpc?: NpcRuntime;
  private worldColliders: Phaser.GameObjects.Rectangle[] = [];
  private tiledMap?: Phaser.Tilemaps.Tilemap;
  private tiledLayers = new Map<string, Phaser.Tilemaps.TilemapLayerBase>();
  private tiledTallGrassLayer?: Phaser.Tilemaps.TilemapLayerBase;
  private tiledInteractions: TiledInteractionRuntime[] = [];
  private nearbyTiledInteraction?: TiledInteractionRuntime;
  private tiledZones: TiledZoneRuntime[] = [];
  private activeTiledZoneIds = new Set<string>();
  private ledgeJump?: {
    direction: Facing;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    startedAt: number;
    durationMs: number;
  };
  private ledgeJumpCooldownUntil = 0;
  private dialogueLayer?: Phaser.GameObjects.Container;
  private dialogueDefinition?: DialogueDefinition;
  private dialogueNode?: DialogueDefinition['nodes'][number];
  private dialogueLineIndex = 0;
  private dialogueChoiceIndex = 0;
  private dialogueNavDirection: MoveDirection = 'none';
  private pendingDuelStart?: { npc: NpcRuntime; duelId: string };
  private storyEchoVisual?: Phaser.GameObjects.Container;
  private affinityTutorialLayer?: Phaser.GameObjects.Container;
  private affinityTutorialStep = 0;
  private npcEventLock = false;
  private playerTrail: Array<{ x: number; y: number }> = [];

  constructor() { super('WorldScene'); }

  create(): void {
    configureSceneLayout(this);
    // Integer camera zoom avoids nearest-neighbour sampling on fractional
    // screen pixels while staying visually close to the previous 1.875 zoom.
    this.cameras.main.setZoom(WORLD_PIXEL_ZOOM);
    this.save = this.registry.get('save') as SaveGame;
    const map = DataRegistry.map(this.save.currentMapId);
    this.transitioning = false;
    this.transitionCooldownUntil = this.time.now + 250;
    this.encounterCooldownUntil = this.time.now + 1000;
    this.encounterDistanceAccumulator = 0;
    this.npcs = [];
    this.worldColliders = [];
    this.tiledMap = undefined;
    this.tiledLayers.clear();
    this.tiledTallGrassLayer = undefined;
    this.tiledInteractions = [];
    this.nearbyTiledInteraction = undefined;
    this.tiledZones = [];
    this.activeTiledZoneIds.clear();
    this.registry.remove('world.echoReserveAvailable');
    this.registry.remove('world.activeSanctuaryId');
    this.ledgeJump = undefined;
    this.ledgeJumpCooldownUntil = 0;
    this.nearbyNpc = undefined;
    this.dialogueChoiceIndex = 0;
    this.dialogueNavDirection = 'none';
    this.pendingDuelStart = undefined;
    this.storyEchoVisual = undefined;
    this.affinityTutorialLayer = undefined;
    this.affinityTutorialStep = 0;
    this.npcEventLock = false;
    this.playerTrail = [];

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBackgroundColor('#172026');
    this.cameras.main.fadeIn(150, 20, 15, 28);

    this.createMapBackground(map);
    this.ensurePlayerAnimations();
    this.createPlayer(this.save.playerPosition.x, this.save.playerPosition.y);
    this.veigarSecrets = new VeigarSecretController(this, this.save, this.player, (dialogue) => this.beginWorldDialogue(dialogue));
    this.resetPlayerTrail();
    if (map.tiled) {
      this.configureTiledMapGameplay();
    } else {
      for (const rect of map.collisions) this.createCollision(rect);
      for (const zone of map.encounterZones) this.createEncounterZone(zone);
      for (const transition of map.transitions) this.createTransition(transition);
    }
    this.createNpcs(map.id);
    this.time.delayedCall(260, () => this.maybeOpenPendingWorldDialogue());
    this.time.delayedCall(420, () => this.maybeTriggerBandleFirstEcho());

    this.inputManager = new InputManager(this);
    this.sprintController = new SprintController(this, this.save, this.player, this.inputManager);
    if (this.input.keyboard) {
      this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
      this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Pixel art should not interpolate camera scroll between subpixels.
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setRoundPixels(true);

    const areaPlate = this.add.rectangle(234, 135, 214, 28, UI.colors.panel, 0.78)
      .setOrigin(0, 0)
      .setStrokeStyle(1, UI.colors.borderSoft, 0.78)
      .setScrollFactor(0)
      .setDepth(3000);
    areaPlate.setAlpha(0.88);
    this.add.text(244, 141, map.name.toUpperCase(), {
      fontFamily: UI.font.family, fontSize: UI.font.small, fontStyle: 'bold', color: UI.text.primary
    }).setScrollFactor(0).setDepth(3001);

    this.createMenuButton();
    this.veigarSecrets.createRuntime();
    this.time.delayedCall(720, () => this.veigarSecrets.maybeShowHint());
    this.maybeLaunchDoubleBattleSandbox();

    this.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => {
        if (!this.transitioning && !this.dialogueLayer) SaveService.save(this.save);
      }
    });
  }

  update(_time: number, delta: number): void {
    if (!this.player || this.transitioning) return;

    if (this.ledgeJump) {
      this.updateLedgeJump();
      return;
    }

    const keyboardInteract = Boolean(
      (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) ||
      (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey))
    );
    const actionA = keyboardInteract || this.inputManager.consumeActionA();
    const actionB = this.inputManager.consumeActionB();
    const menuPressed = this.inputManager.consumeMenu();
    const escapePressed = Boolean(this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey));

    if (this.affinityTutorialLayer) {
      for (const npc of this.npcs) this.stopNpc(npc);
      this.player.body.setVelocity(0, 0);
      this.updatePlayerVisual('none');
      this.handleAffinityTutorialInput(actionA, actionB || escapePressed);
      return;
    }

    if (this.dialogueLayer) {
      for (const npc of this.npcs) this.stopNpc(npc);
      this.player.body.setVelocity(0, 0);
      this.updatePlayerVisual('none');
      this.handleDialogueInput(actionA, actionB || escapePressed);
      return;
    }

    if (this.npcEventLock) {
      for (const npc of this.npcs) this.stopNpc(npc);
      this.player.body.setVelocity(0, 0);
      this.updatePlayerVisual('none');
      return;
    }

    if ((this.menuKey && Phaser.Input.Keyboard.JustDown(this.menuKey)) || escapePressed || menuPressed) {
      this.openMenu();
      return;
    }

    if (actionA && this.nearbyTiledInteraction) {
      this.handleTiledInteraction(this.nearbyTiledInteraction);
      return;
    }

    if (actionA && this.nearbyNpc) {
      this.beginNpcInteraction(this.nearbyNpc);
      return;
    }

    this.player.body.setVelocity(0, 0);
    const direction = this.inputManager.direction;
    if (direction !== 'none' && this.tryStartLedgeJump(direction)) return;
    const movementSpeed = this.sprintController.update(delta, direction);
    if (direction === 'left') { this.player.body.setVelocityX(-movementSpeed); this.lastFacing = 'left'; }
    else if (direction === 'right') { this.player.body.setVelocityX(movementSpeed); this.lastFacing = 'right'; }
    else if (direction === 'up') { this.player.body.setVelocityY(-movementSpeed); this.lastFacing = 'up'; }
    else if (direction === 'down') { this.player.body.setVelocityY(movementSpeed); this.lastFacing = 'down'; }

    this.updatePlayerVisual(direction);
    this.playerVisual.anims.timeScale = direction === 'none' ? 1 : movementSpeed / this.moveSpeed;
    this.recordPlayerTrail();
    this.updateNpcs();
    this.updateNpcDuelSight();
    if (this.npcEventLock || this.dialogueLayer) return;
    this.updateNpcAutoTalk();
    if (this.dialogueLayer || this.npcEventLock) return;
    this.updateNpcGuides();
    if (this.dialogueLayer || this.npcEventLock) return;
    this.updateFollowerCompletions();
    if (this.transitioning || this.dialogueLayer) return;
    this.updateNearbyNpc();
    this.updateNearbyTiledInteraction();
    this.updateTiledZones();
    if (this.dialogueLayer) return;
    this.veigarSecrets.update(delta);
    if (!this.veigarSecrets.chasingFlame) this.updateEncounterState(delta);
    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
  }

  private handleDialogueInput(actionA: boolean, actionB: boolean): void {
    if (actionB) {
      this.closeDialogue();
      return;
    }

    const node = this.dialogueNode;
    if (!node) return;
    const atEnd = this.dialogueLineIndex >= node.lines.length - 1;
    const hasChoices = atEnd && Boolean(node.choices?.length);
    const direction = this.inputManager.direction;

    if (hasChoices && direction !== 'none' && this.dialogueNavDirection === 'none') {
      const choices = node.choices ?? [];
      const delta = direction === 'up' || direction === 'left' ? -1 : 1;
      this.dialogueChoiceIndex = Phaser.Math.Wrap(this.dialogueChoiceIndex + delta, 0, choices.length);
      this.renderDialogue();
    }
    this.dialogueNavDirection = direction;

    if (!actionA) return;
    if (hasChoices) {
      const choice = node.choices?.[this.dialogueChoiceIndex];
      if (choice) this.chooseDialogue(choice.nextNodeId);
      return;
    }
    this.advanceDialogue();
  }

  private createMapBackground(map: MapDefinition): void {
    if (map.tiled) {
      this.createTiledMap(map);
      return;
    }

    const { id: mapId, width, height } = map;
    if (mapId === 'bandle-village') {
      this.add.image(0, 0, 'bandle-village-bg').setOrigin(0).setDisplaySize(width, height).setDepth(0);
      return;
    }
    if (mapId === 'bandle-house-01') {
      this.add.rectangle(0, 0, width, height, 0x3b2a24).setOrigin(0).setDepth(0);
      this.add.rectangle(24, 38, width - 48, height - 62, 0xb98959).setOrigin(0).setStrokeStyle(7, 0xd7b978).setDepth(1);
      this.add.rectangle(62, 78, 130, 64, 0x5c3d32).setOrigin(0).setDepth(2);
      this.add.rectangle(334, 80, 118, 50, 0x4e6a55).setOrigin(0).setDepth(2);
      this.add.rectangle(64, 238, 92, 70, 0x6b4e38).setOrigin(0).setDepth(2);
      this.add.rectangle(344, 222, 92, 88, 0x74503a).setOrigin(0).setDepth(2);
      this.add.ellipse(256, 184, 144, 84, 0x714b34).setStrokeStyle(5, 0xe2bf80).setDepth(2);
      this.add.text(256, 58, 'INTERIOR PROVISIONAL', {
        fontFamily: UI.font.family, fontSize: UI.font.body, color: '#fff1bd'
      }).setOrigin(0.5).setDepth(3);
      return;
    }
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(width, height).setDepth(0);
  }

  private createTiledMap(map: MapDefinition): void {
    const definition = map.tiled;
    if (!definition) return;

    const tilemap = this.make.tilemap({ key: definition.key });
    const tilesets = definition.tilesets.map((entry) => {
      const tileset = tilemap.addTilesetImage(entry.name, entry.key);
      if (!tileset) throw new Error(`No se pudo vincular el tileset "${entry.name}" en "${map.id}".`);
      return tileset;
    });

    const layerDepths: Array<[string, number]> = [
      ['Ground', 0],
      ['Paths', 6.5],
      ['GroundDetails', 2],
      ['VillageDetails', 2],
      ['SanctuaryFloor', 3],
      ['Decoration', 4],
      ['Decorations', 4],
      ['Structures', 5],
      ['Obstacles', 6],
      ['TallGrass', 7],
      ['Ledges_down', 8],
      ['Ledges_left', 8],
      ['Ledges_right', 8],
      ['AbovePlayer', 2000]
    ];

    const depths = new Map(layerDepths);
    const layerOccurrences = new Map<string, number>();
    for (const [index, data] of tilemap.layers.entries()) {
      const name = data.name;
      const depth = depths.get(name);
      if (depth === undefined) continue;
      // Names need not be unique in Tiled. Use the layer index so both
      // AbovePlayer layers in Dark Forest are rendered in their map order.
      const layer = tilemap.createLayer(index, tilesets, 0, 0);
      if (!layer) continue;
      const occurrence = layerOccurrences.get(name) ?? 0;
      layerOccurrences.set(name, occurrence + 1);
      layer.setDepth(depth + occurrence * 0.01);
      if (!this.tiledLayers.has(name)) this.tiledLayers.set(name, layer);
      if (name === 'TallGrass') this.tiledTallGrassLayer = layer;
    }

    this.tiledMap = tilemap;
  }

  private configureTiledMapGameplay(): void {
    const pathLayer = this.tiledLayers.get('Paths');
    for (const [name, layer] of this.tiledLayers) {
      if (name !== 'Obstacles' && !this.tiledLayerBooleanProperty(layer, 'collides')) continue;
      layer.forEachTile((tile) => {
        if (tile.index < 0) return;
        const pathTile = name === 'Obstacles' ? pathLayer?.getTileAt(tile.x, tile.y) : null;
        if (pathTile && pathTile.index >= 0) return;
        this.createCollision({ x: tile.pixelX, y: tile.pixelY, width: tile.width, height: tile.height });
      });
    }

    // A Path tile can make a bridge deck walkable over an obstacle, but it
    // cannot describe which side of the bridge is a drop. Tiled BridgeRails
    // mark only those edges; the ends stay open for entering and leaving.
    for (const rail of this.tiledMap?.getObjectLayer('BridgeRails')?.objects ?? []) {
      if (rail.width && rail.height) {
        this.createCollision({ x: rail.x ?? 0, y: rail.y ?? 0, width: rail.width, height: rail.height });
      }
    }

    this.createOneWayLedgeColliders('Ledges_down', 'down');
    this.createOneWayLedgeColliders('Ledges_left', 'left');
    this.createOneWayLedgeColliders('Ledges_right', 'right');
    this.createTiledPortals();
    this.createTiledInteractions();
    this.createTiledZones();
  }

  private tiledLayerBooleanProperty(layer: Phaser.Tilemaps.TilemapLayerBase, name: string): boolean {
    const properties = (layer.layer as { properties?: unknown }).properties;
    if (Array.isArray(properties)) {
      const entry = properties.find((property) =>
        typeof property === 'object' && property !== null && (property as { name?: unknown }).name === name
      ) as { value?: unknown } | undefined;
      return entry?.value === true;
    }
    if (properties && typeof properties === 'object') {
      return (properties as Record<string, unknown>)[name] === true;
    }
    return false;
  }

  private createOneWayLedgeColliders(layerName: string, direction: Facing): void {
    const layer = this.tiledLayers.get(layerName);
    if (!layer) return;

    layer.forEachTile((tile) => {
      if (tile.index < 0) return;
      const collider = this.add.rectangle(
        tile.pixelX + tile.width / 2,
        tile.pixelY + tile.height / 2,
        tile.width,
        tile.height,
        0x000000,
        0
      );
      this.physics.add.existing(collider, true);
      this.physics.add.collider(
        this.player,
        collider,
        undefined,
        () => !this.isMovingInDirection(direction),
        this
      );
    });
  }

  private isMovingInDirection(direction: Facing): boolean {
    const velocity = this.player.body.velocity;
    if (direction === 'down') return velocity.y > 0;
    if (direction === 'up') return velocity.y < 0;
    if (direction === 'left') return velocity.x < 0;
    return velocity.x > 0;
  }

  private tryStartLedgeJump(direction: Facing): boolean {
    if (this.time.now < this.ledgeJumpCooldownUntil || direction === 'up') return false;

    const layerName = direction === 'down'
      ? 'Ledges_down'
      : direction === 'left'
        ? 'Ledges_left'
        : 'Ledges_right';
    const layer = this.tiledLayers.get(layerName);
    if (!layer) return false;

    const halfWidth = this.player.body.halfWidth;
    const halfHeight = this.player.body.halfHeight;
    const probeOffsetX = direction === 'left' ? -(halfWidth + 4) : direction === 'right' ? halfWidth + 4 : 0;
    const probeOffsetY = direction === 'down' ? halfHeight + 4 : 0;
    const tile = layer.getTileAtWorldXY(this.player.x + probeOffsetX, this.player.y + probeOffsetY);
    if (!tile || tile.index < 0) return false;

    let targetX = this.player.x;
    let targetY = this.player.y;
    if (direction === 'down') targetY = tile.pixelY + tile.height + halfHeight + 3;
    else if (direction === 'left') targetX = tile.pixelX - halfWidth - 3;
    else targetX = tile.pixelX + tile.width + halfWidth + 3;

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY);
    const durationMs = Phaser.Math.Clamp(Math.round((distance / 185) * 1000), 220, 300);

    this.ledgeJump = {
      direction,
      startX: this.player.x,
      startY: this.player.y,
      targetX,
      targetY,
      startedAt: this.time.now,
      durationMs
    };
    this.ledgeJumpCooldownUntil = this.time.now + durationMs + 140;
    this.encounterDistanceAccumulator = 0;
    this.encounterCooldownUntil = Math.max(this.encounterCooldownUntil, this.time.now + durationMs + 180);
    this.lastFacing = direction;
    this.playerVisual.anims.stop();
    this.playerVisual.setFrame(PLAYER_IDLE_FRAME[direction]);

    const velocityScale = 1000 / durationMs;
    this.player.body.setVelocity(
      (targetX - this.player.x) * velocityScale,
      (targetY - this.player.y) * velocityScale
    );
    return true;
  }

  private updateLedgeJump(): void {
    const jump = this.ledgeJump;
    if (!jump) return;

    const progress = Phaser.Math.Clamp((this.time.now - jump.startedAt) / jump.durationMs, 0, 1);
    const arcHeight = Math.sin(progress * Math.PI) * 12;
    this.playerVisual
      .setPosition(Math.round(this.player.x), Math.round(this.player.y + 6 - arcHeight))
      .setDisplaySize(PLAYER_VISUAL_SIZE, PLAYER_VISUAL_SIZE)
      .setDepth(100 + Math.round(this.player.y));

    if (progress < 1) return;

    this.player.body.reset(jump.targetX, jump.targetY);
    this.player.body.setVelocity(0, 0);
    this.ledgeJump = undefined;
    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
    this.updatePlayerVisual('none');
  }

  private createTiledPortals(): void {
    const objectLayer = this.tiledMap?.getObjectLayer('Portals');
    for (const object of objectLayer?.objects ?? []) {
      const targetMapId = this.tiledObjectStringProperty(object, 'targetMap');
      if (!targetMapId) continue;
      const targetSpawnId = this.tiledObjectStringProperty(object, 'targetSpawn');
      const requiredFlag = this.tiledObjectStringProperty(object, 'requiredFlag');
      const blockedMessage = this.tiledObjectStringProperty(object, 'blockedMessage');
      const target = this.resolveMapSpawn(targetMapId, targetSpawnId);
      this.createTransition({
        id: object.name || `portal-${object.id}`,
        targetMapId,
        x: Math.round(object.x ?? 0),
        y: Math.round(object.y ?? 0),
        width: Math.max(1, Math.round(object.width || 32)),
        height: Math.max(1, Math.round(object.height || 32)),
        targetX: target.x,
        targetY: target.y,
        conditions: requiredFlag ? [{ type: 'flag', id: requiredFlag }] : undefined,
        blockedMessage
      });
    }
  }

  private tiledObjectStringProperty(
    object: { properties?: Array<{ name: string; value: unknown }> },
    name: string
  ): string | undefined {
    const value = object.properties?.find((entry) => entry.name === name)?.value;
    return typeof value === 'string' ? value : undefined;
  }

  private tiledObjectBooleanProperty(
    object: { properties?: Array<{ name: string; value: unknown }> },
    name: string
  ): boolean {
    return object.properties?.find((entry) => entry.name === name)?.value === true;
  }

  private tiledObjectNumberProperty(
    object: { properties?: Array<{ name: string; value: unknown }> },
    name: string
  ): number | undefined {
    const value = object.properties?.find((entry) => entry.name === name)?.value;
    return typeof value === 'number' ? value : undefined;
  }

  private tiledObjectRect(object: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    gid?: number;
  }): { x: number; y: number; width: number; height: number } {
    const width = Math.max(1, object.width || 32);
    const height = Math.max(1, object.height || 32);
    const x = object.x ?? 0;
    // Tiled stores Tile Object Y at the bottom edge; rectangles use top-left.
    const y = object.gid !== undefined ? (object.y ?? 0) - height : (object.y ?? 0);
    return { x, y, width, height };
  }

  private createTiledInteractions(): void {
    const objectLayer = this.tiledMap?.getObjectLayer('Interactions');
    this.tiledInteractions = [];

    for (const object of objectLayer?.objects ?? []) {
      const action = this.tiledObjectStringProperty(object, 'action');
      if (!action) continue;

      const id = object.name || `interaction-${object.id}`;
      const pickupFlag = this.pickupFlagId(id);
      if ((action === 'pickup_item' || action === 'pickup_gold') && this.save.worldProgress.flags.includes(pickupFlag)) {
        continue;
      }
      if (this.veigarSecrets.shouldSkipInteraction(action)) continue;

      const rect = this.tiledObjectRect(object as {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        gid?: number;
      });
      const interaction: TiledInteractionRuntime = {
        id,
        name: object.name || 'Interacción',
        action,
        ...rect,
        requiresInteract: this.tiledObjectBooleanProperty(object, 'requiresInteract'),
        itemId: this.tiledObjectStringProperty(object, 'itemId'),
        quantity: this.tiledObjectNumberProperty(object, 'quantity'),
        gold: this.tiledObjectNumberProperty(object, 'gold')
      };

      if (action === 'pickup_item' || action === 'pickup_gold') {
        interaction.visual = this.createPickupMarker(interaction);
        interaction.body = this.createPickupCollider(interaction);
      }
      this.veigarSecrets.decorate(interaction);
      this.tiledInteractions.push(interaction);
    }
  }

  private createTiledZones(): void {
    const objectLayer = this.tiledMap?.getObjectLayer('Zones');
    this.tiledZones = [];
    this.activeTiledZoneIds.clear();

    for (const object of objectLayer?.objects ?? []) {
      const action = this.tiledObjectStringProperty(object, 'action');
      if (!action) continue;
      const rect = this.tiledObjectRect(object as {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        gid?: number;
      });
      this.tiledZones.push({
        id: object.name || `zone-${object.id}`,
        action,
        ...rect,
        ellipse: Boolean((object as { ellipse?: boolean }).ellipse),
        trigger: this.tiledObjectStringProperty(object, 'trigger'),
        sanctuaryId: this.tiledObjectStringProperty(object, 'sanctuaryId'),
        healEchos: this.tiledObjectBooleanProperty(object, 'healEchos'),
        enableEchoReserve: this.tiledObjectBooleanProperty(object, 'enableEchoReserve'),
        setCheckpoint: this.tiledObjectBooleanProperty(object, 'setCheckpoint')
      });
    }
  }

  private isInsideTiledZone(zone: TiledZoneRuntime): boolean {
    if (!zone.ellipse) {
      return this.player.x >= zone.x && this.player.x <= zone.x + zone.width
        && this.player.y >= zone.y && this.player.y <= zone.y + zone.height;
    }

    const rx = zone.width / 2;
    const ry = zone.height / 2;
    if (rx <= 0 || ry <= 0) return false;
    const cx = zone.x + rx;
    const cy = zone.y + ry;
    const dx = (this.player.x - cx) / rx;
    const dy = (this.player.y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }

  private updateTiledZones(): void {
    const inside = this.tiledZones.filter((zone) => this.isInsideTiledZone(zone));
    const nextIds = new Set(inside.map((zone) => zone.id));

    for (const zone of inside) {
      if (!this.activeTiledZoneIds.has(zone.id)) this.enterTiledZone(zone);
    }

    const reserveZone = inside.find((zone) => zone.action === 'sanctuary' && zone.enableEchoReserve);
    if (reserveZone) {
      this.registry.set('world.echoReserveAvailable', true);
      this.registry.set('world.activeSanctuaryId', reserveZone.sanctuaryId ?? reserveZone.id);
    } else {
      this.registry.remove('world.echoReserveAvailable');
      this.registry.remove('world.activeSanctuaryId');
    }

    this.activeTiledZoneIds = nextIds;
  }

  private enterTiledZone(zone: TiledZoneRuntime): void {
    if (zone.action !== 'sanctuary') return;

    const checkpointX = Math.round(this.player.x);
    const checkpointY = Math.round(this.player.y);
    const sanctuaryId = zone.sanctuaryId ?? zone.id;

    if (zone.setCheckpoint) {
      this.save.checkpoint = {
        sanctuaryId,
        name: 'Santuario de Soraka · Bandle',
        mapId: this.save.currentMapId,
        x: checkpointX,
        y: checkpointY
      };
    }
    if (zone.healEchos) SanctuaryService.healParty(this.save);

    this.save.playerPosition = { x: checkpointX, y: checkpointY };
    SaveService.save(this.save);

    if (zone.trigger === 'enter') {
      const reserveLine = zone.enableEchoReserve
        ? 'La Reserva de Ecos está disponible mientras permanezcas en el santuario.'
        : 'La energía del santuario permanece a tu alrededor.';
      this.beginWorldDialogue({
        id: `sanctuary-enter-${zone.id}`,
        startNodeId: 'inicio',
        nodes: [{
          id: 'inicio',
          speaker: 'SANTUARIO',
          lines: ['La energía del santuario restaura a tus Ecos.', reserveLine]
        }]
      });
    }
  }

  private createPickupMarker(interaction: TiledInteractionRuntime): Phaser.GameObjects.Container {
    const centerX = interaction.x + interaction.width / 2;
    const centerY = interaction.y + interaction.height / 2;
    const visualWidth = Math.max(12, interaction.width);
    const visualHeight = Math.max(12, interaction.height);
    const shadow = this.add.ellipse(0, 7, Math.max(14, visualWidth * 0.78), 6, 0x07131e, 0.28);

    const textureKey = interaction.action === 'pickup_gold'
      ? 'world-gold-bag'
      : interaction.itemId
        ? `item-${interaction.itemId}`
        : undefined;

    if (textureKey && this.textures.exists(textureKey)) {
      const image = this.add.image(0, 7, textureKey)
        .setOrigin(0.5, 1)
        .setDisplaySize(visualWidth, visualHeight);
      const container = this.add.container(centerX, centerY, [shadow, image])
        .setDepth(120 + Math.round(centerY));
      this.tweens.add({
        targets: image,
        y: 3,
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      return container;
    }

    const marker = interaction.action === 'pickup_gold'
      ? this.add.ellipse(0, -3, 18, 18, 0xc89532, 1).setStrokeStyle(2, 0x5f431d)
      : this.add.rectangle(0, -3, 13, 13, 0xc94d57, 1).setAngle(45).setStrokeStyle(2, 0x6c2630);
    return this.add.container(centerX, centerY, [shadow, marker]).setDepth(120 + Math.round(centerY));
  }

  private createPickupCollider(interaction: TiledInteractionRuntime): PhysicsRectangle {
    const centerX = interaction.x + interaction.width / 2;
    const centerY = interaction.y + interaction.height / 2;
    const bodyWidth = Math.min(interaction.width, 24);
    const bodyHeight = Math.min(interaction.height, 20);
    const body = this.add.rectangle(centerX, centerY + 3, bodyWidth, bodyHeight, 0x000000, 0);
    this.physics.add.existing(body, true);
    const physicsBody = body as PhysicsRectangle;
    this.worldColliders.push(body);
    this.physics.add.collider(this.player, physicsBody);
    return physicsBody;
  }

  private pickupFlagId(interactionId: string): string {
    return `pickup:${this.save.currentMapId}:${interactionId}`;
  }

  private updateNearbyTiledInteraction(): void {
    let best: TiledInteractionRuntime | undefined;
    let bestDistance = 80;

    for (const interaction of this.tiledInteractions) {
      if (!interaction.requiresInteract) continue;
      const nearestX = Phaser.Math.Clamp(this.player.x, interaction.x, interaction.x + interaction.width);
      const nearestY = Phaser.Math.Clamp(this.player.y, interaction.y, interaction.y + interaction.height);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestX, nearestY);
      if (distance < bestDistance) {
        best = interaction;
        bestDistance = distance;
      }
    }

    this.nearbyTiledInteraction = best;
  }

  private handleTiledInteraction(interaction: TiledInteractionRuntime): void {
    if (interaction.action === 'open_crafting') {
      if (!this.save.worldProgress.flags.includes('story:crafting-unlocked')) return;
      this.player.body.setVelocity(0, 0);
      this.playerVisual.anims.stop();
      this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
      SaveService.save(this.save);
      this.registry.set('shop.returnScene', 'WorldScene');
      this.scene.start('CraftingScene');
      return;
    }
    if (interaction.action === 'heal_ecos') {
      this.useTiledSanctuary(interaction);
      return;
    }
    if (interaction.action === 'pickup_item') {
      this.collectItemPickup(interaction);
      return;
    }
    if (interaction.action === 'pickup_gold') {
      this.collectGoldPickup(interaction);
      return;
    }
    const secretResult = this.veigarSecrets.handle(interaction);
    if (secretResult.handled) {
      if (secretResult.consume) {
        this.tiledInteractions = this.tiledInteractions.filter((entry) => entry !== interaction);
        this.nearbyTiledInteraction = undefined;
      }
      return;
    }
    console.warn(`Interacción Tiled no soportada: "${interaction.action}" (${interaction.id}).`);
  }

  private useTiledSanctuary(interaction: TiledInteractionRuntime): void {
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    const checkpointX = Math.round(this.player.x);
    const checkpointY = Math.round(this.player.y);
    this.save.playerPosition = { x: checkpointX, y: checkpointY };

    SanctuaryService.activate(this.save, {
      sanctuaryId: interaction.id || 'bandle-soraka-shrine',
      name: 'Santuario de Soraka · Bandle',
      mapId: this.save.currentMapId,
      x: checkpointX,
      y: checkpointY
    });
    SaveService.save(this.save);
    this.beginWorldDialogue(DataRegistry.dialogue('soraka-sanctuary-prayer'));
  }

  private collectItemPickup(interaction: TiledInteractionRuntime): void {
    if (!interaction.itemId) {
      console.warn(`Pickup "${interaction.id}" no tiene itemId.`);
      return;
    }

    const quantity = Math.max(1, Math.round(interaction.quantity ?? 1));
    const item = DataRegistry.item(interaction.itemId);
    WorldActionService.apply(this.save, { type: 'add-item', itemId: interaction.itemId, quantity });
    this.finishPickup(interaction, `Has encontrado: ${item.name}${quantity > 1 ? ` ×${quantity}` : ''}.`);
  }

  private collectGoldPickup(interaction: TiledInteractionRuntime): void {
    const amount = Math.max(1, Math.round(interaction.gold ?? interaction.quantity ?? 0));
    if (amount <= 0) {
      console.warn(`Pickup "${interaction.id}" no tiene una cantidad de oro válida.`);
      return;
    }

    WorldActionService.apply(this.save, { type: 'add-gold', amount });
    this.finishPickup(interaction, `Has encontrado ${amount} de oro.`);
  }

  private finishPickup(interaction: TiledInteractionRuntime, message: string): void {
    const flagId = this.pickupFlagId(interaction.id);
    WorldActionService.apply(this.save, { type: 'set-flag', id: flagId, value: true });
    QuestService.recordEvent(this.save, { type: 'interact', targetId: interaction.id });
    SaveService.save(this.save);

    interaction.visual?.destroy(true);
    if (interaction.body) {
      this.worldColliders = this.worldColliders.filter((collider) => collider !== interaction.body);
      interaction.body.destroy();
    }
    this.tiledInteractions = this.tiledInteractions.filter((entry) => entry !== interaction);
    this.nearbyTiledInteraction = undefined;

    const dialogue: DialogueDefinition = {
      id: `pickup-dialogue-${interaction.id}`,
      startNodeId: 'inicio',
      nodes: [{ id: 'inicio', speaker: 'Hallazgo', lines: [message] }]
    };
    this.beginWorldDialogue(dialogue);
  }

  private beginWorldDialogue(dialogue: DialogueDefinition): void {
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.dialogueDefinition = dialogue;
    this.dialogueNode = dialogue.nodes.find((entry) => entry.id === dialogue.startNodeId);
    this.dialogueLineIndex = 0;
    this.dialogueChoiceIndex = 0;
    this.dialogueNavDirection = 'none';
    this.renderDialogue();
  }

  private resolveMapSpawn(mapId: string, spawnId?: string): { x: number; y: number } {
    const targetMap = DataRegistry.map(mapId);
    if (spawnId && targetMap.spawns?.[spawnId]) {
      return { x: targetMap.spawns[spawnId].x, y: targetMap.spawns[spawnId].y };
    }

    if (spawnId && targetMap.tiled) {
      const cached = this.cache.tilemap.get(targetMap.tiled.key) as unknown;
      const source = (cached as { data?: unknown } | undefined)?.data ?? cached;
      const tiledJson = source as {
        layers?: Array<{
          name?: string;
          type?: string;
          objects?: Array<{ name?: string; x?: number; y?: number; width?: number; height?: number }>;
        }>;
      };
      const spawnLayer = tiledJson?.layers?.find((layer) => layer.type === 'objectgroup' && layer.name === 'Spawns');
      const spawnObject = spawnLayer?.objects?.find((object) => object.name === spawnId);
      if (spawnObject) {
        return {
          x: Math.round((spawnObject.x ?? 0) + (spawnObject.width ?? 0) / 2),
          y: Math.round((spawnObject.y ?? 0) + (spawnObject.height ?? 0) / 2)
        };
      }
    }

    if (spawnId) console.warn(`Spawn "${spawnId}" no existe en "${mapId}". Usando spawn por defecto.`);
    return { ...targetMap.spawn };
  }

  private resolveNpcPosition(placement: NpcDefinition): { x: number; y: number } {
    if (placement.spawnId && this.tiledMap) {
      const object = this.tiledMap.getObjectLayer('NpcSpawns')?.objects.find((entry) => entry.name === placement.spawnId);
      if (object) {
        return {
          x: Math.round((object.x ?? 0) + (object.width ?? 0) / 2),
          y: Math.round((object.y ?? 0) + (object.height ?? 0) / 2)
        };
      }
      console.warn(`NpcSpawn "${placement.spawnId}" no existe en "${placement.mapId}". Usando coordenadas de respaldo.`);
    }
    return { x: placement.x, y: placement.y };
  }

  private createNpcs(mapId: string): void {
    const localPlacements = DataRegistry.npcs(mapId).filter((npc) => ConditionService.matchesAll(this.save, npc.conditions));
    const activeFollowers = DataRegistry.npcs()
      .filter((npc) => npc.follower && this.isFollowerActive(npc))
      .filter((npc) => ConditionService.matchesAll(this.save, npc.conditions));
    const placements = [...localPlacements, ...activeFollowers]
      .filter((npc, index, entries) => entries.findIndex((entry) => entry.id === npc.id) === index);

    for (const placement of placements) {
      const following = this.isFollowerActive(placement);
      const position = following ? this.followerSpawnPosition(placement) : this.resolveNpcPosition(placement);
      const config = placement.championId ? DataRegistry.visualOverworld(placement.championId, placement.formId) : undefined;
      const actorPreset = placement.actorId ? DataRegistry.worldActor(placement.actorId) : undefined;
      const bodyWidth = config?.hitboxWidth ?? actorPreset?.hitboxWidth ?? 18;
      const bodyHeight = config?.hitboxHeight ?? actorPreset?.hitboxHeight ?? 14;
      const body = this.add.rectangle(position.x, position.y, bodyWidth, bodyHeight, 0xffffff, 0);
      this.physics.add.existing(body);
      const physicsBody = body as PhysicsRectangle;
      physicsBody.body.setSize(bodyWidth, bodyHeight);
      physicsBody.body.setCollideWorldBounds(true);
      physicsBody.body.setImmovable(!following);

      const isSolid = actorPreset?.solid !== false;
      const playerCollider = isSolid && !following ? this.physics.add.collider(this.player, physicsBody) : undefined;
      for (const collider of this.worldColliders) this.physics.add.collider(physicsBody, collider);
      if (isSolid) {
        for (const other of this.npcs) this.physics.add.collider(physicsBody, other.body);
      }

      const championTextureKey = placement.championId
        ? (placement.formId
          ? placement.championId + '-form-' + placement.formId + '-overworld'
          : placement.championId + '-overworld')
        : null;
      const actorTextureKey = placement.actorId ? `world-actor-${placement.actorId}` : null;
      const textureKey = championTextureKey ?? actorTextureKey;

      let visual: Phaser.GameObjects.Container;
      let sprite: Phaser.GameObjects.Sprite | undefined;

      if (textureKey && this.textures.exists(textureKey)) {
        const scale = placement.overworldScale ?? config?.overworldScale ?? actorPreset?.overworldScale ?? 1.4;
        const offsetY = config?.offsetY ?? actorPreset?.offsetY ?? 0;
        const rotated = Math.abs(placement.visualRotation ?? 0) > 0.01;
        sprite = this.add.sprite(0, rotated ? -6 + offsetY : 7 + offsetY, textureKey, PLAYER_IDLE_FRAME[placement.facing])
          .setOrigin(0.5, rotated ? 0.5 : 1)
          .setScale(scale)
          .setAngle(placement.visualRotation ?? 0);
        visual = this.add.container(position.x, position.y, [sprite]);
      } else if (placement.visualType === 'merchant') {
        const bodyShape = this.add.ellipse(0, -5, 30, 29, 0x725744, 1).setStrokeStyle(2, 0x3f3029);
        const scarf = this.add.rectangle(0, -12, 25, 6, UI.colors.goldDark, 1).setStrokeStyle(1, UI.colors.gold);
        const head = this.add.circle(0, -25, 12, 0x8a6a52, 1).setStrokeStyle(2, 0x3f3029);
        const muzzle = this.add.ellipse(0, -21, 18, 10, 0xc4a37f, 1).setStrokeStyle(1, 0x60483a);
        const nose = this.add.circle(0, -24, 2.5, 0x251b17, 1);
        const earLeft = this.add.circle(-9, -31, 4, 0x725744, 1).setStrokeStyle(1, 0x3f3029);
        const earRight = this.add.circle(9, -31, 4, 0x725744, 1).setStrokeStyle(1, 0x3f3029);
        const satchel = this.add.rectangle(13, 0, 10, 14, 0x6d4d22, 1).setStrokeStyle(1, UI.colors.goldDark);
        visual = this.add.container(position.x, position.y, [bodyShape, scarf, earLeft, earRight, head, muzzle, nose, satchel]);
      } else if (placement.visualType === 'sanctuary') {
        const base = this.add.ellipse(0, 2, 42, 17, 0x49647a, 1).setStrokeStyle(2, 0xd7c7ff);
        const lower = this.add.rectangle(0, -8, 27, 22, 0x647f96, 1).setStrokeStyle(2, 0x2d4558);
        const pillar = this.add.rectangle(0, -27, 13, 28, 0x7892aa, 1).setStrokeStyle(2, 0x334d61);
        const halo = this.add.circle(0, -43, 15, 0x7a66c8, 0.22).setStrokeStyle(2, 0xcbbcff, 0.9);
        const star = this.add.star(0, -43, 8, 4, 10, 0xf2e6ff, 1).setStrokeStyle(1, 0x9b7ee8);
        const gem = this.add.circle(0, -21, 4, 0xc6a9ff, 1).setStrokeStyle(1, 0xf3eaff);
        visual = this.add.container(position.x, position.y, [base, lower, pillar, halo, star, gem]);
      } else if (actorPreset?.kind === 'creature') {
        const color = actorPreset.color;
        const bodyShape = this.add.ellipse(0, -5, 24, 17, color, 1).setStrokeStyle(2, 0x24313a);
        const head = this.add.circle(8, -10, 7, color, 1).setStrokeStyle(2, 0x24313a);
        const eye = this.add.circle(10, -12, 1.5, 0xf5f2dc, 1);
        visual = this.add.container(position.x, position.y, [bodyShape, head, eye]);
      } else {
        const color = actorPreset?.color ?? placement.color;
        const torso = this.add.rectangle(0, -5, 18, 22, color, 1).setStrokeStyle(2, 0x132630);
        const head = this.add.circle(0, -20, 10, 0xe9c68d, 1).setStrokeStyle(2, 0x4a3229);
        const earLeft = this.add.ellipse(-10, -21, 7, 12, color, 1).setStrokeStyle(1, 0x4a3229);
        const earRight = this.add.ellipse(10, -21, 7, 12, color, 1).setStrokeStyle(1, 0x4a3229);
        visual = this.add.container(position.x, position.y, [torso, earLeft, earRight, head]);
      }

      visual.setDepth(100 + position.y);
      const runtime: NpcRuntime = {
        placement,
        body: physicsBody,
        visual,
        sprite,
        facing: placement.facing,
        homeX: position.x,
        homeY: position.y,
        patrolIndex: 0,
        pauseUntil: this.time.now + Phaser.Math.Between(250, 900),
        playerCollider
      };
      this.npcs.push(runtime);

      if (sprite && placement.ambientMotion?.type === 'bounce') {
        const baseY = sprite.y;
        this.tweens.add({
          targets: sprite,
          y: baseY - (placement.ambientMotion.amount ?? 5),
          duration: placement.ambientMotion.durationMs ?? 520,
          yoyo: true,
          repeat: -1,
          hold: 120,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }


  private isFollowerActive(placement: NpcDefinition): boolean {
    return Boolean(placement.follower && this.save.worldProgress.flags.includes(placement.follower.activeFlag));
  }

  private followerSpawnPosition(placement: NpcDefinition): { x: number; y: number } {
    const distance = placement.follower?.followDistance ?? 46;
    const offset: Record<Facing, { x: number; y: number }> = {
      up: { x: 0, y: distance },
      down: { x: 0, y: -distance },
      left: { x: distance, y: 0 },
      right: { x: -distance, y: 0 }
    };
    const delta = offset[this.lastFacing];
    return { x: this.player.x + delta.x, y: this.player.y + delta.y };
  }

  private resetPlayerTrail(): void {
    const forward: Record<Facing, { x: number; y: number }> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    const direction = forward[this.lastFacing];
    this.playerTrail = [];
    for (let distance = 72; distance >= 0; distance -= 8) {
      this.playerTrail.push({
        x: this.player.x - direction.x * distance,
        y: this.player.y - direction.y * distance
      });
    }
  }

  private recordPlayerTrail(): void {
    const last = this.playerTrail[this.playerTrail.length - 1];
    if (!last) {
      this.resetPlayerTrail();
      return;
    }
    if (Phaser.Math.Distance.Between(last.x, last.y, this.player.x, this.player.y) < 6) return;
    this.playerTrail.push({ x: this.player.x, y: this.player.y });
    if (this.playerTrail.length > 120) this.playerTrail.shift();
  }

  private followerTrailTarget(distanceBehind: number): { x: number; y: number } {
    if (this.playerTrail.length === 0) return { x: this.player.x, y: this.player.y };
    let remaining = distanceBehind;
    for (let i = this.playerTrail.length - 1; i > 0; i -= 1) {
      const newer = this.playerTrail[i];
      const older = this.playerTrail[i - 1];
      const segment = Phaser.Math.Distance.Between(newer.x, newer.y, older.x, older.y);
      if (segment <= 0.01) continue;
      if (remaining <= segment) {
        const ratio = remaining / segment;
        return {
          x: Phaser.Math.Linear(newer.x, older.x, ratio),
          y: Phaser.Math.Linear(newer.y, older.y, ratio)
        };
      }
      remaining -= segment;
    }
    return { ...this.playerTrail[0] };
  }

  private updateFollowerNpc(npc: NpcRuntime): void {
    const follower = npc.placement.follower;
    if (!follower || !this.isFollowerActive(npc.placement)) return;

    npc.playerCollider?.destroy();
    npc.playerCollider = undefined;
    npc.body.body.setImmovable(false);

    const target = this.followerTrailTarget(follower.followDistance ?? 46);
    const dx = target.x - npc.body.x;
    const dy = target.y - npc.body.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 170) {
      npc.body.body.reset(target.x, target.y);
      npc.facing = this.lastFacing;
      this.syncNpcVisual(npc, false);
      return;
    }
    if (distance < 3) {
      this.stopNpc(npc);
      return;
    }

    const speed = follower.speed ?? 126;
    npc.body.body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    this.syncNpcVisual(npc, true);
  }

  private completeFollowersForMap(mapId: string): void {
    for (const npc of DataRegistry.npcs()) {
      const follower = npc.follower;
      if (!follower || follower.completeOnMapId !== mapId || !this.isFollowerActive(npc)) continue;
      if (follower.completeAtX !== undefined && follower.completeAtY !== undefined) continue;
      WorldActionService.applyAll(this.save, [
        { type: 'set-flag', id: follower.activeFlag, value: false },
        ...(follower.completionFlag ? [{ type: 'set-flag' as const, id: follower.completionFlag, value: true }] : []),
        ...(follower.completionActions ?? [])
      ]);
      if (follower.completionDialogueId) {
        this.registry.set('world.pendingDialogueId', follower.completionDialogueId);
      }
    }
  }

  private isGuideActive(placement: NpcDefinition): boolean {
    return Boolean(placement.guide && this.save.worldProgress.flags.includes(placement.guide.activeFlag));
  }

  private updateGuideNpc(npc: NpcRuntime): void {
    const guide = npc.placement.guide;
    if (!guide || !this.isGuideActive(npc.placement)) return;
    const points = guide.points;
    if (points.length === 0 || npc.patrolIndex >= points.length) {
      this.stopNpc(npc);
      return;
    }

    const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
    if (playerDistance > (guide.maxLeadDistance ?? 130)) {
      this.stopNpc(npc);
      return;
    }

    const target = points[npc.patrolIndex];
    const dx = target.x - npc.body.x;
    const dy = target.y - npc.body.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      npc.body.body.reset(target.x, target.y);
      npc.patrolIndex += 1;
      this.stopNpc(npc);
      return;
    }

    const speed = guide.speed ?? 76;
    npc.body.body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    this.syncNpcVisual(npc, true);
  }

  private updateNpcGuides(): void {
    if (this.dialogueLayer || this.npcEventLock || this.transitioning) return;
    for (const npc of this.npcs) {
      const guide = npc.placement.guide;
      if (!guide || !this.isGuideActive(npc.placement) || npc.guideArrivalTriggered) continue;
      if (npc.patrolIndex < guide.points.length) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
      if (distance > (guide.arrivalRadius ?? 88)) continue;

      npc.guideArrivalTriggered = true;
      WorldActionService.applyAll(this.save, [
        { type: 'set-flag', id: guide.activeFlag, value: false },
        ...(guide.completionFlag ? [{ type: 'set-flag' as const, id: guide.completionFlag, value: true }] : [])
      ]);
      SaveService.save(this.save);
      this.beginDialogueDefinition(npc, DataRegistry.dialogue(guide.arrivalDialogueId));
      return;
    }
  }

  private updateFollowerCompletions(): void {
    for (const npc of this.npcs) {
      const follower = npc.placement.follower;
      if (!follower || !this.isFollowerActive(npc.placement)) continue;
      if (follower.completeOnMapId !== this.save.currentMapId) continue;
      if (follower.completeAtX === undefined || follower.completeAtY === undefined) continue;
      const completionRadius = follower.completionRadius ?? 72;
      const playerDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        follower.completeAtX,
        follower.completeAtY
      );
      const followerDistance = Phaser.Math.Distance.Between(
        npc.body.x,
        npc.body.y,
        follower.completeAtX,
        follower.completeAtY
      );
      if (playerDistance > completionRadius || followerDistance > completionRadius + 58) continue;

      WorldActionService.applyAll(this.save, [
        { type: 'set-flag', id: follower.activeFlag, value: false },
        ...(follower.completionFlag ? [{ type: 'set-flag' as const, id: follower.completionFlag, value: true }] : []),
        ...(follower.completionActions ?? [])
      ]);
      if (follower.completionDialogueId) {
        this.registry.set('world.pendingDialogueId', follower.completionDialogueId);
      }
      this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
      SaveService.save(this.save);
      this.transitioning = true;
      this.player.body.setVelocity(0, 0);
      this.time.delayedCall(120, () => this.scene.restart());
      return;
    }
  }

  private beginAutoTalkApproach(npc: NpcRuntime): void {
    const config = npc.placement.autoTalk;
    if (!config) return;
    this.npcEventLock = true;
    this.player.body.setVelocity(0, 0);
    this.updatePlayerVisual('none');
    for (const entry of this.npcs) this.stopNpc(entry);

    const beginMove = (): void => {
      const startX = npc.body.x;
      const startY = npc.body.y;
      const dx = this.player.x - startX;
      const dy = this.player.y - startY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const travel = Math.max(0, distance - (config.approachDistance ?? 42));
      const targetX = startX + (dx / distance) * travel;
      const targetY = startY + (dy / distance) * travel;
      const state = { progress: 0 };

      if (travel < 4) {
        this.npcEventLock = false;
        this.beginNpcInteraction(npc);
        return;
      }

      this.tweens.add({
        targets: state,
        progress: 1,
        duration: Phaser.Math.Clamp((travel / (config.speed ?? 150)) * 1000, 180, 1050),
        ease: 'Quad.easeOut',
        onUpdate: () => {
          const x = Phaser.Math.Linear(startX, targetX, state.progress);
          const y = Phaser.Math.Linear(startY, targetY, state.progress);
          npc.body.body.reset(x, y);
          const stepDx = targetX - x;
          const stepDy = targetY - y;
          npc.facing = Math.abs(stepDx) > Math.abs(stepDy)
            ? (dx < 0 ? 'left' : 'right')
            : (dy < 0 ? 'up' : 'down');
          this.syncNpcVisual(npc, true);
        },
        onComplete: () => {
          npc.body.body.reset(targetX, targetY);
          this.stopNpc(npc);
          this.npcEventLock = false;
          this.beginNpcInteraction(npc);
        }
      });
    };

    if (!config.showAlert) {
      beginMove();
      return;
    }

    const marker = this.add.text(npc.body.x, npc.body.y - 54, '!', {
      fontFamily: UI.font.family,
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#fff4b5',
      stroke: '#3a2b19',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(2600);
    this.tweens.add({
      targets: marker,
      y: marker.y - 10,
      duration: 140,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    this.time.delayedCall(320, () => {
      marker.destroy();
      beginMove();
    });
  }

  private startNpcDuelSequence(npc: NpcRuntime, duelId: string): void {
    const duel = DataRegistry.duel(duelId);
    const transform = duel.preBattleTransformation;
    if (!transform || !npc.sprite || !npc.placement.championId) {
      this.startNpcDuel(npc, duelId);
      return;
    }

    this.npcEventLock = true;
    this.player.body.setVelocity(0, 0);
    this.updatePlayerVisual('none');
    for (const entry of this.npcs) this.stopNpc(entry);

    const sprite = npc.sprite;
    const championId = npc.placement.championId;
    const duration = transform.durationMs ?? 1100;
    const targetTexture = championId + '-form-' + transform.formId + '-overworld';
    const targetVisual = DataRegistry.visualOverworld(championId, transform.formId);
    const targetScale = targetVisual?.overworldScale ?? sprite.scaleX * 1.35;
    this.tweens.killTweensOf(sprite);

    this.cameras.main.shake(Math.round(duration * 0.72), 0.005);
    this.tweens.add({
      targets: sprite,
      x: { from: -3, to: 3 },
      duration: 65,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: npc.visual,
      y: npc.visual.y - 9,
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut'
    });

    this.time.delayedCall(Math.round(duration * 0.38), () => {
      this.cameras.main.flash(180, 255, 142, 70);
      this.cameras.main.shake(320, 0.012);
      sprite.x = 0;
      if (this.textures.exists(targetTexture)) sprite.setTexture(targetTexture);
      sprite.setFrame(PLAYER_IDLE_FRAME.down);
      sprite.setScale(targetScale * 0.62);
      this.tweens.add({
        targets: sprite,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: Math.round(duration * 0.42),
        ease: 'Back.easeOut'
      });
    });

    this.time.delayedCall(duration, () => {
      npc.facing = 'down';
      this.syncNpcVisual(npc, false);
      this.npcEventLock = false;
      this.startNpcDuel(npc, duelId);
    });
  }

  private updateNpcDuelSight(): void {
    if (this.dialogueLayer || this.npcEventLock || this.transitioning || this.ledgeJump) return;
    for (const npc of this.npcs) {
      const sight = npc.placement.duelSight;
      const service = npc.placement.service;
      if (!sight || service?.type !== 'duel' || npc.alerted) continue;
      if (this.save.worldProgress.flags.includes(this.duelVictoryFlag(service.duelId))) continue;
      if (!this.save.party.some((champion) => champion.currentHp > 0)) continue;
      if (!this.npcCanSeePlayer(npc, sight.rangeTiles * 32, sight.laneWidth ?? 22)) continue;
      this.beginTrainerAlert(npc);
      return;
    }
  }

  private npcCanSeePlayer(npc: NpcRuntime, range: number, laneWidth: number): boolean {
    const dx = this.player.x - npc.body.x;
    const dy = this.player.y - npc.body.y;
    const halfLane = laneWidth / 2;
    const inLane =
      (npc.facing === 'right' && dx > 0 && dx <= range && Math.abs(dy) <= halfLane) ||
      (npc.facing === 'left' && dx < 0 && -dx <= range && Math.abs(dy) <= halfLane) ||
      (npc.facing === 'down' && dy > 0 && dy <= range && Math.abs(dx) <= halfLane) ||
      (npc.facing === 'up' && dy < 0 && -dy <= range && Math.abs(dx) <= halfLane);
    if (!inLane) return false;

    const sightLine = new Phaser.Geom.Line(npc.body.x, npc.body.y, this.player.x, this.player.y);
    for (const collider of this.worldColliders) {
      if (Phaser.Geom.Intersects.LineToRectangle(sightLine, collider.getBounds())) return false;
    }
    return true;
  }

  private beginTrainerAlert(npc: NpcRuntime): void {
    npc.alerted = true;
    this.npcEventLock = true;
    this.player.body.setVelocity(0, 0);
    this.updatePlayerVisual('none');
    for (const entry of this.npcs) this.stopNpc(entry);

    const marker = this.add.text(npc.body.x, npc.body.y - 54, '!', {
      fontFamily: UI.font.family,
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#fff4b5',
      stroke: '#3a2b19',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(2600);

    this.tweens.add({
      targets: marker,
      y: marker.y - 10,
      duration: 150,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.time.delayedCall(360, () => {
      marker.destroy();
      this.approachTrainerForDuel(npc, () => {
        this.npcEventLock = false;
        if (!this.dialogueLayer && !this.transitioning) this.beginNpcInteraction(npc);
      });
    });
  }

  private approachTrainerForDuel(npc: NpcRuntime, onComplete: () => void): void {
    const startX = npc.body.x;
    const startY = npc.body.y;
    const dx = this.player.x - startX;
    const dy = this.player.y - startY;
    const axisDistance = npc.facing === 'left' || npc.facing === 'right' ? Math.abs(dx) : Math.abs(dy);
    const travel = Phaser.Math.Clamp(axisDistance - 42, 0, 96);
    if (travel < 4) {
      onComplete();
      return;
    }

    const directionX = npc.facing === 'right' ? 1 : npc.facing === 'left' ? -1 : 0;
    const directionY = npc.facing === 'down' ? 1 : npc.facing === 'up' ? -1 : 0;
    const targetX = startX + directionX * travel;
    const targetY = startY + directionY * travel;
    const state = { progress: 0 };

    this.tweens.add({
      targets: state,
      progress: 1,
      duration: Phaser.Math.Clamp((travel / 112) * 1000, 140, 720),
      ease: 'Linear',
      onUpdate: () => {
        const x = startX + (targetX - startX) * state.progress;
        const y = startY + (targetY - startY) * state.progress;
        npc.body.body.reset(x, y);
        this.syncNpcVisual(npc, true);
      },
      onComplete: () => {
        npc.body.body.reset(targetX, targetY);
        this.stopNpc(npc);
        onComplete();
      }
    });
  }

  private updateNpcAutoTalk(): void {
    if (this.dialogueLayer || this.npcEventLock || this.transitioning || this.ledgeJump) return;
    for (const npc of this.npcs) {
      const autoTalk = npc.placement.autoTalk;
      if (!autoTalk || npc.autoTalkTriggered) continue;
      if (autoTalk.onceFlag && this.save.worldProgress.flags.includes(autoTalk.onceFlag)) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
      if (distance > autoTalk.radius) continue;

      npc.autoTalkTriggered = true;
      if (autoTalk.onceFlag) {
        WorldActionService.applyAll(this.save, [{ type: 'set-flag', id: autoTalk.onceFlag, value: true }]);
        SaveService.save(this.save);
      }
      if (autoTalk.approach) {
        this.beginAutoTalkApproach(npc);
      } else {
        this.beginNpcInteraction(npc);
      }
      return;
    }
  }

  private updateNpcs(): void {
    const now = this.time.now;
    for (const npc of this.npcs) {
      if (this.isFollowerActive(npc.placement)) {
        this.updateFollowerNpc(npc);
        continue;
      }
      if (this.isGuideActive(npc.placement)) {
        this.updateGuideNpc(npc);
        continue;
      }
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
      const blockedByLegacyMap = map.collisions.some((rect) =>
        x >= rect.x - 12 && x <= rect.x + rect.width + 12 && y >= rect.y - 12 && y <= rect.y + rect.height + 12
      );
      const blockedByTiledMap = [...this.tiledLayers].some(([name, layer]) => {
        if (name !== 'Obstacles' && !this.tiledLayerBooleanProperty(layer, 'collides')) return false;
        const tile = layer.getTileAtWorldXY(x, y);
        if (!tile || tile.index < 0) return false;
        if (name === 'Obstacles') {
          const pathTile = this.tiledLayers.get('Paths')?.getTileAtWorldXY(x, y);
          if (pathTile && pathTile.index >= 0) return false;
        }
        return true;
      });
      if (!blockedByLegacyMap && !blockedByTiledMap) return { x, y };
    }
    return undefined;
  }

  private updateNearbyNpc(): void {
    let best: NpcRuntime | undefined;
    let bestDistance = 54;
    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.body.x, npc.body.y);
      if (distance < bestDistance) { best = npc; bestDistance = distance; }
    }
    this.nearbyNpc = best;
  }

  private beginNpcInteraction(npc: NpcRuntime): void {
    QuestService.recordEvent(this.save, { type: 'talk', targetId: npc.placement.id });
    WorldActionService.applyAll(this.save, npc.placement.onTalkActions);
    SaveService.save(this.save);
    const service = npc.placement.service;
    if (service?.type === 'shop') {
      this.openNpcShop(npc, service.shopId);
      return;
    }
    if (service?.type === 'sanctuary') {
      this.useSanctuary(npc, service.sanctuaryId);
      return;
    }
    if (service?.type === 'quest') {
      this.useQuestNpc(npc, service.questId);
      return;
    }
    if (service?.type === 'duel') {
      this.useDuelNpc(npc, service.duelId);
      return;
    }
    this.beginNpcDialogue(npc);
  }

  private useDuelNpc(npc: NpcRuntime, duelId: string): void {
    const duel = DataRegistry.duel(duelId);
    const victoryFlag = this.duelVictoryFlag(duel.id);

    if (this.save.worldProgress.flags.includes(victoryFlag)) {
      const dialogue = duel.victoryDialogueId
        ? DataRegistry.dialogue(duel.victoryDialogueId)
        : (npc.placement.dialogueId ? DataRegistry.dialogue(npc.placement.dialogueId) : undefined);
      if (dialogue) this.beginDialogueDefinition(npc, dialogue);
      return;
    }

    if (duel.introDialogueId) {
      this.pendingDuelStart = { npc, duelId };
      this.beginDialogueDefinition(npc, DataRegistry.dialogue(duel.introDialogueId));
      return;
    }

    this.startNpcDuel(npc, duelId);
  }

  private duelVictoryFlag(duelId: string): string {
    return `duel:${duelId}:won`;
  }

  private startNpcDuel(npc: NpcRuntime, duelId: string): void {
    if (this.transitioning || this.ledgeJump || this.dialogueLayer) return;
    const duel = DataRegistry.duel(duelId);
    const healthyParty = this.save.party.filter((champion) => champion.currentHp > 0);
    if (healthyParty.length === 0 || duel.team.length === 0) return;

    const enemyTeam = duel.team.map((entry) => this.createDuelChampion(entry));
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.facePlayerToward(npc.body.x, npc.body.y);
    this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
    SaveService.save(this.save);

    if (duel.format === 'double') {
      if (healthyParty.length < 2 || enemyTeam.length < 2) {
        this.transitioning = false;
        this.beginWorldDialogue({
          id: `duel-double-unavailable-${duel.id}`,
          startNodeId: 'inicio',
          nodes: [{
            id: 'inicio',
            speaker: duel.trainerName,
            lines: ['Para un combate doble necesitas al menos dos Ecos disponibles.']
          }]
        });
        return;
      }

      this.registry.set('battle.doubleSession', {
        id: `duel:${duel.id}`,
        format: 'double',
        kind: 'duel',
        playerTeam: healthyParty,
        enemyTeam,
        trainerName: duel.trainerName,
        rewardGold: duel.rewardGold,
        victoryFlag: this.duelVictoryFlag(duel.id),
        allowFlee: false,
        allowLink: false,
        persistPlayerState: true,
        returnScene: 'WorldScene'
      });
      this.cameras.main.flash(220, 255, 240, 175);
      this.cameras.main.shake(160, 0.0024);
      this.time.delayedCall(320, () => this.scene.start('DoubleBattleScene'));
      return;
    }

    const firstAvailable = healthyParty[0];
    this.registry.remove('battle.activeInstanceId');
    this.registry.remove('battle.participants');
    this.registry.set('battle.activeInstanceId', firstAvailable.instanceId);
    this.registry.set('battle.participants', [firstAvailable.instanceId]);
    this.registry.set('pendingDuel', {
      duelId: duel.id,
      trainerName: duel.trainerName,
      rewardGold: duel.rewardGold,
      victoryFlag: this.duelVictoryFlag(duel.id),
      enemyIndex: 0,
      team: enemyTeam
    });
    this.registry.set('pendingEncounter', {
      zoneId: `duel:${duel.id}`,
      wildChampion: enemyTeam[0]
    });

    this.cameras.main.flash(220, 255, 240, 175);
    this.cameras.main.shake(160, 0.0024);
    this.time.delayedCall(320, () => this.scene.start('BattleScene'));
  }

  private maybeLaunchDoubleBattleSandbox(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('doubleBattle') !== '1') return;
    url.searchParams.delete('doubleBattle');
    window.history.replaceState({}, '', url.toString());

    const clones = this.save.party
      .filter((champion) => champion.currentHp > 0)
      .slice(0, 3)
      .map((champion) => this.cloneChampionForSandbox(champion));
    const fallbacks: DuelEchoDefinition[] = [
      { championId: 'garen', mastery: 8 },
      { championId: 'teemo', mastery: 8 },
      { championId: 'tristana', mastery: 8 }
    ];
    while (clones.length < 3) {
      clones.push(this.createDuelChampion(fallbacks[clones.length]));
    }

    const enemyTeam = [
      this.createDuelChampion({ championId: 'poppy', mastery: 7 }),
      this.createDuelChampion({ championId: 'rumble', mastery: 7 }),
      this.createDuelChampion({ championId: 'corki', mastery: 8 })
    ];

    this.registry.set('battle.doubleSession', {
      id: 'sandbox-double-battle',
      format: 'double',
      kind: 'sandbox',
      playerTeam: clones,
      enemyTeam,
      trainerName: 'Vinculador de pruebas',
      rewardGold: 0,
      allowFlee: false,
      allowLink: false,
      persistPlayerState: false,
      returnScene: 'WorldScene'
    });

    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.time.delayedCall(250, () => this.scene.start('DoubleBattleScene'));
  }

  private cloneChampionForSandbox(champion: ChampionInstance): ChampionInstance {
    return {
      ...champion,
      instanceId: crypto.randomUUID(),
      skillRanks: { ...champion.skillRanks },
      runeTraits: champion.runeTraits.map((entry) => ({ ...entry })),
      equippedItems: [...champion.equippedItems]
    };
  }

  private createDuelChampion(entry: DuelEchoDefinition): ChampionInstance {
    const mastery = Math.max(1, Math.round(entry.mastery));
    const champion: ChampionInstance = {
      instanceId: crypto.randomUUID(),
      championId: entry.championId,
      mastery,
      masteryExperience: 0,
      skillRanks: ProgressionService.defaultSkillRanks(mastery),
      unspentSkillPoints: ProgressionService.earnedManualSkillPoints(mastery),
      currentHp: 1,
      runeTraits: [],
      equippedItems: []
    };
    champion.currentHp = BattleEngine.statsFor(champion, entry.formId).hp;
    return champion;
  }

  private openNpcShop(npc: NpcRuntime, shopId: string): void {
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.facePlayerToward(npc.body.x, npc.body.y);
    this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
    SaveService.save(this.save);
    this.registry.set('shop.activeId', shopId);
    this.registry.set('shop.vendorName', npc.placement.name);
    this.registry.set('shop.returnScene', 'WorldScene');
    this.scene.start('ShopScene');
  }

  private useSanctuary(npc: NpcRuntime, sanctuaryId: string): void {
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.facePlayerToward(npc.body.x, npc.body.y);
    const checkpointX = Math.round(this.player.x);
    const checkpointY = Math.round(this.player.y);
    this.save.playerPosition = { x: checkpointX, y: checkpointY };
    SanctuaryService.activate(this.save, {
      sanctuaryId,
      name: `${npc.placement.name} · Bandle`,
      mapId: this.save.currentMapId,
      x: checkpointX,
      y: checkpointY
    });
    SaveService.save(this.save);
    this.beginNpcDialogue(npc);
  }

  private useQuestNpc(npc: NpcRuntime, questId: string): void {
    const quest = DataRegistry.quest(questId);
    let progress = QuestService.progress(this.save, questId);
    let dialogueId: string | undefined;

    if (!progress) {
      QuestService.start(this.save, questId);
      progress = QuestService.progress(this.save, questId);
      dialogueId = quest.dialogues?.start;
    } else if (progress.status === 'ready') {
      dialogueId = quest.dialogues?.ready;
      QuestService.complete(this.save, questId);
      progress = QuestService.progress(this.save, questId);
    } else if (progress.status === 'completed') {
      dialogueId = quest.dialogues?.completed;
    } else {
      dialogueId = quest.dialogues?.active;
    }

    SaveService.save(this.save);
    const dialogue = dialogueId ? DataRegistry.dialogue(dialogueId) : this.fallbackQuestDialogue(npc, quest.title, progress?.status ?? 'active');
    this.beginDialogueDefinition(npc, dialogue);
  }

  private fallbackQuestDialogue(npc: NpcRuntime, questTitle: string, status: 'active' | 'ready' | 'completed'): DialogueDefinition {
    const line = status === 'completed'
      ? `Misión completada: ${questTitle}.`
      : status === 'ready'
        ? 'Has completado los objetivos. Vuelve para cerrar la misión.'
        : 'Sigue los objetivos del diario y vuelve cuando hayas terminado.';
    return {
      id: `fallback-${npc.placement.id}`,
      startNodeId: 'inicio',
      nodes: [{ id: 'inicio', speaker: npc.placement.name, lines: [line] }]
    };
  }

  private beginNpcDialogue(npc: NpcRuntime): void {
    let dialogueId = this.isFollowerActive(npc.placement)
      ? (npc.placement.follower?.travelDialogueId ?? npc.placement.dialogueId)
      : npc.placement.dialogueId;
    if (npc.placement.id === 'rumble-treehouse-first' && this.save.worldProgress.flags.includes('ability:sprint-unlocked')) {
      dialogueId = 'rumble-treehouse-after';
    }
    if (npc.placement.id === 'veigar-house-reveal' && this.save.worldProgress.flags.includes('secret:veigar-echo-awakened')) {
      dialogueId = 'veigar-house-after';
    }
    if (!dialogueId) return;
    this.beginDialogueDefinition(npc, DataRegistry.dialogue(dialogueId));
  }

  private beginDialogueDefinition(npc: NpcRuntime, dialogue: DialogueDefinition): void {
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.facePlayerToward(npc.body.x, npc.body.y);
    this.dialogueDefinition = dialogue;
    this.dialogueNode = dialogue.nodes.find((entry) => entry.id === dialogue.startNodeId);
    this.dialogueLineIndex = 0;
    this.dialogueChoiceIndex = 0;
    this.dialogueNavDirection = 'none';
    this.renderDialogue();
  }

  private facePlayerToward(x: number, y: number): void {
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    this.lastFacing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    this.updatePlayerVisual('none');
  }

  private renderDialogue(): void {
    this.dialogueLayer?.destroy(true);
    const node = this.dialogueNode;
    if (!node) return;

    const x = 20;
    const y = 350;
    const width = 920;
    const height = 170;
    const mode = inferNarrativeMode(node.speaker, node.mode);
    const frame = createNarrativeFrame(
      this,
      x,
      y,
      width,
      height,
      node.speaker,
      node.lines[this.dialogueLineIndex] ?? '',
      mode,
      node.portraitChampionId
    );
    const objects = frame.objects;

    const atEnd = this.dialogueLineIndex >= node.lines.length - 1;
    if (atEnd && node.choices?.length) {
      node.choices.forEach((choice, index) => {
        const choiceY = y + 62 + index * 42;
        const selected = index === this.dialogueChoiceIndex;
        const box = this.add.rectangle(x + 780, choiceY, 250, 34, selected ? UI.colors.goldDark : UI.colors.panelRaised, 0.98)
          .setStrokeStyle(selected ? 3 : 2, selected ? UI.colors.gold : UI.colors.borderSoft)
          .setInteractive({ useHandCursor: true });
        const text = this.add.text(x + 780, choiceY, `${selected ? '◆ ' : ''}${choice.label.toUpperCase()}`, {
          fontFamily: UI.font.family,
          fontSize: '16px',
          fontStyle: 'bold',
          color: selected ? UI.text.gold : UI.text.primary
        }).setOrigin(0.5);
        box.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.dialogueChoiceIndex = index;
          this.chooseDialogue(choice.nextNodeId);
        });
        objects.push(box, text);
      });
    } else {
      const box = this.add.rectangle(x + 810, y + 136, 180, 36, UI.colors.panelRaised, 0.98)
        .setStrokeStyle(2, atEnd ? UI.colors.gold : UI.colors.border)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x + 810, y + 136, atEnd ? 'CERRAR' : 'SIGUIENTE', {
        fontFamily: UI.font.family,
        fontSize: '16px',
        fontStyle: 'bold',
        color: atEnd ? UI.text.gold : UI.text.primary
      }).setOrigin(0.5);
      box.on(Phaser.Input.Events.POINTER_DOWN, () => this.advanceDialogue());
      objects.push(box, text);
    }

    const dialogueZoom = this.cameras.main.zoom;
    const dialogueHudX = (this.cameras.main.width / 2) * (1 - 1 / dialogueZoom);
    const dialogueHudY = (this.cameras.main.height / 2) * (1 - 1 / dialogueZoom);
    this.dialogueLayer = this.add.container(dialogueHudX, dialogueHudY, objects)
      .setScrollFactor(0)
      .setScale(1 / dialogueZoom)
      .setDepth(10000);
  }

  private advanceDialogue(): void {
    const node = this.dialogueNode;
    if (!node) return;
    if (this.dialogueLineIndex < node.lines.length - 1) {
      this.dialogueLineIndex += 1;
      this.dialogueChoiceIndex = 0;
      this.renderDialogue();
      return;
    }
    if (node.choices?.length) return;
    this.applyDialogueActions(node.actions);
    this.closeDialogue();
  }

  private chooseDialogue(nodeId: string): void {
    const current = this.dialogueNode;
    if (current) {
      const choice = current.choices?.find((entry) => entry.nextNodeId === nodeId);
      this.applyDialogueActions(current.actions);
      this.applyDialogueActions(choice?.actions);
    }

    const next = this.dialogueDefinition?.nodes.find((entry) => entry.id === nodeId);
    if (!next) {
      this.closeDialogue();
      return;
    }
    this.dialogueNode = next;
    this.dialogueLineIndex = 0;
    this.dialogueChoiceIndex = 0;
    this.dialogueNavDirection = 'none';
    this.renderDialogue();
  }

  private applyDialogueActions(actions: readonly import('../data/types').WorldActionDefinition[] | undefined): void {
    if (!actions?.length) return;
    if (WorldActionService.applyAll(this.save, actions)) SaveService.save(this.save);
  }

  private playEchoReleaseFromNpc(championId: string): void {
    const npc = this.npcs.find((entry) => entry.placement.championId === championId);
    if (!npc) return;
    const config = DataRegistry.visualOverworld(championId, npc.placement.formId);
    const scale = npc.placement.overworldScale ?? config?.overworldScale ?? 0.52;
    this.npcEventLock = true;
    const started = EchoReleaseEffect.play(
      this,
      championId,
      {
        x: npc.body.x,
        y: npc.body.y,
        facingFrame: PLAYER_IDLE_FRAME[npc.facing],
        scale
      },
      { x: this.player.x, y: this.player.y },
      () => { this.npcEventLock = false; }
    );
    if (!started) this.npcEventLock = false;
  }

  private closeDialogue(): void {
    const closedDialogueId = this.dialogueDefinition?.id;
    const duelStart = this.pendingDuelStart;
    this.pendingDuelStart = undefined;
    if (this.storyEchoVisual) {
      const echoVisual = this.storyEchoVisual;
      this.storyEchoVisual = undefined;
      this.tweens.add({
        targets: echoVisual,
        alpha: 0,
        scale: 0.82,
        duration: 220,
        ease: 'Sine.easeIn',
        onComplete: () => echoVisual.destroy(true)
      });
    }
    this.dialogueLayer?.destroy(true);
    this.dialogueLayer = undefined;
    this.dialogueDefinition = undefined;
    this.dialogueNode = undefined;
    this.dialogueLineIndex = 0;
    this.dialogueChoiceIndex = 0;
    this.dialogueNavDirection = 'none';
    this.updateNearbyNpc();
    this.updateNearbyTiledInteraction();

    if (duelStart) {
      this.startNpcDuelSequence(duelStart.npc, duelStart.duelId);
      return;
    }

    if (closedDialogueId === 'tristana-bandle-greeting') {
      this.maybeOpenAffinityTutorial();
    }
    if (closedDialogueId === 'rumble-treehouse-intro') {
      this.sprintController.refreshUi();
      this.time.delayedCall(80, () => this.playEchoReleaseFromNpc('rumble'));
    }
    if (closedDialogueId === 'veigar-house-reveal') {
      this.time.delayedCall(80, () => this.playEchoReleaseFromNpc('veigar'));
    }
    this.veigarSecrets.onDialogueClosed(closedDialogueId);
  }

  private maybeOpenAffinityTutorial(): void {
    if (!this.save.worldProgress.flags.includes('story:type-tutorial-pending')) return;
    if (this.save.worldProgress.flags.includes('story:type-tutorial-seen')) {
      WorldActionService.applyAll(this.save, [{ type: 'set-flag', id: 'story:type-tutorial-pending', value: false }]);
      SaveService.save(this.save);
      return;
    }
    this.affinityTutorialStep = 0;
    this.renderAffinityTutorial();
  }

  private handleAffinityTutorialInput(actionA: boolean, actionB: boolean): void {
    if (actionB) {
      this.closeAffinityTutorial();
      return;
    }
    if (!actionA) return;
    if (this.affinityTutorialStep >= 2) {
      this.closeAffinityTutorial();
      return;
    }
    this.affinityTutorialStep += 1;
    this.renderAffinityTutorial();
  }

  private renderAffinityTutorial(): void {
    this.affinityTutorialLayer?.destroy(true);
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(480, 270, 820, 420, UI.colors.panel, 0.99)
      .setStrokeStyle(3, UI.colors.gold);
    objects.push(panel);
    objects.push(this.add.text(480, 92, 'TRISTANA · TIPOS Y AFINIDADES', {
      fontFamily: UI.font.family,
      fontSize: '22px',
      fontStyle: 'bold',
      color: UI.text.gold
    }).setOrigin(0.5));

    const texture = this.textures.exists('tristana-overworld') ? 'tristana-overworld' : PLAYER_TEXTURE_KEY;
    const tristana = this.add.sprite(675, 300, texture, PLAYER_IDLE_FRAME.left)
      .setOrigin(0.5, 1)
      .setScale(texture === 'tristana-overworld' ? 0.95 : 0.72);
    objects.push(tristana);

    const step = this.affinityTutorialStep;
    const title = step === 0
      ? '1 · CADA ECO TIENE UNO O DOS TIPOS'
      : step === 1
        ? '2 · LOS TIPOS CREAN VENTAJAS Y DEBILIDADES'
        : '3 · LEE EL COMBATE ANTES DE ATACAR';
    objects.push(this.add.text(120, 138, title, {
      fontFamily: UI.font.family,
      fontSize: '16px',
      fontStyle: 'bold',
      color: UI.text.primary
    }));

    if (step === 0) {
      objects.push(this.add.text(120, 185,
        'Tristana es MARCIAL. Las habilidades ofensivas también pueden tener un tipo.\nNo basta con mirar el daño: importa contra qué tipo estás atacando.',
        { fontFamily: UI.font.family, fontSize: '17px', color: UI.text.primary, wordWrap: { width: 470 } }
      ));
      const badge = this.add.rectangle(300, 310, 190, 48, 0x17384a, 1).setStrokeStyle(2, UI.colors.borderSoft);
      const label = this.add.text(300, 310, 'MARCIAL', {
        fontFamily: UI.font.family, fontSize: '18px', fontStyle: 'bold', color: UI.text.accent
      }).setOrigin(0.5);
      objects.push(badge, label);
    } else if (step === 1) {
      const result = TypeEffectivenessService.multiplier('espiritual', ['marcial']);
      objects.push(this.add.text(120, 184,
        'Un ataque ESPIRITUAL golpea con ventaja a un objetivo MARCIAL.',
        { fontFamily: UI.font.family, fontSize: '17px', color: UI.text.primary, wordWrap: { width: 480 } }
      ));
      const attacker = this.add.rectangle(230, 300, 190, 48, 0x17384a, 1).setStrokeStyle(2, UI.colors.borderSoft);
      const attackerLabel = this.add.text(230, 300, 'ESPIRITUAL', {
        fontFamily: UI.font.family, fontSize: '16px', fontStyle: 'bold', color: UI.text.accent
      }).setOrigin(0.5);
      const resultLabel = this.add.text(420, 300, '▲  EFICAZ ×' + result.multiplier.toFixed(2).replace('.', ','), {
        fontFamily: UI.font.family, fontSize: '17px', fontStyle: 'bold', color: UI.text.gold
      }).setOrigin(0.5);
      objects.push(attacker, attackerLabel, resultLabel);
      this.tweens.add({ targets: [attacker, attackerLabel], x: '+=42', duration: 360, yoyo: true, ease: 'Quad.easeInOut' });
      this.tweens.add({ targets: tristana, alpha: { from: 1, to: 0.45 }, duration: 120, delay: 330, yoyo: true, repeat: 1 });
    } else {
      const result = TypeEffectivenessService.multiplier('marcial', ['runico']);
      objects.push(this.add.text(120, 178,
        'MARCIAL también es eficaz contra RÚNICO. En combate, ▲ indica ventaja y ▼ que el rival resiste.\nUsa esos avisos para cambiar de habilidad o de Eco antes de malgastar un turno.',
        { fontFamily: UI.font.family, fontSize: '17px', color: UI.text.primary, wordWrap: { width: 500 } }
      ));
      objects.push(this.add.text(300, 316, 'MARCIAL  →  RÚNICO', {
        fontFamily: UI.font.family, fontSize: '19px', fontStyle: 'bold', color: UI.text.accent
      }).setOrigin(0.5));
      objects.push(this.add.text(300, 354, '▲  EFICAZ ×' + result.multiplier.toFixed(2).replace('.', ','), {
        fontFamily: UI.font.family, fontSize: '17px', fontStyle: 'bold', color: UI.text.gold
      }).setOrigin(0.5));
    }

    objects.push(this.add.text(480, 447, step >= 2 ? 'A · CERRAR' : 'A · SIGUIENTE    B · CERRAR', {
      fontFamily: UI.font.family, fontSize: '14px', fontStyle: 'bold', color: UI.text.secondary
    }).setOrigin(0.5));

    const zoom = this.cameras.main.zoom;
    const hudX = (this.cameras.main.width / 2) * (1 - 1 / zoom);
    const hudY = (this.cameras.main.height / 2) * (1 - 1 / zoom);
    this.affinityTutorialLayer = this.add.container(hudX, hudY, objects)
      .setScrollFactor(0)
      .setScale(1 / zoom)
      .setDepth(12000);
  }

  private closeAffinityTutorial(): void {
    this.affinityTutorialLayer?.destroy(true);
    this.affinityTutorialLayer = undefined;
    WorldActionService.applyAll(this.save, [
      { type: 'set-flag', id: 'story:type-tutorial-pending', value: false },
      { type: 'set-flag', id: 'story:type-tutorial-seen', value: true }
    ]);
    SaveService.save(this.save);
  }

  private createMenuButton(): void {
    const button = this.add.circle(708, 150, 18, UI.colors.panel, 0.62)
      .setStrokeStyle(2, UI.colors.border, 0.62)
      .setScrollFactor(0)
      .setDepth(4000)
      .setInteractive({ useHandCursor: true });
    this.add.text(708, 150, '☰', {
      fontFamily: UI.font.family, fontSize: '16px', fontStyle: 'bold', color: UI.text.primary
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001).setAlpha(0.9);
    button.on(Phaser.Input.Events.POINTER_DOWN, () => this.openMenu());
  }

  private openMenu(): void {
    if (this.transitioning || this.ledgeJump || this.dialogueLayer) return;
    this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
    this.player.body.setVelocity(0, 0);
    this.scene.launch('MenuScene');
    this.scene.pause();
  }

  private ensurePlayerAnimations(): void {
    const create = (key: string, start: number, end: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, { start, end }),
        frameRate: 5,
        repeat: -1
      });
    };
    create(PLAYER_ANIMATIONS.down, 0, 2);
    create(PLAYER_ANIMATIONS.up, 3, 5);
    create(PLAYER_ANIMATIONS.left, 6, 8);
    create(PLAYER_ANIMATIONS.right, 9, 11);
  }

  private updatePlayerVisual(direction: MoveDirection): void {
    this.playerVisual.setPosition(Math.round(this.player.x), Math.round(this.player.y) + 6);
    this.playerVisual.setDisplaySize(PLAYER_VISUAL_SIZE, PLAYER_VISUAL_SIZE);
    this.playerVisual.setDepth(100 + Math.round(this.player.y));
    if (direction === 'none') {
      this.playerVisual.anims.stop();
      this.playerVisual.setFrame(PLAYER_IDLE_FRAME[this.lastFacing]);
      return;
    }
    this.playerVisual.anims.play(PLAYER_ANIMATIONS[direction], true);
  }

  private createPlayer(x: number, y: number): void {
    const body = this.add.rectangle(x, y, 16, 10, 0xffffff, 0);
    this.physics.add.existing(body);
    this.player = body as PhysicsRectangle;
    this.player.body.setSize(16, 10);
    this.player.body.setCollideWorldBounds(true);
    this.playerVisual = this.add.sprite(Math.round(x), Math.round(y) + 6, PLAYER_TEXTURE_KEY, PLAYER_IDLE_FRAME.down)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_VISUAL_SIZE, PLAYER_VISUAL_SIZE)
      .setDepth(100 + Math.round(y));
  }

  private createCollision(rect: RectDefinition): void {
    const collider = this.add.rectangle(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
      0x000000,
      0
    );
    this.physics.add.existing(collider, true);
    this.worldColliders.push(collider);
    this.physics.add.collider(this.player, collider);
  }

  private createEncounterZone(zone: EncounterZoneDefinition): void {
    this.add.zone(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.width, zone.height);
  }

  private createTransition(transition: TransitionDefinition): void {
    const zone = this.add.zone(
      transition.x + transition.width / 2,
      transition.y + transition.height / 2,
      transition.width,
      transition.height
    );
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone as PhysicsZone, () => {
      void this.handleTransition(transition);
    });
  }

  private async handleTransition(transition: TransitionDefinition): Promise<void> {
    if (this.transitioning || this.ledgeJump || this.time.now < this.transitionCooldownUntil || this.dialogueLayer) return;

    if (!ConditionService.matchesAll(this.save, transition.conditions ?? [])) {
      this.transitionCooldownUntil = this.time.now + 700;
      this.player.body.setVelocity(0, 0);
      this.playerVisual.anims.stop();
      if (transition.blockedMessage) {
        this.beginWorldDialogue({
          id: `transition-blocked-${transition.id}`,
          startNodeId: 'blocked',
          nodes: [{
            id: 'blocked',
            speaker: '',
            lines: [transition.blockedMessage]
          }]
        });
      }
      return;
    }

    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.encounterDistanceAccumulator = 0;
    this.cameras.main.fadeOut(160, 20, 15, 28);
    await new Promise<void>((resolve) => {
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
    });

    const previousMapId = this.save.currentMapId;
    this.save.currentMapId = transition.targetMapId;
    this.save.playerPosition = { x: transition.targetX, y: transition.targetY };
    this.syncWorldProgress(transition.targetMapId);
    this.completeFollowersForMap(transition.targetMapId);
    SaveService.save(this.save);

    if (transition.targetMapId === previousMapId) {
      this.player.setPosition(transition.targetX, transition.targetY);
      this.playerVisual.setPosition(Math.round(transition.targetX), Math.round(transition.targetY) + 6);
      this.resetPlayerTrail();
      for (const npc of this.npcs) {
        if (!this.isFollowerActive(npc.placement)) continue;
        const position = this.followerSpawnPosition(npc.placement);
        npc.body.body.reset(position.x, position.y);
        this.syncNpcVisual(npc, false);
      }
      this.cameras.main.fadeIn(160, 20, 15, 28);
      this.transitionCooldownUntil = this.time.now + 500;
      this.encounterCooldownUntil = this.time.now + 700;
      this.transitioning = false;
      return;
    }
    this.scene.restart();
  }

  private syncWorldProgress(mapId: string): void {
    this.save.worldProgress.currentRegionId = 'bandle-city';
    if (mapId === 'bandle-debug') this.save.worldProgress.currentZoneId = 'portal-clearing';
    if (mapId === 'bandle-tiled-test') {
      this.save.worldProgress.currentZoneId = 'bandle-route';
      if (!this.save.worldProgress.unlockedZones.includes('bandle-route')) {
        this.save.worldProgress.unlockedZones.push('bandle-route');
      }
    }
    const routeZoneId: Record<string, string> = { dark_forest: 'dark-forest', gnar_valley: 'gnar-valley', gnar_cave: 'gnar-cave', angar_corki: 'corki-hangar' };
    if (routeZoneId[mapId]) {
      this.save.worldProgress.currentZoneId = routeZoneId[mapId];
      if (!this.save.worldProgress.unlockedZones.includes(routeZoneId[mapId])) {
        this.save.worldProgress.unlockedZones.push(routeZoneId[mapId]);
      }
    }
    if (mapId === 'bandle-village' || mapId === 'bandle-house-01' || mapId === 'three-house' || mapId.startsWith('bandle_house_')) {
      this.save.worldProgress.currentZoneId = 'bandle-village';
      if (!this.save.worldProgress.unlockedZones.includes('bandle-village')) {
        this.save.worldProgress.unlockedZones.push('bandle-village');
      }
    }
    QuestService.recordEvent(this.save, { type: 'visit', targetId: this.save.worldProgress.currentZoneId });
  }

  private maybeOpenPendingWorldDialogue(): void {
    if (this.dialogueLayer || this.transitioning) return;
    const dialogueId = this.registry.get('world.pendingDialogueId') as string | undefined;
    if (!dialogueId) return;
    this.registry.remove('world.pendingDialogueId');
    this.beginWorldDialogue(DataRegistry.dialogue(dialogueId));
  }

  private maybeTriggerBandleFirstEcho(): void {
    if (this.save.worldProgress.currentRegionId !== 'bandle-city') return;
    if (this.save.worldProgress.currentZoneId !== 'portal-clearing') return;
    if (!this.save.worldProgress.flags.includes('story:first-echo-pending')) return;
    if (!this.save.worldProgress.flags.includes('story:lulu-helped-teemo')) return;

    const alreadyOwnsTeemo = [...this.save.party, ...this.save.storage].some((echo) => echo.championId === 'teemo');
    if (alreadyOwnsTeemo) {
      WorldActionService.applyAll(this.save, [
        { type: 'set-flag', id: 'story:first-echo-pending', value: false },
        { type: 'set-flag', id: 'story:first-echo-linked', value: true }
      ]);
      SaveService.save(this.save);
      return;
    }

    const changed = WorldActionService.applyAll(this.save, [
      { type: 'grant-echo', championId: 'teemo', mastery: 2 },
      { type: 'set-flag', id: 'story:first-echo-pending', value: false },
      { type: 'set-flag', id: 'story:first-echo-linked', value: true }
    ]);
    if (!changed) return;

    SaveService.save(this.save);
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.cameras.main.flash(220, 120, 220, 255);
    this.cameras.main.shake(180, 0.004);
    this.showTeemoEchoManifestation();
    this.beginWorldDialogue({
      id: 'story-first-echo-teemo',
      startNodeId: 'inicio',
      nodes: [{
        id: 'inicio',
        speaker: 'RESONANCIA',
        mode: 'event',
        lines: [
          'La hierba se agita aunque no sopla viento.',
          'Una figura azulada toma la forma de Teemo frente a ti. No parece del todo física.',
          'La resonancia no huye ni ataca. Se aferra al mismo instante que compartiste con Teemo.',
          'Teemo se ha vinculado contigo.'
        ]
      }]
    });
  }

  private showTeemoEchoManifestation(): void {
    this.storyEchoVisual?.destroy(true);
    this.lastFacing = 'down';
    this.playerVisual.anims.stop();
    this.playerVisual.setFrame(PLAYER_IDLE_FRAME.down);

    const texture = this.textures.exists('teemo-overworld') ? 'teemo-overworld' : PLAYER_TEXTURE_KEY;
    const glowOuter = this.add.circle(0, -17, 25, 0x4fcfff, 0.16)
      .setStrokeStyle(2, 0x9cf2ff, 0.72);
    const glowInner = this.add.circle(0, -17, 16, 0x62dcff, 0.18);
    const spirit = this.add.sprite(0, 8, texture, PLAYER_IDLE_FRAME.up)
      .setOrigin(0.5, 1)
      .setScale(texture === 'teemo-overworld' ? 0.58 : 0.48)
      .setTint(0x79e2f2)
      .setAlpha(0.84);

    const x = this.player.x;
    const y = this.player.y + 48;
    this.storyEchoVisual = this.add.container(x, y, [glowOuter, glowInner, spirit])
      .setAlpha(0)
      .setDepth(900 + Math.round(y));

    this.tweens.add({
      targets: this.storyEchoVisual,
      alpha: 1,
      scale: { from: 0.86, to: 1 },
      duration: 320,
      ease: 'Back.easeOut'
    });
    this.tweens.add({
      targets: this.storyEchoVisual,
      y: y - 3,
      duration: 860,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: [glowOuter, glowInner],
      alpha: { from: 0.14, to: 0.28 },
      scale: { from: 0.95, to: 1.10 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private updateEncounterState(delta: number): void {
    // Story games begin before the player has linked a first Eco.
    // Wild encounters stay dormant until there is at least one usable party member.
    if (!this.save.party.some((champion) => champion.currentHp > 0)) return;

    const zone = this.findActiveEncounterZone();
    const moving = this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
    if (!zone || !moving || this.time.now < this.encounterCooldownUntil) return;

    this.encounterDistanceAccumulator += (this.moveSpeed * delta) / 1000;
    while (this.encounterDistanceAccumulator >= this.encounterStepDistance) {
      this.encounterDistanceAccumulator -= this.encounterStepDistance;
      if (Math.random() <= this.encounterChancePerStep) {
        this.startEncounter(zone);
        return;
      }
    }
  }

  private findActiveEncounterZone(): EncounterZoneDefinition | null {
    const map = DataRegistry.map(this.save.currentMapId);
    const x = this.player.x;
    const y = this.player.y;

    if (map.tiled && this.tiledTallGrassLayer) {
      const tile = this.tiledTallGrassLayer.getTileAtWorldXY(x, y);
      if (tile && tile.index >= 0) {
        return {
          id: `${map.id}-tall-grass`,
          encounterTableId: map.tiled.encounterTableId ?? 'bandle-meadow',
          x: tile.pixelX,
          y: tile.pixelY,
          width: tile.width,
          height: tile.height
        };
      }
      return null;
    }

    return map.encounterZones.find((zone) =>
      x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
    ) ?? null;
  }

  private startEncounter(zone: EncounterZoneDefinition): void {
    if (this.transitioning || this.ledgeJump || this.dialogueLayer) return;
    const firstAvailable = this.save.party.find((champion) => champion.currentHp > 0);
    if (!firstAvailable) {
      this.transitioning = true;
      const recovery = SanctuaryService.recoverAfterDefeat(this.save);
      SaveService.save(this.save);
      this.registry.set('lastDefeat', recovery);
      this.scene.start('DefeatScene');
      return;
    }

    const wildChampion = this.createWildChampion(zone.encounterTableId);
    if (!wildChampion) {
      this.encounterCooldownUntil = this.time.now + 900;
      this.encounterDistanceAccumulator = 0;
      return;
    }
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.encounterDistanceAccumulator = 0;
    this.registry.remove('battle.activeInstanceId');
    this.registry.remove('battle.participants');
    this.registry.set('battle.activeInstanceId', firstAvailable.instanceId);
    this.registry.set('battle.participants', [firstAvailable.instanceId]);
    this.registry.set('pendingEncounter', { zoneId: zone.id, wildChampion });
    SaveService.save(this.save);
    this.cameras.main.flash(220, 255, 255, 255);
    this.cameras.main.shake(160, 0.0024);
    this.time.delayedCall(320, () => this.scene.start('BattleScene'));
  }

  private createWildChampion(encounterTableId: string): ChampionInstance | null {
    const zoneId = ({ dark_forest: 'dark-forest', gnar_valley: 'gnar-valley' } as Record<string, string>)[this.save.currentMapId]
      ?? this.save.worldProgress.currentZoneId;
    const entries = EchoAppearanceService.entriesForEncounter(
      this.save,
      encounterTableId,
      this.save.worldProgress.currentRegionId,
      zoneId
    );
    if (entries.length === 0) return null;
    const entry = this.pickWeightedEntry(entries);
    const definition = DataRegistry.champion(entry.championId);
    const mastery = Phaser.Math.Between(entry.minMastery, entry.maxMastery);
    return {
      instanceId: crypto.randomUUID(),
      championId: entry.championId,
      mastery,
      masteryExperience: 0,
      skillRanks: ProgressionService.defaultSkillRanks(mastery),
      unspentSkillPoints: ProgressionService.earnedManualSkillPoints(mastery),
      currentHp: Math.round(definition.baseStats.hp + definition.growthStats.hp * Math.max(0, mastery - 1)),
      runeTraits: [],
      equippedItems: []
    };
  }

  private pickWeightedEntry(entries: EncounterEntry[]): EncounterEntry {
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
  }
}
