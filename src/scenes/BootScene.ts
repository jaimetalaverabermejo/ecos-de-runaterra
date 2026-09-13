import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/SaveService';

const V3_MIGRATION_KEY = 'ecos-de-runaterra.v3-map-migrated';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.svg('bandle-v3-bg', './assets/maps/bandle-v3.svg');
    this.load.svg('garen-overworld-v3', './assets/sprites/garen-overworld-v3.svg');
    this.load.svg('garen-battle-back-v3', './assets/sprites/garen-battle-v3.svg');
    this.load.svg('teemo-battle-front-v3', './assets/sprites/teemo-battle-v3.svg');
  }

  create(): void {
    DataRegistry.champion('garen');
    DataRegistry.champion('teemo');
    DataRegistry.map('bandle-debug');
    DataRegistry.encounter('bandle-meadow');

    this.createGarenOverworldFrames();

    const save = SaveService.load();

    // Reset only once when moving from the old greybox geometry to Bandle v3.
    if (localStorage.getItem(V3_MIGRATION_KEY) !== '1') {
      save.currentMapId = 'bandle-debug';
      save.playerPosition = { x: 430, y: 430 };
      SaveService.save(save);
      localStorage.setItem(V3_MIGRATION_KEY, '1');
    }

    this.registry.set('save', save);
    this.scene.start('WorldScene');
  }

  private createGarenOverworldFrames(): void {
    const texture = this.textures.get('garen-overworld-v3');
    const directions = ['down', 'up', 'left', 'right'] as const;

    for (let row = 0; row < directions.length; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const frameName = `${directions[row]}-${column}`;
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, column * 16, row * 16, 16, 16);
        }
      }
    }
  }
}
