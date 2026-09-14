import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/save/SaveService';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet(
      'garen-overworld',
      './assets/champions/garen/overworld.png',
      { frameWidth: 48, frameHeight: 48 }
    );

    this.load.image('garen-battle-front', './assets/champions/garen/battle/front.png');
    this.load.image('garen-battle-back', './assets/champions/garen/battle/back.png');
    this.load.image('garen-portrait', './assets/champions/garen/portrait.png');

    this.load.image('teemo-battle-front', './assets/champions/teemo/battle/front.png');
    this.load.image('bandle-bg', './assets/world/regions/bandle-city/zones/portal-clearing/overworld.png');
    this.load.svg('bandle-village-bg', './assets/world/regions/bandle-city/zones/bandle-village/overworld.svg', { width: 1024, height: 768 });
  }

  create(): void {
    DataRegistry.champion('garen');
    DataRegistry.champion('teemo');
    DataRegistry.map('bandle-debug');
    DataRegistry.map('bandle-village');
    DataRegistry.map('bandle-house-01');
    DataRegistry.encounter('bandle-meadow');

    this.textures.get('garen-overworld').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('garen-battle-front').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('garen-battle-back').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('garen-portrait').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('teemo-battle-front').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('bandle-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('bandle-village-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);

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
