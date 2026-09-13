import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/SaveService';
import {
  BANDLE_MAP_DATA_URI,
  TEEMO_BATTLE_FRONT_DATA_URI
} from '../assets/embeddedAssets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Production overworld asset for Garen: 144x192 px, 3x4 grid, 48x48 per frame.
    this.load.spritesheet('garen-overworld', './assets/champions/garen/overworld.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    // Champion-specific assets live under public/assets/champions/<id>/.
    this.load.svg('garen-battle-back', './assets/champions/garen/battle-back-v3.svg');
    this.load.image('teemo-battle-front', TEEMO_BATTLE_FRONT_DATA_URI);
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
