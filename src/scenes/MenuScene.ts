import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/BattleEngine';
import { SaveService } from '../systems/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

type MenuView = 'team' | 'inventory';

export class MenuScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedPartyIndex = 0;
  private view: MenuView = 'team';
  private contentObjects: Phaser.GameObjects.GameObject[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.cameras.main.setBackgroundColor('#0f1719');
    this.add.rectangle(256, 144, 512, 288, UI.colors.backdrop, 1);

    UiKit.label(this, 16, 10, 'ECOS DE RUNATERRA', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 496, 14, `Equipo ${this.save.party.length}/5 · Reserva ${this.save.storage.length}`, UI.font.small, UI.text.muted)
      .setOrigin(1, 0);

    UiKit.panel(this, 8, 36, 96, 236);
    UiKit.panel(this, 112, 36, 392, 236);

    UiKit.button(this, 56, 62, 80, 32, 'EQUIPO', () => {
      this.view = 'team';
      this.render();
    }, { accent: 'green' });

    UiKit.button(this, 56, 102, 80, 32, 'MOCHILA', () => {
      this.view = 'inventory';
      this.render();
    }, { accent: 'blue' });

    UiKit.button(this, 56, 160, 80, 32, 'GUARDAR', () => {
      SaveService.save(this.save);
      this.setStatus('✓ Partida guardada');
    });

    UiKit.button(this, 56, 202, 80, 40, 'GUARDAR\nY SALIR', () => {
      SaveService.save(this.save);
      this.scene.start('TitleScene');
    }, { fontSize: UI.font.small });

    UiKit.button(this, 56, 250, 80, 28, 'VOLVER', () => {
      this.scene.start('WorldScene');
    });

    this.statusText = UiKit.label(this, 118, 276, '', UI.font.small, '#bfe8b7', true).setOrigin(0, 1);
    this.render();
  }

  private render(): void {
    for (const object of this.contentObjects) object.destroy();
    this.contentObjects = [];

    if (this.view === 'team') this.renderTeam();
    else this.renderInventory();
  }

  private renderTeam(): void {
    this.addContentText(124, 46, 'EQUIPO ACTIVO', UI.font.heading, UI.text.primary, true);
    this.addContentText(124, 62, 'Selecciona un campeón para ver su ficha.', UI.font.tiny, UI.text.muted);

    for (let i = 0; i < 5; i += 1) {
      const champion = this.save.party[i];
      const y = 91 + i * 34;
      const selected = i === this.selectedPartyIndex && Boolean(champion);
      const slot = this.add.rectangle(186, y, 128, 28, selected ? UI.colors.panelRaised : UI.colors.panelAlt, 1)
        .setStrokeStyle(2, selected ? UI.colors.border : UI.colors.borderSoft);
      this.contentObjects.push(slot);

      if (!champion) {
        this.addContentText(130, y - 5, `${i + 1}`, UI.font.small, UI.text.muted, true);
        this.addContentText(150, y - 5, '— vacío —', UI.font.small, UI.text.muted);
        continue;
      }

      const definition = DataRegistry.champion(champion.championId);
      const stats = BattleEngine.statsFor(champion);
      const hpRatio = Phaser.Math.Clamp(champion.currentHp / stats.hp, 0, 1);

      this.addContentText(130, y - 9, `${i + 1}`, UI.font.small, UI.text.muted, true);
      this.addContentText(150, y - 10, definition.name, UI.font.body, UI.text.primary, true);
      this.addContentText(150, y + 3, `Nv.${champion.level} · M${champion.mastery}`, UI.font.tiny, UI.text.secondary);

      const track = this.add.rectangle(222, y + 7, 76, 4, UI.colors.hpTrack, 1).setOrigin(0, 0.5);
      const fill = this.add.rectangle(222, y + 7, 76 * hpRatio, 4, this.hpColor(hpRatio), 1).setOrigin(0, 0.5);
      this.contentObjects.push(track, fill);

      slot.setInteractive({ useHandCursor: true });
      slot.on(Phaser.Input.Events.POINTER_UP, () => {
        this.selectedPartyIndex = i;
        this.render();
      });
    }

    const selected = this.save.party[this.selectedPartyIndex] ?? this.save.party[0];
    if (!selected) {
      this.addContentText(284, 92, 'No hay campeones en el equipo.', UI.font.body, UI.text.secondary);
      return;
    }

    this.renderChampionDetails(selected);
  }

  private renderChampionDetails(champion: ChampionInstance): void {
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const x = 284;
    const hpRatio = Phaser.Math.Clamp(champion.currentHp / stats.hp, 0, 1);
    const masteryRatio = Phaser.Math.Clamp(champion.mastery / 50, 0, 1);

    this.addContentText(x, 48, definition.name.toUpperCase(), UI.font.heading, UI.text.primary, true);
    this.addContentText(488, 49, `Nv. ${champion.level}`, UI.font.body, UI.text.blue, true).setOrigin(1, 0);

    this.addContentText(x, 70, `VIDA  ${champion.currentHp} / ${stats.hp}`, UI.font.small, UI.text.secondary, true);
    this.addTrackedBar(x, 87, 194, 7, hpRatio, this.hpColor(hpRatio));

    this.addContentText(x, 100, `EXP ${champion.experience}`, UI.font.tiny, UI.text.muted);
    this.addContentText(488, 100, `MAESTRÍA ${champion.mastery}/50`, UI.font.tiny, UI.text.purple, true).setOrigin(1, 0);
    this.addTrackedBar(x, 117, 194, 5, masteryRatio, UI.colors.purple);

    this.addContentText(x, 130, 'ESTADÍSTICAS', UI.font.small, UI.text.accent, true);
    this.addStatRow(x, 148, 'Vida', stats.hp, 'Ataque', stats.attack);
    this.addStatRow(x, 166, 'Poder', stats.power, 'Defensa', stats.defense);
    this.addStatRow(x, 184, 'Resistencia', stats.resistance, 'Velocidad', stats.speed);

    this.addContentText(x, 207, 'EQUIPO', UI.font.small, UI.text.accent, true);
    const equipped = champion.equippedItems.length > 0
      ? champion.equippedItems.slice(0, 3).map((itemId) => DataRegistry.item(itemId).name).join(' · ')
      : 'Sin objetos equipados';
    this.addContentText(x, 222, equipped, UI.font.tiny, champion.equippedItems.length > 0 ? UI.text.primary : UI.text.muted);

    const traits = champion.runeTraits.length > 0
      ? champion.runeTraits.map((trait) => trait.id).join(' · ')
      : 'Sin Rasgos Rúnicos';
    this.addContentText(x, 241, traits, UI.font.tiny, champion.runeTraits.length > 0 ? UI.text.purple : UI.text.muted);
    this.addContentText(x, 255, `EXP Maestría ${champion.masteryExperience}`, UI.font.tiny, UI.text.muted);
  }

  private renderInventory(): void {
    this.addContentText(124, 46, 'MOCHILA', UI.font.heading, UI.text.primary, true);
    this.addContentText(124, 62, 'Componentes y objetos disponibles.', UI.font.tiny, UI.text.muted);

    const entries = Object.entries(this.save.inventory).filter(([, quantity]) => quantity > 0);
    if (entries.length === 0) {
      this.addContentText(132, 100, 'La mochila está vacía.', UI.font.body, UI.text.muted);
      return;
    }

    entries.forEach(([itemId, quantity], index) => {
      const item = DataRegistry.item(itemId);
      const y = 92 + index * 52;
      const card = this.add.rectangle(308, y, 360, 42, UI.colors.panelAlt, 1)
        .setStrokeStyle(1, UI.colors.borderSoft);
      this.contentObjects.push(card);

      this.addContentText(138, y - 13, item.name, UI.font.body, UI.text.primary, true);
      this.addContentText(478, y - 13, `×${quantity}`, UI.font.body, UI.text.accent, true).setOrigin(1, 0);
      this.addContentText(138, y + 3, `COMPONENTE · ${this.formatBonuses(item.statBonuses)}`, UI.font.small, UI.text.secondary);
    });

    this.addContentText(132, 246, `Equipo ${this.save.party.length}/5 · Reserva ${this.save.storage.length}`, UI.font.small, UI.text.muted);
  }

  private addStatRow(x: number, y: number, leftLabel: string, leftValue: number, rightLabel: string, rightValue: number): void {
    this.addContentText(x, y, leftLabel, UI.font.small, UI.text.muted);
    this.addContentText(x + 72, y, String(leftValue), UI.font.small, UI.text.primary, true);
    this.addContentText(x + 102, y, rightLabel, UI.font.small, UI.text.muted);
    this.addContentText(x + 184, y, String(rightValue), UI.font.small, UI.text.primary, true).setOrigin(1, 0);
  }

  private addTrackedBar(x: number, y: number, width: number, height: number, ratio: number, color: number): void {
    const track = this.add.rectangle(x, y, width, height, UI.colors.hpTrack, 1).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x, y, width * Phaser.Math.Clamp(ratio, 0, 1), height, color, 1).setOrigin(0, 0.5);
    this.contentObjects.push(track, fill);
  }

  private formatBonuses(bonuses: Partial<StatBlock>): string {
    const labels: Record<keyof StatBlock, string> = {
      hp: 'VID', attack: 'ATQ', power: 'POD', defense: 'DEF', resistance: 'RES', speed: 'VEL'
    };

    return Object.entries(bonuses)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => `${labels[key as keyof StatBlock]} +${value}`)
      .join(' · ') || 'Sin bonificaciones';
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return UI.colors.hp;
    if (ratio > 0.2) return UI.colors.hpMid;
    return UI.colors.hpLow;
  }

  private addContentText(
    x: number,
    y: number,
    text: string,
    fontSize: string,
    color: string,
    bold = false
  ): Phaser.GameObjects.Text {
    const object = UiKit.label(this, x, y, text, fontSize, color, bold);
    this.contentObjects.push(object);
    return object;
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
    this.time.delayedCall(1800, () => this.statusText.setText(''));
  }
}
