import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/SaveService';
import {
  BANDLE_MAP_DATA_URI,
  GAREN_BATTLE_BACK_DATA_URI,
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
    this.load.image('garen-battle-back', GAREN_BATTLE_BACK_DATA_URI);
    this.load.image('teemo-battle-front', TEEMO_BATTLE_FRONT_DATA_URI);
    this.load.image('bandle-bg', BANDLE_MAP_DATA_URI);
  }

  create(): void {
    DataRegistry.champion('garen');
    DataRegistry.champion('teemo');
    DataRegistry.map('bandle-debug');
    DataRegistry.encounter('bandle-meadow');

    const save = SaveService.load();
    const map = DataRegistry.map(save.currentMapId);
    const migrationKey = 'ecos-de-runaterra.migration.v3';

    // One-time migration: v2 greybox coordinates do not match the Bandle v3 background.
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
