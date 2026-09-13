import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';

interface PendingEncounter {
  zoneId: string;
  wildChampion: ChampionInstance;
}

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create(): void {
    const save = this.registry.get('save') as SaveGame;
    const encounter = this.registry.get('pendingEncounter') as PendingEncounter | undefined;
    const playerChampion = save.party[0];
    const wildChampion = encounter?.wildChampion;

    if (!playerChampion || !wildChampion) {
      this.scene.start('WorldScene');
      return;
    }

    const playerDefinition = DataRegistry.champion(playerChampion.championId);
    const wildDefinition = DataRegistry.champion(wildChampion.championId);
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#0f1721');

    this.add.rectangle(width / 2, 70, width, 140, 0x9bd37b, 1);
    this.add.rectangle(width / 2, 185, width, 90, 0x7fb564, 1);
    this.add.rectangle(width / 2, height - 34, width, 68, 0x172437, 1);

    this.add.text(16, 10, `¡Ha aparecido un ${wildDefinition.name} salvaje!`, {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 }
    });

    this.add.ellipse(112, 222, 122, 24, 0x000000, 0.17);
    this.add.ellipse(width - 106, 149, 100, 20, 0x000000, 0.17);

    this.add.image(112, 218, 'garen-battle-back').setOrigin(0.5, 1).setScale(1.28);
    this.add.image(width - 106, 148, 'teemo-battle-front').setOrigin(0.5, 1).setScale(1.08);

    this.drawStatPanel(18, 52, `${wildDefinition.name} · Nv.${wildChampion.level}`, wildDefinition.baseStats);
    this.drawStatPanel(width - 184, 164, `${playerDefinition.name} · Nv.${playerChampion.level}`, playerDefinition.baseStats);

    this.add.text(16, height - 24, 'STEP 3 · Combate real en la siguiente iteración', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#d9e4f5'
    });

    this.createActionButton(width - 82, height - 23, 120, 26, 'HUIR / VOLVER', () => {
      this.registry.remove('pendingEncounter');
      this.scene.start('WorldScene');
    });
  }

  private drawStatPanel(x: number, y: number, title: string, stats: StatBlock): void {
    const panel = this.add.rectangle(x, y, 166, 62, 0x0f1721, 0.91).setOrigin(0, 0);
    panel.setStrokeStyle(2, 0xb8d1ff);

    this.add.text(x + 9, y + 8, title, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff'
    });
    this.add.text(x + 9, y + 27, `VID ${stats.hp}  ATQ ${stats.attack}  POD ${stats.power}`, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#dbe7f5'
    });
    this.add.text(x + 9, y + 43, `DEF ${stats.defense}  RES ${stats.resistance}  VEL ${stats.speed}`, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#dbe7f5'
    });
  }

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void
  ): void {
    const button = this.add
      .rectangle(x, y, width, height, 0x2f466a, 1)
      .setStrokeStyle(2, 0xa8c8ff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(0x3b5c8f, 1));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(0x2f466a, 1));
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      button.setFillStyle(0x2f466a, 1);
      onClick();
    });
  }
}
