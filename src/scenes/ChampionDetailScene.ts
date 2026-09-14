import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

interface ChampionDetailData {
  partyIndex?: number;
}

export class ChampionDetailScene extends Phaser.Scene {
  private save!: SaveGame;
  private partyIndex = 0;

  constructor() {
    super('ChampionDetailScene');
  }

  init(data: ChampionDetailData): void {
    this.partyIndex = data.partyIndex ?? 0;
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    if (!this.save.party[this.partyIndex]) {
      this.scene.start('TeamScene');
      return;
    }

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x4b6670).setAlpha(0.34);
    this.add.rectangle(0, 0, 512, 288, 0x03101a, 0.62).setOrigin(0, 0);

    UiKit.framedPanel(this, 8, 8, 496, 272);
    this.drawHeader();
    this.drawChampion();
  }

  private drawHeader(): void {
    this.add.rectangle(12, 12, 488, 38, UI.colors.panelRaised, 1).setOrigin(0, 0);
    UiKit.label(this, 24, 18, 'CAMPEÓN', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 24, 38, 'ECOS DE RUNATERRA', UI.font.tiny, UI.text.accent, true);

    const startX = 220;
    this.save.party.forEach((champion, index) => {
      const definition = DataRegistry.champion(champion.championId);
      const selected = index === this.partyIndex;
      const x = startX + index * 52;
      const tab = this.add.rectangle(x, 30, 44, 32, selected ? 0x155268 : UI.colors.panelAlt, 1)
        .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      UiKit.label(this, x, 20, definition.name.slice(0, 3).toUpperCase(), UI.font.tiny, selected ? UI.text.gold : UI.text.secondary, true).setOrigin(0.5, 0);
      UiKit.label(this, x, 33, `M${champion.mastery}`, UI.font.tiny, UI.text.muted).setOrigin(0.5, 0);
      tab.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('ChampionDetailScene', { partyIndex: index }));
    });
  }

  private drawChampion(): void {
    const champion = this.save.party[this.partyIndex] as ChampionInstance;
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);

    UiKit.framedPanel(this, 18, 58, 168, 176, true);
    this.add.rectangle(22, 62, 160, 122, 0x173549, 1).setStrokeStyle(1, UI.colors.borderSoft);
    this.addChampionPortrait(champion.championId, 102, 178);
    UiKit.label(this, 28, 190, definition.name.toUpperCase(), UI.font.title, UI.text.primary, true);
    UiKit.badge(this, 150, 200, `Nv. ${champion.level}`, 0x11314a);
    UiKit.label(this, 28, 216, this.roleLabel(definition.tags[0]), UI.font.small, UI.text.accent, true);

    UiKit.panel(this, 196, 58, 184, 92, 'INFORMACIÓN');
    this.infoRow(208, 90, 'VIDA', `${champion.currentHp} / ${stats.hp}`);
    UiKit.progressBar(this, 272, 96, 94, 7, champion.currentHp / stats.hp, this.hpColor(champion.currentHp / stats.hp));
    this.infoRow(208, 110, 'NIVEL', String(champion.level));
    this.infoRow(208, 128, 'MAESTRÍA', `${champion.mastery} / 50`);
    UiKit.progressBar(this, 290, 134, 76, 6, champion.mastery / 50, UI.colors.blue);

    UiKit.panel(this, 388, 58, 106, 92, 'ESTADÍSTICAS');
    this.statLine(398, 87, 'ATQ', stats.attack);
    this.statLine(445, 87, 'POD', stats.power);
    this.statLine(398, 106, 'DEF', stats.defense);
    this.statLine(445, 106, 'RES', stats.resistance);
    this.statLine(398, 125, 'VEL', stats.speed);
    this.statLine(445, 125, 'VID', stats.hp);

    UiKit.panel(this, 196, 158, 298, 76, 'BUILD');
    const slots = [212, 282, 352, 422];
    for (let i = 0; i < 4; i += 1) {
      const itemId = champion.equippedItems[i];
      const x = slots[i];
      const active = i < 3;
      this.add.rectangle(x, 193, 56, 48, active ? 0x112c42 : 0x0b1d2d, 1)
        .setStrokeStyle(2, itemId ? UI.colors.gold : UI.colors.borderSoft)
        .setAlpha(active ? 1 : 0.58);
      if (itemId) {
        const item = DataRegistry.item(itemId);
        UiKit.label(this, x, 177, item.name, UI.font.tiny, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(52);
        UiKit.label(this, x, 209, this.shortBonuses(item.statBonuses), UI.font.tiny, UI.text.accent, true).setOrigin(0.5, 0);
      } else {
        UiKit.label(this, x, 185, active ? 'VACÍO' : 'EXTRA', UI.font.tiny, active ? UI.text.muted : UI.text.blue, true).setOrigin(0.5, 0);
        UiKit.label(this, x, 202, active ? '—' : 'PRÓX.', UI.font.tiny, UI.text.muted).setOrigin(0.5, 0);
      }
    }

    const traits = champion.runeTraits.length > 0
      ? champion.runeTraits.map((trait) => trait.id).join(' · ')
      : 'Sin Rasgos Rúnicos';
    UiKit.label(this, 20, 242, `Rasgos: ${traits}`, UI.font.tiny, champion.runeTraits.length ? UI.text.purple : UI.text.muted);
    UiKit.label(this, 20, 256, `EXP ${champion.experience} · EXP Maestría ${champion.masteryExperience}`, UI.font.tiny, UI.text.secondary);

    UiKit.button(this, 402, 256, 82, 24, 'BUILD', () => {
      this.showHint('Gestión de equipamiento: siguiente iteración funcional.');
    }, { accent: 'gold', fontSize: UI.font.small });
    UiKit.button(this, 468, 256, 56, 24, 'ATRÁS', () => this.scene.start('TeamScene'), {
      accent: 'blue', fontSize: UI.font.small
    });
  }

  private addChampionPortrait(championId: string, x: number, groundY: number): void {
    if (championId === 'garen') {
      this.add.image(x, groundY, 'garen-battle-back').setOrigin(0.5, 1).setDisplaySize(126, 126);
      UiKit.label(this, x, 166, 'portrait provisional', UI.font.tiny, UI.text.muted).setOrigin(0.5, 0);
      return;
    }
    if (championId === 'teemo') {
      this.add.image(x, groundY, 'teemo-battle-front').setOrigin(0.5, 1).setDisplaySize(108, 122);
      return;
    }
    this.add.circle(x, groundY - 58, 44, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.border);
  }

  private infoRow(x: number, y: number, label: string, value: string): void {
    UiKit.label(this, x, y, label, UI.font.small, UI.text.muted, true);
    UiKit.label(this, x + 72, y, value, UI.font.small, UI.text.primary, true);
  }

  private statLine(x: number, y: number, label: string, value: number): void {
    UiKit.label(this, x, y, label, UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, x + 32, y, String(value), UI.font.small, UI.text.primary, true).setOrigin(1, 0);
  }

  private shortBonuses(bonuses: Partial<StatBlock>): string {
    return Object.entries(bonuses).map(([key, value]) => `${DataRegistry.stat(key as keyof StatBlock).short}+${value}`).join(' ');
  }

  private roleLabel(tag?: string): string {
    const labels: Record<string, string> = { vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador' };
    return tag ? labels[tag] ?? tag : 'Campeón';
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return UI.colors.hp;
    if (ratio > 0.2) return UI.colors.hpMid;
    return UI.colors.hpLow;
  }

  private showHint(message: string): void {
    const hint = UiKit.label(this, 256, 270, message, UI.font.tiny, UI.text.gold, true).setOrigin(0.5).setBackgroundColor('rgba(3,15,24,0.9)').setPadding(6, 3, 6, 3);
    this.time.delayedCall(1800, () => hint.destroy());
  }
}
