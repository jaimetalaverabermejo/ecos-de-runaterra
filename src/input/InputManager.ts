import Phaser from 'phaser';

export type MoveDirection = 'left' | 'right' | 'up' | 'down' | 'none';

type DirectionKeyMap = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class InputManager {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: DirectionKeyMap;
  private touchDirection: MoveDirection = 'none';
  private readonly touchCapable: boolean;

  constructor(private readonly scene: Phaser.Scene) {
    this.touchCapable = InputManager.detectTouchDevice();
    this.createKeyboardInput();
    if (this.touchCapable) this.createTouchDPad();

    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.clearTouchDirection, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  get direction(): MoveDirection {
    if (this.touchDirection !== 'none') return this.touchDirection;
    if (this.isKeyboardDown('left')) return 'left';
    if (this.isKeyboardDown('right')) return 'right';
    if (this.isKeyboardDown('up')) return 'up';
    if (this.isKeyboardDown('down')) return 'down';
    return 'none';
  }

  get usesTouchControls(): boolean {
    return this.touchCapable;
  }

  private createKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = this.scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as DirectionKeyMap;
  }

  private createTouchDPad(): void {
    const baseX = 58;
    const baseY = 224;
    const step = 34;

    this.createTouchButton(baseX, baseY - step, '▲', 'up');
    this.createTouchButton(baseX, baseY + step, '▼', 'down');
    this.createTouchButton(baseX - step, baseY, '◀', 'left');
    this.createTouchButton(baseX + step, baseY, '▶', 'right');

    this.scene.add.circle(baseX, baseY, 10, 0x09120b, 0.28).setScrollFactor(0).setDepth(1900);
  }

  private createTouchButton(
    x: number,
    y: number,
    label: string,
    direction: Exclude<MoveDirection, 'none'>
  ): void {
    const button = this.scene.add
      .rectangle(x, y, 32, 32, 0x0b160f, 0.58)
      .setStrokeStyle(2, 0xf2fff4, 0.58)
      .setScrollFactor(0)
      .setDepth(1900)
      .setInteractive();

    this.scene.add
      .text(x, y + 1, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1901);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.touchDirection = direction;
    });

    button.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.touchDirection === direction) this.touchDirection = 'none';
    });
  }

  private isKeyboardDown(direction: Exclude<MoveDirection, 'none'>): boolean {
    const cursorKey = this.cursors?.[direction];
    const wasdKey = this.wasd?.[direction];
    return Boolean(cursorKey?.isDown || wasdKey?.isDown);
  }

  private clearTouchDirection(): void {
    this.touchDirection = 'none';
  }

  private destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.clearTouchDirection, this);
    this.touchDirection = 'none';
  }

  private static detectTouchDevice(): boolean {
    return (
      navigator.maxTouchPoints > 0 ||
      'ontouchstart' in window ||
      window.matchMedia?.('(pointer: coarse)').matches === true
    );
  }
}
