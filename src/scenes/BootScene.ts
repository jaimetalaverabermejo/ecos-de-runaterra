import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/SaveService';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet(
      'garen-overworld',
      './assets/champions/garen/overworld/overworld.png',
      { frameWidth: 48, frameHeight: 48 }
    );

    this.load.svg('garen-battle-back', './assets/champions/garen/battle/back.svg');
    this.load.image('teemo-battle-front', './assets/champions/teemo/battle/front.png');

    this.load.image(
      'bandle-bg',
      './assets/world/regions/bandle-city/zones/portal-clearing/overworld.png'
    );
  }

  create(): void {
    DataRegistry.champion('garen');
    DataRegistry.champion('teemo');
    DataRegistry.map('bandle-debug');
    DataRegistry.encounter('bandle-meadow');

    this.textures.get('garen-overworld').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('garen-battle-back').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('teemo-battle-front').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('bandle-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);

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
    this.scene.start('TitleScene');
  }
}
