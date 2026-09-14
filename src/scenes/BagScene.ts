import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ItemCategory, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { UI } from '../ui/theme/UiTheme';
import { UiKit } from '../ui/components/UiKit';

type SortMode = 'name' | 'quantity';

const CATEGORIES: Array<{ id: ItemCategory; label: string; icon: string }> = [
  { id: 'consumable', label: 'CONSUMIBLES', icon: '◉' },
  { id: 'equipment', label: 'EQUIPO', icon: '▰' },
  { id: 'runic', label: 'RÚNICOS', icon: '◇' },
  { id: 'material', label: 'MATERIALES', icon: '◆' },
  { id: 'key', label: 'CLAVES', icon: '⌘' }
];

export class BagScene extends Phaser.Scene {
  private save!: SaveGame;
  private category: ItemCategory = 'equipment';
  private sortMode: SortMode = 'name';
  private selectedItemId: string | null = null;

  constructor() {
    super('BagScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.category = (this.registry.get('bag.category') as ItemCategory | undefined) ?? 'equipment';
    this.sortMode = (this.registry.get('bag.sort') as SortMode | undefined) ?? 'name';
    this.selectedItemId = (this.registry.get('bag.selected') as string | undefined) ?? null;

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x46666f).setAlpha(0.36);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.58).setOrigin(0, 0);

    UiKit.framedPanel(this, 6, 6, 500, 276);
    this.drawHeader();
    this.drawCategories();
    const visibleItems = this.itemsForCategory();
    this.ensureSelectedItem(visibleItems);
    this.drawInventory(visibleItems);
    this.drawDetails(visibleItems);
    this.drawFooter();
  }

  private drawHeader(): void {
    this.add.rectangle(10, 10, 492, 34, UI.colors.panelRaised, 1).setOrigin(0, 0);
    UiKit.label(this, 24, 14, 'BOLSA', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 24, 32, 'ECOS DE RUNATERRA', UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 488, 15, 'BANDLE CITY', UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
    UiKit.runeDivider(this, 252, 39, 126);
  }

  private drawCategories(): void {
    UiKit.framedPanel(this, 12, 50, 116, 198);
    CATEGORIES.forEach((category, index) => {
      const y = 60 + index * 36;
      const selected = category.id === this.category;
      const box = this.add.rectangle(70, y + 14, 104, 30, selected ? 0x124e66 : UI.colors.panelAlt, 1)
        .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      UiKit.label(this, 28, y + 6, category.icon, UI.font.heading, selected ? UI.text.gold : UI.text.accent, true).setOrigin(0.5, 0);
      UiKit.label(this, 44, y + 7, category.label, UI.font.small, selected ? UI.text.primary : UI.text.secondary, true);

      box.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('bag.category', category.id);
        this.registry.remove('bag.selected');
        this.scene.restart();
      });
    });
  }

  private drawInventory(items: Array<{ definition: ItemDefinition; quantity: number }>): void {
    UiKit.framedPanel(this, 134, 50, 236, 198);
    UiKit.label(this, 146, 57, 'INVENTARIO', UI.font.heading, UI.text.primary, true);
    UiKit.label(this, 358, 58, `${items.length} tipos`, UI.font.tiny, UI.text.secondary).setOrigin(1, 0);
    UiKit.runeDivider(this, 252, 76, 180);

    if (items.length === 0) {
      UiKit.label(this, 252, 136, 'No hay objetos\nen esta categoría.', UI.font.body, UI.text.muted, true)
        .setOrigin(0.5)
        .setAlign('center');
      return;
    }

    const cellWidth = 68;
    const cellHeight = 64;
    items.slice(0, 9).forEach((entry, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 144 + col * 72;
      const y = 84 + row * 68;
      const selected = entry.definition.id === this.selectedItemId;
      const card = this.add.rectangle(x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight, selected ? 0x123e55 : UI.colors.panelAlt, 1)
        .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });

      this.add.rectangle(x + 34, y + 22, 34, 34, 0x0a2031, 1).setStrokeStyle(1, selected ? UI.colors.gold : UI.colors.cyanGlow);
      const textureKey = this.itemTextureKey(entry.definition);
      if (textureKey) {
        this.add.image(x + 34, y + 22, textureKey).setDisplaySize(32, 32);
      } else {
        UiKit.label(this, x + 34, y + 13, this.itemGlyph(entry.definition), UI.font.heading, selected ? UI.text.gold : UI.text.accent, true).setOrigin(0.5, 0);
      }
      UiKit.label(this, x + 34, y + 41, this.shortName(entry.definition.name), UI.font.tiny, UI.text.primary, true).setOrigin(0.5, 0).setAlign('center');
      UiKit.label(this, x + 61, y + 5, `×${entry.quantity}`, UI.font.tiny, UI.text.secondary, true).setOrigin(1, 0);

      card.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('bag.selected', entry.definition.id);
        this.scene.restart();
      });
    });
  }

  private drawDetails(items: Array<{ definition: ItemDefinition; quantity: number }>): void {
    UiKit.framedPanel(this, 376, 50, 124, 198);
    UiKit.label(this, 388, 57, 'DETALLES', UI.font.heading, UI.text.primary, true);
    UiKit.runeDivider(this, 438, 76, 88);

    const selected = items.find((entry) => entry.definition.id === this.selectedItemId) ?? items[0];
    if (!selected) {
      UiKit.label(this, 438, 128, 'Selecciona\nuna categoría.', UI.font.small, UI.text.muted, true)
        .setOrigin(0.5)
        .setAlign('center');
      this.drawDetailActions(null);
      return;
    }

    const { definition, quantity } = selected;
    this.add.rectangle(438, 101, 52, 52, 0x091d2c, 1).setStrokeStyle(2, UI.colors.cyanGlow);
    const textureKey = this.itemTextureKey(definition);
    if (textureKey) {
      this.add.image(438, 101, textureKey).setDisplaySize(46, 46);
    } else {
      UiKit.label(this, 438, 88, this.itemGlyph(definition), '20px', UI.text.accent, true).setOrigin(0.5, 0);
    }
    UiKit.label(this, 438, 130, definition.name, UI.font.body, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(108, true).setAlign('center');
    UiKit.label(this, 388, 157, `Cantidad: ${quantity}`, UI.font.small, UI.text.secondary, true);
    UiKit.label(this, 388, 172, this.categoryLabel(definition.category ?? 'equipment'), UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 388, 187, definition.description ?? 'Objeto de inventario.', UI.font.tiny, UI.text.secondary)
      .setWordWrapWidth(100, true)
      .setLineSpacing(1);
    UiKit.label(this, 388, 220, this.formatBonuses(definition.statBonuses), UI.font.tiny, UI.text.gold, true)
      .setWordWrapWidth(100, true);

    this.drawDetailActions(definition);
  }

  private drawDetailActions(item: ItemDefinition | null): void {
    const isEquipment = (item?.category ?? 'equipment') === 'equipment';
    UiKit.button(this, 417, 235, 72, 20, isEquipment ? 'VER BUILD' : 'USAR', () => {
      if (isEquipment) this.scene.start('TeamScene');
    }, { accent: item ? 'gold' : 'neutral', disabled: !item, fontSize: UI.font.tiny });

    UiKit.button(this, 476, 235, 42, 20, this.sortMode === 'name' ? 'A→Z' : '×#', () => {
      this.registry.set('bag.sort', this.sortMode === 'name' ? 'quantity' : 'name');
      this.scene.restart();
    }, { accent: 'blue', fontSize: UI.font.tiny });
  }

  private drawFooter(): void {
    UiKit.runeDivider(this, 256, 256, 454);
    UiKit.label(this, 18, 263, `Oro ${this.save.gold} · Orden: ${this.sortMode === 'name' ? 'Nombre' : 'Cantidad'}`, UI.font.tiny, UI.text.secondary, true);
    UiKit.button(this, 465, 268, 66, 22, 'ATRÁS', () => this.scene.start('MenuScene'), {
      accent: 'blue',
      fontSize: UI.font.small
    });
  }

  private itemsForCategory(): Array<{ definition: ItemDefinition; quantity: number }> {
    const entries = Object.entries(this.save.inventory)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ definition: DataRegistry.item(itemId), quantity }))
      .filter(({ definition }) => (definition.category ?? 'equipment') === this.category);

    entries.sort((a, b) => {
      if (this.sortMode === 'quantity') return b.quantity - a.quantity || a.definition.name.localeCompare(b.definition.name);
      return a.definition.name.localeCompare(b.definition.name);
    });
    return entries;
  }

  private ensureSelectedItem(items: Array<{ definition: ItemDefinition; quantity: number }>): void {
    if (items.length === 0) {
      this.selectedItemId = null;
      return;
    }
    if (!items.some((entry) => entry.definition.id === this.selectedItemId)) {
      this.selectedItemId = items[0].definition.id;
      this.registry.set('bag.selected', this.selectedItemId);
    }
  }

  private itemTextureKey(item: ItemDefinition): string | null {
    if (item.id === 'amplifying-tome') return 'item-amplifying-tome';
    if (item.id === 'sapphire-crystal') return 'item-sapphire-crystal';
    if (item.id === 'dagger') return 'item-dagger';
    return null;
  }

  private itemGlyph(item: ItemDefinition): string {
    if (item.id === 'long-sword') return '†';
    if (item.id === 'ruby-crystal') return '◆';
    if (item.id === 'amplifying-tome') return '▤';
    return '◇';
  }

  private shortName(name: string): string {
    if (name.length <= 12) return name;
    const words = name.split(' ');
    if (words.length > 1) return `${words[0]}\n${words.slice(1).join(' ')}`;
    return `${name.slice(0, 10)}…`;
  }

  private categoryLabel(category: ItemCategory): string {
    return CATEGORIES.find((entry) => entry.id === category)?.label ?? category.toUpperCase();
  }

  private formatBonuses(bonuses: Partial<StatBlock>): string {
    const labels = Object.entries(bonuses)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => `${DataRegistry.stat(key as keyof StatBlock).short} +${value}`);
    return labels.length > 0 ? labels.join(' · ') : 'Sin bonificaciones';
  }
}
