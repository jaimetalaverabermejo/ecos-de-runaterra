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

    this.cameras.main.setBackgroundColor('#101722');
    this.drawBattleBackground(width, height);

    const wildSprite = this.add
      .image(width + 70, 92, 'teemo-battle-front')
      .setDisplaySize(105, 126)
      .setAlpha(0);

    const playerSprite = this.add
      .image(-80, 190, 'garen-battle-back')
      .setDisplaySize(140, 143)
      .setAlpha(0);

    this.drawInfoBox(width - 160, 18, wildDefinition.name, wildChampion.level, wildDefinition.baseStats);
    this.drawInfoBox(22, 154, playerDefinition.name, playerChampion.level, playerDefinition.baseStats);

    const message = this.add
      .text(20, 18, `¡Ha aparecido un ${wildDefinition.name} salvaje!`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 7, y: 5 }
      })
      .setAlpha(0)
      .setDepth(20);

    this.tweens.add({
      targets: wildSprite,
      x: width - 92,
      alpha: 1,
      duration: 280,
      ease: 'Back.Out'
    });

    this.tweens.add({
      targets: playerSprite,
      x: 102,
      alpha: 1,
      duration: 320,
      delay: 100,
      ease: 'Back.Out'
    });

    this.tweens.add({ targets: message, alpha: 1, duration: 180, delay: 260 });

    this.createActionButton(width - 84, height - 28, 126, 30, 'HUIR / VOLVER', () => {
      this.registry.remove('pendingEncounter');
      this.scene.start('WorldScene');
    });

    this.add
      .text(18, height - 54, 'STEP 2 · Encuentro funcional · Combate real en Step 3', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#d6e5f5'
      })
      .setDepth(20);
  }

  private drawBattleBackground(width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x101722, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x78b963, 1);
    graphics.fillRect(0, 0, width, 132);
    graphics.fillStyle(0x91cf75, 1);
    graphics.fillRect(0, 88, width, 44);
    graphics.fillStyle(0x304b38, 1);
    graphics.fillEllipse(width - 92, 128, 148, 28);
    graphics.fillEllipse(102, 232, 190, 32);
    graphics.fillStyle(0x1a2533, 1);
    graphics.fillRect(0, 132, width, height - 132);
    graphics.lineStyle(2, 0xc6e6a9, 0.35);
    graphics.lineBetween(0, 132, width, 132);
  }

  private drawInfoBox(x: number, y: number, name: string, level: number, stats: StatBlock): void {
    this.add
      .rectangle(x + 68, y + 32, 136, 64, 0x101722, 0.9)
      .setStrokeStyle(2, 0xdfeaff, 0.7)
      .setDepth(10);

    this.add
      .text(x + 8, y + 7, `${name} · Nv.${level}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff'
      })
      .setDepth(11);

    this.add
      .text(x + 8, y + 24, `VID ${stats.hp}  ATQ ${stats.attack}  POD ${stats.power}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#cfe0f3'
      })
      .setDepth(11);

    this.add
      .text(x + 8, y + 38, `DEF ${stats.defense}  RES ${stats.resistance}  VEL ${stats.speed}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#cfe0f3'
      })
      .setDepth(11);
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
      .rectangle(x, y, width, height, 0x253140, 1)
      .setStrokeStyle(2, 0x8bb6ff)
      .setInteractive({ useHandCursor: true })
      .setDepth(30);

    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(31);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(0x35506d, 1));
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      button.setFillStyle(0x253140, 1);
      onClick();
    });
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(0x253140, 1));
  }
}
