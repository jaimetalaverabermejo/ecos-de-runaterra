import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { SaveService } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

export class TeamScene extends Phaser.Scene {
  private save!: SaveGame;
  private reorderMode = false;
  private reorderSourceIndex: number | null = null;
  private instructionText!: Phaser.GameObjects.Text;
  private cardPanels = new Map<number, Phaser.GameObjects.Rectangle>();

  constructor() {
    super('TeamScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.reorderMode = false;
    this.reorderSourceIndex = null;
    this.cardPanels.clear();

    Ui960Kit.backdrop(this, 'bandle-bg', 0x526f78, 0.32, 0.68);
    Ui960Kit.header(this, 'EQUIPO', `${this.save.party.length} / 5 ECOS ACTIVOS`, 'ECOS DE RUNATERRA');

    const slots = [
      { x: 42, y: 116 },
      { x: 340, y: 116 },
      { x: 638, y: 116 },
      { x: 191, y: 272 },
      { x: 489, y: 272 }
    ];

    for (let i = 0; i < 5; i += 1) {
      const champion = this.save.party[i];
      const pos = slots[i];
      if (champion) this.createChampionCard(pos.x, pos.y, 280, 128, champion, i, i === 0);
      else this.createEmptyCard(pos.x, pos.y, 280, 128, i);
    }

    Ui960Kit.separator(this, 480, 430, 860);
    this.instructionText = Ui960Kit.label(
      this,
      54,
      454,
      'Toca un Eco para abrir su ficha. El primero es quien inicia los combates.',
      UI960_FONT.small,
      UI.text.secondary
    ).setWordWrapWidth(560, true);

    Ui960Kit.button(this, 710, 474, 150, 44, 'ORDENAR', () => this.toggleReorderMode(), {
      selected: true,
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 862, 474, 120, 44, 'ATRÁS', () => this.scene.start('MenuScene'), {
      fontSize: UI960_FONT.small
    });
  }

  private createChampionCard(x: number, y: number, width: number, height: number, champion: ChampionInstance, index: number, leader: boolean): void {
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const hpRatio = Phaser.Math.Clamp(champion.currentHp / stats.hp, 0, 1);
    const panel = Ui960Kit.panel(this, x, y, width, height, { selected: leader, alt: true });
    panel.setInteractive({ useHandCursor: true });
    this.cardPanels.set(index, panel);

    Ui960Kit.slot(this, x + 54, y + 62, 86, leader);
    this.addChampionVisual(champion.championId, x + 54, y + 105);

    Ui960Kit.label(this, x + 106, y + 14, definition.name.toUpperCase(), UI960_FONT.heading, UI.text.primary, true)
      .setWordWrapWidth(118, true);
    const masteryLabel = leader ? `M${champion.mastery} · LÍDER` : `M${champion.mastery}`;
    Ui960Kit.label(this, x + width - 16, y + 18, masteryLabel, UI960_FONT.tiny, UI.text.gold, true).setOrigin(1, 0);

    const typeMeta = (definition.affinityIds ?? []).length > 0
      ? TypeEffectivenessService.typeNames(definition.affinityIds ?? [], true)
      : 'SIN TIPO';
    Ui960Kit.label(this, x + 106, y + 47, `${this.roleLabel(definition.tags[0])} · ${typeMeta}`, '12px', UI.text.secondary, true)
      .setWordWrapWidth(width - 124, true);

    const barX = x + 144;
    const barWidth = width - 162;
    Ui960Kit.label(this, x + 106, y + 72, 'EXP', '11px', UI.text.muted, true);
    Ui960Kit.progress(this, barX, y + 82, barWidth, 9, ProgressionService.experienceRatio(champion), UI.colors.blue);

    Ui960Kit.label(this, x + 106, y + 96, 'VID', '11px', UI.text.muted, true);
    Ui960Kit.progress(this, barX, y + 106, barWidth, 9, hpRatio, this.hpColor(hpRatio));
    Ui960Kit.label(this, x + width - 16, y + 112, `${champion.currentHp}/${stats.hp}`, '10px', UI.text.secondary, true).setOrigin(1, 0.5);

    panel.on(Phaser.Input.Events.POINTER_DOWN, () => panel.setFillStyle(UI.colors.panelRaised, 1));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.setFillStyle(UI.colors.panelAlt, 0.97));
    panel.on(Phaser.Input.Events.POINTER_UP, () => {
      panel.setFillStyle(UI.colors.panelAlt, 0.97);
      if (this.reorderMode) {
        this.handleReorderTap(index);
        return;
      }
      this.scene.start('ChampionDetailScene', { partyIndex: index });
    });
  }

  private toggleReorderMode(): void {
    if (this.reorderMode) {
      this.scene.restart();
      return;
    }
    this.reorderMode = true;
    this.reorderSourceIndex = null;
    this.instructionText.setText('ORDENAR: toca un Eco y después la posición con la que quieres intercambiarlo.');
  }

  private handleReorderTap(index: number): void {
    if (index < 0 || index >= this.save.party.length) return;

    if (this.reorderSourceIndex === null) {
      this.reorderSourceIndex = index;
      this.cardPanels.get(index)?.setStrokeStyle(4, UI.colors.gold);
      const name = DataRegistry.champion(this.save.party[index].championId).name;
      this.instructionText.setText(`${name} seleccionado. Toca otro Eco para intercambiar posiciones.`);
      return;
    }

    if (this.reorderSourceIndex === index) {
      this.cardPanels.get(index)?.setStrokeStyle(index === 0 ? 3 : 2, index === 0 ? UI.colors.gold : UI.colors.borderSoft);
      this.reorderSourceIndex = null;
      this.instructionText.setText('ORDENAR: toca un Eco y después la posición con la que quieres intercambiarlo.');
      return;
    }

    const sourceIndex = this.reorderSourceIndex;
    const source = this.save.party[sourceIndex];
    this.save.party[sourceIndex] = this.save.party[index];
    this.save.party[index] = source;
    SaveService.save(this.save);
    this.registry.set('save', this.save);
    this.scene.restart();
  }

  private createEmptyCard(x: number, y: number, width: number, height: number, index: number): void {
    Ui960Kit.panel(this, x, y, width, height, { alpha: 0.7 });
    Ui960Kit.label(this, x + width / 2, y + 42, `RANURA ${index + 1}`, UI960_FONT.heading, UI.text.muted, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, x + width / 2, y + 76, 'Vacía', UI960_FONT.small, UI.text.muted).setOrigin(0.5, 0);
  }

  private addChampionVisual(championId: string, x: number, groundY: number): void {
    const portrait = `${championId}-portrait`;
    if (this.textures.exists(portrait)) {
      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(76, 76);
      return;
    }
    const front = `${championId}-battle-front`;
    if (this.textures.exists(front)) {
      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(72, 78);
      return;
    }
    this.add.circle(x, groundY - 38, 28, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.borderSoft);
  }

  private roleLabel(tag?: string): string {
    const labels: Record<string, string> = {
      vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador',
      tanque: 'Tanque', luchador: 'Luchador', mago: 'Mago', asesino: 'Asesino', tirador: 'Tirador', apoyo: 'Apoyo', especialista: 'Especialista'
    };
    return tag ? labels[tag] ?? tag : 'Campeón';
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return UI.colors.hp;
    if (ratio > 0.2) return UI.colors.hpMid;
    return UI.colors.hpLow;
  }
}
