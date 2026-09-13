import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { SaveGame } from '../state/GameState';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    const save = this.registry.get('save') as SaveGame;
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#101820');
    this.add.rectangle(width / 2, height / 2, width, height, 0x101820, 1);
    this.add.rectangle(width / 2, 74, width - 48, 92, 0x1b2935, 1).setStrokeStyle(2, 0x8bb6ff);

    this.add.text(width / 2, 52, 'ECOS DE RUNATERRA', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, 82, 'Vertical Slice · Bandle City', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#b8cce0'
    }).setOrigin(0.5);

    const lead = save.party[0] ? DataRegistry.champion(save.party[0].championId).name : 'Sin campeón';
    this.add.text(width / 2, 125, `Equipo ${save.party.length}/5 · Líder: ${lead} · Reserva: ${save.storage.length}`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#dbe7f5'
    }).setOrigin(0.5);

    this.createButton(width / 2, 176, 184, 38, 'CONTINUAR', () => {
      this.scene.start('WorldScene');
    });

    this.add.text(width / 2, height - 38, 'Guardado local en este navegador', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#7f91a5'
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, width, height, 0x2f466a, 1)
      .setStrokeStyle(2, 0xa8c8ff)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(0x3b5c8f, 1));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(0x2f466a, 1));
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      button.setFillStyle(0x2f466a, 1);
      onClick();
    });
  }
}
