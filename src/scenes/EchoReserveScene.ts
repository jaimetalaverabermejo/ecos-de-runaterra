import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { SaveService } from '../systems/save/SaveService';
import { TypeBadge } from '../ui/components/TypeBadge';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

type ReserveSource = 'party' | 'storage';

interface ReserveSelection {
  source: ReserveSource;
  index: number;
}

interface ReserveSceneData {
  selection?: ReserveSelection;
  page?: number;
}

export class EchoReserveScene extends Phaser.Scene {
  private save!: SaveGame;
  private selection?: ReserveSelection;
  private storagePage = 0;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('EchoReserveScene');
  }

  init(data?: ReserveSceneData): void {
    this.selection = data?.selection;
    this.storagePage = Math.max(0, Math.round(data?.page ?? 0));
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;

    Ui960Kit.backdrop(this, 'bandle-bg', 0x526f78, 0.28, 0.72);
    Ui960Kit.header(
      this,
      'RESERVA DE ECOS',
      `${this.save.party.length}/5 activos · ${this.save.storage.length} en reserva`,
      'SANTUARIO'
    );

    if (this.registry.get('world.echoReserveAvailable') !== true) {
      Ui960Kit.panel(this, 170, 160, 620, 190, { alt: true });
      Ui960Kit.label(this, 480, 205, 'LA RESERVA SOLO RESPONDE EN UN SANTUARIO', UI960_FONT.heading, UI.text.primary, true).setOrigin(0.5, 0);
      Ui960Kit.label(this, 480, 258, 'Vuelve al Santuario de Soraka para reorganizar tus Ecos.', UI960_FONT.small, UI.text.secondary).setOrigin(0.5, 0);
      Ui960Kit.button(this, 480, 390, 160, 44, 'VOLVER', () => this.scene.start('TeamScene'), { selected: true });
      return;
    }

    Ui960Kit.label(this, 44, 102, 'EQUIPO ACTIVO', UI960_FONT.small, UI.text.gold, true);
    Ui960Kit.label(this, 522, 102, 'RESERVA', UI960_FONT.small, UI.text.gold, true);

    for (let i = 0; i < 5; i += 1) {
      this.createPartyRow(i, 38, 126 + i * 63);
    }

    const pageSize = 8;
    const pageCount = Math.max(1, Math.ceil(this.save.storage.length / pageSize));
    this.storagePage = Phaser.Math.Clamp(this.storagePage, 0, pageCount - 1);
    const start = this.storagePage * pageSize;
    const entries = this.save.storage.slice(start, start + pageSize);

    if (entries.length === 0) {
      Ui960Kit.panel(this, 510, 126, 412, 300, { alt: true });
      Ui960Kit.label(this, 716, 245, 'Aún no hay Ecos en reserva.', UI960_FONT.small, UI.text.secondary).setOrigin(0.5);
    } else {
      entries.forEach((champion, localIndex) => {
        const absoluteIndex = start + localIndex;
        const col = localIndex % 2;
        const row = Math.floor(localIndex / 2);
        this.createStorageCard(champion, absoluteIndex, 510 + col * 208, 126 + row * 78);
      });
    }

    if (pageCount > 1) {
      Ui960Kit.button(this, 575, 455, 96, 36, '◀', () => {
        this.scene.restart({ page: Math.max(0, this.storagePage - 1) });
      }, { disabled: this.storagePage === 0, fontSize: UI960_FONT.small });
      Ui960Kit.label(this, 716, 446, `${this.storagePage + 1} / ${pageCount}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(0.5, 0);
      Ui960Kit.button(this, 857, 455, 96, 36, '▶', () => {
        this.scene.restart({ page: Math.min(pageCount - 1, this.storagePage + 1) });
      }, { disabled: this.storagePage >= pageCount - 1, fontSize: UI960_FONT.small });
    }

    this.statusText = Ui960Kit.label(
      this,
      40,
      462,
      this.selectionMessage(),
      '12px',
      UI.text.secondary,
      true
    ).setWordWrapWidth(475, true);

    Ui960Kit.button(this, 590, 505, 150, 42, 'MOVER', () => this.moveSelected(), {
      disabled: !this.selection,
      selected: Boolean(this.selection),
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 760, 505, 150, 42, 'LIMPIAR', () => {
      this.scene.restart({ page: this.storagePage });
    }, {
      disabled: !this.selection,
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 900, 505, 100, 42, 'VOLVER', () => this.scene.start('TeamScene'), {
      fontSize: UI960_FONT.small
    });

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('TeamScene'));
  }

  private createPartyRow(index: number, x: number, y: number): void {
    const champion = this.save.party[index];
    const selected = this.selection?.source === 'party' && this.selection.index === index;
    const panel = this.add.rectangle(x, y, 420, 54, UI.colors.panel, 0.96)
      .setOrigin(0)
      .setStrokeStyle(selected ? 3 : 1, selected ? UI.colors.gold : UI.colors.borderSoft, 1)
      .setInteractive({ useHandCursor: true });

    if (!champion) {
      Ui960Kit.label(this, x + 18, y + 17, `RANURA ${index + 1} · VACÍA`, '13px', UI.text.muted, true);
      panel.on(Phaser.Input.Events.POINTER_UP, () => this.handleSlotTap('party', index));
      return;
    }

    this.addChampionVisual(champion, x + 31, y + 47, 42);
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    Ui960Kit.label(this, x + 64, y + 8, definition.name.toUpperCase(), '14px', UI.text.primary, true);
    Ui960Kit.label(this, x + 390, y + 8, `M${champion.mastery}`, '12px', UI.text.gold, true).setOrigin(1, 0);
    const affinities = definition.affinityIds ?? [];
    if (affinities.length > 0) {
      TypeBadge.row(this, x + 188, y + 32, affinities.slice(0, 2), { width: 66, height: 16, iconSize: 10, fontSize: '7px', gap: 3 });
    }
    Ui960Kit.label(this, x + 64, y + 32, `VID ${champion.currentHp}/${stats.hp}`, '10px', UI.text.secondary);
    if (index === 0) Ui960Kit.label(this, x + 390, y + 31, 'LÍDER', '10px', UI.text.gold, true).setOrigin(1, 0);

    panel.on(Phaser.Input.Events.POINTER_UP, () => this.handleSlotTap('party', index));
  }

  private createStorageCard(champion: ChampionInstance, index: number, x: number, y: number): void {
    const selected = this.selection?.source === 'storage' && this.selection.index === index;
    const panel = this.add.rectangle(x, y, 196, 68, UI.colors.panelAlt, 0.97)
      .setOrigin(0)
      .setStrokeStyle(selected ? 3 : 1, selected ? UI.colors.gold : UI.colors.borderSoft, 1)
      .setInteractive({ useHandCursor: true });

    this.addChampionVisual(champion, x + 30, y + 59, 46);
    Ui960Kit.label(this, x + 60, y + 10, DataRegistry.champion(champion.championId).name.toUpperCase(), '12px', UI.text.primary, true)
      .setWordWrapWidth(105, true);
    Ui960Kit.label(this, x + 180, y + 10, `M${champion.mastery}`, '11px', UI.text.gold, true).setOrigin(1, 0);
    const definition = DataRegistry.champion(champion.championId);
    const affinities = definition.affinityIds ?? [];
    if (affinities.length > 0) {
      TypeBadge.row(this, x + 60, y + 34, affinities.slice(0, 2), { width: 55, height: 14, iconSize: 9, fontSize: '6px', gap: 3 });
    }
    const stats = BattleEngine.statsFor(champion);
    Ui960Kit.label(this, x + 60, y + 52, `${champion.currentHp}/${stats.hp} VID`, '8px', UI.text.secondary);

    panel.on(Phaser.Input.Events.POINTER_UP, () => this.handleSlotTap('storage', index));
  }

  private handleSlotTap(source: ReserveSource, index: number): void {
    if (source === 'party' && index >= this.save.party.length) {
      if (this.selection?.source === 'storage' && this.save.party.length < 5) {
        const champion = this.save.storage.splice(this.selection.index, 1)[0];
        if (champion) this.save.party.push(champion);
        this.persistAndRestart();
      }
      return;
    }

    if (!this.selection) {
      this.scene.restart({ selection: { source, index }, page: this.storagePage });
      return;
    }

    if (this.selection.source === source) {
      const same = this.selection.index === index;
      this.scene.restart({ selection: same ? undefined : { source, index }, page: this.storagePage });
      return;
    }

    const partyIndex = source === 'party' ? index : this.selection.index;
    const storageIndex = source === 'storage' ? index : this.selection.index;
    const partyChampion = this.save.party[partyIndex];
    const storageChampion = this.save.storage[storageIndex];
    if (!partyChampion || !storageChampion) return;

    this.save.party[partyIndex] = storageChampion;
    this.save.storage[storageIndex] = partyChampion;
    this.persistAndRestart();
  }

  private moveSelected(): void {
    if (!this.selection) return;

    if (this.selection.source === 'party') {
      if (this.save.party.length <= 1) {
        this.statusText.setText('Debe quedar al menos un Eco en el equipo activo.');
        return;
      }
      const champion = this.save.party.splice(this.selection.index, 1)[0];
      if (champion) this.save.storage.push(champion);
      this.persistAndRestart();
      return;
    }

    if (this.save.party.length >= 5) {
      this.statusText.setText('El equipo está completo. Selecciona un Eco activo para intercambiarlo con el de reserva.');
      return;
    }

    const champion = this.save.storage.splice(this.selection.index, 1)[0];
    if (champion) this.save.party.push(champion);
    this.persistAndRestart();
  }

  private persistAndRestart(): void {
    SaveService.save(this.save);
    this.registry.set('save', this.save);
    const pageCount = Math.max(1, Math.ceil(this.save.storage.length / 8));
    this.scene.restart({ page: Math.min(this.storagePage, pageCount - 1) });
  }

  private selectionMessage(): string {
    if (!this.selection) return 'Selecciona un Eco. Puedes moverlo o tocar uno del otro lado para intercambiarlos.';
    const champion = this.selection.source === 'party'
      ? this.save.party[this.selection.index]
      : this.save.storage[this.selection.index];
    if (!champion) return 'Selecciona un Eco.';
    const name = DataRegistry.champion(champion.championId).name;
    return this.selection.source === 'party'
      ? `${name} seleccionado. MOVER lo envía a reserva; toca un Eco reservado para intercambiarlos.`
      : `${name} seleccionado. MOVER lo añade si hay hueco; toca un Eco activo para intercambiarlos.`;
  }

  private addChampionVisual(champion: ChampionInstance, x: number, groundY: number, size: number): void {
    const portrait = `${champion.championId}-portrait`;
    if (this.textures.exists(portrait)) {
      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(size, size);
      return;
    }
    const front = `${champion.championId}-battle-front`;
    if (this.textures.exists(front)) {
      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(size, size);
    }
  }
}
