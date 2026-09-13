import Phaser from 'phaser';
import { UI } from '../theme/UiTheme';

export interface ButtonOptions {
  disabled?: boolean;
  accent?: 'green' | 'blue' | 'purple' | 'neutral';
  fontSize?: string;
}

export class UiKit {
  static panel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    title?: string
  ): Phaser.GameObjects.Rectangle {
    scene.add.rectangle(x + 3, y + 3, width, height, UI.colors.shadow, 0.28).setOrigin(0, 0);
    const panel = scene.add.rectangle(x, y, width, height, UI.colors.panel, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI.colors.border);

    if (title) {
      scene.add.rectangle(x + 2, y + 2, width - 4, 24, UI.colors.panelRaised, 1).setOrigin(0, 0);
      scene.add.text(x + 10, y + 6, title, {
        fontFamily: UI.font.family,
        fontSize: UI.font.heading,
        fontStyle: 'bold',
        color: UI.text.primary
      });
    }

    return panel;
  }

  static label(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    size: string = UI.font.body,
    color: string = UI.text.primary,
    bold = false
  ): Phaser.GameObjects.Text {
    return scene.add.text(x, y, text, {
      fontFamily: UI.font.family,
      fontSize: size,
      fontStyle: bold ? 'bold' : 'normal',
      color,
      lineSpacing: 2
    });
  }

  static button(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    options: ButtonOptions = {}
  ): { button: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const disabled = options.disabled ?? false;
    const fill = this.buttonColor(options.accent ?? 'neutral');
    const pressed = options.accent === 'green' ? UI.colors.accentPressed : UI.colors.panelRaised;
    const border = disabled ? UI.colors.borderSoft : UI.colors.border;

    const button = scene.add.rectangle(x, y, width, height, disabled ? UI.colors.panelAlt : fill, 1)
      .setStrokeStyle(2, border);

    const text = scene.add.text(x, y, label, {
      fontFamily: UI.font.family,
      fontSize: options.fontSize ?? UI.font.body,
      fontStyle: 'bold',
      color: disabled ? UI.text.muted : UI.text.primary,
      align: 'center'
    }).setOrigin(0.5);

    if (!disabled) {
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(pressed, 1));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(fill, 1));
      button.on(Phaser.Input.Events.POINTER_UP, () => {
        button.setFillStyle(fill, 1);
        onClick();
      });
    }

    return { button, label: text };
  }

  static progressBar(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    ratio: number,
    fillColor = UI.colors.accent
  ): { track: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle } {
    const clamped = Phaser.Math.Clamp(ratio, 0, 1);
    const track = scene.add.rectangle(x, y, width, height, UI.colors.hpTrack, 1).setOrigin(0, 0.5);
    const fill = scene.add.rectangle(x, y, width * clamped, height, fillColor, 1).setOrigin(0, 0.5);
    return { track, fill };
  }

  private static buttonColor(accent: ButtonOptions['accent']): number {
    if (accent === 'green') return 0x42663b;
    if (accent === 'blue') return 0x38577a;
    if (accent === 'purple') return 0x594276;
    return UI.colors.panelAlt;
  }
}
