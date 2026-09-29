import Phaser from 'phaser';
import type { MoveDirection } from '../../input/InputManager';
import { InputManager } from '../../input/InputManager';
import type { SaveGame } from '../../state/GameState';

type PhysicsPlayer = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export class SprintController {
  private readonly walkSpeed = 112;
  private readonly sprintSpeed = 178;
  private readonly heatPerSecond = 22;
  private readonly coolPerSecond = 50;
  private heat = 0;
  private overheated = false;
  private sprinting = false;
  private frame?: Phaser.GameObjects.Rectangle;
  private fill?: Phaser.GameObjects.Rectangle;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly save: SaveGame,
    private readonly player: PhysicsPlayer,
    private readonly input: InputManager
  ) {}

  get unlocked(): boolean {
    return this.save.worldProgress.flags.includes('ability:sprint-unlocked');
  }

  get isSprinting(): boolean {
    return this.sprinting;
  }

  update(delta: number, direction: MoveDirection): number {
    const moving = direction !== 'none';
    const wantsSprint = this.unlocked && moving && this.input.sprintHeld && !this.overheated;
    this.sprinting = wantsSprint;

    if (wantsSprint) {
      this.heat = Math.min(100, this.heat + this.heatPerSecond * (delta / 1000));
      if (this.heat >= 100) this.overheated = true;
    } else if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - this.coolPerSecond * (delta / 1000));
      if (this.overheated && this.heat <= 30) this.overheated = false;
    }

    this.updateUi();
    return wantsSprint ? this.sprintSpeed : this.walkSpeed;
  }

  refreshUi(): void {
    this.updateUi();
  }

  private ensureUi(): void {
    if (!this.unlocked || this.frame || this.fill) return;
    this.frame = this.scene.add.rectangle(this.player.x, this.player.y - 44, 38, 7, 0x0a1018, 0.82)
      .setStrokeStyle(1, 0xb9dbe5, 0.55)
      .setDepth(920 + Math.round(this.player.y));
    this.fill = this.scene.add.rectangle(this.player.x - 17, this.player.y - 44, 34, 3, 0xe6a04c, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(921 + Math.round(this.player.y))
      .setScale(0, 1);
  }

  private updateUi(): void {
    if (!this.unlocked) {
      this.frame?.setVisible(false);
      this.fill?.setVisible(false);
      return;
    }

    this.ensureUi();
    if (!this.frame || !this.fill) return;
    const visible = this.heat > 1 || this.overheated;
    const x = this.player.x;
    const y = this.player.y - 44;

    this.frame.setPosition(x, y)
      .setVisible(visible)
      .setDepth(920 + Math.round(this.player.y));
    this.fill.setPosition(x - 17, y)
      .setScale(Phaser.Math.Clamp(this.heat / 100, 0, 1), 1)
      .setFillStyle(this.overheated ? 0xf06a4f : 0xe6a04c, 0.95)
      .setVisible(visible)
      .setDepth(921 + Math.round(this.player.y));
  }
}
