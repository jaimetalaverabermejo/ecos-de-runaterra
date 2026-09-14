import Phaser from 'phaser';
import type { SaveGame } from '../state/GameState';
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
    this.save = this.registry.get('save') as SaveGame;
    this.cameras.main.setBackgroundColor('#07131e');

    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x78949a).setAlpha(0.62);
    this.add.rectangle(0, 0, 512, 288, 0x00101b, 0.36).setOrigin(0, 0);

    const panelX = 320;
    UiKit.framedPanel(this, panelX, 8, 184, 272);
    this.add.rectangle(panelX + 4, 12, 176, 44, UI.colors.panelRaised, 1).setOrigin(0, 0);
    UiKit.label(this, panelX + 92, 20, 'ECOS DE RUNATERRA', UI.font.title, UI.text.primary, true).setOrigin(0.5, 0);
    UiKit.label(this, panelX + 92, 43, 'MENÚ', UI.font.small, UI.text.accent, true).setOrigin(0.5, 0);
    UiKit.runeDivider(this, panelX + 92, 57, 140, true);

    const collectionCount = this.save.party.length + this.save.storage.length;
    const inventoryCount = Object.values(this.save.inventory).reduce((sum, quantity) => sum + quantity, 0);

    this.createMenuRow(330, 64, 'EQUIPO', `${this.save.party.length} / 5 campeones`, '♟', true, () => {
      this.scene.start('TeamScene');
    });
    this.createMenuRow(330, 100, 'COLECCIÓN', `${collectionCount} Ecos registrados`, '◇', false, () => {
      this.setStatus('Colección preparada para una siguiente iteración.');
    });
    this.createMenuRow(330, 136, 'BOLSA', `${inventoryCount} objetos`, '▣', false, () => {
      this.scene.start('BagScene');
    });
    this.createMenuRow(330, 172, 'MAPA', 'Runaterra · Bandle', '⌖', false, () => {
      this.scene.start('WorldMapScene');
    });
    this.createMenuRow(330, 208, 'GUARDAR', 'Partida actual', '◆', false, () => {
      SaveService.save(this.save);
      this.setStatus('✓ Partida guardada');
    });

    UiKit.button(this, 374, 260, 82, 24, 'VOLVER', () => this.scene.start('WorldScene'), {
      accent: 'blue',
      fontSize: UI.font.small
    });
    UiKit.button(this, 462, 260, 78, 24, 'SALIR', () => {
      SaveService.save(this.save);
      this.scene.start('TitleScene');
    }, { accent: 'gold', fontSize: UI.font.small });

    this.statusText = UiKit.label(this, 16, 258, 'Selecciona una opción.', UI.font.small, UI.text.secondary, true)
      .setBackgroundColor('rgba(4,18,28,0.78)')
      .setPadding(7, 5, 7, 5);
  }

  private createMenuRow(x: number, y: number, title: string, subtitle: string, icon: string, selected: boolean, onClick: () => void): void {
    const width = 164;
    const height = 30;
    const panel = this.add.rectangle(x + width / 2, y + height / 2, width, height, selected ? 0x114b62 : UI.colors.panelAlt, 0.98)
      .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
      .setInteractive({ useHandCursor: true });

    this.add.rectangle(x + 20, y + 15, 34, 28, selected ? 0x17687a : 0x102a41, 1)
      .setStrokeStyle(1, selected ? UI.colors.gold : UI.colors.borderSoft);
    this.add.diamond(x + 20, y + 15, 22, 22, 0x07131e, 0.35).setStrokeStyle(1, UI.colors.cyanGlow);
    UiKit.label(this, x + 20, y + 6, icon, '16px', selected ? UI.text.gold : UI.text.accent, true).setOrigin(0.5, 0);
    UiKit.label(this, x + 43, y + 4, title, UI.font.heading, UI.text.primary, true);
    UiKit.label(this, x + 43, y + 18, subtitle, UI.font.tiny, UI.text.secondary);
    UiKit.label(this, x + 153, y + 7, '›', '18px', selected ? UI.text.gold : UI.text.muted, true).setOrigin(0.5, 0);

    panel.on(Phaser.Input.Events.POINTER_DOWN, () => panel.setFillStyle(UI.colors.panelRaised, 1));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.setFillStyle(selected ? 0x114b62 : UI.colors.panelAlt, 0.98));
    panel.on(Phaser.Input.Events.POINTER_UP, () => {
      panel.setFillStyle(selected ? 0x114b62 : UI.colors.panelAlt, 0.98);
      onClick();
    });
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
    this.time.delayedCall(2200, () => this.statusText.setText('Selecciona una opción.'));
  }
}
