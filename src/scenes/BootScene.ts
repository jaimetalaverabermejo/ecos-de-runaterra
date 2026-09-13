import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/SaveService';
import { BANDLE_MAP_DATA_URI } from '../assets/embeddedAssets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Canonical replace-in-place asset paths. Keep these filenames and future art updates
    // can be uploaded directly to GitHub without changing TypeScript.
    this.load.spritesheet('garen-overworld', './assets/sprites/garen-world.png', {
      frameWidth: 48,
      frameHeight: 48
    });
    this.load.image('garen-battle-back', './assets/sprites/garen-battle-back.png');
    this.load.image('teemo-battle-front', './assets/sprites/teemo-battle-front.png');

    // Temporary embedded overworld background. The canonical future path will be
    // ./assets/maps/bandle-overworld.png once the final 1024x768 PNG is uploaded.
    this.load.image('bandle-bg', BANDLE_MAP_DATA_URI);
  }

  create(): void {
    DataRegistry.champion('garen');
    DataRegistry.champion('teemo');
    DataRegistry.map('bandle-debug');
    DataRegistry.encounter('bandle-meadow');

    this.textures.get('garen-overworld').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('garen-battle-back').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('teemo-battle-front').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('bandle-bg').setFilter(Phaser.Textures.FilterMode.LINEAR);

    const save = SaveService.load();
    const map = DataRegistry.map(save.currentMapId);
    const migrationKey = 'ecos-de-runaterra.migration.v3';

    if (localStorage.getItem(migrationKey) !== 'done') {
      save.currentMapId = 'bandle-debug';
      save.playerPosition = { ...map.spawn };
      SaveService.save(save);
      localStorage.setItem(migrationKey, 'done');
    }

    this.registry.set('save', save);
    this.scene.start('WorldScene');
  }
}
