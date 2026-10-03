import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { normalizeShowdownConfig, showdownFormatLabel, type ShowdownConfig, type ShowdownActiveSlots } from '../systems/showdown/ShowdownSession';

export class ShowdownSetupScene extends Phaser.Scene {
  private config!: ShowdownConfig;

  constructor() {
    super('ShowdownSetupScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.config = normalizeShowdownConfig(this.registry.get('showdown.config') as Partial<ShowdownConfig> | undefined);
    this.registry.set('showdown.config', this.config);

    Ui960Kit.backdrop(this, 'bandle-bg', 0x345767, 0.24, 0.78);
    Ui960Kit.header(this, 'REGLAS DEL SHOWDOWN', 'Define el formato antes de construir los equipos', showdownFormatLabel(this.config));

    this.section(76, 126, 808, 92, 'FORMATO EN CAMPO');
    this.choice(300, 180, 180, 42, '1 VS 1', this.config.activeSlots === 1, () => this.setActiveSlots(1));
    this.choice(520, 180, 180, 42, '2 VS 2', this.config.activeSlots === 2, () => this.setActiveSlots(2));
    Ui960Kit.label(this, 738, 169, '3v3', UI960_FONT.small, UI.text.muted, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 738, 191, 'reservado', '10px', UI.text.muted, true).setOrigin(0.5, 0);

    this.section(76, 236, 808, 98, 'TAMAÑO TOTAL DEL EQUIPO');
    for (let size = 1; size <= 5; size += 1) {
      const disabled = size < this.config.activeSlots;
      this.choice(250 + (size - 1) * 115, 293, 82, 40, String(size), this.config.teamSize === size, () => this.setTeamSize(size), disabled);
    }
    Ui960Kit.label(this, 830, 285, `${this.config.activeSlots} activos · ${Math.max(0, this.config.teamSize - this.config.activeSlots)} reservas`, '11px', UI.text.accent, true).setOrigin(1, 0);

    this.section(76, 352, 808, 92, 'MAESTRÍA');
    [5, 8, 12, 18].forEach((value, index) => {
      this.choice(286 + index * 150, 405, 112, 40, 'M' + value, this.config.mastery === value, () => this.setMastery(value));
    });

    const back = Ui960Kit.button(this, 142, 492, 170, 40, 'VOLVER', () => this.scene.start('ShowdownHomeScene'), {
      fontSize: UI960_FONT.tiny
    });
    const next = Ui960Kit.button(this, 736, 492, 250, 44, 'CREAR EQUIPOS', () => {
      this.registry.set('showdown.config', this.config);
      this.registry.remove('showdown.builderTeams');
      this.scene.start('BattleSandboxScene');
    }, {
      selected: true,
      fontSize: UI960_FONT.small
    });
    back.button.setDepth(10); back.label.setDepth(11);
    next.button.setDepth(10); next.label.setDepth(11);

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('ShowdownHomeScene'));
  }

  private section(x: number, y: number, width: number, height: number, title: string): void {
    Ui960Kit.panel(this, x, y, width, height, { alt: true, alpha: 0.96 });
    Ui960Kit.label(this, x + 22, y + 14, title, UI960_FONT.tiny, UI.text.secondary, true);
  }

  private choice(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    selected: boolean,
    onClick: () => void,
    disabled: boolean = false
  ): void {
    Ui960Kit.button(this, x, y, width, height, label, onClick, {
      selected,
      disabled,
      fontSize: UI960_FONT.tiny
    });
  }

  private setActiveSlots(activeSlots: ShowdownActiveSlots): void {
    this.config = normalizeShowdownConfig({ ...this.config, activeSlots });
    this.registry.set('showdown.config', this.config);
    this.scene.restart();
  }

  private setTeamSize(teamSize: number): void {
    this.config = normalizeShowdownConfig({ ...this.config, teamSize });
    this.registry.set('showdown.config', this.config);
    this.scene.restart();
  }

  private setMastery(mastery: number): void {
    this.config = normalizeShowdownConfig({ ...this.config, mastery });
    this.registry.set('showdown.config', this.config);
    this.scene.restart();
  }
}
