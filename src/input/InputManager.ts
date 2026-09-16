import Phaser from 'phaser';

export type MoveDirection = 'left' | 'right' | 'up' | 'down' | 'none';

type DirectionKeyMap = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class InputManager {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: DirectionKeyMap;
  private touchDirection: MoveDirection = 'none';
  private touchActionAQueued = false;
  private touchActionBQueued = false;
  private readonly touchCapable: boolean;

  constructor(private readonly scene: Phaser.Scene) {
    this.touchCapable = InputManager.detectTouchDevice();
    this.createKeyboardInput();
    if (this.touchCapable) this.createTouchControls();

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

  consumeActionA(): boolean {
    if (!this.touchActionAQueued) return false;
    this.touchActionAQueued = false;
    return true;
  }

  consumeActionB(): boolean {
    if (!this.touchActionBQueued) return false;
    this.touchActionBQueued = false;
    return true;
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

  private createTouchControls(): void {
    const baseX = 109;
    const baseY = 424;
    const step = 64;

    this.createDirectionButton(baseX, baseY - step, '▲', 'up');
    this.createDirectionButton(baseX, baseY + step, '▼', 'down');
    this.createDirectionButton(baseX - step, baseY, '◀', 'left');
    this.createDirectionButton(baseX + step, baseY, '▶', 'right');

    this.scene.add.circle(baseX, baseY, 23, 0x07131e, 0.30)
      .setStrokeStyle(2, 0x49d8e8, 0.28)
      .setScrollFactor(0)
      .setDepth(12000);

    this.createActionButton(874, 405, 38, 'A', 0x1d5a40, 0x72e6f0, () => {
      this.touchActionAQueued = true;
    });
    this.createActionButton(806, 473, 34, 'B', 0x5c4819, 0xf2d76d, () => {
      this.touchActionBQueued = true;
    });
  }

  private createDirectionButton(
    x: number,
    y: number,
    label: string,
    direction: Exclude<MoveDirection, 'none'>
  ): void {
    const button = this.scene.add.circle(x, y, 32, 0x0d2234, 0.38)
      .setStrokeStyle(4, 0x49d8e8, 0.48)
      .setScrollFactor(0)
      .setDepth(12000)
      .setInteractive({ useHandCursor: true });

    this.scene.add.text(x, y + 1, label, {
      fontFamily: 'Verdana, Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f8fbff'
    })
      .setOrigin(0.5)
      .setAlpha(0.86)
      .setScrollFactor(0)
      .setDepth(12001);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.touchDirection = direction;
      button.setFillStyle(0x173d5b, 0.62);
    });

    button.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.touchDirection === direction) this.touchDirection = 'none';
      button.setFillStyle(0x0d2234, 0.38);
    });

    button.on(Phaser.Input.Events.POINTER_OUT, () => {
      if (this.touchDirection === direction) this.touchDirection = 'none';
      button.setFillStyle(0x0d2234, 0.38);
    });
  }

  private createActionButton(
    x: number,
    y: number,
    radius: number,
    label: string,
    fill: number,
    stroke: number,
    onPress: () => void
  ): void {
    const button = this.scene.add.circle(x, y, radius, fill, 0.46)
      .setStrokeStyle(4, stroke, 0.70)
      .setScrollFactor(0)
      .setDepth(12000)
      .setInteractive({ useHandCursor: true });

    this.scene.add.text(x, y, label, {
      fontFamily: 'Verdana, Arial, sans-serif',
      fontSize: radius >= 36 ? '26px' : '23px',
      fontStyle: 'bold',
      color: '#f8fbff'
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(12001);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      button.setAlpha(0.9);
      onPress();
    });
    button.on(Phaser.Input.Events.POINTER_UP, () => button.setAlpha(1));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setAlpha(1));
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
    this.touchActionAQueued = false;
    this.touchActionBQueued = false;
  }

  private static detectTouchDevice(): boolean {
    return (
      navigator.maxTouchPoints > 0 ||
      'ontouchstart' in window ||
      window.matchMedia?.('(pointer: coarse)').matches === true
    );
  }
}
