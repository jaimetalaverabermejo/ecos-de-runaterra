import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, EncounterEntry, EncounterZoneDefinition, RectDefinition, TransitionDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { InputManager, type MoveDirection } from '../input/InputManager';
import { SaveService } from '../systems/save/SaveService';
import { UI } from '../ui/theme/UiTheme';
import { bandleVillageInteractions } from '../data/world/regions/bandle-city/zones/bandle-village/interactions';

type PhysicsRectangle = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
type PhysicsZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body };
type Facing = 'up' | 'down' | 'left' | 'right';
type DialogueChoice = { label: string; nextNodeId: string };
type DialogueNode = { id: string; speaker: string; lines: readonly string[]; choices?: readonly DialogueChoice[] };
type DialogueDefinition = { id: string; startNodeId: string; nodes: readonly DialogueNode[] };
type NpcPlacement = { id: string; name: string; x: number; y: number; facing: Facing; color: number; dialogueId: string };
type MapInteractions = { npcs: readonly NpcPlacement[]; dialogues: readonly DialogueDefinition[] };
type NpcRuntime = { placement: NpcPlacement; body: PhysicsRectangle; visual: Phaser.GameObjects.Container };

const PLAYER_TEXTURE_KEY = 'garen-overworld';
const PLAYER_IDLE_FRAME: Record<Facing, number> = { down: 1, up: 4, left: 7, right: 10 };
const PLAYER_ANIMATIONS: Record<Facing, string> = {
  down: 'garen-walk-down', up: 'garen-walk-up', left: 'garen-walk-left', right: 'garen-walk-right'
};
const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.4, right: 1.43, up: 1.53, left: 1.5 };
const EMPTY_INTERACTIONS: MapInteractions = { npcs: [], dialogues: [] };

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
  private interactionButton?: Phaser.GameObjects.Container;
  private dialogueLayer?: Phaser.GameObjects.Container;
  private dialogueDefinition?: DialogueDefinition;
  private dialogueNode?: DialogueNode;
  private dialogueLineIndex = 0;

  constructor() { super('WorldScene'); }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    const map = DataRegistry.map(this.save.currentMapId);
    this.transitioning = false;
    this.transitionCooldownUntil = this.time.now + 250;
    this.encounterCooldownUntil = this.time.now + 1000;
    this.encounterDistanceAccumulator = 0;
    this.npcs = [];
    this.nearbyNpc = undefined;

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBackgroundColor('#172026');
    this.cameras.main.fadeIn(150, 20, 15, 28);

    this.createMapBackground(map.id, map.width, map.height);
    this.ensurePlayerAnimations();
    this.createPlayer(this.save.playerPosition.x, this.save.playerPosition.y);
    for (const rect of map.collisions) this.createCollision(rect);
    for (const zone of map.encounterZones) this.createEncounterZone(zone);
    for (const transition of map.transitions) this.createTransition(transition);
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
    this.add.text(12, 10, map.name.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', backgroundColor: '#06141bcc', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(3000);
    const hint = this.inputManager.usesTouchControls
      ? 'Mover: cruceta · Acércate a un NPC para hablar · ☰: menú'
      : 'Mover: WASD/flechas · E/Espacio: hablar · M/Esc: menú';
    this.add.text(12, 36, hint, {
      fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', backgroundColor: '#06141baa', padding: { x: 5, y: 3 }
    }).setScrollFactor(0).setDepth(3000);
    this.createMenuButton();
    this.createInteractionButton();
  }

  update(_time: number, delta: number): void {
    if (!this.player || this.transitioning) return;
    const interactPressed =
      (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) ||
      (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey));

    if (this.dialogueLayer) {
      this.player.body.setVelocity(0, 0);
      this.updatePlayerVisual('none');
      if (interactPressed) this.advanceDialogue();
      return;
    }

    if ((this.menuKey && Phaser.Input.Keyboard.JustDown(this.menuKey)) ||
        (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey))) {
      this.openMenu(); return;
    }
    if (interactPressed && this.nearbyNpc) { this.beginNpcDialogue(this.nearbyNpc); return; }

    this.player.body.setVelocity(0, 0);
    const direction = this.inputManager.direction;
    if (direction === 'left') { this.player.body.setVelocityX(-this.moveSpeed); this.lastFacing = 'left'; }
    else if (direction === 'right') { this.player.body.setVelocityX(this.moveSpeed); this.lastFacing = 'right'; }
    else if (direction === 'up') { this.player.body.setVelocityY(-this.moveSpeed); this.lastFacing = 'up'; }
    else if (direction === 'down') { this.player.body.setVelocityY(this.moveSpeed); this.lastFacing = 'down'; }

    this.updatePlayerVisual(direction);
    this.updateNearbyNpc();
    this.updateEncounterState(delta);
    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
  }

  private interactionsForMap(mapId: string): MapInteractions {
    if (mapId === 'bandle-village') return bandleVillageInteractions as unknown as MapInteractions;
    return EMPTY_INTERACTIONS;
  }

  private createMapBackground(mapId: string, width: number, height: number): void {
    if (mapId === 'bandle-village') {
      this.add.image(0, 0, 'bandle-village-bg').setOrigin(0).setDisplaySize(width, height).setDepth(0); return;
    }
    if (mapId === 'bandle-house-01') {
      this.add.rectangle(0, 0, width, height, 0x3b2a24).setOrigin(0).setDepth(0);
      this.add.rectangle(24, 38, width - 48, height - 62, 0xb98959).setOrigin(0).setStrokeStyle(7, 0xd7b978).setDepth(1);
      this.add.rectangle(62, 78, 130, 64, 0x5c3d32).setOrigin(0).setDepth(2);
      this.add.rectangle(334, 80, 118, 50, 0x4e6a55).setOrigin(0).setDepth(2);
      this.add.rectangle(64, 238, 92, 70, 0x6b4e38).setOrigin(0).setDepth(2);
      this.add.rectangle(344, 222, 92, 88, 0x74503a).setOrigin(0).setDepth(2);
      this.add.ellipse(256, 184, 144, 84, 0x714b34).setStrokeStyle(5, 0xe2bf80).setDepth(2);
      this.add.text(256, 58, 'INTERIOR PROVISIONAL', { fontFamily: 'monospace', fontSize: '11px', color: '#fff1bd' }).setOrigin(0.5).setDepth(3);
      return;
    }
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(width, height).setDepth(0);
  }

  private createNpcs(mapId: string): void {
    for (const placement of this.interactionsForMap(mapId).npcs) {
      const body = this.add.rectangle(placement.x, placement.y, 18, 14, 0xffffff, 0);
      this.physics.add.existing(body);
      const physicsBody = body as PhysicsRectangle;
      physicsBody.body.setImmovable(true);
      this.physics.add.collider(this.player, physicsBody);
      const shadow = this.add.ellipse(0, 7, 26, 10, 0x07131e, 0.32);
      const torso = this.add.rectangle(0, -5, 18, 22, placement.color, 1).setStrokeStyle(2, 0x132630);
      const head = this.add.circle(0, -20, 10, 0xe9c68d, 1).setStrokeStyle(2, 0x4a3229);
      const visual = this.add.container(placement.x, placement.y, [shadow, torso, head]).setDepth(100 + placement.y);
      this.npcs.push({ placement, body: physicsBody, visual });
    }
  }

  private createInteractionButton(): void {
    const box = this.add.rectangle(0, 0, 92, 28, 0x0d2234, 0.96).setStrokeStyle(2, 0xe6c45b).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, 'A · HABLAR', { fontFamily: 'Verdana, Arial, sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#f8fbff' }).setOrigin(0.5);
    this.interactionButton = this.add.container(452, 146, [box, label]).setScrollFactor(0).setDepth(4500).setVisible(false);
    box.on(Phaser.Input.Events.POINTER_UP, () => { if (this.nearbyNpc && !this.dialogueLayer) this.beginNpcDialogue(this.nearbyNpc); });
  }

  private updateNearbyNpc(): void {
    let best: NpcRuntime | undefined; let bestDistance = 54;
    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.placement.x, npc.placement.y);
      if (distance < bestDistance) { best = npc; bestDistance = distance; }
    }
    this.nearbyNpc = best; this.interactionButton?.setVisible(Boolean(best));
  }

  private beginNpcDialogue(npc: NpcRuntime): void {
    const dialogue = this.interactionsForMap(this.save.currentMapId).dialogues.find((entry) => entry.id === npc.placement.dialogueId);
    if (!dialogue) return;
    this.player.body.setVelocity(0, 0); this.playerVisual.anims.stop();
    this.facePlayerToward(npc.placement.x, npc.placement.y); this.interactionButton?.setVisible(false);
    this.dialogueDefinition = dialogue;
    this.dialogueNode = dialogue.nodes.find((entry) => entry.id === dialogue.startNodeId);
    this.dialogueLineIndex = 0; this.renderDialogue();
  }

  private facePlayerToward(x: number, y: number): void {
    const dx = x - this.player.x, dy = y - this.player.y;
    this.lastFacing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    this.updatePlayerVisual('none');
  }

  private renderDialogue(): void {
    this.dialogueLayer?.destroy(true); const node = this.dialogueNode; if (!node) return;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(6, 174, 500, 106, UI.colors.panel, 0.99).setOrigin(0).setStrokeStyle(2, UI.colors.border));
    objects.push(this.add.rectangle(10, 178, 492, 2, UI.colors.cyanGlow, 0.9).setOrigin(0));
    objects.push(this.add.text(20, 184, node.speaker.toUpperCase(), { fontFamily: UI.font.family, fontSize: UI.font.small, fontStyle: 'bold', color: UI.text.gold }));
    objects.push(this.add.text(20, 204, node.lines[this.dialogueLineIndex] ?? '', { fontFamily: UI.font.family, fontSize: UI.font.body, color: UI.text.primary, wordWrap: { width: 325 }, lineSpacing: 4 }));
    const atEnd = this.dialogueLineIndex >= node.lines.length - 1;
    if (atEnd && node.choices?.length) {
      node.choices.forEach((choice, index) => {
        const y = 208 + index * 31;
        const box = this.add.rectangle(443, y, 106, 24, index === 0 ? UI.colors.goldDark : UI.colors.panelRaised, 1).setStrokeStyle(2, index === 0 ? UI.colors.gold : UI.colors.borderSoft).setInteractive({ useHandCursor: true });
        const text = this.add.text(443, y, choice.label.toUpperCase(), { fontFamily: UI.font.family, fontSize: UI.font.small, fontStyle: 'bold', color: UI.text.primary }).setOrigin(0.5);
        box.on(Phaser.Input.Events.POINTER_UP, () => this.chooseDialogue(choice.nextNodeId)); objects.push(box, text);
      });
    } else {
      const box = this.add.rectangle(452, 250, 82, 24, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.borderSoft).setInteractive({ useHandCursor: true });
      const text = this.add.text(452, 250, atEnd ? 'CERRAR' : 'SIGUIENTE', { fontFamily: UI.font.family, fontSize: UI.font.tiny, fontStyle: 'bold', color: UI.text.primary }).setOrigin(0.5);
      box.on(Phaser.Input.Events.POINTER_UP, () => this.advanceDialogue()); objects.push(box, text);
    }
    this.dialogueLayer = this.add.container(0, 0, objects).setScrollFactor(0).setDepth(10000);
  }

  private advanceDialogue(): void {
    const node = this.dialogueNode; if (!node) return;
    if (this.dialogueLineIndex < node.lines.length - 1) { this.dialogueLineIndex++; this.renderDialogue(); return; }
    if (node.choices?.length) return; this.closeDialogue();
  }

  private chooseDialogue(nodeId: string): void {
    const next = this.dialogueDefinition?.nodes.find((entry) => entry.id === nodeId);
    if (!next) { this.closeDialogue(); return; }
    this.dialogueNode = next; this.dialogueLineIndex = 0; this.renderDialogue();
  }

  private closeDialogue(): void {
    this.dialogueLayer?.destroy(true); this.dialogueLayer = undefined; this.dialogueDefinition = undefined; this.dialogueNode = undefined; this.dialogueLineIndex = 0; this.updateNearbyNpc();
  }

  private createMenuButton(): void {
    const button = this.add.rectangle(486, 22, 34, 28, 0x0b160f, 0.72).setStrokeStyle(2, 0xf2fff4, 0.65).setScrollFactor(0).setDepth(4000).setInteractive({ useHandCursor: true });
    this.add.text(486, 22, '☰', { fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    button.on(Phaser.Input.Events.POINTER_UP, () => this.openMenu());
  }

  private openMenu(): void {
    if (this.transitioning || this.dialogueLayer) return;
    this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
    this.player.body.setVelocity(0, 0); this.scene.start('MenuScene');
  }

  private ensurePlayerAnimations(): void {
    const create = (key: string, start: number, end: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, { start, end }), frameRate: 5, repeat: -1 });
    };
    create(PLAYER_ANIMATIONS.down, 0, 2); create(PLAYER_ANIMATIONS.up, 3, 5); create(PLAYER_ANIMATIONS.left, 6, 8); create(PLAYER_ANIMATIONS.right, 9, 11);
  }

  private updatePlayerVisual(direction: MoveDirection): void {
    this.playerVisual.setPosition(this.player.x, this.player.y + 6); this.playerVisual.setScale(PLAYER_VISUAL_SCALE[this.lastFacing]); this.playerVisual.setDepth(100 + Math.round(this.player.y));
    if (direction === 'none') { this.playerVisual.anims.stop(); this.playerVisual.setFrame(PLAYER_IDLE_FRAME[this.lastFacing]); return; }
    this.playerVisual.anims.play(PLAYER_ANIMATIONS[direction], true);
  }

  private createPlayer(x: number, y: number): void {
    const body = this.add.rectangle(x, y, 16, 10, 0xffffff, 0); this.physics.add.existing(body); this.player = body as PhysicsRectangle;
    this.player.body.setSize(16, 10); this.player.body.setCollideWorldBounds(true);
    this.playerVisual = this.add.sprite(x, y + 6, PLAYER_TEXTURE_KEY, PLAYER_IDLE_FRAME.down).setOrigin(0.5, 1).setScale(PLAYER_VISUAL_SCALE.down).setDepth(100 + y);
  }

  private createCollision(rect: RectDefinition): void {
    const collider = this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0x000000, 0); this.physics.add.existing(collider, true); this.physics.add.collider(this.player, collider);
  }
  private createEncounterZone(zone: EncounterZoneDefinition): void { this.add.zone(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.width, zone.height); }
  private createTransition(transition: TransitionDefinition): void {
    const zone = this.add.zone(transition.x + transition.width / 2, transition.y + transition.height / 2, transition.width, transition.height); this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone as PhysicsZone, () => { void this.handleTransition(transition); });
  }

  private async handleTransition(transition: TransitionDefinition): Promise<void> {
    if (this.transitioning || this.time.now < this.transitionCooldownUntil || this.dialogueLayer) return;
    this.transitioning = true; this.player.body.setVelocity(0, 0); this.playerVisual.anims.stop(); this.encounterDistanceAccumulator = 0;
    this.cameras.main.fadeOut(160, 20, 15, 28);
    await new Promise<void>((resolve) => this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve()));
    const previousMapId = this.save.currentMapId;
    this.save.currentMapId = transition.targetMapId; this.save.playerPosition = { x: transition.targetX, y: transition.targetY }; this.syncWorldProgress(transition.targetMapId); SaveService.save(this.save);
    if (transition.targetMapId === previousMapId) {
      this.player.setPosition(transition.targetX, transition.targetY); this.playerVisual.setPosition(transition.targetX, transition.targetY + 6); this.cameras.main.fadeIn(160, 20, 15, 28);
      this.transitionCooldownUntil = this.time.now + 500; this.encounterCooldownUntil = this.time.now + 700; this.transitioning = false; return;
    }
    this.scene.restart();
  }

  private syncWorldProgress(mapId: string): void {
    this.save.worldProgress.currentRegionId = 'bandle-city';
    if (mapId === 'bandle-debug') this.save.worldProgress.currentZoneId = 'portal-clearing';
    if (mapId === 'bandle-village' || mapId === 'bandle-house-01') {
      this.save.worldProgress.currentZoneId = 'bandle-village';
      if (!this.save.worldProgress.unlockedZones.includes('bandle-village')) this.save.worldProgress.unlockedZones.push('bandle-village');
    }
  }

  private updateEncounterState(delta: number): void {
    const zone = this.findActiveEncounterZone(); const moving = this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
    if (!zone || !moving || this.time.now < this.encounterCooldownUntil) return;
    this.encounterDistanceAccumulator += (this.moveSpeed * delta) / 1000;
    while (this.encounterDistanceAccumulator >= this.encounterStepDistance) {
      this.encounterDistanceAccumulator -= this.encounterStepDistance;
      if (Math.random() <= this.encounterChancePerStep) { this.startEncounter(zone); return; }
    }
  }

  private findActiveEncounterZone(): EncounterZoneDefinition | null {
    const map = DataRegistry.map(this.save.currentMapId), x = this.player.x, y = this.player.y;
    return map.encounterZones.find((zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) ?? null;
  }

  private startEncounter(zone: EncounterZoneDefinition): void {
    if (this.transitioning || this.dialogueLayer) return;
    this.transitioning = true; this.player.body.setVelocity(0, 0); this.encounterDistanceAccumulator = 0;
    const wildChampion = this.createWildChampion(zone.encounterTableId); this.registry.set('pendingEncounter', { zoneId: zone.id, wildChampion }); SaveService.save(this.save);
    this.cameras.main.flash(220, 255, 255, 255); this.cameras.main.shake(160, 0.0024); this.time.delayedCall(320, () => this.scene.start('BattleScene'));
  }

  private createWildChampion(encounterTableId: string): ChampionInstance {
    const table = DataRegistry.encounter(encounterTableId); const entry = this.pickWeightedEntry(table.entries); const definition = DataRegistry.champion(entry.championId);
    const level = Phaser.Math.Between(entry.minLevel, entry.maxLevel);
    return { instanceId: crypto.randomUUID(), championId: entry.championId, level, experience: 0, mastery: 1, masteryExperience: 0, currentHp: definition.baseStats.hp, runeTraits: [], equippedItems: [] };
  }

  private pickWeightedEntry(entries: EncounterEntry[]): EncounterEntry {
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0); let roll = Math.random() * totalWeight;
    for (const entry of entries) { roll -= entry.weight; if (roll <= 0) return entry; }
    return entries[entries.length - 1];
  }
}
