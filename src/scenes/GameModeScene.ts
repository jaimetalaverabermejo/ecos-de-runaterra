import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleFocusController, type ConsoleFocusOption } from '../input/ConsoleFocusController';

export class GameModeScene extends Phaser.Scene {
  private consoleOptions: ConsoleFocusOption[] = [];
  private consoleFocus?: ConsoleFocusController;

  constructor() {
    super('GameModeScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.consoleOptions = [];

    this.add.image(480, 270, 'ui960-title-bg').setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x01101a, 0.5).setOrigin(0);
    Ui960Kit.panel(this, 72, 44, 816, 450, { alpha: 0.97 });
    Ui960Kit.label(this, 104, 68, 'ELIGE CÓMO JUGAR', UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, 856, 77, 'ECOS DE RUNATERRA', UI960_FONT.tiny, UI.text.accent, true).setOrigin(1, 0);
    Ui960Kit.separator(this, 480, 112, 716);

    this.createModeCard(
      104, 142, 352, 260,
      'AVENTURA',
      'Explora Runaterra, progresa, guarda partida y construye tu equipo de Ecos.',
      'PARTIDA PERSISTENTE',
      () => this.scene.start('ProfileSelectScene')
    );

    this.createModeCard(
      504, 142, 352, 260,
      'SHOWDOWN',
      'Combate libre con roster completo, reglas configurables y equipos temporales.',
      'SIN GUARDADO · ENTORNO INDEPENDIENTE',
      () => this.scene.start('ShowdownHomeScene')
    );

    Ui960Kit.label(this, 480, 436, 'Ambos modos comparten el mismo motor, balance, VFX y presentación de combate.', UI960_FONT.tiny, UI.text.secondary, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 480, 466, 'ESC / B  Volver', UI960_FONT.tiny, UI.text.muted, true).setOrigin(0.5, 0);

    this.consoleFocus = new ConsoleFocusController(this, this.consoleOptions, () => this.scene.start('TitleScene'));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  update(): void {
    this.consoleFocus?.update();
  }

  private createModeCard(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    description: string,
    meta: string,
    onClick: () => void
  ): void {
    const panel = this.add.rectangle(x, y, width, height, 0x0a1d2b, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, UI.colors.borderSoft)
      .setInteractive({ useHandCursor: true });
    this.add.rectangle(x + 6, y + 6, width - 12, 4, UI.colors.cyanGlow, 0.72).setOrigin(0);
    Ui960Kit.label(this, x + 24, y + 30, title, '30px', UI.text.gold, true);
    Ui960Kit.label(this, x + 24, y + 88, description, UI960_FONT.small, UI.text.primary)
      .setWordWrapWidth(width - 48, true)
      .setLineSpacing(5);
    Ui960Kit.label(this, x + 24, y + height - 44, meta, '11px', UI.text.accent, true);

    panel.on(Phaser.Input.Events.POINTER_OVER, () => panel.setStrokeStyle(3, UI.colors.gold));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.setStrokeStyle(2, UI.colors.borderSoft));
    panel.on(Phaser.Input.Events.POINTER_UP, onClick);
    this.consoleOptions.push({ x: x - 16, y: y + height / 2, activate: onClick });
  }
}
