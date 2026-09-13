import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, EncounterEntry, EncounterZoneDefinition, RectDefinition, TransitionDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { InputManager, type MoveDirection } from '../input/InputManager';
import { SaveService } from '../systems/SaveService';

type PhysicsRectangle = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
type PhysicsZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body };
type Facing = 'up' | 'down' | 'left' | 'right';

const PLAYER_TEXTURE_KEY = 'garen-overworld';
const PLAYER_IDLE_FRAME: Record<Facing, number> = { down: 1, up: 4, left: 7, right: 10 };
const PLAYER_ANIMATIONS: Record<Facing, string> = {
  down: 'garen-walk-down', up: 'garen-walk-up', left: 'garen-walk-left', right: 'garen-walk-right'
};
const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.4, right: 1.43, up: 1.53, left: 1.5 };

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

  constructor() { super('WorldScene'); }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    const map = DataRegistry.map(this.save.currentMapId);
    this.transitioning = false;
    this.transitionCooldownUntil = this.time.now + 250;
    this.encounterCooldownUntil = this.time.now + 1000;
    this.encounterDistanceAccumulator = 0;

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBackgroundColor('#172026');
    this.cameras.main.fadeIn(150, 20, 15, 28);

    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(map.width, map.height).setDepth(0);
    this.ensurePlayerAnimations();
    this.createPlayer(this.save.playerPosition.x, this.save.playerPosition.y);

    for (const rect of map.collisions) this.createCollision(rect);
    for (const zone of map.encounterZones) this.createEncounterZone(zone);
    for (const transition of map.transitions) this.createTransition(transition);

    this.inputManager = new InputManager(this);
    if (this.input.keyboard) {
      this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
      this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.add.text(12, 10, 'BANDLE CITY — VERTICAL SLICE 05', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    const hint = this.inputManager.usesTouchControls
      ? 'Mover: cruceta · Hierba alta: Ecos · ☰: menú'
      : 'Mover: WASD/flechas · M/Esc: menú · Hierba alta: Ecos';
    this.add.text(12, 38, hint, {
      fontFamily: 'monospace', fontSize: '9px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 5, y: 3 }
    }).setScrollFactor(0).setDepth(1000);

    this.createMenuButton();
  }

  update(_time: number, delta: number): void {
    if (!this.player || this.transitioning) return;

    if ((this.menuKey && Phaser.Input.Keyboard.JustDown(this.menuKey)) ||
        (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey))) {
      this.openMenu();
      return;
    }

    this.player.body.setVelocity(0, 0);
    const direction = this.inputManager.direction;

    if (direction === 'left') { this.player.body.setVelocityX(-this.moveSpeed); this.lastFacing = 'left'; }
    else if (direction === 'right') { this.player.body.setVelocityX(this.moveSpeed); this.lastFacing = 'right'; }
    else if (direction === 'up') { this.player.body.setVelocityY(-this.moveSpeed); this.lastFacing = 'up'; }
    else if (direction === 'down') { this.player.body.setVelocityY(this.moveSpeed); this.lastFacing = 'down'; }

    this.updatePlayerVisual(direction);
    this.updateEncounterState(delta);
    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
  }

  private createMenuButton(): void {
    const button = this.add.rectangle(486, 22, 34, 28, 0x0b160f, 0.72)
      .setStrokeStyle(2, 0xf2fff4, 0.65)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true });

    this.add.text(486, 22, '☰', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(0x244533, 0.9));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(0x0b160f, 0.72));
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      button.setFillStyle(0x0b160f, 0.72);
      this.openMenu();
    });
  }

  private openMenu(): void {
    if (this.transitioning) return;
    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.scene.start('MenuScene');
  }

  private ensurePlayerAnimations(): void {
    const create = (key: string, start: number, end: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, { start, end }), frameRate: 5, repeat: -1 });
    };
    create(PLAYER_ANIMATIONS.down, 0, 2);
    create(PLAYER_ANIMATIONS.up, 3, 5);
    create(PLAYER_ANIMATIONS.left, 6, 8);
    create(PLAYER_ANIMATIONS.right, 9, 11);
  }

  private updatePlayerVisual(direction: MoveDirection): void {
    this.playerVisual.setPosition(this.player.x, this.player.y + 6);
    this.playerVisual.setScale(PLAYER_VISUAL_SCALE[this.lastFacing]);
    if (direction === 'none') {
      this.playerVisual.anims.stop();
      this.playerVisual.setFrame(PLAYER_IDLE_FRAME[this.lastFacing]);
      return;
    }
    this.playerVisual.anims.play(PLAYER_ANIMATIONS[direction], true);
  }

  private createPlayer(x: number, y: number): void {
    const body = this.add.rectangle(x, y, 16, 10, 0xffffff, 0).setDepth(19);
    this.physics.add.existing(body);
    this.player = body as PhysicsRectangle;
    this.player.body.setSize(16, 10);
    this.player.body.setCollideWorldBounds(true);
    this.playerVisual = this.add.sprite(x, y + 6, PLAYER_TEXTURE_KEY, PLAYER_IDLE_FRAME.down)
      .setOrigin(0.5, 1).setScale(PLAYER_VISUAL_SCALE.down).setDepth(20);
  }

  private createCollision(rect: RectDefinition): void {
    const collider = this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0x000000, 0);
    this.physics.add.existing(collider, true);
    this.physics.add.collider(this.player, collider);
  }

  private createEncounterZone(zone: EncounterZoneDefinition): void {
    this.add.zone(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.width, zone.height);
  }

  private createTransition(transition: TransitionDefinition): void {
    const zone = this.add.zone(transition.x + transition.width / 2, transition.y + transition.height / 2, transition.width, transition.height);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone as PhysicsZone, () => { void this.handleTransition(transition); });
  }

  private async handleTransition(transition: TransitionDefinition): Promise<void> {
    if (this.transitioning || this.time.now < this.transitionCooldownUntil) return;
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

  private updateEncounterState(delta: number): void {
    const zone = this.findActiveEncounterZone();
    const moving = this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
    if (!zone || !moving || this.time.now < this.encounterCooldownUntil) return;
    this.encounterDistanceAccumulator += (this.moveSpeed * delta) / 1000;
    while (this.encounterDistanceAccumulator >= this.encounterStepDistance) {
      this.encounterDistanceAccumulator -= this.encounterStepDistance;
      if (Math.random() <= this.encounterChancePerStep) { this.startEncounter(zone); return; }
    }
  }

  private findActiveEncounterZone(): EncounterZoneDefinition | null {
    const map = DataRegistry.map(this.save.currentMapId);
    const x = this.player.x;
    const y = this.player.y;
    return map.encounterZones.find((zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) ?? null;
  }

  private startEncounter(zone: EncounterZoneDefinition): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.playerVisual.anims.stop();
    this.encounterDistanceAccumulator = 0;
    const wildChampion = this.createWildChampion(zone.encounterTableId);
    this.registry.set('pendingEncounter', { zoneId: zone.id, wildChampion });
    SaveService.save(this.save);
    this.cameras.main.flash(220, 255, 255, 255);
    this.cameras.main.shake(160, 0.0024);
    this.time.delayedCall(320, () => this.scene.start('BattleScene'));
  }

  private createWildChampion(encounterTableId: string): ChampionInstance {
    const table = DataRegistry.encounter(encounterTableId);
    const entry = this.pickWeightedEntry(table.entries);
    const definition = DataRegistry.champion(entry.championId);
    const level = Phaser.Math.Between(entry.minLevel, entry.maxLevel);
    return {
      instanceId: crypto.randomUUID(), championId: entry.championId, level, experience: 0, mastery: 1,
      masteryExperience: 0, currentHp: definition.baseStats.hp, runeTraits: [], equippedItems: []
    };
  }

  private pickWeightedEntry(entries: EncounterEntry[]): EncounterEntry {
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of entries) { roll -= entry.weight; if (roll <= 0) return entry; }
    return entries[entries.length - 1];
  }
}
