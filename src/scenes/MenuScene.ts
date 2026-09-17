import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import type { SaveGame } from '../state/GameState';
import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';
import { SaveService } from '../systems/save/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class MenuScene extends Phaser.Scene {
  private save!: SaveGame;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;

    this.add.image(480, 270, 'bandle-village-bg').setDisplaySize(960, 540).setTint(0x9db2a7);
    this.add.rectangle(0, 0, 960, 540, 0x00101b, 0.28).setOrigin(0);

    this.add.image(18, 24, 'ui960-panel').setOrigin(0).setDisplaySize(220, 490).setAlpha(0.99);
    this.add.image(256, 24, 'ui960-panel-alt').setOrigin(0).setDisplaySize(680, 490).setAlpha(0.99);

    UiKit.label(this, 46, 48, 'MENÚ', '24px', UI.text.primary, true);
    this.add.image(42, 86, 'ui960-separator').setOrigin(0).setDisplaySize(192, 10);

    const inventoryCount = Object.values(this.save.inventory).reduce((sum, quantity) => sum + quantity, 0);
    const activeQuests = Object.values(this.save.quests).filter((quest) => quest && quest.status !== 'completed').length;
    const completedQuests = Object.values(this.save.quests).filter((quest) => quest?.status === 'completed').length;
    const echoes = EchoRegistryService.counts(this.save);

    this.createMenuRow(44, 114, 'EQUIPO', `${this.save.party.length}/5 Ecos`, 'ui960-icon-team', true, () => this.scene.start('TeamScene'));
    this.createMenuRow(44, 162, this.save.player.name.toUpperCase(), `${echoes.linked} vinculados`, 'ui960-icon-player', false, () => this.scene.start('PlayerScene'));
    this.createMenuRow(44, 210, 'BOLSA', `${inventoryCount} objetos`, 'ui960-icon-bag', false, () => this.scene.start('BagScene'));
    this.createMenuRow(44, 258, 'MISIONES', activeQuests > 0 ? `${activeQuests} activa${activeQuests > 1 ? 's' : ''}` : `${completedQuests} completadas`, 'ui960-icon-journal', false, () => this.scene.start('JournalScene'));
    this.createMenuRow(44, 306, 'MAPA', 'Runaterra · Bandle', 'ui960-icon-map', false, () => this.scene.start('WorldMapScene'));
    this.createMenuRow(44, 354, 'GUARDAR', 'Partida actual', 'ui960-icon-save', false, () => {
      SaveService.save(this.save);
      this.setStatus('✓ Partida guardada');
    });

    this.createButton(44, 422, 'VOLVER', () => this.scene.start('WorldScene'));
    this.createButton(44, 470, 'SALIR', () => {
      SaveService.save(this.save);
      this.scene.start('TitleScene');
    });

    this.renderPartySummary();

    this.statusText = UiKit.label(this, 286, 472, 'Selecciona una opción.', '13px', UI.text.secondary, true);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('WorldScene'));
  }

  private renderPartySummary(): void {
    UiKit.label(this, 282, 48, 'EQUIPO ACTIVO', '24px', UI.text.primary, true);
    UiKit.label(this, 900, 54, `${this.save.party.length} / 5`, '14px', UI.text.gold, true).setOrigin(1, 0);

    this.save.party.slice(0, 5).forEach((champion, index) => {
      const y = 104 + index * 70;
      this.add.rectangle(282, y, 628, 60, 0x06233a, 0.92)
        .setOrigin(0)
        .setStrokeStyle(2, 0x2aa5c7, 0.75);

      this.add.image(296, y + 2, 'ui960-slot').setOrigin(0).setDisplaySize(56, 56);
      const portraitKey = `${champion.championId}-portrait`;
      if (this.textures.exists(portraitKey)) {
        this.add.image(324, y + 30, portraitKey).setDisplaySize(42, 42);
      }

      const name = champion.championId
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      UiKit.label(this, 370, y + 9, name, '18px', UI.text.primary, true);
      UiKit.label(this, 370, y + 34, `Maestría ${champion.mastery}`, '13px', UI.text.secondary);
      UiKit.label(this, 870, y + 18, `${champion.currentHp} HP`, '14px', UI.text.primary, true).setOrigin(1, 0);
    });

    if (this.save.party.length === 0) {
      UiKit.label(this, 282, 128, 'No hay Ecos en el equipo activo.', '15px', UI.text.secondary);
    }
  }

  private createMenuRow(x: number, y: number, title: string, subtitle: string, iconKey: string, selected: boolean, onClick: () => void): void {
    const panel = this.add.image(x, y, selected ? 'ui960-button-selected' : 'ui960-button')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    this.add.image(x + 18, y + 20, iconKey).setDisplaySize(20, 20);
    UiKit.label(this, x + 36, y + 6, title, '12px', UI.text.primary, true);
    UiKit.label(this, x + 36, y + 22, subtitle, '10px', UI.text.secondary);

    panel.on(Phaser.Input.Events.POINTER_OVER, () => panel.setTexture('ui960-button-selected'));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.setTexture(selected ? 'ui960-button-selected' : 'ui960-button'));
    panel.on(Phaser.Input.Events.POINTER_UP, onClick);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.image(x, y, 'ui960-button')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    UiKit.label(this, x + 84, y + 10, label, '13px', UI.text.primary, true).setOrigin(0.5, 0);

    button.on(Phaser.Input.Events.POINTER_OVER, () => button.setTexture('ui960-button-selected'));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setTexture('ui960-button'));
    button.on(Phaser.Input.Events.POINTER_UP, onClick);
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
    this.time.delayedCall(2200, () => this.statusText.setText('Selecciona una opción.'));
  }
}
