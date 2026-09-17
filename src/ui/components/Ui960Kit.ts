import Phaser from 'phaser';
import { UI } from '../theme/UiTheme';

export const UI960_FONT = {
  title: '32px',
  heading: '22px',
  body: '18px',
  small: '15px',
  tiny: '13px'
} as const;

export interface Ui960ButtonOptions {
  selected?: boolean;
  disabled?: boolean;
  fontSize?: string;
  tint?: number;
}

export interface Ui960PanelOptions {
  selected?: boolean;
  alt?: boolean;
  alpha?: number;
  accent?: number;
}

export interface Ui960TextureButtonOptions extends Ui960ButtonOptions {
  normalTexture: string;
  selectedTexture?: string;
  disabledTexture?: string;
}

export class Ui960Kit {
  static backdrop(
    scene: Phaser.Scene,
    texture: string = 'bandle-bg',
    tint: number = 0x496972,
    imageAlpha: number = 0.34,
    overlayAlpha: number = 0.66
  ): void {
    scene.cameras.main.setBackgroundColor('#07131e');
    scene.add.image(480, 270, texture).setDisplaySize(960, 540).setTint(tint).setAlpha(imageAlpha);
    scene.add.rectangle(0, 0, 960, 540, 0x03101b, overlayAlpha).setOrigin(0);
  }

  static panel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, options: Ui960PanelOptions = {}): Phaser.GameObjects.Rectangle {
    const selected = options.selected ?? false;
    const alpha = options.alpha ?? 0.97;
    const fill = options.alt ? UI.colors.panelAlt : UI.colors.panel;
    const accent = options.accent ?? (selected ? UI.colors.gold : UI.colors.cyanGlow);
    const border = selected ? UI.colors.gold : UI.colors.borderSoft;

    scene.add.rectangle(x + 4, y + 5, width, height, UI.colors.shadow, 0.34).setOrigin(0);
    const panel = scene.add.rectangle(x, y, width, height, fill, alpha)
      .setOrigin(0)
      .setStrokeStyle(selected ? 3 : 2, border, 1);
    scene.add.rectangle(x + 4, y + 4, Math.max(0, width - 8), 3, accent, selected ? 0.92 : 0.68).setOrigin(0);
    this.cornerBrackets(scene, x, y, width, height, accent, selected ? 1 : 0.82);
    return panel;
  }

  static frame(
    scene: Phaser.Scene,
    texture: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    originX: number = 0,
    originY: number = 0
  ): Phaser.GameObjects.Image {
    const image = scene.add.image(x, y, texture).setOrigin(originX, originY);
    if (width !== undefined && height !== undefined) image.setDisplaySize(width, height);
    return image;
  }

  static header(scene: Phaser.Scene, title: string, subtitle?: string, right?: string): void {
    if (scene.textures.exists('ui960a-header')) {
      scene.add.image(480, 50, 'ui960a-header').setDisplaySize(880, 64);
      this.label(scene, 62, 29, title, UI960_FONT.title, UI.text.primary, true);
      if (subtitle) this.label(scene, 64, 65, subtitle, UI960_FONT.tiny, UI.text.accent, true);
      if (right) this.label(scene, 896, 38, right, UI960_FONT.small, UI.text.gold, true).setOrigin(1, 0);
      return;
    }

    scene.add.rectangle(24, 18, 912, 72, UI.colors.panelRaised, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, UI.colors.borderSoft);
    scene.add.rectangle(28, 22, 904, 3, UI.colors.cyanGlow, 0.8).setOrigin(0);
    this.label(scene, 48, 31, title, UI960_FONT.title, UI.text.primary, true);
    if (subtitle) this.label(scene, 50, 68, subtitle, UI960_FONT.tiny, UI.text.accent, true);
    if (right) this.label(scene, 910, 38, right, UI960_FONT.small, UI.text.secondary, true).setOrigin(1, 0);
  }

  static label(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    size: string = UI960_FONT.body,
    color: string = UI.text.primary,
    bold: boolean = false
  ): Phaser.GameObjects.Text {
    return scene.add.text(x, y, text, {
      fontFamily: UI.font.family,
      fontSize: size,
      fontStyle: bold ? 'bold' : 'normal',
      color,
      lineSpacing: 3
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
    options: Ui960ButtonOptions = {}
  ): { button: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text } {
    if (scene.textures.exists('ui960a-button-small')) {
      let normalTexture = 'ui960a-button-small';
      let selectedTexture = 'ui960a-button-small-selected';
      let disabledTexture = 'ui960a-button-small';

      if (width > 160 && width <= 205) {
        normalTexture = 'ui960a-button-action';
        selectedTexture = 'ui960a-button-action-selected';
        disabledTexture = 'ui960a-button-action-secondary';
      } else if (width > 205) {
        normalTexture = 'ui960a-button-menu';
        selectedTexture = 'ui960a-button-menu-selected';
        disabledTexture = 'ui960a-button-menu-disabled';
      }

      return this.textureButton(scene, x, y, width, height, label, onClick, {
        ...options,
        normalTexture,
        selectedTexture,
        disabledTexture
      });
    }

    const disabled = options.disabled ?? false;
    const selected = options.selected ?? false;
    const texture = disabled ? 'ui960-button-disabled' : selected ? 'ui960-button-selected' : 'ui960-button';
    const button = scene.add.image(x, y, texture).setDisplaySize(width, height);
    if (options.tint !== undefined) button.setTint(options.tint);
    const text = this.label(
      scene,
      x,
      y,
      label,
      options.fontSize ?? UI960_FONT.small,
      disabled ? UI.text.muted : selected ? UI.text.gold : UI.text.primary,
      true
    ).setOrigin(0.5);

    if (!disabled) this.bindButton(button, onClick, options.tint);
    return { button, label: text };
  }

  static textureButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    options: Ui960TextureButtonOptions
  ): { button: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text } {
    const disabled = options.disabled ?? false;
    const selected = options.selected ?? false;
    const texture = disabled
      ? options.disabledTexture ?? options.normalTexture
      : selected
        ? options.selectedTexture ?? options.normalTexture
        : options.normalTexture;

    const button = scene.add.image(x, y, texture).setDisplaySize(width, height);
    if (disabled && !options.disabledTexture) button.setAlpha(0.56);
    if (options.tint !== undefined) button.setTint(options.tint);

    const text = this.label(
      scene,
      x,
      y,
      label,
      options.fontSize ?? UI960_FONT.small,
      disabled ? UI.text.muted : selected ? UI.text.gold : UI.text.primary,
      true
    ).setOrigin(0.5);

    if (!disabled) this.bindButton(button, onClick, options.tint);
    return { button, label: text };
  }

  static slot(scene: Phaser.Scene, x: number, y: number, size: number = 64, selected: boolean = false): Phaser.GameObjects.Image {
    return scene.add.image(x, y, selected ? 'ui960-slot-selected' : 'ui960-slot').setDisplaySize(size, size);
  }

  static separator(scene: Phaser.Scene, x: number, y: number, width: number): Phaser.GameObjects.Image {
    if (scene.textures.exists('ui960a-divider')) {
      return scene.add.image(x, y, 'ui960a-divider').setDisplaySize(width, 8);
    }
    return scene.add.image(x, y, 'ui960-separator').setDisplaySize(width, 10);
  }

  static progress(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    ratio: number,
    fillColor: number = UI.colors.blue
  ): { track: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle } {
    const clamped = Phaser.Math.Clamp(ratio, 0, 1);
    const track = scene.add.rectangle(x, y, width, height, UI.colors.hpTrack, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, UI.colors.goldDark);
    const fill = scene.add.rectangle(x + 2, y, Math.max(0, (width - 4) * clamped), Math.max(2, height - 4), fillColor, 1)
      .setOrigin(0, 0.5);
    return { track, fill };
  }

  static dimmer(scene: Phaser.Scene, alpha: number = 0.3): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(0, 0, 960, 540, 0x020912, alpha).setOrigin(0);
  }

  private static bindButton(button: Phaser.GameObjects.Image, onClick: () => void, tint?: number): void {
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setTint(0xc8eaf0));
    button.on(Phaser.Input.Events.POINTER_OUT, () => {
      if (tint !== undefined) button.setTint(tint);
      else button.clearTint();
    });
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      if (tint !== undefined) button.setTint(tint);
      else button.clearTint();
      onClick();
    });
  }

  private static cornerBrackets(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number, alpha: number): void {
    const inset = 10;
    const length = 18;
    const thickness = 3;
    const left = x + inset;
    const right = x + width - inset;
    const top = y + inset;
    const bottom = y + height - inset;

    scene.add.rectangle(left, top, length, thickness, color, alpha).setOrigin(0, 0);
    scene.add.rectangle(left, top, thickness, length, color, alpha).setOrigin(0, 0);
    scene.add.rectangle(right, top, length, thickness, color, alpha).setOrigin(1, 0);
    scene.add.rectangle(right, top, thickness, length, color, alpha).setOrigin(1, 0);
    scene.add.rectangle(left, bottom, length, thickness, color, alpha).setOrigin(0, 1);
    scene.add.rectangle(left, bottom, thickness, length, color, alpha).setOrigin(0, 1);
    scene.add.rectangle(right, bottom, length, thickness, color, alpha).setOrigin(1, 1);
    scene.add.rectangle(right, bottom, thickness, length, color, alpha).setOrigin(1, 1);
  }
}
