import Phaser from 'phaser';
import { InputManager, type MoveDirection } from '../input/InputManager';
import { WorldScene } from './WorldScene';
import { UI } from '../ui/theme/UiTheme';

const TOUCH_DEPTH = 12000;
const TOUCH_ALPHA = 0.82;

function px(scene: Phaser.Scene, screenPixels: number): number {
  return screenPixels / Math.max(1, scene.cameras.main.zoom || 1);
}

function setPressedTexture(image: Phaser.GameObjects.Image, pressed: boolean, normalKey: string, pressedKey: string): void {
  image.setTexture(pressed ? pressedKey : normalKey);
  image.setAlpha(pressed ? 0.96 : TOUCH_ALPHA);
}

export function applyTouchControlsUiPass(): void {
  patchInputManager();
  patchWorldMenuButton();
}

function patchInputManager(): void {
  const prototype = InputManager.prototype as any;
  if (prototype.__ui960TouchPassApplied) return;
  prototype.__ui960TouchPassApplied = true;

  prototype.createTouchControls = function (): void {
    const scene = this.scene as Phaser.Scene;
    const baseX = 282;
    const baseY = 352;
    const step = 34;

    scene.add.image(baseX, baseY, 'ui960a-touch-dpad-base')
      .setDisplaySize(px(scene, 192), px(scene, 192))
      .setAlpha(0.72)
      .setScrollFactor(0)
      .setDepth(TOUCH_DEPTH - 2);

    const createDirection = (
      x: number,
      y: number,
      direction: Exclude<MoveDirection, 'none'>,
      angle: number
    ): void => {
      const arrow = scene.add.image(x, y, 'ui960a-touch-dpad-arrow')
        .setDisplaySize(px(scene, 44), px(scene, 44))
        .setAngle(angle)
        .setAlpha(TOUCH_ALPHA)
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH);

      const hit = scene.add.zone(x, y, px(scene, 68), px(scene, 68))
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH + 2)
        .setInteractive({ useHandCursor: true });

      const release = (): void => {
        if (this.touchDirection === direction) this.touchDirection = 'none';
        setPressedTexture(arrow, false, 'ui960a-touch-dpad-arrow', 'ui960a-touch-dpad-arrow-pressed');
      };

      hit.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.touchDirection = direction;
        setPressedTexture(arrow, true, 'ui960a-touch-dpad-arrow', 'ui960a-touch-dpad-arrow-pressed');
      });
      hit.on(Phaser.Input.Events.POINTER_UP, release);
      hit.on(Phaser.Input.Events.POINTER_OUT, release);
    };

    createDirection(baseX, baseY - step, 'up', 0);
    createDirection(baseX + step, baseY, 'right', 90);
    createDirection(baseX, baseY + step, 'down', 180);
    createDirection(baseX - step, baseY, 'left', -90);

    const createAction = (x: number, y: number, label: 'A' | 'B', onPress: () => void): void => {
      const button = scene.add.image(x, y, 'ui960a-touch-button-round')
        .setDisplaySize(px(scene, 116), px(scene, 116))
        .setAlpha(TOUCH_ALPHA)
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH)
        .setInteractive({ useHandCursor: true });

      scene.add.text(x, y, label, {
        fontFamily: UI.font.family,
        fontSize: `${Math.max(13, Math.round(px(scene, 28)))}px`,
        fontStyle: 'bold',
        color: '#f8fbff'
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH + 1);

      const release = (): void => setPressedTexture(
        button,
        false,
        'ui960a-touch-button-round',
        'ui960a-touch-button-round-pressed'
      );

      button.on(Phaser.Input.Events.POINTER_DOWN, () => {
        setPressedTexture(button, true, 'ui960a-touch-button-round', 'ui960a-touch-button-round-pressed');
        onPress();
      });
      button.on(Phaser.Input.Events.POINTER_UP, release);
      button.on(Phaser.Input.Events.POINTER_OUT, release);
    };

    createAction(690, 342, 'A', () => { this.touchActionAQueued = true; });
    createAction(654, 378, 'B', () => { this.touchActionBQueued = true; });
  };
}

function patchWorldMenuButton(): void {
  const prototype = WorldScene.prototype as any;
  if (prototype.__ui960TouchMenuPassApplied) return;
  prototype.__ui960TouchMenuPassApplied = true;

  prototype.createMenuButton = function (): void {
    const x = 708;
    const y = 150;
    const button = this.add.image(x, y, 'ui960a-touch-button-menu')
      .setDisplaySize(px(this, 92), px(this, 92))
      .setAlpha(TOUCH_ALPHA)
      .setScrollFactor(0)
      .setDepth(4000)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, '☰', {
      fontFamily: UI.font.family,
      fontSize: `${Math.max(14, Math.round(px(this, 34)))}px`,
      fontStyle: 'bold',
      color: UI.text.primary
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001).setAlpha(0.94);

    const release = (): void => setPressedTexture(
      button,
      false,
      'ui960a-touch-button-menu',
      'ui960a-touch-button-menu-pressed'
    );

    button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      setPressedTexture(button, true, 'ui960a-touch-button-menu', 'ui960a-touch-button-menu-pressed');
    });
    button.on(Phaser.Input.Events.POINTER_OUT, release);
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      release();
      this.openMenu();
    });
  };
}
