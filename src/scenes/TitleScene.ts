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

    const backgroundKey = this.textures.exists('title-background-960') ? 'title-background-960' : 'bandle-bg';
    this.add.image(480, 270, backgroundKey).setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x03101a, 0.18).setOrigin(0);
    this.add.image(480, 76, 'title-logo-960').setOrigin(0.5, 0).setDisplaySize(520, 150);

    UiKit.label(this, 480, 414, 'CREATED BY JAIME TALAVERA', '14px', UI.text.secondary, true).setOrigin(0.5, 0);
    UiKit.label(this, 480, 442, `v${appVersion}`, '12px', UI.text.muted, true).setOrigin(0.5, 0);

    const prompt = UiKit.label(this, 480, 486, 'PULSA A / ENTER O TOCA PARA CONTINUAR', '16px', UI.text.primary, true).setOrigin(0.5, 0);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    let started = false;
    const proceed = (): void => {
      if (started) return;
      started = true;
      this.scene.start('SaveSelectScene');
    };
    this.input.once(Phaser.Input.Events.POINTER_UP, proceed);
    this.input.keyboard?.once('keydown-A', proceed);
    this.input.keyboard?.once('keydown-ENTER', proceed);
    this.input.keyboard?.once('keydown-SPACE', proceed);
  }
}
