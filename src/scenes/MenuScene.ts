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
    const x = 652;
    const y = 52;
    const width = 280;
    const height = 420;
    Ui960Kit.frame(this, 'ui960a-menu-side-panel', x, y, width, height);

    Ui960Kit.label(this, x + 26, y + 18, 'MENÚ', UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, x + width - 24, y + 28, 'RUNATERRA', UI960_FONT.tiny, UI.text.gold, true).setOrigin(1, 0);
    Ui960Kit.separator(this, x + width / 2, y + 66, width - 40);

    const inventoryCount = Object.values(this.save.inventory).reduce((sum, quantity) => sum + quantity, 0);
    const activeQuests = Object.values(this.save.quests).filter((quest) => quest && quest.status !== 'completed').length;
    const completedQuests = Object.values(this.save.quests).filter((quest) => quest?.status === 'completed').length;
    const echoes = EchoRegistryService.counts(this.save);

    this.createRow(x + 24, y + 82, 'ui960-icon-team', 'EQUIPO', `${this.save.party.length}/5 Ecos`, () => this.scene.start('TeamScene'));
    this.createRow(x + 24, y + 136, 'ui960-icon-player', this.save.player.name.toUpperCase(), `${echoes.linked} vinculados`, () => this.scene.start('PlayerScene'));
    this.createRow(x + 24, y + 190, 'ui960-icon-bag', 'BOLSA', `${inventoryCount} objetos`, () => this.scene.start('BagScene'));
    this.createRow(x + 24, y + 244, 'ui960-icon-journal', 'MISIONES', activeQuests > 0 ? `${activeQuests} activa${activeQuests > 1 ? 's' : ''}` : `${completedQuests} completadas`, () => this.scene.start('JournalScene'));
    this.createRow(x + 24, y + 298, 'ui960-icon-map', 'MAPA', 'Runaterra · Bandle', () => this.scene.start('WorldMapScene'));
    this.createRow(x + 24, y + 352, 'ui960-icon-save', 'GUARDAR', 'Partida actual', () => {
      SaveService.save(this.save);
      this.setStatus('Partida guardada');
    });

    this.statusText = Ui960Kit.label(this, x + 28, y + 397, 'Selecciona una opción.', '11px', UI.text.secondary, true);

    Ui960Kit.button(this, 728, 505, 140, 44, 'VOLVER', () => this.returnToWorld(), { fontSize: UI960_FONT.small });
    Ui960Kit.button(this, 866, 505, 140, 44, 'SALIR', () => {
      SaveService.save(this.save);
      this.scene.stop('WorldScene');
      this.scene.start('TitleScene');
    }, { selected: true, fontSize: UI960_FONT.small });

    this.input.keyboard?.once('keydown-ESC', () => this.returnToWorld());
  }

  private createRow(x: number, y: number, icon: string, title: string, subtitle: string, onClick: () => void): void {
    const button = Ui960Kit.textureButton(this, x + 116, y + 26, 232, 52, '', onClick, {
      normalTexture: 'ui960a-menu-option',
      selectedTexture: 'ui960a-menu-option-selected',
      fontSize: UI960_FONT.small
    });
    this.add.image(x + 28, y + 26, icon).setDisplaySize(30, 30).setDepth(button.button.depth + 1);
    Ui960Kit.label(this, x + 52, y + 8, title, UI960_FONT.small, UI.text.primary, true).setDepth(button.button.depth + 1);
    Ui960Kit.label(this, x + 52, y + 29, subtitle, '11px', UI.text.secondary).setDepth(button.button.depth + 1);
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
