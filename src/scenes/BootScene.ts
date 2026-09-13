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
    // Overworld remains on the known-good embedded sprite until the new
    // champion-folder asset is validated at the exact production dimensions.
    this.load.spritesheet('garen-overworld', GAREN_OVERWORLD_SHEET_DATA_URI, {
      frameWidth: GAREN_OVERWORLD_FRAME_WIDTH,
      frameHeight: GAREN_OVERWORLD_FRAME_HEIGHT
    });

    // Champion-specific assets now live under public/assets/champions/<id>/.
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
