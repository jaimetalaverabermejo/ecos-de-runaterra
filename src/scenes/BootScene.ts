import Phaser from 'phaser';
import { CatalogoContenido } from '../contenido/CatalogoContenido';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/save/SaveService';
import { V15TestRosterService } from '../systems/testing/V15TestRosterService';
import { BATTLE_UI_ATLAS_DATA_URI, BATTLE_UI_FRAMES } from '../ui/battle/v2/assets';
import { BATTLE_UI_960_FRAMES, UI960_MASTER_ATLAS_DATA_URI } from '../ui/battle/v3/assets';
import { ASSET_STANDARD_960, LEGACY_ASSET_STANDARD } from '../config/AssetStandards';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet(
      'player-overworld',
      './assets/player/overworld.png',
      { frameWidth: ASSET_STANDARD_960.overworld.frameWidth, frameHeight: ASSET_STANDARD_960.overworld.frameHeight }
    );
    this.load.image('player-portrait', './assets/player/portrait.png');

    for (const asset of CatalogoContenido.assetsCampeones()) {
      if (asset.type === 'overworld') {
        this.load.spritesheet(asset.textureKey, asset.url, {
          frameWidth: asset.frameWidth ?? LEGACY_ASSET_STANDARD.overworld.frameWidth,
          frameHeight: asset.frameHeight ?? LEGACY_ASSET_STANDARD.overworld.frameHeight
        });
      } else {
        this.load.image(asset.textureKey, asset.url);
      }
    }

    const componentIds = [
      'amplifying-tome', 'sapphire-crystal', 'dagger', 'agility-cloak', 'long-sword',
      'ruby-crystal', 'cloth-armor', 'null-magic-mantle', 'glowing-mote'
    ];
    for (const id of componentIds) this.load.image(`item-${id}`, `./assets/items/components/${id}.png`);

    this.load.image('item-lost-chapter', './assets/items/unique/lost-chapter.png');
    this.load.image('item-power-wand', './assets/items/unique/power-wand.png');
    this.load.image('item-speed-core', './assets/items/unique/speed-core.png');
    this.load.image('item-power-relic', './assets/items/legendary/power-relic.png');
    this.load.image('item-speed-legendary', './assets/items/legendary/speed-legendary.png');

    this.load.image('battle-ui-v2', BATTLE_UI_ATLAS_DATA_URI);
    this.load.image('battle-ui-960', UI960_MASTER_ATLAS_DATA_URI);
    this.load.image('title-background-960', './assets/ui/ui_960_v1/title/56_title_background.png');
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
    DataRegistry.echo('poppy');
    DataRegistry.echo('lulu');
    DataRegistry.echo('tristana');
    DataRegistry.echo('gnar');
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
      if (this.textures.exists(asset.textureKey)) this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    for (const key of [
      'item-amplifying-tome', 'item-sapphire-crystal', 'item-dagger', 'item-agility-cloak', 'item-long-sword',
      'item-ruby-crystal', 'item-cloth-armor', 'item-null-magic-mantle', 'item-glowing-mote',
      'item-lost-chapter', 'item-power-wand', 'item-speed-core', 'item-power-relic', 'item-speed-legendary'
    ]) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.textures.get('battle-ui-v2').setFilter(Phaser.Textures.FilterMode.NEAREST);
    const battleUiTexture = this.textures.get('battle-ui-v2');
    for (const [frameName, frame] of Object.entries(BATTLE_UI_FRAMES)) battleUiTexture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);

    const ui960 = this.textures.get('battle-ui-960');
    ui960.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const [frameName, frame] of Object.entries(BATTLE_UI_960_FRAMES)) {
      if (!ui960.has(frameName)) ui960.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
    }
    if (this.textures.exists('title-background-960')) this.textures.get('title-background-960').setFilter(Phaser.Textures.FilterMode.NEAREST);

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

    const v15TestRosterKey = 'ecos-de-runaterra.migration.v15-test-roster.1';
    if (localStorage.getItem(v15TestRosterKey) !== 'done') {
      V15TestRosterService.apply(save);
      SaveService.save(save);
      localStorage.setItem(v15TestRosterKey, 'done');
    }

    this.registry.set('app.version', '16.2 UI960 EMBED FIX');
    this.registry.set('save', save);
    this.scene.start('TitleScene');
  }
}
