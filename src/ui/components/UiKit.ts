import Phaser from 'phaser';
import { UI } from '../theme/UiTheme';

export interface ButtonOptions {
  disabled?: boolean;
  accent?: 'green' | 'blue' | 'gold' | 'purple' | 'neutral';
  fontSize?: string;
  selected?: boolean;
}

export class UiKit {
  static panel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, title?: string): Phaser.GameObjects.Rectangle {
    scene.add.rectangle(x + 3, y + 3, width, height, UI.colors.shadow, 0.36).setOrigin(0, 0);
    const panel = scene.add.rectangle(x, y, width, height, UI.colors.panel, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI.colors.borderSoft);

    scene.add.rectangle(x + 3, y + 3, width - 6, 2, UI.colors.cyanGlow, 0.7).setOrigin(0, 0);
    this.runeCorners(scene, x, y, width, height, false);

    if (title) {
      scene.add.rectangle(x + 2, y + 2, width - 4, 25, UI.colors.panelRaised, 1).setOrigin(0, 0);
      scene.add.text(x + 10, y + 6, title, {
        fontFamily: UI.font.family,
        fontSize: UI.font.heading,
        fontStyle: 'bold',
        color: UI.text.primary
      });
    }
    return panel;
  }

  static framedPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, selected = false): Phaser.GameObjects.Rectangle {
    const border: number = selected ? UI.colors.gold : UI.colors.borderSoft;
    scene.add.rectangle(x + 2, y + 2, width, height, UI.colors.shadow, 0.35).setOrigin(0, 0);
    const panel = scene.add.rectangle(x, y, width, height, UI.colors.panel, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(selected ? 3 : 2, border);

    scene.add.rectangle(x + 3, y + 3, width - 6, 2, selected ? UI.colors.gold : UI.colors.cyanGlow, 0.82).setOrigin(0, 0);
    this.runeCorners(scene, x, y, width, height, selected);
    return panel;
  }

  static label(scene: Phaser.Scene, x: number, y: number, text: string, size: string = UI.font.body, color: string = UI.text.primary, bold = false): Phaser.GameObjects.Text {
    return scene.add.text(x, y, text, {
      fontFamily: UI.font.family,
      fontSize: size,
      fontStyle: bold ? 'bold' : 'normal',
      color,
      lineSpacing: 2
    });
  }

  static button(scene: Phaser.Scene, x: number, y: number, width: number, height: number, label: string, onClick: () => void, options: ButtonOptions = {}): { button: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const disabled = options.disabled ?? false;
    const fill = this.buttonColor(options.accent ?? 'neutral');
    const border: number = options.selected ? UI.colors.gold : disabled ? UI.colors.borderSoft : UI.colors.borderSoft;
    const button = scene.add.rectangle(x, y, width, height, disabled ? UI.colors.panelAlt : fill, 1)
      .setStrokeStyle(options.selected ? 3 : 2, border);
    const text = scene.add.text(x, y, label, {
      fontFamily: UI.font.family,
      fontSize: options.fontSize ?? UI.font.body,
      fontStyle: 'bold',
      color: disabled ? UI.text.muted : UI.text.primary,
      align: 'center'
    }).setOrigin(0.5);

    if (!disabled) {
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(UI.colors.panelRaised, 1));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(fill, 1));
      button.on(Phaser.Input.Events.POINTER_UP, () => {
        button.setFillStyle(fill, 1);
        onClick();
      });
    }
    return { button, label: text };
  }

  static progressBar(scene: Phaser.Scene, x: number, y: number, width: number, height: number, ratio: number, fillColor: number = UI.colors.accent): { track: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle } {
    const clamped = Phaser.Math.Clamp(ratio, 0, 1);
    const track = scene.add.rectangle(x, y, width, height, UI.colors.hpTrack, 1).setOrigin(0, 0.5).setStrokeStyle(1, UI.colors.borderSoft);
    const fill = scene.add.rectangle(x + 1, y, Math.max(0, (width - 2) * clamped), Math.max(2, height - 2), fillColor, 1).setOrigin(0, 0.5);
    return { track, fill };
  }

  static divider(scene: Phaser.Scene, x: number, y: number, width: number): Phaser.GameObjects.Rectangle {
    const line = scene.add.rectangle(x, y, width, 1, UI.colors.borderSoft, 0.8).setOrigin(0, 0.5);
    scene.add.rectangle(x + width / 2, y, 6, 6, UI.colors.cyanGlow, 0.8).setAngle(45).setStrokeStyle(1, UI.colors.border);
    return line;
  }

  static badge(scene: Phaser.Scene, x: number, y: number, text: string, color: number = UI.colors.panelRaised): Phaser.GameObjects.Container {
    const bg = scene.add.rectangle(0, 0, 48, 18, color, 1).setStrokeStyle(1, UI.colors.borderSoft);
    const label = scene.add.text(0, 0, text, { fontFamily: UI.font.family, fontSize: UI.font.small, color: UI.text.primary, fontStyle: 'bold' }).setOrigin(0.5);
    return scene.add.container(x, y, [bg, label]);
  }

  static runeDivider(scene: Phaser.Scene, x: number, y: number, width: number, gold = false): Phaser.GameObjects.Container {
    const color = gold ? UI.colors.gold : UI.colors.cyanGlow;
    const lineLeft = scene.add.rectangle(-width / 2 + 18, 0, width / 2 - 24, 1, color, 0.72).setOrigin(0, 0.5);
    const lineRight = scene.add.rectangle(6, 0, width / 2 - 24, 1, color, 0.72).setOrigin(0, 0.5);
    const diamond = scene.add.rectangle(0, 0, 9, 9, UI.colors.panel, 1).setAngle(45).setStrokeStyle(2, color);
    const core = scene.add.rectangle(0, 0, 3, 3, color, 1).setAngle(45);
    return scene.add.container(x, y, [lineLeft, lineRight, diamond, core]);
  }

  private static runeCorners(scene: Phaser.Scene, x: number, y: number, width: number, height: number, selected: boolean): void {
    const color = selected ? UI.colors.gold : UI.colors.cyanGlow;
    const alpha = selected ? 1 : 0.72;
    const inset = 5;
    const length = 8;

    scene.add.rectangle(x + inset, y + inset, length, 2, color, alpha).setOrigin(0, 0);
    scene.add.rectangle(x + inset, y + inset, 2, length, color, alpha).setOrigin(0, 0);
    scene.add.rectangle(x + width - inset, y + inset, length, 2, color, alpha).setOrigin(1, 0);
    scene.add.rectangle(x + width - inset, y + inset, 2, length, color, alpha).setOrigin(1, 0);
    scene.add.rectangle(x + inset, y + height - inset, length, 2, color, alpha).setOrigin(0, 1);
    scene.add.rectangle(x + inset, y + height - inset, 2, length, color, alpha).setOrigin(0, 1);
    scene.add.rectangle(x + width - inset, y + height - inset, length, 2, color, alpha).setOrigin(1, 1);
    scene.add.rectangle(x + width - inset, y + height - inset, 2, length, color, alpha).setOrigin(1, 1);
  }

  private static buttonColor(accent: ButtonOptions['accent']): number {
    if (accent === 'green') return 0x1d5a40;
    if (accent === 'blue') return 0x124766;
    if (accent === 'gold') return 0x5c4819;
    if (accent === 'purple') return 0x4a2f63;
    return UI.colors.panelAlt;
  }
}
