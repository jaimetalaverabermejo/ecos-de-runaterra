import { WorldScene } from './WorldScene';
import type { ChampionInstance } from '../data/types';
import type { MoveDirection } from '../input/InputManager';
import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';

const TEXTURE = 'player-overworld';
const IDLE = { down: 1, up: 4, left: 7, right: 10 } as const;
const ANIMS = {
  down: 'player-walk-down',
  up: 'player-walk-up',
  left: 'player-walk-left',
  right: 'player-walk-right'
} as const;

type Facing = keyof typeof IDLE;

export function applyPlayerWorldV13(): void {
  const prototype = WorldScene.prototype as any;
  if (prototype.__playerWorldV13Applied) return;
  prototype.__playerWorldV13Applied = true;

  prototype.ensurePlayerAnimations = function (): void {
    const create = (key: string, start: number, end: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(TEXTURE, { start, end }),
        frameRate: 5,
        repeat: -1
      });
    };
    create(ANIMS.down, 0, 2);
    create(ANIMS.up, 3, 5);
    create(ANIMS.left, 6, 8);
    create(ANIMS.right, 9, 11);
  };

  prototype.createPlayer = function (x: number, y: number): void {
    const body = this.add.rectangle(x, y, 16, 10, 0xffffff, 0);
    this.physics.add.existing(body);
    this.player = body;
    this.player.body.setSize(16, 10);
    this.player.body.setCollideWorldBounds(true);
    this.playerVisual = this.add.sprite(x, y + 6, TEXTURE, IDLE.down)
      .setOrigin(0.5, 1)
      .setScale(0.65)
      .setDepth(100 + y);
  };

  prototype.updatePlayerVisual = function (direction: MoveDirection): void {
    const facing = this.lastFacing as Facing;
    this.playerVisual.setPosition(this.player.x, this.player.y + 6);
    this.playerVisual.setScale(0.65);
    this.playerVisual.setDepth(100 + Math.round(this.player.y));
    if (direction === 'none') {
      this.playerVisual.anims.stop();
      this.playerVisual.setFrame(IDLE[facing]);
      return;
    }
    this.playerVisual.anims.play(ANIMS[direction as Facing], true);
  };

  const originalCreateWildChampion = prototype.createWildChampion;
  prototype.createWildChampion = function (encounterTableId: string): ChampionInstance {
    const champion = originalCreateWildChampion.call(this, encounterTableId) as ChampionInstance;
    EchoRegistryService.markSeen(this.save, champion.championId);
    return champion;
  };
}
