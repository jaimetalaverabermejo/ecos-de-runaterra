import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { EchoCatalogEntry, EchoDiscoveryState } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';

type PlayerTab = 'profile' | 'registry';

const PAGE_SIZE = 12;

export class PlayerScene extends Phaser.Scene {
  private save!: SaveGame;
  private tab: PlayerTab = 'profile';
  private page = 0;
  private regionId = 'bandle-city';
  private overlayLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('PlayerScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.tab = (this.registry.get('player.tab') as PlayerTab | undefined) ?? 'profile';
    this.page = Math.max(0, Number(this.registry.get('player.registryPage') ?? 0));
    const regions = EchoRegistryService.unlockedRegionalCatalogs(this.save);
    const requested = this.registry.get('player.registryRegion') as string | undefined;
    this.regionId = regions.find(region => region.id === requested)?.id
      ?? regions.find(region => region.id === this.save.worldProgress.currentRegionId)?.id
      ?? regions[0]?.id ?? 'bandle-city';

    Ui960Kit.backdrop(this, 'bandle-bg', 0x496972, 0.3, 0.7);
    Ui960Kit.header(this, this.save.player.name.toUpperCase(), 'VIAJERO DE RUNATERRA', 'PERFIL');
    this.drawTabs();
    if (this.tab === 'profile') this.drawProfile();
    else this.drawRegistry();
    this.drawFooter();
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    if (this.overlayLayer && direction) return;
    if (direction === 'left' || direction === 'right') {
      if (this.overlayLayer) return;
      if (this.tab === 'registry') this.changeRegion(direction === 'left' ? -1 : 1);
      else this.setTab('registry');
      return;
    }
    if (this.tab === 'registry' && (direction === 'up' || direction === 'down')) {
      this.changePage(direction === 'up' ? -1 : 1);
      return;
    }

    if (ConsoleInput.consumeB()) {
      if (this.overlayLayer) {
        this.overlayLayer.destroy(true);
        this.overlayLayer = undefined;
      } else {
        this.scene.start('MenuScene');
      }
      return;
    }
    ConsoleInput.consumeA();
  }

  private drawTabs(): void {
    Ui960Kit.button(this, 330, 128, 220, 44, 'PERFIL', () => this.setTab('profile'), {
      selected: this.tab === 'profile',
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 570, 128, 220, 44, 'REGISTRO DE ECOS', () => this.setTab('registry'), {
      selected: this.tab === 'registry',
      fontSize: UI960_FONT.small
    });
  }

  private drawProfile(): void {
    Ui960Kit.panel(this, 42, 162, 876, 300, { alpha: 0.96 });
    Ui960Kit.panel(this, 64, 184, 250, 250, { selected: true, alt: true });
    this.add.image(189, 406, 'player-portrait').setOrigin(0.5, 1).setDisplaySize(214, 214);

    const counts = EchoRegistryService.counts(this.save);
    const region = DataRegistry.worldRegion(this.save.worldProgress.currentRegionId);
    Ui960Kit.label(this, 348, 190, this.save.player.name.toUpperCase(), UI960_FONT.title, UI.text.gold, true);
    Ui960Kit.label(this, 350, 230, 'EXPLORADOR', UI960_FONT.small, UI.text.accent, true);
    Ui960Kit.separator(this, 626, 268, 530);

    this.profileStat(350, 292, 'REGIÓN ACTUAL', region.name.toUpperCase());
    this.profileStat(350, 354, 'ECOS VISTOS', `${counts.discovered} / ${counts.total}`);
    this.profileStat(350, 416, 'ECOS VINCULADOS', `${counts.linked}`);
    this.profileStat(620, 292, 'EQUIPO', `${this.save.party.length} / 5`);
    this.profileStat(620, 354, 'RUNAS', `${this.save.runes.unlockedIds.length}`);
    this.profileStat(620, 416, 'ORO', `${this.save.gold}`);
  }

  private profileStat(x: number, y: number, label: string, value: string): void {
    Ui960Kit.label(this, x, y, label, UI960_FONT.tiny, UI.text.secondary, true);
    Ui960Kit.label(this, x, y + 23, value, UI960_FONT.body, UI.text.primary, true);
  }

  private drawRegistry(): void {
    const catalog = EchoRegistryService.regionalCatalog(this.regionId);
    const pageCount = Math.max(1, Math.ceil(catalog.length / PAGE_SIZE));
    this.page = Phaser.Math.Clamp(this.page, 0, pageCount - 1);
    const entries = catalog.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);

    Ui960Kit.panel(this, 42, 162, 876, 310, { alpha: 0.96 });
    const regions = EchoRegistryService.unlockedRegionalCatalogs(this.save);
    const regionIndex = regions.findIndex(region => region.id === this.regionId);
    const counts = EchoRegistryService.counts(this.save, this.regionId);
    Ui960Kit.button(this, 84, 186, 52, 34, '‹', () => this.changeRegion(-1), { disabled: regionIndex <= 0, fontSize: UI960_FONT.small });
    Ui960Kit.label(this, 480, 174, DataRegistry.worldRegion(this.regionId).name.toUpperCase(), UI960_FONT.small, UI.text.gold, true).setOrigin(0.5, 0);
    Ui960Kit.button(this, 876, 186, 52, 34, '›', () => this.changeRegion(1), { disabled: regionIndex >= regions.length - 1, fontSize: UI960_FONT.small });
    Ui960Kit.label(this, 480, 204, `${counts.discovered}/${counts.total} DESCUBIERTOS · ${counts.linked} VINCULADOS · REGIÓN ${regionIndex + 1}/${regions.length}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(0.5, 0);

    entries.forEach((entry, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 60 + col * 214;
      const y = 232 + row * 66;
      this.drawEchoCell(entry, x, y);
    });

    Ui960Kit.button(this, 748, 448, 52, 30, '‹', () => this.changePage(-1), {
      disabled: this.page <= 0,
      fontSize: UI960_FONT.small
    });
    Ui960Kit.label(this, 808, 440, `${this.page + 1}/${pageCount}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(0.5, 0);
    Ui960Kit.button(this, 868, 448, 52, 30, '›', () => this.changePage(1), {
      disabled: this.page >= pageCount - 1,
      fontSize: UI960_FONT.small
    });
  }

  private drawEchoCell(entry: EchoCatalogEntry, x: number, y: number): void {
    const state = EchoRegistryService.state(this.save, entry.id);
    const linked = state === 'linked';
    const seen = state === 'seen';
    const bg = linked ? 0x173f37 : seen ? 0x16364b : 0x0b1c28;
    const border = linked ? UI.colors.gold : seen ? UI.colors.cyanGlow : UI.colors.borderSoft;
    const cell = this.add.rectangle(x, y, 200, 60, bg, 1).setOrigin(0).setStrokeStyle(linked ? 3 : 2, border);
    if (state !== 'unknown') {
      cell.setInteractive({ useHandCursor: true });
      cell.on(Phaser.Input.Events.POINTER_UP, () => this.openRegistryAffinity(entry));
    }
    const portraitKey = `${entry.id}-portrait`;
    this.add.rectangle(x + 30, y + 30, 50, 50, 0x142939).setStrokeStyle(1, border);
    if (state !== 'unknown' && this.textures.exists(portraitKey)) {
      this.add.image(x + 30, y + 30, portraitKey).setDisplaySize(48, 48);
    } else {
      Ui960Kit.label(this, x + 30, y + 30, this.stateGlyph(state), UI960_FONT.body, UI.text.muted, true).setOrigin(0.5);
    }
    Ui960Kit.label(this, x + 64, y + 9, state === 'unknown' ? '???' : this.shortEchoName(entry.name), UI960_FONT.tiny, state === 'unknown' ? UI.text.muted : UI.text.primary, true);
    Ui960Kit.label(this, x + 64, y + 35, linked ? 'VINCULADO' : seen ? 'VISTO' : 'DESCONOCIDO', '11px', linked ? UI.text.gold : seen ? UI.text.accent : UI.text.muted, true);
  }

  private openRegistryAffinity(entry: EchoCatalogEntry): void {
    this.overlayLayer?.destroy(true);
    const definition = DataRegistry.echoes().find((eco) => eco.id === entry.id);
    const types = definition?.affinityIds ?? [];
    const strong = TypeEffectivenessService.offensiveStrengths(types);
    const weak = TypeEffectivenessService.defensiveWeaknesses(types);
    const resist = TypeEffectivenessService.defensiveResistances(types);
    const objects: Phaser.GameObjects.GameObject[] = [];

    objects.push(this.add.rectangle(480, 270, 960, 540, 0x020912, 0.84));
    objects.push(this.add.rectangle(480, 270, 690, 330, UI.colors.panel, 0.995).setStrokeStyle(4, UI.colors.gold));
    objects.push(Ui960Kit.label(this, 176, 132, entry.name.toUpperCase(), UI960_FONT.title, UI.text.primary, true));
    const portraitKey = `${entry.id}-portrait`;
    if (this.textures.exists(portraitKey)) objects.push(this.add.image(762, 153, portraitKey).setDisplaySize(70, 70));
    objects.push(Ui960Kit.label(this, 176, 190, `TIPOS     ${TypeEffectivenessService.typeNames(types)}`, UI960_FONT.small, types.length ? UI.text.gold : UI.text.muted, true));
    objects.push(Ui960Kit.label(this, 176, 230, `FUERTE    ${strong.length ? TypeEffectivenessService.typeNames(strong) : '—'}`, UI960_FONT.small, UI.text.accent, true).setWordWrapWidth(600, true));
    objects.push(Ui960Kit.label(this, 176, 270, `DÉBIL     ${weak.length ? TypeEffectivenessService.typeNames(weak) : '—'}`, UI960_FONT.small, UI.text.secondary, true).setWordWrapWidth(600, true));
    objects.push(Ui960Kit.label(this, 176, 310, `RESISTE   ${resist.length ? TypeEffectivenessService.typeNames(resist) : '—'}`, UI960_FONT.small, UI.text.secondary, true).setWordWrapWidth(600, true));
    const close = Ui960Kit.button(this, 480, 388, 150, 42, 'CERRAR', () => {
      this.overlayLayer?.destroy(true);
      this.overlayLayer = undefined;
    }, { fontSize: UI960_FONT.small });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private stateGlyph(state: EchoDiscoveryState): string {
    if (state === 'linked') return '◆';
    if (state === 'seen') return '◈';
    return '?';
  }

  private shortEchoName(name: string): string {
    return name.length <= 14 ? name.toUpperCase() : `${name.slice(0, 13).toUpperCase()}…`;
  }

  private setTab(tab: PlayerTab): void {
    this.registry.set('player.tab', tab);
    this.scene.restart();
  }

  private changePage(delta: number): void {
    this.registry.set('player.registryPage', Math.max(0, this.page + delta));
    this.scene.restart();
  }

  private changeRegion(delta: number): void {
    const regions = EchoRegistryService.unlockedRegionalCatalogs(this.save);
    const index = regions.findIndex(region => region.id === this.regionId);
    const next = regions[index + delta];
    if (!next) return;
    this.registry.set('player.registryRegion', next.id);
    this.registry.set('player.registryPage', 0);
    this.scene.restart();
  }

  private drawFooter(): void {
    Ui960Kit.separator(this, 480, 486, 870);
    Ui960Kit.label(this, 44, 504, this.tab === 'registry' ? '← → región · ↑ ↓ página · Toca un Eco para ver su afinidad.' : 'Tu perfil es independiente del Eco activo.', UI960_FONT.tiny, UI.text.secondary, true);
    Ui960Kit.button(this, 866, 505, 126, 40, 'ATRÁS', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
  }
}
