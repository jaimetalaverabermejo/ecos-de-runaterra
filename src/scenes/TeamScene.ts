import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class TeamScene extends Phaser.Scene {
  private save!: SaveGame;

  constructor() {
    super('TeamScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x526f78).setAlpha(0.45);
    this.add.rectangle(0, 0, 512, 288, 0x04111c, 0.52).setOrigin(0, 0);

    UiKit.framedPanel(this, 8, 8, 496, 272);
    this.add.rectangle(12, 12, 488, 36, UI.colors.panelRaised, 1).setOrigin(0, 0);
    UiKit.label(this, 26, 18, 'EQUIPO', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 126, 23, `${this.save.party.length} / 5 campeones activos`, UI.font.small, UI.text.accent, true);
    UiKit.label(this, 484, 22, 'ECOS DE RUNATERRA', UI.font.tiny, UI.text.muted, true).setOrigin(1, 0);

    const slots = [
      { x: 20, y: 58 },
      { x: 206, y: 58 },
      { x: 20, y: 128 },
      { x: 206, y: 128 },
      { x: 113, y: 198 }
    ];

    for (let i = 0; i < 5; i += 1) {
      const champion = this.save.party[i];
      const pos = slots[i];
      if (champion) this.createChampionCard(pos.x, pos.y, 178, 60, champion, i, i === 0);
      else this.createEmptyCard(pos.x, pos.y, 178, 60, i);
    }

    UiKit.button(this, 452, 256, 72, 24, 'ATRÁS', () => this.scene.start('MenuScene'), {
      accent: 'blue', fontSize: UI.font.small
    });
    UiKit.label(this, 24, 253, 'Toca un campeón para abrir su ficha, Maestría y build.', UI.font.small, UI.text.secondary);
  }

  private createChampionCard(x: number, y: number, width: number, height: number, champion: ChampionInstance, index: number, leader: boolean): void {
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const hpRatio = Phaser.Math.Clamp(champion.currentHp / stats.hp, 0, 1);
    const panel = UiKit.framedPanel(this, x, y, width, height, leader);
    panel.setInteractive({ useHandCursor: true });

    this.add.rectangle(x + 28, y + 30, 48, 52, 0x0a1c2b, 1).setStrokeStyle(1, UI.colors.borderSoft);
    this.addChampionVisual(champion.championId, x + 28, y + 54);

    UiKit.label(this, x + 58, y + 7, definition.name.toUpperCase(), UI.font.heading, UI.text.primary, true);
    UiKit.label(this, x + 58, y + 23, this.roleLabel(definition.tags[0]), UI.font.small, UI.text.secondary);
    UiKit.badge(this, x + 145, y + 15, `M ${champion.mastery}`, 0x11314a);

    UiKit.progressBar(this, x + 58, y + 40, 98, 6, ProgressionService.experienceRatio(champion), UI.colors.blue);
    UiKit.label(this, x + 58, y + 44, `EXP ${champion.masteryExperience}/${ProgressionService.experienceToNext(champion.mastery) || 'MAX'}`, UI.font.tiny, UI.text.muted).setOrigin(0, 0.5);

    UiKit.progressBar(this, x + 58, y + 53, 98, 6, hpRatio, this.hpColor(hpRatio));
    UiKit.label(this, x + 158, y + 48, `${champion.currentHp}/${stats.hp}`, UI.font.tiny, UI.text.secondary).setOrigin(1, 0);

    if (leader) UiKit.label(this, x + width - 10, y + height - 14, 'LÍDER', UI.font.tiny, UI.text.gold, true).setOrigin(1, 0);

    panel.on(Phaser.Input.Events.POINTER_DOWN, () => panel.setFillStyle(UI.colors.panelRaised, 1));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.setFillStyle(UI.colors.panel, 0.98));
    panel.on(Phaser.Input.Events.POINTER_UP, () => {
      this.scene.start('ChampionDetailScene', { partyIndex: index });
    });
  }

  private createEmptyCard(x: number, y: number, width: number, height: number, index: number): void {
    UiKit.framedPanel(this, x, y, width, height, false).setAlpha(0.68);
    UiKit.label(this, x + width / 2, y + 19, `RANURA ${index + 1}`, UI.font.small, UI.text.muted, true).setOrigin(0.5, 0);
    UiKit.label(this, x + width / 2, y + 35, 'Vacía', UI.font.tiny, UI.text.muted).setOrigin(0.5, 0);
  }

  private addChampionVisual(championId: string, x: number, groundY: number): void {
    if (championId === 'garen') {
      this.add.image(x, groundY, 'garen-portrait').setOrigin(0.5, 1).setDisplaySize(48, 48);
      return;
    }
    if (championId === 'teemo') {
      this.add.image(x, groundY, 'teemo-battle-front').setOrigin(0.5, 1).setDisplaySize(42, 48);
      return;
    }
    this.add.circle(x, groundY - 24, 18, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.border);
  }

  private roleLabel(tag?: string): string {
    const labels: Record<string, string> = {
      vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador'
    };
    return tag ? labels[tag] ?? tag : 'Campeón';
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return UI.colors.hp;
    if (ratio > 0.2) return UI.colors.hpMid;
    return UI.colors.hpLow;
  }
}
