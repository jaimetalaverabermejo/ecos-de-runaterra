import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/SaveService';
import {
  BANDLE_MAP_DATA_URI,
  GAREN_OVERWORLD_SHEET_DATA_URI,
  GAREN_OVERWORLD_FRAME_HEIGHT,
  GAREN_OVERWORLD_FRAME_WIDTH,
  TEEMO_BATTLE_FRONT_DATA_URI
} from '../assets/embeddedAssets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet('garen-overworld', GAREN_OVERWORLD_SHEET_DATA_URI, {
      frameWidth: GAREN_OVERWORLD_FRAME_WIDTH,
      frameHeight: GAREN_OVERWORLD_FRAME_HEIGHT
    });

    // The embedded back sprite became unreliable on iOS in v3.
    // Use the repository SVG instead: it is deterministic, transparent and crisp.
    this.load.svg('garen-battle-back', './assets/sprites/garen-battle-v3.svg');
    this.load.image('teemo-battle-front', TEEMO_BATTLE_FRONT_DATA_URI);
    this.load.image('bandle-bg', BANDLE_MAP_DATA_URI);
  }

  create(): void {
    DataRegistry.champion('garen');
    DataRegistry.champion('teemo');
    DataRegistry.map('bandle-debug');
    DataRegistry.encounter('bandle-meadow');

    // Keep characters crisp while allowing the temporary raster map to scale more smoothly.
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
