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
      'amplifying-tome',
      'agility-cloak',
      'cloth-armor',
      'dagger',
      'glowing-mote',
      'long-sword',
      'null-magic-mantle',
      'ruby-crystal',
      'sapphire-crystal'
    ];
    for (const id of componentIds) {
      this.load.image(`item-${id}`, `./assets/items/components/${id}.png`);
    }

    this.load.image('item-lost-chapter', './assets/items/epic/lost-chapter.png');
    this.load.image('item-power-wand', './assets/items/epic/power-wand.png');
    this.load.image('item-speed-core', './assets/items/epic/speed-core.png');
    this.load.image('item-power-relic', './assets/items/legendary/power-relic.png');
    this.load.image('item-speed-legendary', './assets/items/legendary/speed-legendary.png');

    this.load.image('battle-ui-v2', BATTLE_UI_ATLAS_DATA_URI);
    this.load.image('battle-ui-960', UI960_MASTER_ATLAS_DATA_URI);

    this.load.image('ui960-title-bg', './assets/ui960/title/56_title_background.png');
    this.load.image('ui960-title-logo', './assets/ui960/title/57_title_logo.png');
    this.load.image('ui960-save-slot', './assets/ui960/save_select/58_save_slot_panel.png');
    this.load.image('ui960-save-option', './assets/ui960/save_select/59_save_option_panel.png');
    this.load.image('ui960-panel', './assets/ui960/menus/41_ui_panel_9slice.png');
    this.load.image('ui960-panel-alt', './assets/ui960/menus/42_ui_panel_alt_9slice.png');
    this.load.image('ui960-button', './assets/ui960/menus/43_ui_button.png');
    this.load.image('ui960-button-selected', './assets/ui960/menus/44_ui_button_selected.png');
    this.load.image('ui960-button-disabled', './assets/ui960/menus/45_ui_button_disabled.png');
    this.load.image('ui960-slot', './assets/ui960/menus/46_ui_slot.png');
    this.load.image('ui960-slot-selected', './assets/ui960/menus/47_ui_slot_selected.png');
    this.load.image('ui960-separator', './assets/ui960/menus/48_ui_separator.png');
    this.load.image('ui960-cursor', './assets/ui960/menus/49_ui_cursor.png');
    this.load.image('ui960-icon-team', './assets/ui960/icons/50_menu_icon_team.png');
    this.load.image('ui960-icon-player', './assets/ui960/icons/51_menu_icon_jaime.png');
    this.load.image('ui960-icon-bag', './assets/ui960/icons/52_menu_icon_bag.png');
    this.load.image('ui960-icon-journal', './assets/ui960/icons/53_menu_icon_journal.png');
    this.load.image('ui960-icon-map', './assets/ui960/icons/54_menu_icon_map.png');
    this.load.image('ui960-icon-save', './assets/ui960/icons/55_menu_icon_save.png');

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
      if (this.textures.exists(asset.textureKey)) {
        this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    for (const key of [
      'item-amplifying-tome', 'item-agility-cloak', 'item-cloth-armor', 'item-dagger', 'item-glowing-mote',
      'item-long-sword', 'item-null-magic-mantle', 'item-ruby-crystal', 'item-sapphire-crystal'
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    for (const key of [
      'item-lost-chapter', 'item-power-wand', 'item-speed-core', 'item-power-relic', 'item-speed-legendary'
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    this.textures.get('battle-ui-v2').setFilter(Phaser.Textures.FilterMode.NEAREST);
    const battleUiTexture = this.textures.get('battle-ui-v2');
    for (const [frameName, frame] of Object.entries(BATTLE_UI_FRAMES)) {
      battleUiTexture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
    }

    const ui960 = this.textures.get('battle-ui-960');
    ui960.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const [frameName, frame] of Object.entries(BATTLE_UI_960_FRAMES)) {
      if (!ui960.has(frameName)) ui960.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
    }

    for (const key of [
      'ui960-title-bg', 'ui960-title-logo', 'ui960-save-slot', 'ui960-save-option',
      'ui960-panel', 'ui960-panel-alt', 'ui960-button', 'ui960-button-selected', 'ui960-button-disabled',
      'ui960-slot', 'ui960-slot-selected', 'ui960-separator', 'ui960-cursor',
      'ui960-icon-team', 'ui960-icon-player', 'ui960-icon-bag', 'ui960-icon-journal', 'ui960-icon-map', 'ui960-icon-save'
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
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

    const v15TestRosterKey = 'ecos-de-runaterra.migration.v15-test-roster.1';
    if (localStorage.getItem(v15TestRosterKey) !== 'done') {
      V15TestRosterService.apply(save);
      SaveService.save(save);
      localStorage.setItem(v15TestRosterKey, 'done');
    }

    this.registry.set('app.version', '16.4.0 UI960 FULL PASS');
    this.registry.set('save', save);
    this.scene.start('TitleScene');
  }
}
