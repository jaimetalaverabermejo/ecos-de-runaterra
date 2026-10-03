import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleFocusController, type ConsoleFocusOption } from '../input/ConsoleFocusController';

export class ShowdownHomeScene extends Phaser.Scene {
  private consoleOptions: ConsoleFocusOption[] = [];
  private consoleFocus?: ConsoleFocusController;

  constructor() {
    super('ShowdownHomeScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.consoleOptions = [];
    this.registry.remove('battle.teamSession');
    this.registry.remove('battle.doubleSession');

    Ui960Kit.backdrop(this, 'bandle-bg', 0x345767, 0.28, 0.74);
    Ui960Kit.header(this, 'SHOWDOWN', 'Combate independiente · mismo motor de Ecos de Runaterra', 'ARENA');

    Ui960Kit.panel(this, 86, 126, 788, 282, { alpha: 0.97 });
    Ui960Kit.label(this, 118, 152, 'COMBATE LIBRE', UI960_FONT.heading, UI.text.gold, true);
    Ui960Kit.label(this, 118, 194,
      'Configura el formato, el tamaño del equipo y la maestría. Los equipos de Showdown son temporales y nunca modifican tu aventura.',
      UI960_FONT.small, UI.text.primary
    ).setWordWrapWidth(700, true).setLineSpacing(4);

    const start = () => this.scene.start('ShowdownSetupScene');
    Ui960Kit.button(this, 480, 300, 300, 58, 'CONFIGURAR COMBATE', start, {
      selected: true,
      fontSize: UI960_FONT.small
    });
    this.consoleOptions.push({ x: 314, y: 300, activate: start });

    Ui960Kit.label(this, 480, 355, '1v1 y 2v2 · equipos de 1 a 5 · roster completo', UI960_FONT.tiny, UI.text.accent, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 480, 438, 'Más adelante: presets competitivos, draft y reglas de torneo.', UI960_FONT.tiny, UI.text.muted, true).setOrigin(0.5, 0);

    const back = () => this.scene.start('GameModeScene');
    Ui960Kit.button(this, 112, 488, 150, 38, 'VOLVER', back, { fontSize: UI960_FONT.tiny });
    this.consoleOptions.push({ x: 28, y: 488, activate: back });

    this.consoleFocus = new ConsoleFocusController(this, this.consoleOptions, back);
    this.input.keyboard?.once('keydown-ESC', back);
  }

  update(): void {
    this.consoleFocus?.update();
  }
}
