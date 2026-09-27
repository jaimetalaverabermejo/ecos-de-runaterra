import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BuildService } from '../systems/build/BuildService';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { InventoryService } from '../systems/inventory/InventoryService';
import { SaveService } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { drawItemIcon } from '../ui/items/ItemIcon';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';

interface BuildSceneData {
  partyIndex?: number;
}

const PAGE_SIZE = 6;

export class BuildScene extends Phaser.Scene {
  private save!: SaveGame;
  private champion!: ChampionInstance;
  private partyIndex = 0;
  private selectedItemId: string | null = null;
  private page = 0;

  constructor() {
    super('BuildScene');
  }

  init(data: BuildSceneData): void {
    this.partyIndex = data.partyIndex ?? 0;
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    const champion = this.save.party[this.partyIndex];
    if (!champion) {
      this.scene.start('TeamScene');
      return;
    }
    this.champion = champion;

    const items = this.availableItems();
    const maxPage = Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1);
    this.page = Phaser.Math.Clamp((this.registry.get('build.page') as number | undefined) ?? 0, 0, maxPage);
    const requested = this.registry.get('build.selected') as string | undefined;
    this.selectedItemId = requested && items.some((item) => item.id === requested)
      ? requested
      : items[this.page * PAGE_SIZE]?.id ?? null;

    Ui960Kit.backdrop(this, 'bandle-bg', 0x47636c, 0.28, 0.72);
    this.drawHeader();
    this.drawEquipped();
    this.drawInventory(items);
    this.drawFooter();
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    const items = this.availableItems();
    if ((direction === 'up' || direction === 'down') && items.length > 0) {
      const pageItems = items.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
      const current = Math.max(0, pageItems.findIndex((item) => item.id === this.selectedItemId));
      const delta = direction === 'up' ? -1 : 1;
      const next = pageItems[Phaser.Math.Wrap(current + delta, 0, pageItems.length)];
      this.registry.set('build.selected', next.id);
      this.scene.restart({ partyIndex: this.partyIndex });
      return;
    }
    if (direction === 'left' || direction === 'right') {
      this.changePage(direction === 'left' ? -1 : 1);
      return;
    }
    if (ConsoleInput.consumeA()) this.equipSelected();
    if (ConsoleInput.consumeB()) this.scene.start('ChampionDetailScene', { partyIndex: this.partyIndex });
  }

  private drawHeader(): void {
    const definition = DataRegistry.champion(this.champion.championId);
    const stats = BattleEngine.statsFor(this.champion);
    Ui960Kit.header(this, `${definition.name.toUpperCase()} · BUILD`, `${this.champion.equippedItems.length}/${BuildService.MAX_SLOTS} OBJETOS EQUIPADOS`, `VID ${this.champion.currentHp}/${stats.hp}`);
    Ui960Kit.label(this, 910, 68, `ATQ ${stats.attack} · POD ${stats.power} · DEF ${stats.defense} · RES ${stats.resistance} · VEL ${stats.speed}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);
  }

  private drawEquipped(): void {
    Ui960Kit.panel(this, 34, 112, 300, 342, { alpha: 0.96 });
    Ui960Kit.label(this, 56, 130, 'BUILD ACTUAL', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.label(this, 56, 163, 'Toca un objeto para desequiparlo.', UI960_FONT.tiny, UI.text.muted);
    Ui960Kit.separator(this, 184, 188, 250);

    const slotXs = [92, 184, 276];
    for (let i = 0; i < BuildService.MAX_SLOTS; i += 1) {
      const x = slotXs[i];
      const itemId = this.champion.equippedItems[i];
      const slot = Ui960Kit.slot(this, x, 240, 72, Boolean(itemId));

      if (!itemId) {
        Ui960Kit.label(this, x, 220, `HUECO ${i + 1}`, UI960_FONT.tiny, UI.text.muted, true).setOrigin(0.5, 0);
        Ui960Kit.label(this, x, 250, 'VACÍO', UI960_FONT.tiny, UI.text.secondary, true).setOrigin(0.5, 0);
        continue;
      }

      const item = DataRegistry.item(itemId);
      drawItemIcon(this, item, x, 232, 52, true);
      Ui960Kit.label(this, x, 278, this.shortName(item.name), UI960_FONT.tiny, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(84, true).setAlign('center');
      slot.setInteractive({ useHandCursor: true });
      slot.on(Phaser.Input.Events.POINTER_UP, () => this.unequip(i));
    }

    Ui960Kit.separator(this, 184, 326, 250);
    const bonuses = this.totalBuildBonuses();
    Ui960Kit.label(this, 56, 347, 'BONUS TOTAL', UI960_FONT.small, UI.text.accent, true);
    Ui960Kit.label(this, 56, 382, this.formatBonuses(bonuses) || 'Sin bonificaciones.', UI960_FONT.small, this.champion.equippedItems.length ? UI.text.gold : UI.text.muted, true)
      .setWordWrapWidth(250, true);
  }

  private drawInventory(items: ItemDefinition[]): void {
    Ui960Kit.panel(this, 350, 112, 576, 342, { alpha: 0.96 });
    Ui960Kit.label(this, 372, 130, 'EQUIPO EN BOLSA', UI960_FONT.heading, UI.text.primary, true);
    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    Ui960Kit.label(this, 842, 135, `${this.page + 1}/${pageCount}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);
    if (pageCount > 1) {
      Ui960Kit.button(this, 866, 146, 42, 30, '‹', () => this.changePage(-1), { fontSize: UI960_FONT.small });
      Ui960Kit.button(this, 910, 146, 42, 30, '›', () => this.changePage(1), { fontSize: UI960_FONT.small });
    }
    Ui960Kit.separator(this, 638, 178, 520);

    if (items.length === 0) {
      Ui960Kit.label(this, 638, 288, 'No tienes objetos de Equipo\ndisponibles en la Bolsa.', UI960_FONT.body, UI.text.muted, true).setOrigin(0.5).setAlign('center');
      return;
    }

    const pageItems = items.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
    pageItems.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 378 + col * 266;
      const y = 198 + row * 82;
      const selected = item.id === this.selectedItemId;
      const card = Ui960Kit.panel(this, x, y, 246, 70, { selected, alt: true, alpha: 0.94 });
      card.setInteractive({ useHandCursor: true });
      drawItemIcon(this, item, x + 42, y + 35, 50, selected);
      Ui960Kit.label(this, x + 78, y + 10, this.shortName(item.name), UI960_FONT.small, UI.text.primary, true).setWordWrapWidth(126, true);
      Ui960Kit.label(this, x + 78, y + 39, this.formatBonuses(item.statBonuses) || 'Sin bonus', UI960_FONT.tiny, UI.text.accent, true);
      Ui960Kit.label(this, x + 228, y + 42, `×${InventoryService.quantity(this.save, item.id)}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);
      card.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('build.selected', item.id);
        this.scene.restart({ partyIndex: this.partyIndex });
      });
    });
  }

  private drawFooter(): void {
    Ui960Kit.separator(this, 480, 478, 870);
    const status = this.registry.get('build.status') as string | undefined;
    if (status) this.registry.remove('build.status');

    const selected = this.selectedItemId ? DataRegistry.item(this.selectedItemId) : null;
    const defaultText = selected
      ? `${selected.name}: ${this.formatBonuses(selected.statBonuses) || 'sin bonificación directa'}`
      : 'Compra o fabrica objetos para añadirlos a una build.';
    Ui960Kit.label(this, 44, 497, status ?? defaultText, UI960_FONT.tiny, status ? UI.text.gold : UI.text.secondary, true).setWordWrapWidth(560, true);

    Ui960Kit.button(this, 740, 505, 150, 40, 'EQUIPAR', () => this.equipSelected(), {
      selected: Boolean(this.selectedItemId && BuildService.canEquip(this.save, this.champion, this.selectedItemId)),
      disabled: !this.selectedItemId || !BuildService.canEquip(this.save, this.champion, this.selectedItemId),
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 874, 505, 110, 40, 'ATRÁS', () => this.scene.start('ChampionDetailScene', { partyIndex: this.partyIndex }), { fontSize: UI960_FONT.small });
  }

  private availableItems(): ItemDefinition[] {
    const tierOrder: Record<string, number> = { legendary: 0, epic: 1, component: 2 };
    return DataRegistry.items()
      .filter((item) => (item.category === undefined || item.category === 'equipment') && InventoryService.quantity(this.save, item.id) > 0)
      .sort((a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9) || a.name.localeCompare(b.name));
  }

  private equipSelected(): void {
    if (!this.selectedItemId) return;
    const result = BuildService.equip(this.save, this.champion, this.selectedItemId);
    if (result.ok) SaveService.save(this.save);
    this.registry.set('build.status', result.message);
    if (result.ok && !InventoryService.has(this.save, this.selectedItemId)) this.registry.remove('build.selected');
    this.scene.restart({ partyIndex: this.partyIndex });
  }

  private unequip(slotIndex: number): void {
    const result = BuildService.unequip(this.save, this.champion, slotIndex);
    if (result.ok) SaveService.save(this.save);
    this.registry.set('build.status', result.message);
    this.scene.restart({ partyIndex: this.partyIndex });
  }

  private changePage(delta: number): void {
    const items = this.availableItems();
    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    this.page = Phaser.Math.Wrap(this.page + delta, 0, pageCount);
    this.registry.set('build.page', this.page);
    this.registry.remove('build.selected');
    this.scene.restart({ partyIndex: this.partyIndex });
  }

  private totalBuildBonuses(): Partial<StatBlock> {
    const total: Partial<StatBlock> = {};
    for (const itemId of this.champion.equippedItems) {
      const item = DataRegistry.item(itemId);
      for (const [key, value] of Object.entries(item.statBonuses)) {
        if (typeof value !== 'number') continue;
        const stat = key as keyof StatBlock;
        total[stat] = (total[stat] ?? 0) + value;
      }
    }
    return total;
  }

  private formatBonuses(bonuses: Partial<StatBlock>): string {
    return Object.entries(bonuses)
      .filter(([, value]) => typeof value === 'number' && value !== 0)
      .map(([key, value]) => `${DataRegistry.stat(key as keyof StatBlock).short}+${value}`)
      .join(' · ');
  }

  private shortName(name: string): string {
    return name.length <= 20 ? name : `${name.slice(0, 18)}…`;
  }
}
