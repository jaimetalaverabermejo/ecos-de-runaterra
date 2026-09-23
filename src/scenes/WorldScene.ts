import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, EncounterEntry, EncounterZoneDefinition, MapDefinition, RectDefinition, TransitionDefinition } from '../data/types';
import type { DialogueDefinition, NpcDefinition } from '../data/narrativeTypes';
import type { SaveGame } from '../state/GameState';
import { InputManager, type MoveDirection } from '../input/InputManager';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { QuestService } from '../systems/quests/QuestService';
import { SanctuaryService } from '../systems/sanctuary/SanctuaryService';
import { SaveService } from '../systems/save/SaveService';
import { EchoAppearanceService } from '../systems/encounters/EchoAppearanceService';
import { ConditionService } from '../systems/world/ConditionService';
import { WorldActionService } from '../systems/world/WorldActionService';
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
};

const PLAYER_TEXTURE_KEY = 'player-overworld';
const PLAYER_IDLE_FRAME: Record<Facing, number> = { down: 1, up: 4, left: 7, right: 10 };
const PLAYER_ANIMATIONS: Record<Facing, string> = {
  down: 'player-walk-down', up: 'player-walk-up', left: 'player-walk-left', right: 'player-walk-right'
};
const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 0.65, right: 0.65, up: 0.65, left: 0.65 };

export class WorldScene extends Phaser.Scene {
  private player!: PhysicsRectangle;
  private playerVisual!: Phaser.GameObjects.Sprite;
  private inputManager!: InputManager;
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

  constructor() { super('WorldScene'); }

  create(): void {
    configureSceneLayout(this);
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
    this.ledgeJump = undefined;
    this.ledgeJumpCooldownUntil = 0;
    this.nearbyNpc = undefined;
    this.dialogueChoiceIndex = 0;
    this.dialogueNavDirection = 'none';

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBackgroundColor('#172026');
    this.cameras.main.fadeIn(150, 20, 15, 28);

    this.createMapBackground(map);
    this.ensurePlayerAnimations();
    this.createPlayer(this.save.playerPosition.x, this.save.playerPosition.y);
    if (map.tiled) {
      this.configureTiledMapGameplay();
    } else {
      for (const rect of map.collisions) this.createCollision(rect);
      for (const zone of map.encounterZones) this.createEncounterZone(zone);
      for (const transition of map.transitions) this.createTransition(transition);
    }
    this.createNpcs(map.id);

    this.inputManager = new InputManager(this);
    if (this.input.keyboard) {
      this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
      this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
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
    const escapePressed = Boolean(this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey));

    if (this.dialogueLayer) {
      for (const npc of this.npcs) this.stopNpc(npc);
      this.player.body.setVelocity(0, 0);
      this.updatePlayerVisual('none');
      this.handleDialogueInput(actionA, actionB || escapePressed);
      return;
    }

    if ((this.menuKey && Phaser.Input.Keyboard.JustDown(this.menuKey)) || escapePressed) {
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
    if (direction === 'left') { this.player.body.setVelocityX(-this.moveSpeed); this.lastFacing = 'left'; }
    else if (direction === 'right') { this.player.body.setVelocityX(this.moveSpeed); this.lastFacing = 'right'; }
    else if (direction === 'up') { this.player.body.setVelocityY(-this.moveSpeed); this.lastFacing = 'up'; }
    else if (direction === 'down') { this.player.body.setVelocityY(this.moveSpeed); this.lastFacing = 'down'; }

    this.updatePlayerVisual(direction);
    this.updateNpcs();
    this.updateNearbyNpc();
    this.updateNearbyTiledInteraction();
    this.updateEncounterState(delta);
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
      ['Paths', 1],
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

    for (const [name, depth] of layerDepths) {
      const layer = tilemap.createLayer(name, tilesets, 0, 0);
      if (!layer) continue;
      layer.setDepth(depth);
      this.tiledLayers.set(name, layer);
      if (name === 'TallGrass') this.tiledTallGrassLayer = layer;
    }

    this.tiledMap = tilemap;
  }

  private configureTiledMapGameplay(): void {
    for (const [name, layer] of this.tiledLayers) {
      if (name !== 'Obstacles' && !this.tiledLayerBooleanProperty(layer, 'collides')) continue;
      layer.forEachTile((tile) => {
        if (tile.index < 0) return;
        this.createCollision({ x: tile.pixelX, y: tile.pixelY, width: tile.width, height: tile.height });
      });
    }

    this.createOneWayLedgeColliders('Ledges_down', 'down');
    this.createOneWayLedgeColliders('Ledges_left', 'left');
    this.createOneWayLedgeColliders('Ledges_right', 'right');
    this.createTiledPortals();
    this.createTiledInteractions();
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
      .setPosition(this.player.x, this.player.y + 6 - arcHeight)
      .setScale(PLAYER_VISUAL_SCALE[jump.direction])
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
      const target = this.resolveMapSpawn(targetMapId, targetSpawnId);
      this.createTransition({
        id: object.name || `portal-${object.id}`,
        targetMapId,
        x: Math.round(object.x ?? 0),
        y: Math.round(object.y ?? 0),
        width: Math.max(1, Math.round(object.width || 32)),
        height: Math.max(1, Math.round(object.height || 32)),
        targetX: target.x,
        targetY: target.y
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

      const interaction: TiledInteractionRuntime = {
        id,
        name: object.name || 'Interacción',
        action,
        x: object.x ?? 0,
        y: object.y ?? 0,
        width: Math.max(1, object.width || 32),
        height: Math.max(1, object.height || 32),
        requiresInteract: this.tiledObjectBooleanProperty(object, 'requiresInteract'),
        itemId: this.tiledObjectStringProperty(object, 'itemId'),
        quantity: this.tiledObjectNumberProperty(object, 'quantity'),
        gold: this.tiledObjectNumberProperty(object, 'gold')
      };

      if (action === 'pickup_item' || action === 'pickup_gold') {
        interaction.visual = this.createPickupMarker(interaction);
      }
      this.tiledInteractions.push(interaction);
    }
  }

  private createPickupMarker(interaction: TiledInteractionRuntime): Phaser.GameObjects.Container {
    const centerX = interaction.x + interaction.width / 2;
    const centerY = interaction.y + interaction.height / 2;
    const shadow = this.add.ellipse(0, 8, 24, 8, 0x07131e, 0.28);

    let marker: Phaser.GameObjects.Shape;
    if (interaction.action === 'pickup_gold') {
      marker = this.add.ellipse(0, -3, 18, 18, 0xc89532, 1).setStrokeStyle(2, 0x5f431d);
      const tie = this.add.rectangle(0, -12, 11, 5, 0x7a5224, 1).setStrokeStyle(1, 0x422b17);
      return this.add.container(centerX, centerY, [shadow, marker, tie]).setDepth(120 + Math.round(centerY));
    }

    marker = this.add.rectangle(0, -3, 13, 13, 0xc94d57, 1).setAngle(45).setStrokeStyle(2, 0x6c2630);
    return this.add.container(centerX, centerY, [shadow, marker]).setDepth(120 + Math.round(centerY));
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
    const amount = Math.max(1, Math.round(interaction.gold ?? 0));
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

  private createNpcs(mapId: string): void {
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
      const blockedByLegacyMap = map.collisions.some((rect) =>
        x >= rect.x - 12 && x <= rect.x + rect.width + 12 && y >= rect.y - 12 && y <= rect.y + rect.height + 12
      );
      const blockedByTiledMap = [...this.tiledLayers].some(([name, layer]) => {
        if (name !== 'Obstacles' && !this.tiledLayerBooleanProperty(layer, 'collides')) return false;
        const tile = layer.getTileAtWorldXY(x, y);
        return Boolean(tile && tile.index >= 0);
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
    this.beginNpcDialogue(npc);
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
    if (!npc.placement.dialogueId) return;
    this.beginDialogueDefinition(npc, DataRegistry.dialogue(npc.placement.dialogueId));
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

    const objects: Phaser.GameObjects.GameObject[] = [];
    const x = 20;
    const y = 350;
    const width = 920;
    const height = 170;

    objects.push(this.add.rectangle(x + 3, y + 3, width, height, UI.colors.shadow, 0.45).setOrigin(0, 0));
    objects.push(this.add.rectangle(x, y, width, height, UI.colors.panel, 0.97).setOrigin(0, 0).setStrokeStyle(2, UI.colors.borderSoft));
    objects.push(this.add.rectangle(x + 4, y + 4, width - 8, 2, UI.colors.cyanGlow, 0.85).setOrigin(0, 0));
    objects.push(this.add.rectangle(x + 10, y + 13, 5, 5, UI.colors.accent, 0.9).setAngle(45));
    objects.push(this.add.rectangle(x + width - 12, y + 13, 5, 5, UI.colors.gold, 0.9).setAngle(45));

    objects.push(this.add.rectangle(x + 24, y + 16, 280, 34, 0x173d5b, 1).setOrigin(0, 0).setStrokeStyle(2, UI.colors.border));
    objects.push(this.add.text(x + 38, y + 22, node.speaker.toUpperCase(), {
      fontFamily: UI.font.family,
      fontSize: '18px',
      fontStyle: 'bold',
      color: UI.text.gold
    }));

    objects.push(this.add.text(x + 30, y + 66, node.lines[this.dialogueLineIndex] ?? '', {
      fontFamily: UI.font.family,
      fontSize: '18px',
      color: UI.text.primary,
      wordWrap: { width: 610 },
      lineSpacing: 6
    }));

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
    this.closeDialogue();
  }

  private chooseDialogue(nodeId: string): void {
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

  private closeDialogue(): void {
    this.dialogueLayer?.destroy(true);
    this.dialogueLayer = undefined;
    this.dialogueDefinition = undefined;
    this.dialogueNode = undefined;
    this.dialogueLineIndex = 0;
    this.dialogueChoiceIndex = 0;
    this.dialogueNavDirection = 'none';
    this.updateNearbyNpc();
    this.updateNearbyTiledInteraction();
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
    this.playerVisual.setPosition(this.player.x, this.player.y + 6);
    this.playerVisual.setScale(PLAYER_VISUAL_SCALE[this.lastFacing]);
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
    this.playerVisual = this.add.sprite(x, y + 6, PLAYER_TEXTURE_KEY, PLAYER_IDLE_FRAME.down)
      .setOrigin(0.5, 1)
      .setScale(PLAYER_VISUAL_SCALE.down)
      .setDepth(100 + y);
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
    SaveService.save(this.save);

    if (transition.targetMapId === previousMapId) {
      this.player.setPosition(transition.targetX, transition.targetY);
      this.playerVisual.setPosition(transition.targetX, transition.targetY + 6);
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
    if (mapId === 'bandle-debug' || mapId === 'bandle-tiled-test') this.save.worldProgress.currentZoneId = 'portal-clearing';
    if (mapId === 'bandle-village' || mapId === 'bandle-house-01' || mapId === 'three-house' || mapId.startsWith('bandle_house_')) {
      this.save.worldProgress.currentZoneId = 'bandle-village';
      if (!this.save.worldProgress.unlockedZones.includes('bandle-village')) {
        this.save.worldProgress.unlockedZones.push('bandle-village');
      }
    }
    QuestService.recordEvent(this.save, { type: 'visit', targetId: this.save.worldProgress.currentZoneId });
  }

  private updateEncounterState(delta: number): void {
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
    const entries = EchoAppearanceService.entriesForEncounter(
      this.save,
      encounterTableId,
      this.save.worldProgress.currentRegionId,
      this.save.worldProgress.currentZoneId
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
