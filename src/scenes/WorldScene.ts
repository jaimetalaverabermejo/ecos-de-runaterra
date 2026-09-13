import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type {
  ChampionInstance,
  EncounterEntry,
  EncounterZoneDefinition,
  RectDefinition,
  TransitionDefinition
} from '../data/types';
import type { SaveGame } from '../state/GameState';
import { InputManager } from '../input/InputManager';
import { SaveService } from '../systems/SaveService';

type PhysicsRectangle = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

type PhysicsZone = Phaser.GameObjects.Zone & {
  body: Phaser.Physics.Arcade.Body;
};

export class WorldScene extends Phaser.Scene {
  private player!: PhysicsRectangle;
  private playerVisual!: Phaser.GameObjects.Image;
  private inputManager!: InputManager;
  private save!: SaveGame;
  private transitioning = false;
  private transitionCooldownUntil = 0;
  private encounterCooldownUntil = 0;
  private encounterDistanceAccumulator = 0;
  private readonly moveSpeed = 128;
  private readonly encounterStepDistance = 40;
  private readonly encounterChancePerStep = 0.22;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    const map = DataRegistry.map(this.save.currentMapId);

    this.transitioning = false;
    this.transitionCooldownUntil = this.time.now + 220;
    this.encounterCooldownUntil = this.time.now + 900;
    this.encounterDistanceAccumulator = 0;

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBackgroundColor('#84c96b');
    this.cameras.main.fadeIn(140, 20, 15, 28);

    this.drawWorldGrid(map.width, map.height);
    this.createPlayer(this.save.playerPosition.x, this.save.playerPosition.y);

    for (const rect of map.collisions) this.createCollision(rect);
    for (const zone of map.encounterZones) this.createEncounterZone(zone);
    for (const transition of map.transitions) this.createTransition(transition);

    this.inputManager = new InputManager(this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.add
      .text(12, 10, 'BANDLE CITY — GREYBOX 02', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 4 }
      })
      .setScrollFactor(0)
      .setDepth(1000);

    const controlHint = this.inputManager.usesTouchControls
      ? 'Mover: cruceta táctil · Verde oscuro: encuentro · Morado: portal'
      : 'Mover: WASD / flechas · Verde oscuro: encuentro · Morado: portal';

    this.add
      .text(12, 38, controlHint, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 5, y: 3 }
      })
      .setScrollFactor(0)
      .setDepth(1000);
  }

  update(_time: number, delta: number): void {
    if (!this.player || this.transitioning) return;

    this.player.body.setVelocity(0, 0);
    const direction = this.inputManager.direction;

    if (direction === 'left') this.player.body.setVelocityX(-this.moveSpeed);
    else if (direction === 'right') this.player.body.setVelocityX(this.moveSpeed);
    else if (direction === 'up') this.player.body.setVelocityY(-this.moveSpeed);
    else if (direction === 'down') this.player.body.setVelocityY(this.moveSpeed);

    this.playerVisual.setPosition(this.player.x, this.player.y - 11);
    this.updateEncounterState(delta);

    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
  }

  private createPlayer(x: number, y: number): void {
    const player = this.add.rectangle(x, y, 20, 20, 0xffffff, 0).setDepth(19);
    this.physics.add.existing(player);

    this.player = player as PhysicsRectangle;
    this.player.body.setSize(18, 16);
    this.player.body.setOffset(1, 4);
    this.player.body.setCollideWorldBounds(true);

    this.playerVisual = this.add
      .image(x, y - 11, 'garen-world')
      .setDisplaySize(42, 50)
      .setDepth(20);
  }

  private createCollision(rect: RectDefinition): void {
    const visual = this.add
      .rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0x426b3a)
      .setDepth(5);
    visual.setStrokeStyle(2, 0x2e4e2a);
    this.physics.add.existing(visual, true);
    this.physics.add.collider(this.player, visual);
  }

  private createEncounterZone(zone: EncounterZoneDefinition): void {
    const visual = this.add
      .rectangle(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.width, zone.height, 0x39784d, 0.62)
      .setDepth(2);
    visual.setStrokeStyle(2, 0x245c36);

    this.add
      .text(zone.x + 8, zone.y + 8, 'PRADO DE ECOS', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#dfffe8'
      })
      .setDepth(3);
  }

  private createTransition(transition: TransitionDefinition): void {
    const visual = this.add
      .rectangle(
        transition.x + transition.width / 2,
        transition.y + transition.height / 2,
        transition.width,
        transition.height,
        0x985bd6,
        0.75
      )
      .setDepth(3);
    visual.setStrokeStyle(2, 0xd8b6ff);

    const zone = this.add.zone(
      transition.x + transition.width / 2,
      transition.y + transition.height / 2,
      transition.width,
      transition.height
    );
    this.physics.add.existing(zone, true);
    const physicsZone = zone as PhysicsZone;

    this.physics.add.overlap(this.player, physicsZone, () => {
      void this.handleTransition(transition);
    });
  }

  private async handleTransition(transition: TransitionDefinition): Promise<void> {
    if (this.transitioning || this.time.now < this.transitionCooldownUntil) return;

    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.encounterDistanceAccumulator = 0;

    this.cameras.main.fadeOut(140, 20, 15, 28);
    await new Promise<void>((resolve) => {
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
    });

    const previousMapId = this.save.currentMapId;
    this.save.currentMapId = transition.targetMapId;
    this.save.playerPosition = { x: transition.targetX, y: transition.targetY };
    SaveService.save(this.save);

    if (transition.targetMapId === previousMapId) {
      this.player.setPosition(transition.targetX, transition.targetY);
      this.playerVisual.setPosition(transition.targetX, transition.targetY - 11);
      this.cameras.main.fadeIn(140, 20, 15, 28);
      this.transitionCooldownUntil = this.time.now + 450;
      this.transitioning = false;
      return;
    }

    this.scene.restart();
  }

  private updateEncounterState(delta: number): void {
    const zone = this.findActiveEncounterZone();
    const isMoving = this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;

    if (this.time.now < this.encounterCooldownUntil || !zone || !isMoving) return;

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

    return (
      map.encounterZones.find(
        (zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
      ) ?? null
    );
  }

  private startEncounter(zone: EncounterZoneDefinition): void {
    if (this.transitioning) return;

    this.transitioning = true;
    this.player.body.setVelocity(0, 0);

    const wildChampion = this.createWildChampion(zone.encounterTableId);
    this.registry.set('pendingEncounter', { zoneId: zone.id, wildChampion });
    SaveService.save(this.save);

    this.cameras.main.flash(180, 255, 255, 255);
    this.cameras.main.shake(120, 0.0035);

    this.time.delayedCall(220, () => this.scene.start('BattleScene'));
  }

  private createWildChampion(encounterTableId: string): ChampionInstance {
    const table = DataRegistry.encounter(encounterTableId);
    const entry = this.pickWeightedEntry(table.entries);
    const definition = DataRegistry.champion(entry.championId);
    const level = Phaser.Math.Between(entry.minLevel, entry.maxLevel);

    return {
      instanceId: crypto.randomUUID(),
      championId: entry.championId,
      level,
      experience: 0,
      mastery: 1,
      masteryExperience: 0,
      currentHp: definition.baseStats.hp,
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

  private drawWorldGrid(width: number, height: number): void {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x84c96b, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, 0x78b962, 0.45);

    for (let x = 0; x <= width; x += 32) graphics.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 32) graphics.lineBetween(0, y, width, y);
  }
}
