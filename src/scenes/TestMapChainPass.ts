import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { WorldScene } from './WorldScene';

const TEST_MAP_BACKGROUNDS: Record<string, string> = {
  'bandle-test-clearing-960': 'bandle-test-clearing-960-bg',
  'bandle-test-village-960': 'bandle-test-village-960-bg'
};

export function applyTestMapChainPass(): void {
  patchBootPreload();
  patchWorldSceneBackground();
}

function patchBootPreload(): void {
  const prototype = BootScene.prototype as any;
  if (prototype.__testMapChainPreloadApplied) return;
  prototype.__testMapChainPreloadApplied = true;

  const originalPreload = prototype.preload;
  prototype.preload = function (): void {
    originalPreload.call(this);
    this.load.image(
      'bandle-test-clearing-960-bg',
      './assets/world/regions/bandle-city/zones/test-clearing-960/overworld.avif'
    );
    this.load.image(
      'bandle-test-village-960-bg',
      './assets/world/regions/bandle-city/zones/test-village-960/overworld.avif'
    );
  };
}

function patchWorldSceneBackground(): void {
  const prototype = WorldScene.prototype as any;
  if (prototype.__testMapChainApplied) return;
  prototype.__testMapChainApplied = true;

  const originalCreateMapBackground = prototype.createMapBackground;
  prototype.createMapBackground = function (mapId: string, width: number, height: number): void {
    const textureKey = TEST_MAP_BACKGROUNDS[mapId];
    if (!textureKey) {
      originalCreateMapBackground.call(this, mapId, width, height);
      return;
    }

    if (this.textures.exists(textureKey)) {
      this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // Keep the normal legacy overworld camera untouched. The temporary 960x540
    // maps are deliberately larger scrollable worlds, so player scale, touch HUD,
    // movement and the rest of the current overworld stay exactly as they are.
    this.add.image(0, 0, textureKey).setOrigin(0).setDisplaySize(width, height).setDepth(0);
  };
}
