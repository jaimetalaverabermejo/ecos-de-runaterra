import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import type { SaveGame } from '../state/GameState';
import { SaveService } from '../systems/save/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class SaveSelectScene extends Phaser.Scene {
  constructor() {
    super('SaveSelectScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    const save = this.registry.get('save') as SaveGame;

    this.add.image(480, 270, 'ui960-title-bg').setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x01101a, 0.34).setOrigin(0);

    this.add.image(64, 44, 'ui960-panel').setOrigin(0).setDisplaySize(830, 450).setAlpha(0.98);
    UiKit.label(this, 100, 72, 'SELECCIONAR PARTIDA', '26px', UI.text.primary, true);

    const continuePanel = this.add.image(100, 132, 'ui960-save-slot')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    UiKit.label(this, 126, 151, 'CONTINUAR', '20px', UI.text.primary, true);
    UiKit.label(this, 126, 188, save.player.name, '18px', UI.text.primary, true);
    const zone = save.worldProgress.currentZoneId.replaceAll('-', ' ');
    UiKit.label(this, 126, 216, `Bandle · ${zone}`, '14px', UI.text.secondary);
    UiKit.label(this, 446, 158, `EQUIPO ${save.party.length}/5`, '14px', UI.text.gold, true);

    save.party.slice(0, 5).forEach((champion, index) => {
      const texture = `${champion.championId}-portrait`;
      const x = 500 + index * 66;
      this.add.image(x, 192, 'ui960-slot').setOrigin(0).setDepth(4);
      if (this.textures.exists(texture)) {
        this.add.image(x + 28, 220, texture).setDisplaySize(42, 42).setDepth(5);
      }
    });

    continuePanel.on(Phaser.Input.Events.POINTER_OVER, () => continuePanel.setTint(0xd9ffff));
    continuePanel.on(Phaser.Input.Events.POINTER_OUT, () => continuePanel.clearTint());
    continuePanel.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('WorldScene'));

    this.createOption(100, 278, 'NUEVA PARTIDA', 'Comenzar una nueva aventura', () => this.startNewGame());
    this.createOption(440, 278, 'VOLVER', 'Regresar a la portada', () => this.scene.start('TitleScene'));

    UiKit.label(this, 104, 454, 'ENTER  Seleccionar     ESC  Volver', '13px', UI.text.secondary, true);
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('WorldScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  private createOption(x: number, y: number, title: string, subtitle: string, onClick: () => void): void {
    const panel = this.add.image(x, y, 'ui960-save-option')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    UiKit.label(this, x + 160, y + 28, title, '20px', UI.text.primary, true).setOrigin(0.5, 0);
    UiKit.label(this, x + 160, y + 70, subtitle, '13px', UI.text.secondary).setOrigin(0.5, 0);

    panel.on(Phaser.Input.Events.POINTER_OVER, () => panel.setTint(0xd9ffff));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.clearTint());
    panel.on(Phaser.Input.Events.POINTER_UP, onClick);
  }

  private startNewGame(): void {
    SaveService.clear();
    const fresh = SaveService.load();
    SaveService.save(fresh);
    this.registry.set('save', fresh);
    this.scene.start('WorldScene');
  }
}
