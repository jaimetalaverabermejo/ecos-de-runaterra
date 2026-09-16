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

    this.add.image(480, 270, 'bandle-bg').setDisplaySize(960, 540).setTint(0x58727f).setAlpha(0.9);
    this.add.rectangle(0, 0, 960, 540, 0x02101a, 0.48).setOrigin(0).setDepth(1);

    UiKit.label(this, 96, 58, 'SELECCIONAR PARTIDA', '26px', UI.text.primary, true).setDepth(10);

    this.add.image(100, 132, 'battle-ui-960', 'save-slot-panel.png').setOrigin(0).setDepth(5);
    UiKit.label(this, 126, 151, 'CONTINUAR', '20px', UI.text.primary, true).setDepth(10);
    UiKit.label(this, 126, 188, save.player.name, '18px', UI.text.primary, true).setDepth(10);
    const zone = save.worldProgress.currentZoneId.replaceAll('-', ' ');
    UiKit.label(this, 126, 216, `Bandle · ${zone}`, '14px', UI.text.secondary).setDepth(10);
    UiKit.label(this, 568, 160, `EQUIPO ${save.party.length}/5`, '14px', UI.text.gold, true).setDepth(10);

    save.party.slice(0, 5).forEach((champion, index) => {
      const texture = `${champion.championId}-portrait`;
      if (!this.textures.exists(texture)) return;
      const x = 575 + index * 54;
      this.add.rectangle(x, 194, 44, 44, 0x0c1c2a, 0.95).setOrigin(0).setStrokeStyle(2, 0xb79a63).setDepth(8);
      this.add.image(x + 22, 216, texture).setDisplaySize(40, 40).setDepth(9);
    });

    this.createOption(100, 286, 'NUEVA PARTIDA', 'Comenzar una nueva aventura', () => this.startNewGame());
    this.createOption(540, 286, 'VOLVER', 'Regresar a la portada', () => this.scene.start('TitleScene'));

    const continueHit = this.add.rectangle(480, 192, 760, 120, 0x000000, 0.001).setInteractive({ useHandCursor: true }).setDepth(20);
    continueHit.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('WorldScene'));

    UiKit.label(this, 104, 468, 'ENTER · Continuar      ESC · Volver', '13px', UI.text.secondary, true).setDepth(10);
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('WorldScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  private createOption(x: number, y: number, title: string, subtitle: string, onClick: () => void): void {
    const panel = this.add.image(x, y, 'battle-ui-960', 'save-option-panel.png').setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(5);
    UiKit.label(this, x + 160, y + 28, title, '20px', UI.text.primary, true).setOrigin(0.5, 0).setDepth(10);
    UiKit.label(this, x + 160, y + 70, subtitle, '13px', UI.text.secondary).setOrigin(0.5, 0).setDepth(10);
    panel.on(Phaser.Input.Events.POINTER_OVER, () => panel.setTint(0xd7ffff));
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
