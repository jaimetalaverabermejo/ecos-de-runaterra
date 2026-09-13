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
import { InputManager, type MoveDirection } from '../input/InputManager';
import { SaveService } from '../systems/SaveService';

type PhysicsSprite = Phaser.Physics.Arcade.Sprite & {
  body: Phaser.Physics.Arcade.Body;
};

type PhysicsZone = Phaser.GameObjects.Zone & {
  body: Phaser.Physics.Arcade.Body;
};

const PLAYER_TEXTURE_KEY = 'garen-overworld';

const PLAYER_IDLE_FRAME: Record<'up' | 'down' | 'left' | 'right', number> = {
  down: 1,
  up: 4,
  left: 7,
  right: 10
};

const PLAYER_ANIMATIONS = {
  down: 'garen-walk-down',
  up: 'garen-walk-up',
  left: 'garen-walk-left',
  right: 'garen-walk-right'
} as const;

export class WorldScene extends Phaser.Scene {
  private player!: PhysicsSprite;
  private inputManager!: InputManager;
  private save!: SaveGame;
  private transitioning = false;
  private transitionCooldownUntil = 0;
  private encounterCooldownUntil = 0;
  private encounterDistanceAccumulator = 0;
  private readonly moveSpeed = 112;
  private readonly encounterStepDistance = 52;
  private readonly encounterChancePerStep = 0.15;
  private lastFacing: 'up' | 'down' | 'left' | 'right' = 'down';

  constructor() {
    super('WorldScene');
  }

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
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.add
      .text(12, 10, 'BANDLE CITY — PROTOTIPO 03', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 4 }
      })
      .setScrollFactor(0)
      .setDepth(1000);

    const hint = this.inputManager.usesTouchControls
      ? 'Mover: cruceta · Hierba alta: Ecos · Portal/escaleras: transición'
      : 'Mover: WASD/flechas · Hierba alta: Ecos · Portal/escaleras: transición';

    this.add
      .text(12, 38, hint, {
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

    if (direction === 'left') {
      this.player.body.setVelocityX(-this.moveSpeed);
      this.lastFacing = 'left';
    } else if (direction === 'right') {
      this.player.body.setVelocityX(this.moveSpeed);
      this.lastFacing = 'right';
    } else if (direction === 'up') {
      this.player.body.setVelocityY(-this.moveSpeed);
      this.lastFacing = 'up';
    } else if (direction === 'down') {
      this.player.body.setVelocityY(this.moveSpeed);
      this.lastFacing = 'down';
    }

    this.updatePlayerAnimation(direction);
    this.updateEncounterState(delta);

    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
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

  private updatePlayerAnimation(direction: MoveDirection): void {
    if (direction === 'none') {
      this.player.anims.stop();
      this.player.setFrame(PLAYER_IDLE_FRAME[this.lastFacing]);
      return;
    }

    this.player.anims.play(PLAYER_ANIMATIONS[direction], true);
  }

  private createPlayer(x: number, y: number): void {
    const player = this.physics.add
      .sprite(x, y, PLAYER_TEXTURE_KEY, PLAYER_IDLE_FRAME.down)
      .setScale(1.4)
      .setDepth(20);

    this.player = player as PhysicsSprite;
    // Small foot hitbox: the visual body can overlap grass/decor while feet drive collisions.
    this.player.body.setSize(12, 8);
    this.player.body.setOffset(9, 21);
    this.player.body.setCollideWorldBounds(true);
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
    this.physics.add.collider(this.player, collider);
  }

  private createEncounterZone(zone: EncounterZoneDefinition): void {
    // Tall grass is already visible in the map art; only the invisible trigger remains.
    this.add.zone(
      zone.x + zone.width / 2,
      zone.y + zone.height / 2,
      zone.width,
      zone.height
    );
  }

  private createTransition(transition: TransitionDefinition): void {
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
    this.player.anims.stop();
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
        (zone) =>
          x >= zone.x &&
          x <= zone.x + zone.width &&
          y >= zone.y &&
          y <= zone.y + zone.height
      ) ?? null
    );
  }

  private startEncounter(zone: EncounterZoneDefinition): void {
    if (this.transitioning) return;

    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.player.anims.stop();
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
}
