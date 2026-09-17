import Phaser from 'phaser';
import { InputManager, type MoveDirection } from '../input/InputManager';
import { WorldScene } from './WorldScene';
import { UI } from '../ui/theme/UiTheme';

const TOUCH_DEPTH = 12000;
const TOUCH_ALPHA = 0.82;
const DPAD_SCREEN_SIZE = 164;
const DPAD_ARROW_SCREEN_SIZE = 38;
const DPAD_STEP = 20;
const ACTION_SCREEN_SIZE = 98;
const MENU_SCREEN_SIZE = 82;

type TouchScene = Phaser.Scene & {
  __ui960TouchObjects?: Phaser.GameObjects.GameObject[];
};

type TouchDialogueWorld = WorldScene & {
  __ui960DialogueTouchHandler?: (pointer: Phaser.Input.Pointer) => void;
  __ui960DialogueTouchEnabledAt?: number;
};

function px(scene: Phaser.Scene, screenPixels: number): number {
  return screenPixels / Math.max(1, scene.cameras.main.zoom || 1);
}

function setPressedTexture(image: Phaser.GameObjects.Image, pressed: boolean, normalKey: string, pressedKey: string): void {
  image.setTexture(pressed ? pressedKey : normalKey);
  image.setAlpha(pressed ? 0.96 : TOUCH_ALPHA);
}

function touchObjects(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const touchScene = scene as TouchScene;
  if (!touchScene.__ui960TouchObjects) touchScene.__ui960TouchObjects = [];
  return touchScene.__ui960TouchObjects;
}

function trackTouchObject<T extends Phaser.GameObjects.GameObject>(scene: Phaser.Scene, object: T): T {
  touchObjects(scene).push(object);
  return object;
}

function setTouchHudVisible(scene: Phaser.Scene, visible: boolean): void {
  for (const object of touchObjects(scene)) {
    if (!object.active) continue;
    const gameObject = object as Phaser.GameObjects.GameObject & {
      setVisible?: (value: boolean) => unknown;
      input?: Phaser.Types.Input.InteractiveObject | null;
    };
    gameObject.setVisible?.(visible);
    if (gameObject.input) gameObject.input.enabled = visible;
  }
}

function removeDialogueTouchHandler(scene: TouchDialogueWorld): void {
  if (!scene.__ui960DialogueTouchHandler) return;
  scene.input.off(Phaser.Input.Events.POINTER_DOWN, scene.__ui960DialogueTouchHandler);
  scene.__ui960DialogueTouchHandler = undefined;
}

export function applyTouchControlsUiPass(): void {
  patchInputManager();
  patchWorldMenuButton();
  patchWorldDialogueTouchVisibility();
}

function patchInputManager(): void {
  const prototype = InputManager.prototype as any;
  if (prototype.__ui960TouchPassApplied) return;
  prototype.__ui960TouchPassApplied = true;

  prototype.createTouchControls = function (): void {
    const scene = this.scene as TouchScene;
    scene.__ui960TouchObjects = [];

    const baseX = 282;
    const baseY = 352;
    const step = DPAD_STEP;

    trackTouchObject(scene, scene.add.image(baseX, baseY, 'ui960a-touch-dpad-base')
      .setDisplaySize(px(scene, DPAD_SCREEN_SIZE), px(scene, DPAD_SCREEN_SIZE))
      .setAlpha(0.72)
      .setScrollFactor(0)
      .setDepth(TOUCH_DEPTH - 2));

    const createDirection = (
      x: number,
      y: number,
      direction: Exclude<MoveDirection, 'none'>,
      angle: number
    ): void => {
      const arrow = trackTouchObject(scene, scene.add.image(x, y, 'ui960a-touch-dpad-arrow')
        .setDisplaySize(px(scene, DPAD_ARROW_SCREEN_SIZE), px(scene, DPAD_ARROW_SCREEN_SIZE))
        .setAngle(angle)
        .setAlpha(TOUCH_ALPHA)
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH));

      const hit = trackTouchObject(scene, scene.add.zone(x, y, px(scene, 62), px(scene, 62))
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH + 2)
        .setInteractive({ useHandCursor: true }));

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
      const button = trackTouchObject(scene, scene.add.image(x, y, 'ui960a-touch-button-round')
        .setDisplaySize(px(scene, ACTION_SCREEN_SIZE), px(scene, ACTION_SCREEN_SIZE))
        .setAlpha(TOUCH_ALPHA)
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH)
        .setInteractive({ useHandCursor: true }));

      trackTouchObject(scene, scene.add.text(x, y, label, {
        fontFamily: UI.font.family,
        fontSize: `${Math.max(12, Math.round(px(scene, 24)))}px`,
        fontStyle: 'bold',
        color: '#f8fbff'
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(TOUCH_DEPTH + 1));

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
    const button = trackTouchObject(this, this.add.image(x, y, 'ui960a-touch-button-menu')
      .setDisplaySize(px(this, MENU_SCREEN_SIZE), px(this, MENU_SCREEN_SIZE))
      .setAlpha(TOUCH_ALPHA)
      .setScrollFactor(0)
      .setDepth(4000)
      .setInteractive({ useHandCursor: true }));

    trackTouchObject(this, this.add.text(x, y, '☰', {
      fontFamily: UI.font.family,
      fontSize: `${Math.max(13, Math.round(px(this, 30)))}px`,
      fontStyle: 'bold',
      color: UI.text.primary
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001).setAlpha(0.94));

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

function patchWorldDialogueTouchVisibility(): void {
  const prototype = WorldScene.prototype as any;
  if (prototype.__ui960TouchDialogueVisibilityApplied) return;
  prototype.__ui960TouchDialogueVisibilityApplied = true;

  const originalRenderDialogue = prototype.renderDialogue;
  prototype.renderDialogue = function (): void {
    const scene = this as TouchDialogueWorld & any;
    removeDialogueTouchHandler(scene);
    setTouchHudVisible(scene, false);
    originalRenderDialogue.call(scene);

    if (!scene.dialogueLayer || !scene.dialogueNode) return;
    scene.__ui960DialogueTouchEnabledAt = scene.time.now + 120;

    const handler = (pointer: Phaser.Input.Pointer): void => {
      if (!scene.dialogueLayer || !scene.dialogueNode) return;
      if (scene.time.now < (scene.__ui960DialogueTouchEnabledAt ?? 0)) return;

      const node = scene.dialogueNode;
      const atEnd = scene.dialogueLineIndex >= node.lines.length - 1;
      const choices = atEnd ? node.choices ?? [] : [];

      if (choices.length > 0) {
        const choiceXMin = 688;
        const choiceXMax = 930;
        if (pointer.x < choiceXMin || pointer.x > choiceXMax) return;

        for (let index = 0; index < choices.length; index += 1) {
          const choiceY = 414 + index * 48;
          if (Math.abs(pointer.y - choiceY) > 24) continue;
          scene.dialogueChoiceIndex = index;
          scene.chooseDialogue(choices[index].nextNodeId);
          return;
        }
        return;
      }

      if (pointer.y >= 350) scene.advanceDialogue();
    };

    scene.__ui960DialogueTouchHandler = handler;
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, handler);
  };

  const originalCloseDialogue = prototype.closeDialogue;
  prototype.closeDialogue = function (): void {
    const scene = this as TouchDialogueWorld & any;
    removeDialogueTouchHandler(scene);
    originalCloseDialogue.call(scene);
    setTouchHudVisible(scene, true);
  };
}
