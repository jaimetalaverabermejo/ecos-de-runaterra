import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type {
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
  private inputManager!: InputManager;
  private save!: SaveGame;
  private transitioning = false;
  private readonly moveSpeed = 128;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    const map = DataRegistry.map(this.save.currentMapId);

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBackgroundColor('#84c96b');

    this.drawWorldGrid(map.width, map.height);
    this.createPlayer(this.save.playerPosition.x, this.save.playerPosition.y);

    for (const rect of map.collisions) {
      this.createCollision(rect);
    }

    for (const zone of map.encounterZones) {
      this.createEncounterZone(zone);
    }

    for (const transition of map.transitions) {
      this.createTransition(transition);
    }

    this.inputManager = new InputManager(this);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.add
      .text(12, 10, 'BANDLE CITY — GREYBOX 01', {
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

  update(): void {
    if (!this.player || this.transitioning) return;

    this.player.body.setVelocity(0, 0);

    const direction = this.inputManager.direction;

    // Cardinal movement only: never move diagonally.
    if (direction === 'left') {
      this.player.body.setVelocityX(-this.moveSpeed);
    } else if (direction === 'right') {
      this.player.body.setVelocityX(this.moveSpeed);
    } else if (direction === 'up') {
      this.player.body.setVelocityY(-this.moveSpeed);
    } else if (direction === 'down') {
      this.player.body.setVelocityY(this.moveSpeed);
    }

    this.save.playerPosition.x = Math.round(this.player.x);
    this.save.playerPosition.y = Math.round(this.player.y);
  }

  private createPlayer(x: number, y: number): void {
    const player = this.add.rectangle(x, y, 20, 28, 0xd9d9d9).setDepth(20);
    player.setStrokeStyle(2, 0x2d3c4d);
    this.physics.add.existing(player);

    this.player = player as PhysicsRectangle;
    this.player.body.setSize(16, 18);
    this.player.body.setOffset(2, 10);
    this.player.body.setCollideWorldBounds(true);
  }

  private createCollision(rect: RectDefinition): void {
    const visual = this.add
      .rectangle(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height,
        0x426b3a
      )
      .setDepth(5);

    visual.setStrokeStyle(2, 0x2e4e2a);
    this.physics.add.existing(visual, true);
    this.physics.add.collider(this.player, visual);
  }

  private createEncounterZone(zone: EncounterZoneDefinition): void {
    const visual = this.add
      .rectangle(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        zone.width,
        zone.height,
        0x39784d,
        0.62
      )
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
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);

    this.cameras.main.fadeOut(140, 20, 15, 28);
    await new Promise<void>((resolve) => {
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
    });

    this.save.currentMapId = transition.targetMapId;
    this.save.playerPosition = { x: transition.targetX, y: transition.targetY };
    SaveService.save(this.save);

    // For Step 1 both portals remain inside the same map. Reloading the scene
    // already proves the transition/save architecture we will use between maps.
    this.scene.restart();
  }

  private drawWorldGrid(width: number, height: number): void {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x84c96b, 1);
    graphics.fillRect(0, 0, width, height);

    graphics.lineStyle(1, 0x78b962, 0.45);
    for (let x = 0; x <= width; x += 32) {
      graphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 32) {
      graphics.lineBetween(0, y, width, y);
    }
  }
}
