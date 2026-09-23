import Phaser from 'phaser';
import { CatalogoContenido } from '../contenido/CatalogoContenido';
import { CatalogoMundo } from '../contenido/CatalogoMundo';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/save/SaveService';
import { V15TestRosterService } from '../systems/testing/V15TestRosterService';
import { BATTLE_UI_ATLAS_DATA_URI, BATTLE_UI_FRAMES } from '../ui/battle/v2/assets';
import { BATTLE_UI_960_FRAMES, UI960_MASTER_ATLAS_DATA_URI } from '../ui/battle/v3/assets';
import { ASSET_STANDARD_960, LEGACY_ASSET_STANDARD } from '../config/AssetStandards';

const UI960_ADDON_ASSETS: Record<string, string> = {
  'ui960a-bag-category': './assets/ui960_addon/bag/bag-category-button-210x60.png',
  'ui960a-bag-category-selected': './assets/ui960_addon/bag/bag-category-button-selected-210x60.png',
  'ui960a-bag-detail-frame': './assets/ui960_addon/bag/bag-detail-image-frame-112x112.png',
  'ui960a-bag-item-row': './assets/ui960_addon/bag/bag-item-row-250x72.png',
  'ui960a-bag-item-row-selected': './assets/ui960_addon/bag/bag-item-row-selected-250x72.png',
  'ui960a-item-frame-thin': './assets/ui960_addon/bag/item-frame-thin-72x72.png',
  'ui960a-item-frame-thin-selected': './assets/ui960_addon/bag/item-frame-thin-selected-72x72.png',
  'ui960a-map-chip': './assets/ui960_addon/map/map-chip-small-120x32.png',
  'ui960a-map-location': './assets/ui960_addon/map/map-location-row-280x56.png',
  'ui960a-map-location-selected': './assets/ui960_addon/map/map-location-row-selected-280x56.png',
  'ui960a-map-side-panel': './assets/ui960_addon/map/map-side-panel-320x420.png',
  'ui960a-menu-option': './assets/ui960_addon/menu_general/menu-general-option-232x52.png',
  'ui960a-menu-option-selected': './assets/ui960_addon/menu_general/menu-general-option-selected-232x52.png',
  'ui960a-menu-side-panel': './assets/ui960_addon/menu_general/menu-general-side-panel-280x420.png',
  'ui960a-button-action': './assets/ui960_addon/menus/button-action-180x52.png',
  'ui960a-button-action-secondary': './assets/ui960_addon/menus/button-action-secondary-180x52.png',
  'ui960a-button-action-selected': './assets/ui960_addon/menus/button-action-selected-180x52.png',
  'ui960a-button-menu': './assets/ui960_addon/menus/button-menu-232x52.png',
  'ui960a-button-menu-disabled': './assets/ui960_addon/menus/button-menu-disabled-232x52.png',
  'ui960a-button-menu-selected': './assets/ui960_addon/menus/button-menu-selected-232x52.png',
  'ui960a-button-small': './assets/ui960_addon/menus/button-small-140x44.png',
  'ui960a-button-small-selected': './assets/ui960_addon/menus/button-small-selected-140x44.png',
  'ui960a-divider': './assets/ui960_addon/menus/divider-line-760x8.png',
  'ui960a-header': './assets/ui960_addon/menus/header-bar-wide-880x64.png',
  'ui960a-panel-content-large': './assets/ui960_addon/menus/panel-content-large-580x420.png',
  'ui960a-panel-content-medium': './assets/ui960_addon/menus/panel-content-medium-420x300.png',
  'ui960a-panel-section-large': './assets/ui960_addon/menus/panel-section-large-340x170.png',
  'ui960a-panel-section-medium': './assets/ui960_addon/menus/panel-section-medium-260x120.png',
  'ui960a-panel-section-small': './assets/ui960_addon/menus/panel-section-small-180x84.png',
  'ui960a-panel-side': './assets/ui960_addon/menus/panel-side-menu-right-280x420.png',
  'ui960a-mission-detail': './assets/ui960_addon/missions/mission-detail-panel-420x300.png',
  'ui960a-mission-objective': './assets/ui960_addon/missions/mission-objective-row-320x44.png',
  'ui960a-mission-row': './assets/ui960_addon/missions/mission-row-320x72.png',
  'ui960a-mission-row-selected': './assets/ui960_addon/missions/mission-row-selected-320x72.png',
  'ui960a-eco-profile': './assets/ui960_addon/team/eco-profile-panel-300x360.png',
  'ui960a-eco-section': './assets/ui960_addon/team/eco-section-panel-290x150.png',
  'ui960a-eco-slot': './assets/ui960_addon/team/eco-slot-panel-150x110.png',
  'ui960a-eco-tab': './assets/ui960_addon/team/eco-tab-button-170x52.png',
  'ui960a-eco-tab-selected': './assets/ui960_addon/team/eco-tab-button-selected-170x52.png',
  'ui960a-team-slot-empty': './assets/ui960_addon/team/team-slot-empty-300x150.png',
  'ui960a-team-slot-filled': './assets/ui960_addon/team/team-slot-filled-300x150.png',
  'ui960a-team-slot-filled-selected': './assets/ui960_addon/team/team-slot-filled-selected-300x150.png'
};

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

    for (const asset of CatalogoMundo.assetsActores()) {
      this.load.spritesheet(asset.textureKey, asset.url, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight
      });
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

    for (const [key, path] of Object.entries(UI960_ADDON_ASSETS)) {
      this.load.image(key, path);
    }

    this.load.image('bandle-bg', './assets/world/regions/bandle-city/zones/portal-clearing/overworld.png');

    for (const map of DataRegistry.maps()) {
      if (!map.tiled) continue;
      this.load.tilemapTiledJSON(map.tiled.key, map.tiled.url);
      for (const tileset of map.tiled.tilesets) {
        if (!this.textures.exists(tileset.key)) this.load.image(tileset.key, tileset.url);
      }
    }
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
    DataRegistry.map('three-house');
    DataRegistry.map('bandle-tiled-test');
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

    for (const key of Object.keys(UI960_ADDON_ASSETS)) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.textures.get('bandle-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('bandle-village-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const map of DataRegistry.maps()) {
      for (const tileset of map.tiled?.tilesets ?? []) {
        if (this.textures.exists(tileset.key)) {
          this.textures.get(tileset.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
    }

    const save = SaveService.load();

    // Saved games can outlive temporary/test maps. Recover gracefully instead
    // of crashing the whole boot flow when a removed map id is persisted.
    try {
      DataRegistry.map(save.currentMapId);
    } catch (error) {
      const fallbackMap = DataRegistry.map('bandle-debug');
      console.warn(
        `Saved map "${save.currentMapId}" no longer exists. Recovering to "${fallbackMap.id}".`,
        error
      );
      save.currentMapId = fallbackMap.id;
      save.playerPosition = { ...fallbackMap.spawn };
      save.worldProgress.currentRegionId = 'bandle-city';
      save.worldProgress.currentZoneId = 'portal-clearing';
      if (!save.worldProgress.unlockedRegions.includes('bandle-city')) {
        save.worldProgress.unlockedRegions.push('bandle-city');
      }
      if (!save.worldProgress.unlockedZones.includes('portal-clearing')) {
        save.worldProgress.unlockedZones.push('portal-clearing');
      }
      SaveService.save(save);
    }

    const migrationKey = 'ecos-de-runaterra.migration.v3';

    if (localStorage.getItem(migrationKey) !== 'done') {
      const migrationMap = DataRegistry.map('bandle-debug');
      save.currentMapId = migrationMap.id;
      save.playerPosition = { ...migrationMap.spawn };
      SaveService.save(save);
      localStorage.setItem(migrationKey, 'done');
    }

    const v15TestRosterKey = 'ecos-de-runaterra.migration.v15-test-roster.1';
    if (localStorage.getItem(v15TestRosterKey) !== 'done') {
      V15TestRosterService.apply(save);
      SaveService.save(save);
      localStorage.setItem(v15TestRosterKey, 'done');
    }

    this.registry.set('app.version', '16.4.2 UI960 ADDON');
    this.registry.set('save', save);
    this.scene.start('TitleScene');
  }
}
