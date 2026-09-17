import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import type { SaveGame } from '../state/GameState';
import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';
import { SaveService } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
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

    Ui960Kit.dimmer(this, 0.16);
    const x = 646;
    const y = 30;
    const width = 286;
    const height = 480;
    Ui960Kit.panel(this, x, y, width, height, { alpha: 0.96, selected: true });

    Ui960Kit.label(this, x + 28, y + 24, 'MENÚ', UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, x + width - 26, y + 31, 'ECOS DE RUNATERRA', UI960_FONT.tiny, UI.text.accent, true).setOrigin(1, 0);
    Ui960Kit.separator(this, x + width / 2, y + 72, width - 44);

    const inventoryCount = Object.values(this.save.inventory).reduce((sum, quantity) => sum + quantity, 0);
    const activeQuests = Object.values(this.save.quests).filter((quest) => quest && quest.status !== 'completed').length;
    const completedQuests = Object.values(this.save.quests).filter((quest) => quest?.status === 'completed').length;
    const echoes = EchoRegistryService.counts(this.save);

    this.createRow(x + 24, y + 88, 'ui960-icon-team', 'EQUIPO', `${this.save.party.length}/5 Ecos`, () => this.scene.start('TeamScene'));
    this.createRow(x + 24, y + 146, 'ui960-icon-player', this.save.player.name.toUpperCase(), `${echoes.linked} vinculados`, () => this.scene.start('PlayerScene'));
    this.createRow(x + 24, y + 204, 'ui960-icon-bag', 'BOLSA', `${inventoryCount} objetos`, () => this.scene.start('BagScene'));
    this.createRow(x + 24, y + 262, 'ui960-icon-journal', 'MISIONES', activeQuests > 0 ? `${activeQuests} activa${activeQuests > 1 ? 's' : ''}` : `${completedQuests} completadas`, () => this.scene.start('JournalScene'));
    this.createRow(x + 24, y + 320, 'ui960-icon-map', 'MAPA', 'Runaterra · Bandle', () => this.scene.start('WorldMapScene'));
    this.createRow(x + 24, y + 378, 'ui960-icon-save', 'GUARDAR', 'Partida actual', () => {
      SaveService.save(this.save);
      this.setStatus('Partida guardada');
    });

    this.statusText = Ui960Kit.label(this, x + 26, y + 438, 'Selecciona una opción.', UI960_FONT.tiny, UI.text.secondary, true);

    Ui960Kit.button(this, x + 74, y + height - 22, 126, 38, 'VOLVER', () => this.returnToWorld(), { fontSize: UI960_FONT.small });
    Ui960Kit.button(this, x + 212, y + height - 22, 126, 38, 'SALIR', () => {
      SaveService.save(this.save);
      this.scene.stop('WorldScene');
      this.scene.start('TitleScene');
    }, { selected: true, fontSize: UI960_FONT.small });

    this.input.keyboard?.once('keydown-ESC', () => this.returnToWorld());
  }

  private createRow(x: number, y: number, icon: string, title: string, subtitle: string, onClick: () => void): void {
    const button = Ui960Kit.button(this, x + 119, y + 23, 238, 48, '', onClick, { fontSize: UI960_FONT.small });
    this.add.image(x + 29, y + 23, icon).setDisplaySize(30, 30).setDepth(button.button.depth + 1);
    Ui960Kit.label(this, x + 54, y + 7, title, UI960_FONT.small, UI.text.primary, true).setDepth(button.button.depth + 1);
    Ui960Kit.label(this, x + 54, y + 27, subtitle, UI960_FONT.tiny, UI.text.secondary).setDepth(button.button.depth + 1);
  }

  private returnToWorld(): void {
    this.scene.resume('WorldScene');
    this.scene.stop('MenuScene');
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
    this.time.delayedCall(1800, () => this.statusText.setText('Selecciona una opción.'));
  }
}
