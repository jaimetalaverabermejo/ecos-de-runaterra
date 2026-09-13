import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/BattleEngine';
import { SaveService } from '../systems/SaveService';

type MenuView = 'team' | 'inventory';

export class MenuScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedPartyIndex = 0;
  private view: MenuView = 'team';
  private contentObjects: Phaser.GameObjects.GameObject[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.cameras.main.setBackgroundColor('#101820');
    this.add.rectangle(256, 144, 512, 288, 0x101820, 1);

    this.add.text(14, 10, 'MENÚ', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ffffff'
    });

    this.add.text(496, 12, `Equipo ${this.save.party.length}/5`, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#9fb5ca'
    }).setOrigin(1, 0);

    this.createNavButton(54, 48, 'EQUIPO', () => {
      this.view = 'team';
      this.render();
    });
    this.createNavButton(54, 82, 'INVENTARIO', () => {
      this.view = 'inventory';
      this.render();
    });
    this.createNavButton(54, 132, 'GUARDAR', () => {
      SaveService.save(this.save);
      this.setStatus('Partida guardada correctamente.');
    });
    this.createNavButton(54, 166, 'GUARDAR\nY SALIR', () => {
      SaveService.save(this.save);
      this.scene.start('TitleScene');
    }, 42);
    this.createNavButton(54, 222, 'VOLVER', () => {
      this.scene.start('WorldScene');
    });

    this.statusText = this.add.text(112, 266, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#9fe3a6'
    });

    this.render();
  }

  private render(): void {
    for (const object of this.contentObjects) object.destroy();
    this.contentObjects = [];

    if (this.view === 'team') this.renderTeam();
    else this.renderInventory();
  }

  private renderTeam(): void {
    const panel = this.add.rectangle(304, 146, 392, 220, 0x182431, 1).setStrokeStyle(2, 0x425a73);
    this.contentObjects.push(panel);

    this.addContentText(116, 40, 'EQUIPO', 11, '#ffffff');

    for (let i = 0; i < 5; i += 1) {
      const champion = this.save.party[i];
      const y = 64 + i * 34;
      const selected = i === this.selectedPartyIndex && Boolean(champion);
      const slot = this.add.rectangle(174, y, 116, 28, selected ? 0x35506d : 0x223140, 1)
        .setStrokeStyle(1, selected ? 0xa8c8ff : 0x52677e);
      this.contentObjects.push(slot);

      if (champion) {
        const definition = DataRegistry.champion(champion.championId);
        const label = this.add.text(122, y - 8, `${i + 1}. ${definition.name}`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#ffffff'
        });
        const sub = this.add.text(122, y + 4, `Nv.${champion.level} · M${champion.mastery}`, {
          fontFamily: 'monospace', fontSize: '7px', color: '#9fb5ca'
        });
        this.contentObjects.push(label, sub);
        slot.setInteractive({ useHandCursor: true });
        slot.on(Phaser.Input.Events.POINTER_UP, () => {
          this.selectedPartyIndex = i;
          this.render();
        });
      } else {
        this.addContentText(122, y - 4, `${i + 1}. — vacío —`, 8, '#6f8194');
      }
    }

    const selected = this.save.party[this.selectedPartyIndex] ?? this.save.party[0];
    if (!selected) {
      this.addContentText(252, 70, 'No hay campeones en el equipo.', 9, '#ffffff');
      return;
    }

    this.renderChampionDetails(selected);
  }

  private renderChampionDetails(champion: ChampionInstance): void {
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const x = 252;

    this.addContentText(x, 42, `${definition.name} · Nv.${champion.level}`, 11, '#ffffff');
    this.addContentText(x, 60, `VID ${champion.currentHp}/${stats.hp}`, 9, '#aee6a8');
    this.addContentText(x, 76, `EXP ${champion.experience} · Maestría ${champion.mastery}/50`, 8, '#dbe7f5');
    this.addContentText(x, 90, `EXP Maestría ${champion.masteryExperience}`, 8, '#dbe7f5');

    this.addContentText(x, 112, 'ESTADÍSTICAS', 9, '#9fc5ff');
    this.addContentText(x, 128, `Vida ${stats.hp}    Ataque ${stats.attack}`, 8, '#ffffff');
    this.addContentText(x, 142, `Poder ${stats.power}    Defensa ${stats.defense}`, 8, '#ffffff');
    this.addContentText(x, 156, `Resistencia ${stats.resistance}    Velocidad ${stats.speed}`, 8, '#ffffff');

    this.addContentText(x, 180, 'OBJETOS EQUIPADOS', 9, '#9fc5ff');
    if (champion.equippedItems.length === 0) {
      this.addContentText(x, 196, 'Sin objetos equipados', 8, '#91a1b8');
    } else {
      champion.equippedItems.slice(0, 3).forEach((itemId, index) => {
        this.addContentText(x, 196 + index * 13, `• ${DataRegistry.item(itemId).name}`, 8, '#ffffff');
      });
    }

    const traits = champion.runeTraits.length > 0
      ? champion.runeTraits.map((trait) => trait.id).join(', ')
      : 'Sin Rasgos Rúnicos';
    this.addContentText(x, 238, `Rasgos: ${traits}`, 7, '#b7a5db');
    this.addContentText(116, 244, `Reserva: ${this.save.storage.length}`, 8, '#9fb5ca');
  }

  private renderInventory(): void {
    const panel = this.add.rectangle(304, 146, 392, 220, 0x182431, 1).setStrokeStyle(2, 0x425a73);
    this.contentObjects.push(panel);
    this.addContentText(116, 40, 'INVENTARIO', 11, '#ffffff');

    const entries = Object.entries(this.save.inventory).filter(([, quantity]) => quantity > 0);
    if (entries.length === 0) {
      this.addContentText(130, 72, 'Inventario vacío.', 9, '#91a1b8');
      return;
    }

    entries.forEach(([itemId, quantity], index) => {
      const item = DataRegistry.item(itemId);
      const y = 70 + index * 40;
      const box = this.add.rectangle(304, y + 8, 350, 32, 0x223140, 1).setStrokeStyle(1, 0x52677e);
      this.contentObjects.push(box);
      this.addContentText(138, y, `${item.name} ×${quantity}`, 9, '#ffffff');
      this.addContentText(138, y + 14, this.formatBonuses(item.statBonuses), 8, '#9fe3a6');
    });

    this.addContentText(130, 236, `Equipo ${this.save.party.length}/5 · Reserva ${this.save.storage.length}`, 8, '#9fb5ca');
  }

  private formatBonuses(bonuses: Partial<StatBlock>): string {
    const labels: Record<keyof StatBlock, string> = {
      hp: 'VID', attack: 'ATQ', power: 'POD', defense: 'DEF', resistance: 'RES', speed: 'VEL'
    };

    return Object.entries(bonuses)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => `${labels[key as keyof StatBlock]} +${value}`)
      .join(' · ') || 'Sin bonificaciones';
  }

  private createNavButton(x: number, y: number, label: string, onClick: () => void, height = 28): void {
    const button = this.add.rectangle(x, y, 88, height, 0x2f466a, 1)
      .setStrokeStyle(1, 0xa8c8ff)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5);

    button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(0x3b5c8f, 1));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(0x2f466a, 1));
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      button.setFillStyle(0x2f466a, 1);
      onClick();
    });
  }

  private addContentText(x: number, y: number, text: string, fontSize: number, color: string): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: `${fontSize}px`, color
    });
    this.contentObjects.push(object);
    return object;
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
    this.time.delayedCall(1800, () => this.statusText.setText(''));
  }
}
