import { WORLD_RUNES, worldRuneTexture } from '../data/WorldRunes';
import { COMBAT_BACKGROUNDS } from '../ui/combat/CombatBackgrounds';
import { CatalogoCombatientes } from '../contenido/CatalogoCombatientes';
import packageMetadata from '../../package.json';
import Phaser from 'phaser';
import { CatalogoContenido } from '../contenido/CatalogoContenido';
import { CatalogoMundo } from '../contenido/CatalogoMundo';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/save/SaveService';
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
  'ui960a-menu-option': './assets/ui960_addon/menus/button-menu-232x52.png',
  'ui960a-menu-option-selected': './assets/ui960_addon/menus/button-menu-selected-232x52.png',
  'ui960a-menu-side-panel': './assets/ui960_addon/menus/panel-side-menu-right-280x420.png',
  'ui960a-button-action': './assets/ui960_addon/menus/button-action-180x52.png',
  'ui960a-button-action-secondary': './assets/ui960_addon/menus/button-action-180x52.png',
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
  'ui960a-mission-detail': './assets/ui960_addon/menus/panel-content-medium-420x300.png',
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

    for (const asset of CatalogoCombatientes.assets()) this.load.image(asset.textureKey, asset.url);

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
    this.load.image('item-minor-healing-potion', './assets/items/consumables/pocion_pequena.png');
    this.load.image('item-healing-potion-medium', './assets/items/consumables/pocion_mediana.png');
    this.load.image('item-healing-potion-large', './assets/items/consumables/pocion_grande.png');
    this.load.image('item-echo-linker-hextech', './assets/items/key/vinculador.png');
    for (const rune of WORLD_RUNES) this.load.image(worldRuneTexture(rune), rune.assetUrl);
    this.load.image('world-rowboat', './assets/world/boats/Bote de remos pixelado.png');
    this.load.image('world-gold-bag', './assets/items/world/bolsa_oro.png');

    this.load.image('item-phage', './assets/items/epic/bacteriofago.png');
    this.load.image('item-bramble-vest', './assets/items/epic/chaleco-espinas.png');
    this.load.image('item-lost-chapter', './assets/items/epic/lost-chapter.png');
    this.load.image('item-power-wand', './assets/items/epic/power-wand.png');
    this.load.image('item-speed-core', './assets/items/epic/speed-core.png');
    this.load.image('item-power-relic', './assets/items/legendary/power-relic.png');
    this.load.image('item-hextech-alternator', './assets/items/epic/alternador.png');
    this.load.image('item-seekers-armguard', './assets/items/epic/brazalete-buscadora.png');
    this.load.image('item-glacial-buckler', './assets/items/epic/broquel-glacial.png');
    this.load.image('item-negatron-cloak', './assets/items/epic/capa.png');
    this.load.image('item-vampiric-scepter', './assets/items/epic/cetro-vampirico.png');
    this.load.image('item-fiendish-codex', './assets/items/epic/codice.png');
    this.load.image('item-serrated-dirk', './assets/items/epic/daga-dentada.png');
    this.load.image('item-bf-sword', './assets/items/epic/espadon.png');
    this.load.image('item-haunting-guise', './assets/items/epic/mascara.png');
    this.load.image('item-recurve-bow', './assets/items/epic/arco-curvo.png');
    this.load.image('item-giants-belt', './assets/items/epic/cinturon.png');

    this.load.image('item-aegis-of-the-legion', './assets/items/epic/golden-armor.png');
    this.load.image('item-bandle-glass-mirror', './assets/items/epic/bandle-glass-mirror.png');
    this.load.image('item-caulfields-warhammer', './assets/items/epic/caulfields-warhammer.png');
    this.load.image('item-chain-vest', './assets/items/epic/chaleco-cristalino.png');
    this.load.image('item-crystalline-bracer', './assets/items/epic/crystalline-bracer.png');
    this.load.image('item-bamis-cinder', './assets/items/epic/fated-ashes.png');
    this.load.image('item-forbidden-idol', './assets/items/epic/incensario.png');
    this.load.image('item-hearthbound-axe', './assets/items/epic/hearthbound-axe.png');
    this.load.image('item-kindlegem', './assets/items/epic/kindlegem.png');
    this.load.image('item-last-whisper', './assets/items/epic/last-whisper.png');
    this.load.image('item-needlessly-large-rod', './assets/items/epic/needlessly-large-rod.png');
    this.load.image('item-pickaxe', './assets/items/epic/pickaxe.png');
    this.load.image('item-rectrix', './assets/items/epic/red-feather.png');
    this.load.image('item-sheen', './assets/items/epic/sheen.png');
    this.load.image('item-spectres-cowl', './assets/items/epic/spectres-cowl.png');
    this.load.image('item-winged-moonplate', './assets/items/epic/winged-moonplate.png');
    this.load.image('item-black-cleaver', './assets/items/legendary/black-cleaver.png');
    this.load.image('item-blade-of-the-ruined-king', './assets/items/legendary/blade-of-the-ruined-king.png');
    this.load.image('item-dead-mans-plate', './assets/items/legendary/dead-mans-plate.png');
    this.load.image('item-echoes-of-helia', './assets/items/legendary/echoes-of-helia.png');
    this.load.image('item-eclipse', './assets/items/legendary/golden-emblem.png');
    this.load.image('item-frozen-heart', './assets/items/legendary/frozen-heart.png');
    this.load.image('item-gargoyle-stoneplate', './assets/items/legendary/silver-gold-armor.png');
    this.load.image('item-guardian-angel', './assets/items/legendary/guardian-angel.png');
    this.load.image('item-immortal-shieldbow', './assets/items/legendary/immortal-shieldbow.png');
    this.load.image('item-infinity-edge', './assets/items/legendary/silver-gold-sword.png');
    this.load.image('item-jaksho-the-protean', './assets/items/legendary/jaksho.png');
    this.load.image('item-kaenic-rookern', './assets/items/legendary/runic-bracelet.png');
    this.load.image('item-kraken-slayer', './assets/items/legendary/kraken-slayer.png');
    this.load.image('item-liandrys-torment', './assets/items/legendary/liandrys-torment.png');
    this.load.image('item-moonstone-renewer', './assets/items/legendary/turquoise-medallion.png');
    this.load.image('item-malignance', './assets/items/legendary/malignance.png');
    this.load.image('item-nashors-tooth', './assets/items/legendary/golden-curved-blade.png');
    this.load.image('item-seryldas-grudge', './assets/items/legendary/cyan-edged-blade.png');
    this.load.image('item-speed-legendary', './assets/items/legendary/cyan-curved-sword.png');
    this.load.image('item-spirit-visage', './assets/items/legendary/runic-armor.png');
    this.load.image('item-staff-of-flowing-water', './assets/items/legendary/staff-of-flowing-water.png');
    this.load.image('item-steraks-gage', './assets/items/legendary/steraks-gage.png');
    this.load.image('item-sunfire-aegis', './assets/items/legendary/sunfire-aegis.png');
    this.load.image('item-thornmail', './assets/items/legendary/spiked-armor.png');
    this.load.image('item-trinity-force', './assets/items/legendary/trinity-force.png');
    this.load.image('item-youmuus-ghostblade', './assets/items/legendary/violet-sword.png');
    this.load.image('item-zhonyas-hourglass', './assets/items/legendary/zhonyas-hourglass.png');

    this.load.image('battle-ui-v2', BATTLE_UI_ATLAS_DATA_URI);
    this.load.image('battle-ui-960', UI960_MASTER_ATLAS_DATA_URI);
    for (const background of Object.values(COMBAT_BACKGROUNDS)) {
      this.load.image(background.key, background.url);
    }

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

    const typeIcons: Record<string, string> = {
      'type-marcial': './assets/ui960/types/29_type_marcial_white_48.png',
      'type-arcano': './assets/ui960/types/30_type_arcano_white_48.png',
      'type-espiritual': './assets/ui960/types/31_type_espiritual_white_48.png',
      'type-tecnologico': './assets/ui960/types/32_type_tecnologico_white_48.png',
      'type-primordial': './assets/ui960/types/33_type_primordial_white_48.png',
      'type-sombrio': './assets/ui960/types/34_type_sombrio_white_48.png',
      'type-celestial': './assets/ui960/types/35_type_celestial_white_48.png',
      'type-vacio': './assets/ui960/types/36_type_vacio_white_48.png',
      'type-runico': './assets/ui960/types/37_type_runico_white_48.png'
    };
    for (const [key, path] of Object.entries(typeIcons)) this.load.image(key, path);

    for (const [key, path] of Object.entries(UI960_ADDON_ASSETS)) {
      this.load.image(key, path);
    }

    this.load.image('bandle-bg', './assets/world/regions/bandle-city/zones/clearing/overworld.png');
    for (const name of ['ionia', 'ionia-main', 'ionia-forest', 'ionia-orders']) this.load.image(`atlas-${name}`, `./assets/world/atlas/${name}.webp`);
    this.load.image('bandle-menu-map', './assets/world/regions/bandle-city/menu-map.png');
    this.load.image('ionia-menu-map', './assets/world/regions/Jonia/Jonia mapa general.png');

    const queuedTilesetKeys = new Set<string>();
    for (const map of DataRegistry.maps()) {
      if (!map.tiled) continue;
      // Public assets keep the same filename after a map edit. Version the URL
      // with the deployed commit so a refreshed game cannot reuse an old map.
      const version = import.meta.env.VITE_BUILD_ID;
      const freshUrl = (url: string) => version ? `${url}?v=${encodeURIComponent(version)}` : url;
      this.load.tilemapTiledJSON(map.tiled.key, freshUrl(map.tiled.url));
      for (const tileset of map.tiled.tilesets) {
        if (!this.textures.exists(tileset.key) && !queuedTilesetKeys.has(tileset.key)) {
          this.load.image(tileset.key, freshUrl(tileset.url));
          queuedTilesetKeys.add(tileset.key);
        }
      }
    }
  }

  create(): void {
    const validationErrors = DataRegistry.validate();
    if (validationErrors.length > 0) {
      const message = `Errores de contenido detectados:\n- ${validationErrors.join('\n- ')}`;
      console.error(message);
      this.cameras.main.setBackgroundColor('#071520');
      this.add.text(40, 40, 'ERROR DE CONTENIDO', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffb4b4'
      });
      this.add.text(40, 92, message, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
        wordWrap: { width: 880 },
        lineSpacing: 5
      });
      return;
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
    DataRegistry.map('clearing');
    DataRegistry.map('bandle_village');
    DataRegistry.map('three-house');
    DataRegistry.encounter('bandle-meadow');

    this.textures.get('player-overworld').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('player-portrait').setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const asset of CatalogoContenido.assetsCampeones()) {
      if (this.textures.exists(asset.textureKey)) {
        this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    for (const asset of CatalogoMundo.assetsActores()) {
      if (this.textures.exists(asset.textureKey)) {
        this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    for (const asset of CatalogoCombatientes.assets()) if (this.textures.exists(asset.textureKey)) this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const key of [
      'item-amplifying-tome', 'item-agility-cloak', 'item-cloth-armor', 'item-dagger', 'item-glowing-mote',
      'item-long-sword', 'item-null-magic-mantle', 'item-ruby-crystal', 'item-sapphire-crystal',
      'item-minor-healing-potion', 'item-healing-potion-medium', 'item-healing-potion-large',
      'item-echo-linker-hextech', 'world-gold-bag'
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    for (const key of [
      'item-lost-chapter', 'item-power-wand', 'item-speed-core', 'item-power-relic', 'item-speed-legendary'
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    this.textures.get('battle-ui-v2').setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const background of Object.values(COMBAT_BACKGROUNDS)) {
      this.textures.get(background.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
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
      'ui960-icon-team', 'ui960-icon-player', 'ui960-icon-bag', 'ui960-icon-journal', 'ui960-icon-map', 'ui960-icon-save',
      'type-marcial', 'type-arcano', 'type-espiritual', 'type-tecnologico', 'type-primordial',
      'type-sombrio', 'type-celestial', 'type-vacio', 'type-runico'
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

    SaveService.initialize();
    this.registry.set('app.version', `${packageMetadata.version} · BOSQUE ETERNO`);
    this.scene.start('TitleScene');
  }
}
