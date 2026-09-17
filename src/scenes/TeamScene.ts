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
  private cardPanels = new Map<number, Phaser.GameObjects.Image>();

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
      { x: 20, y: 108 },
      { x: 330, y: 108 },
      { x: 640, y: 108 },
      { x: 175, y: 270 },
      { x: 485, y: 270 }
    ];

    for (let i = 0; i < 5; i += 1) {
      const champion = this.save.party[i];
      const pos = slots[i];
      if (champion) this.createChampionCard(pos.x, pos.y, champion, i, i === 0);
      else this.createEmptyCard(pos.x, pos.y, i);
    }

    Ui960Kit.separator(this, 480, 436, 860);
    this.instructionText = Ui960Kit.label(
      this,
      44,
      454,
      'Toca un Eco para abrir su ficha. El primero es quien inicia los combates.',
      UI960_FONT.small,
      UI.text.secondary
    ).setWordWrapWidth(570, true);

    Ui960Kit.button(this, 710, 492, 150, 44, 'ORDENAR', () => this.toggleReorderMode(), {
      selected: true,
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 862, 492, 120, 44, 'ATRÁS', () => this.scene.start('MenuScene'), {
      fontSize: UI960_FONT.small
    });
  }

  private createChampionCard(x: number, y: number, champion: ChampionInstance, index: number, leader: boolean): void {
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const hpRatio = Phaser.Math.Clamp(champion.currentHp / stats.hp, 0, 1);
    const panel = this.add.image(x, y, leader ? 'ui960a-team-slot-filled-selected' : 'ui960a-team-slot-filled')
      .setOrigin(0)
      .setDisplaySize(300, 150)
      .setInteractive({ useHandCursor: true });
    this.cardPanels.set(index, panel);

    this.addChampionVisual(champion.championId, x + 58, y + 124);
    Ui960Kit.label(this, x + 112, y + 16, definition.name.toUpperCase(), UI960_FONT.heading, UI.text.primary, true)
      .setWordWrapWidth(122, true);
    Ui960Kit.label(this, x + 282, y + 18, `M${champion.mastery}`, UI960_FONT.tiny, UI.text.gold, true).setOrigin(1, 0);
    if (leader) Ui960Kit.label(this, x + 282, y + 42, 'LÍDER', '11px', UI.text.gold, true).setOrigin(1, 0);

    const typeMeta = (definition.affinityIds ?? []).length > 0
      ? TypeEffectivenessService.typeNames(definition.affinityIds ?? [], true)
      : 'SIN TIPO';
    Ui960Kit.label(this, x + 112, y + 48, `${this.roleLabel(definition.tags[0])} · ${typeMeta}`, '12px', UI.text.secondary, true)
      .setWordWrapWidth(166, true);

    Ui960Kit.label(this, x + 112, y + 78, 'EXP', '11px', UI.text.muted, true);
    Ui960Kit.progress(this, x + 150, y + 88, 128, 9, ProgressionService.experienceRatio(champion), UI.colors.blue);

    Ui960Kit.label(this, x + 112, y + 106, 'VID', '11px', UI.text.muted, true);
    Ui960Kit.progress(this, x + 150, y + 116, 128, 9, hpRatio, this.hpColor(hpRatio));
    Ui960Kit.label(this, x + 278, y + 132, `${champion.currentHp}/${stats.hp}`, '10px', UI.text.secondary, true).setOrigin(1, 0);

    panel.on(Phaser.Input.Events.POINTER_DOWN, () => panel.setTint(0xc8eaf0));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.clearTint());
    panel.on(Phaser.Input.Events.POINTER_UP, () => {
      panel.clearTint();
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
      this.cardPanels.get(index)?.setTexture('ui960a-team-slot-filled-selected');
      const name = DataRegistry.champion(this.save.party[index].championId).name;
      this.instructionText.setText(`${name} seleccionado. Toca otro Eco para intercambiar posiciones.`);
      return;
    }

    if (this.reorderSourceIndex === index) {
      this.cardPanels.get(index)?.setTexture(index === 0 ? 'ui960a-team-slot-filled-selected' : 'ui960a-team-slot-filled');
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

  private createEmptyCard(x: number, y: number, index: number): void {
    this.add.image(x, y, 'ui960a-team-slot-empty').setOrigin(0).setDisplaySize(300, 150);
    Ui960Kit.label(this, x + 150, y + 50, `RANURA ${index + 1}`, UI960_FONT.heading, UI.text.muted, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, x + 150, y + 88, 'Vacía', UI960_FONT.small, UI.text.muted).setOrigin(0.5, 0);
  }

  private addChampionVisual(championId: string, x: number, groundY: number): void {
    const portrait = `${championId}-portrait`;
    if (this.textures.exists(portrait)) {
      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(82, 82);
      return;
    }
    const front = `${championId}-battle-front`;
    if (this.textures.exists(front)) {
      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(78, 84);
      return;
    }
    this.add.circle(x, groundY - 40, 28, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.goldDark);
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
