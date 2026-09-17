import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import type { SaveGame } from '../state/GameState';
import { SaveService } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

export class SaveSelectScene extends Phaser.Scene {
  constructor() {
    super('SaveSelectScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    const save = this.registry.get('save') as SaveGame;

    this.add.image(480, 270, 'ui960-title-bg').setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x01101a, 0.42).setOrigin(0);
    Ui960Kit.panel(this, 66, 48, 828, 444, { alpha: 0.96 });

    Ui960Kit.label(this, 96, 74, 'SELECCIONAR PARTIDA', UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, 862, 82, 'ECOS DE RUNATERRA', UI960_FONT.tiny, UI.text.accent, true).setOrigin(1, 0);
    Ui960Kit.separator(this, 480, 112, 724);

    const continuePanel = this.add.image(100, 130, 'ui960-save-slot')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    Ui960Kit.label(this, 126, 150, 'CONTINUAR', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.label(this, 126, 190, save.player.name, UI960_FONT.body, UI.text.primary, true);
    const zone = save.worldProgress.currentZoneId.replaceAll('-', ' ');
    Ui960Kit.label(this, 126, 219, `Bandle · ${zone}`, UI960_FONT.small, UI.text.secondary);
    Ui960Kit.label(this, 474, 153, `EQUIPO ${save.party.length}/5`, UI960_FONT.small, UI.text.gold, true);

    save.party.slice(0, 5).forEach((champion, index) => {
      const texture = `${champion.championId}-portrait`;
      const x = 514 + index * 66;
      Ui960Kit.slot(this, x, 208, 56, index === 0);
      if (this.textures.exists(texture)) this.add.image(x, 208, texture).setDisplaySize(44, 44);
    });

    continuePanel.on(Phaser.Input.Events.POINTER_OVER, () => continuePanel.setTint(0xd9ffff));
    continuePanel.on(Phaser.Input.Events.POINTER_OUT, () => continuePanel.clearTint());
    continuePanel.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('WorldScene'));

    this.createOption(100, 292, 'NUEVA PARTIDA', 'Comenzar una nueva aventura', () => this.startNewGame());
    this.createOption(440, 292, 'VOLVER', 'Regresar a la portada', () => this.scene.start('TitleScene'));

    Ui960Kit.separator(this, 480, 438, 724);
    Ui960Kit.label(this, 104, 458, 'ENTER  Seleccionar     ESC  Volver', UI960_FONT.tiny, UI.text.secondary, true);
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('WorldScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  private createOption(x: number, y: number, title: string, subtitle: string, onClick: () => void): void {
    const panel = this.add.image(x, y, 'ui960-save-option')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    Ui960Kit.label(this, x + 160, y + 29, title, UI960_FONT.heading, UI.text.primary, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, x + 160, y + 73, subtitle, UI960_FONT.tiny, UI.text.secondary).setOrigin(0.5, 0);

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
