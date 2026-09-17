import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { WorldScene } from './WorldScene';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';

const TEST_MAP_BACKGROUNDS: Record<string, string> = {
  'bandle-test-clearing-960': 'bandle-test-clearing-960-bg',
  'bandle-test-village-960': 'bandle-test-village-960-bg'
};

export function applyTestMapChainPass(): void {
  patchBootPreload();
  patchWorldScene();
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
      './assets/world/regions/bandle-city/zones/test-clearing-960/overworld.jpg'
    );
    this.load.image(
      'bandle-test-village-960-bg',
      './assets/world/regions/bandle-city/zones/test-village-960/overworld.jpg'
    );
  };
}

function patchWorldScene(): void {
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
    this.add.image(0, 0, textureKey).setOrigin(0).setDisplaySize(width, height).setDepth(0);
  };

  const originalCreate = prototype.create;
  prototype.create = function (): void {
    originalCreate.call(this);

    const scene = this as any;
    const mapId = scene.save?.currentMapId ?? scene.registry.get('save')?.currentMapId;
    if (!TEST_MAP_BACKGROUNDS[mapId]) return;

    const map = DataRegistry.map(mapId);
    configureSceneLayout(scene, 'native-960');
    scene.cameras.main.setBounds(0, 0, map.width, map.height);
    if (scene.player) scene.cameras.main.startFollow(scene.player, true, 0.12, 0.12);
    scene.cameras.main.setRoundPixels(true);
  };
}
