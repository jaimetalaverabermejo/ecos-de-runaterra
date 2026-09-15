import Phaser from 'phaser';
import { CatalogoContenido } from '../contenido/CatalogoContenido';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/save/SaveService';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet(
      'player-overworld',
      './assets/player/overworld.png',
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.image('player-portrait', './assets/player/portrait.png');

    for (const asset of CatalogoContenido.assetsCampeones()) {
      if (asset.type === 'overworld') {
        this.load.spritesheet(asset.textureKey, asset.url, { frameWidth: 48, frameHeight: 48 });
      } else {
        this.load.image(asset.textureKey, asset.url);
      }
    }

    this.load.image('item-amplifying-tome', './assets/items/components/power/amplifying-tome.png');
    this.load.image('item-sapphire-crystal', './assets/items/components/power/sapphire-crystal.png');
    this.load.image('item-dagger', './assets/items/components/speed/dagger.png');
    this.load.image('item-agility-cloak', './assets/items/components/speed/agility-cloak.png');
    this.load.image('item-lost-chapter', './assets/items/epic/lost-chapter.png');
    this.load.image('item-power-wand', './assets/items/epic/power-wand.png');
    this.load.image('item-speed-core', './assets/items/epic/speed-core.png');
    this.load.image('item-power-relic', './assets/items/legendary/power-relic.png');
    this.load.image('item-speed-legendary', './assets/items/legendary/speed-legendary.png');

    this.load.image('bandle-bg', './assets/world/regions/bandle-city/zones/portal-clearing/overworld.png');
    this.load.svg('bandle-village-bg', './assets/world/regions/bandle-city/zones/bandle-village/overworld.svg', { width: 1024, height: 768 });
  }

  create(): void {
    const validationErrors = DataRegistry.validate();
    if (validationErrors.length > 0) {
      const message = `Errores de contenido detectados:\n- ${validationErrors.join('\n- ')}`;
      console.error(message);
      throw new Error(message);
    }

    DataRegistry.echo('garen');
    DataRegistry.echo('teemo');
    DataRegistry.item('amplifying-tome');
    DataRegistry.item('sapphire-crystal');
    DataRegistry.item('dagger');
    DataRegistry.recipe('recipe-lost-chapter');
    DataRegistry.recipe('recipe-speed-core');
    DataRegistry.shop('bandle-workshop');
    DataRegistry.map('bandle-debug');
    DataRegistry.map('bandle-village');
    DataRegistry.map('bandle-house-01');
    DataRegistry.encounter('bandle-meadow');

    this.textures.get('player-overworld').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('player-portrait').setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const asset of CatalogoContenido.assetsCampeones()) {
      if (this.textures.exists(asset.textureKey)) {
        this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    for (const key of [
      'item-amplifying-tome', 'item-sapphire-crystal', 'item-dagger', 'item-agility-cloak',
      'item-lost-chapter', 'item-power-wand', 'item-speed-core', 'item-power-relic', 'item-speed-legendary'
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

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

    this.registry.set('app.version', '14.5.1');
    this.registry.set('save', save);
    this.scene.start('TitleScene');
  }
}
