import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    const appVersion = (this.registry.get('app.version') as string | undefined) ?? 'dev';

    this.add.image(480, 270, 'ui960-title-bg').setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x01101a, 0.12).setOrigin(0);

    this.add.image(326, 146, 'ui960-title-logo').setDisplaySize(520, 150);

    const proceed = (): void => this.scene.start('SaveSelectScene');
    this.createButton(320, 332, 'CONTINUAR', proceed);

    UiKit.label(this, 320, 382, 'Seleccionar partida', '13px', UI.text.secondary, true).setOrigin(0.5, 0);
    UiKit.label(this, 320, 466, `v${appVersion}`, '11px', UI.text.muted, true).setOrigin(0.5, 0);
    UiKit.label(this, 320, 488, 'CREATED BY JAIME TALAVERA', '11px', UI.text.secondary, true).setOrigin(0.5, 0);

    const prompt = UiKit.label(this, 320, 438, 'PULSA ENTER / A', '13px', UI.text.primary, true).setOrigin(0.5, 0);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.input.keyboard?.once('keydown-A', proceed);
    this.input.keyboard?.once('keydown-ENTER', proceed);
    this.input.keyboard?.once('keydown-SPACE', proceed);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.image(x, y, 'ui960-button')
      .setInteractive({ useHandCursor: true });
    UiKit.label(this, x, y - 9, label, '15px', UI.text.primary, true).setOrigin(0.5, 0);

    button.on(Phaser.Input.Events.POINTER_OVER, () => button.setTexture('ui960-button-selected'));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setTexture('ui960-button'));
    button.on(Phaser.Input.Events.POINTER_UP, onClick);
  }
}
