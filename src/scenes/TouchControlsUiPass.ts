import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { UI } from '../ui/theme/UiTheme';

const TOUCH_ALPHA = 0.82;
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
  patchWorldMenuButton();
  patchWorldDialogueTouchVisibility();
}

function patchWorldMenuButton(): void {
  const prototype = WorldScene.prototype as any;
  if (prototype.__ui960TouchMenuPassApplied) return;
  prototype.__ui960TouchMenuPassApplied = true;

  prototype.createMenuButton = function (): void {
    if (document.body.dataset.mobileConsole === 'true') return;

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
