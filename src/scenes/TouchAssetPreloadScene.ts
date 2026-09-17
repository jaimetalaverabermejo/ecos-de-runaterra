import Phaser from 'phaser';

const TOUCH_ASSETS: Record<string, string> = {
  'ui960a-touch-dpad-base': './assets/ui960_addon/touch/touch-dpad-base-192x192.png',
  'ui960a-touch-dpad-arrow': './assets/ui960_addon/touch/touch-dpad-arrow-44x44.png',
  'ui960a-touch-dpad-arrow-pressed': './assets/ui960_addon/touch/touch-dpad-arrow-pressed-44x44.png',
  'ui960a-touch-button-round': './assets/ui960_addon/touch/touch-button-round-116x116.png',
  'ui960a-touch-button-round-pressed': './assets/ui960_addon/touch/touch-button-round-pressed-116x116.png',
  'ui960a-touch-button-menu': './assets/ui960_addon/touch/touch-button-menu-92x92.png',
  'ui960a-touch-button-menu-pressed': './assets/ui960_addon/touch/touch-button-menu-pressed-92x92.png'
};

/**
 * Tiny bootstrap scene that loads the touch-control add-on before BootScene.
 * Keeping this separate avoids coupling the optional mobile UI pack to the
 * main asset manifest while still making the textures available everywhere.
 */
export class TouchAssetPreloadScene extends Phaser.Scene {
  constructor() {
    super('TouchAssetPreloadScene');
  }

  preload(): void {
    for (const [key, path] of Object.entries(TOUCH_ASSETS)) {
      this.load.image(key, path);
    }
  }

  create(): void {
    for (const key of Object.keys(TOUCH_ASSETS)) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.scene.start('BootScene');
  }
}
