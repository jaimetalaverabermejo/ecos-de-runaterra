import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { EchoCatalogEntry, EchoDiscoveryState } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

type PlayerTab = 'profile' | 'registry';

const PAGE_SIZE = 20;

export class PlayerScene extends Phaser.Scene {
  private save!: SaveGame;
  private tab: PlayerTab = 'profile';
  private page = 0;

  constructor() {
    super('PlayerScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.tab = (this.registry.get('player.tab') as PlayerTab | undefined) ?? 'profile';
    this.page = Math.max(0, Number(this.registry.get('player.registryPage') ?? 0));

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x496972).setAlpha(0.34);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.64).setOrigin(0);
    UiKit.framedPanel(this, 6, 6, 500, 276);

    this.drawHeader();
    this.drawTabs();
    if (this.tab === 'profile') this.drawProfile();
    else this.drawRegistry();
    this.drawFooter();
  }

  private drawHeader(): void {
    this.add.rectangle(10, 10, 492, 34, UI.colors.panelRaised, 1).setOrigin(0);
    UiKit.label(this, 22, 14, this.save.player.name.toUpperCase(), UI.font.title, UI.text.primary, true);
    UiKit.label(this, 22, 32, 'VIAJERO DE RUNATERRA', UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 488, 18, 'PERFIL', UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
  }

  private drawTabs(): void {
    const profile = UiKit.button(this, 86, 58, 132, 24, 'PERFIL', () => this.setTab('profile'), {
      accent: this.tab === 'profile' ? 'gold' : 'neutral',
      selected: this.tab === 'profile',
      fontSize: UI.font.small
    });
    const registry = UiKit.button(this, 235, 58, 154, 24, 'REGISTRO DE ECOS', () => this.setTab('registry'), {
      accent: this.tab === 'registry' ? 'gold' : 'neutral',
      selected: this.tab === 'registry',
      fontSize: UI.font.small
    });
    profile.button.setDepth(20); profile.label.setDepth(21);
    registry.button.setDepth(20); registry.label.setDepth(21);
  }

  private drawProfile(): void {
    UiKit.framedPanel(this, 14, 78, 484, 164);
    this.add.rectangle(28, 90, 146, 140, 0x071b28, 1).setOrigin(0).setStrokeStyle(2, UI.colors.borderSoft);
    this.add.image(101, 221, 'player-portrait').setOrigin(0.5, 1).setDisplaySize(132, 132);

    const counts = EchoRegistryService.counts(this.save);
    const region = DataRegistry.worldRegion(this.save.worldProgress.currentRegionId);
    UiKit.label(this, 194, 92, this.save.player.name.toUpperCase(), UI.font.title, UI.text.gold, true);
    UiKit.label(this, 194, 116, 'EXPLORADOR', UI.font.small, UI.text.accent, true);
    UiKit.runeDivider(this, 340, 137, 282);

    this.profileStat(194, 151, 'REGIÓN ACTUAL', region.name.toUpperCase());
    this.profileStat(194, 174, 'ECOS VISTOS', `${counts.discovered} / ${counts.total}`);
    this.profileStat(194, 197, 'ECOS VINCULADOS', `${counts.linked}`);
    this.profileStat(336, 151, 'EQUIPO', `${this.save.party.length} / 5`);
    this.profileStat(336, 174, 'RUNAS', `${this.save.runes.unlockedIds.length}`);
    this.profileStat(336, 197, 'ORO', `${this.save.gold}`);
  }

  private profileStat(x: number, y: number, label: string, value: string): void {
    UiKit.label(this, x, y, label, UI.font.tiny, UI.text.secondary, true);
    UiKit.label(this, x, y + 11, value, UI.font.small, UI.text.primary, true);
  }

  private drawRegistry(): void {
    const catalog = DataRegistry.echoCatalog();
    const pageCount = Math.max(1, Math.ceil(catalog.length / PAGE_SIZE));
    this.page = Phaser.Math.Clamp(this.page, 0, pageCount - 1);
    const entries = catalog.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);

    UiKit.framedPanel(this, 12, 78, 488, 166);
    const counts = EchoRegistryService.counts(this.save);
    UiKit.label(this, 24, 84, `REGISTRO · ${counts.discovered}/${counts.total} DESCUBIERTOS · ${counts.linked} VINCULADOS`, UI.font.tiny, UI.text.secondary, true);

    entries.forEach((entry, index) => {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = 20 + col * 96;
      const y = 104 + row * 33;
      this.drawEchoCell(entry, x, y);
    });

    UiKit.button(this, 385, 231, 32, 18, '‹', () => this.changePage(-1), {
      accent: 'blue', disabled: this.page <= 0, fontSize: UI.font.small
    });
    UiKit.label(this, 430, 226, `${this.page + 1}/${pageCount}`, UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0);
    UiKit.button(this, 475, 231, 32, 18, '›', () => this.changePage(1), {
      accent: 'blue', disabled: this.page >= pageCount - 1, fontSize: UI.font.small
    });
  }

  private drawEchoCell(entry: EchoCatalogEntry, x: number, y: number): void {
    const state = EchoRegistryService.state(this.save, entry.id);
    const linked = state === 'linked';
    const seen = state === 'seen';
    const bg = linked ? 0x173f37 : seen ? 0x16364b : 0x0b1c28;
    const border = linked ? UI.colors.gold : seen ? UI.colors.cyanGlow : UI.colors.borderSoft;
    this.add.rectangle(x, y, 88, 27, bg, 1).setOrigin(0).setStrokeStyle(linked ? 2 : 1, border);
    this.add.circle(x + 12, y + 13, 7, linked ? 0xd3a94f : seen ? 0x2d7895 : 0x142939, 1)
      .setStrokeStyle(1, border);
    UiKit.label(this, x + 12, y + 5, this.stateGlyph(state), UI.font.tiny, linked ? '#101b1b' : UI.text.primary, true).setOrigin(0.5, 0);
    UiKit.label(this, x + 23, y + 4, state === 'unknown' ? '???' : this.shortEchoName(entry.name), UI.font.tiny, state === 'unknown' ? UI.text.muted : UI.text.primary, true)
      .setWordWrapWidth(60, true);
    if (linked) UiKit.label(this, x + 23, y + 16, 'VÍNCULO', '7px', UI.text.gold, true);
    else if (seen) UiKit.label(this, x + 23, y + 16, 'VISTO', '7px', UI.text.accent, true);
  }

  private stateGlyph(state: EchoDiscoveryState): string {
    if (state === 'linked') return '◆';
    if (state === 'seen') return '◈';
    return '?';
  }

  private shortEchoName(name: string): string {
    return name.length <= 11 ? name.toUpperCase() : `${name.slice(0, 10).toUpperCase()}…`;
  }

  private setTab(tab: PlayerTab): void {
    this.registry.set('player.tab', tab);
    this.scene.restart();
  }

  private changePage(delta: number): void {
    this.registry.set('player.registryPage', Math.max(0, this.page + delta));
    this.scene.restart();
  }

  private drawFooter(): void {
    UiKit.runeDivider(this, 256, 253, 454);
    UiKit.label(this, 20, 262, this.tab === 'registry' ? '??? → visto → vinculado' : 'Tu perfil es independiente del Eco activo.', UI.font.tiny, UI.text.secondary, true);
    UiKit.button(this, 467, 268, 64, 22, 'ATRÁS', () => this.scene.start('MenuScene'), {
      accent: 'blue', fontSize: UI.font.small
    });
  }
}
