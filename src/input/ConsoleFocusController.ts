import Phaser from 'phaser';
import { ConsoleInput } from './ConsoleInput';

export interface ConsoleFocusOption {
  x: number;
  y: number;
  activate: () => void;
  enabled?: () => boolean;
}

export class ConsoleFocusController {
  private index = 0;
  private readonly cursor: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly options: ConsoleFocusOption[],
    private readonly onBack?: () => void
  ) {
    ConsoleInput.clearTransient();
    this.cursor = scene.add.text(0, 0, '◆', {
      fontFamily: 'Verdana, Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f2d76d'
    }).setOrigin(0.5).setDepth(30000);

    this.index = Math.max(0, this.options.findIndex((option) => this.isEnabled(option)));
    this.refresh();
  }

  update(): void {
    if (this.options.length === 0) {
      if (ConsoleInput.consumeB()) this.onBack?.();
      return;
    }

    const direction = ConsoleInput.consumeDirection();
    if (direction) {
      const delta = direction === 'up' || direction === 'left' ? -1 : 1;
      this.move(delta);
    }

    if (ConsoleInput.consumeA()) {
      const option = this.options[this.index];
      if (option && this.isEnabled(option)) option.activate();
    }

    if (ConsoleInput.consumeB()) this.onBack?.();
  }

  setIndex(index: number): void {
    if (this.options.length === 0) return;
    this.index = Phaser.Math.Wrap(index, 0, this.options.length);
    this.skipDisabled(1);
    this.refresh();
  }

  private move(delta: number): void {
    if (this.options.length <= 1) return;
    this.index = Phaser.Math.Wrap(this.index + delta, 0, this.options.length);
    this.skipDisabled(delta);
    this.refresh();
  }

  private skipDisabled(delta: number): void {
    for (let attempt = 0; attempt < this.options.length; attempt += 1) {
      const option = this.options[this.index];
      if (option && this.isEnabled(option)) return;
      this.index = Phaser.Math.Wrap(this.index + delta, 0, this.options.length);
    }
  }

  private refresh(): void {
    const option = this.options[this.index];
    this.cursor.setVisible(Boolean(option));
    if (option) this.cursor.setPosition(option.x, option.y);
  }

  private isEnabled(option: ConsoleFocusOption): boolean {
    return option.enabled?.() ?? true;
  }
}
