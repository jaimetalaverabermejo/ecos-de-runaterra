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
  private hud?: Phaser.GameObjects.Container;
  private fill?: Phaser.GameObjects.Rectangle;
  private label?: Phaser.GameObjects.Text;

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
    if (!this.unlocked || this.hud || this.fill) return;

    const panel = this.scene.add.rectangle(0, 0, 154, 30, 0x07131e, 0.88)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6f93a2, 0.78);
    const label = this.scene.add.text(9, 7, 'CALOR', {
      fontFamily: 'Verdana, Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#d7edf5'
    }).setOrigin(0, 0);
    const track = this.scene.add.rectangle(54, 9, 90, 12, 0x0d2531, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x5d7f8d, 0.82);
    this.fill = this.scene.add.rectangle(56, 15, 86, 7, 0xe6a04c, 0.96)
      .setOrigin(0, 0.5)
      .setScale(0, 1);
    this.label = label;
    this.hud = this.scene.add.container(26, 486, [panel, track, this.fill, label])
      .setScrollFactor(0)
      .setDepth(12000)
      .setVisible(false);
  }

  private updateUi(): void {
    if (!this.unlocked) {
      this.hud?.setVisible(false);
      return;
    }

    this.ensureUi();
    if (!this.hud || !this.fill) return;

    const visible = this.heat > 1 || this.overheated;
    this.hud.setVisible(visible);
    this.fill
      .setScale(Phaser.Math.Clamp(this.heat / 100, 0, 1), 1)
      .setFillStyle(this.overheated ? 0xf06a4f : this.heat > 72 ? 0xf0ba4f : 0xe6a04c, 0.96);
    this.label?.setColor(this.overheated ? '#ffb2a5' : '#d7edf5');
  }
}
