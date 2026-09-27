import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ItemCategory, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { UI } from '../ui/theme/UiTheme';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { ConsoleInput } from '../input/ConsoleInput';

type SortMode = 'name' | 'quantity';
type BagCategory = Exclude<ItemCategory, 'runic'> | 'runes';

const RUNE_SLOT_COUNT = 12;
const CATEGORIES: Array<{ id: BagCategory; label: string; icon: string }> = [
  { id: 'consumable', label: 'CONSUMIBLES', icon: '◉' },
  { id: 'equipment', label: 'EQUIPO', icon: '▰' },
  { id: 'material', label: 'MATERIALES', icon: '◆' },
  { id: 'key', label: 'CLAVES', icon: '⌘' },
  { id: 'runes', label: 'RUNAS', icon: '◇' }
];

export class BagScene extends Phaser.Scene {
  private save!: SaveGame;
  private category: BagCategory = 'equipment';
  private sortMode: SortMode = 'name';
  private selectedItemId: string | null = null;

  constructor() {
    super('BagScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    const storedCategory = this.registry.get('bag.category') as string | undefined;
    this.category = storedCategory === 'runic' ? 'runes' : (storedCategory as BagCategory | undefined) ?? 'equipment';
    this.sortMode = (this.registry.get('bag.sort') as SortMode | undefined) ?? 'name';
    this.selectedItemId = (this.registry.get('bag.selected') as string | undefined) ?? null;

    Ui960Kit.backdrop(this, 'bandle-bg', 0x46666f, 0.28, 0.7);
    Ui960Kit.header(this, 'BOLSA', 'ECOS DE RUNATERRA', 'BANDLE CITY');
    this.drawCategories();

    if (this.category === 'runes') {
      this.drawRuneCollection();
      this.drawRuneDetails();
    } else {
      const visibleItems = this.itemsForCategory();
      this.ensureSelectedItem(visibleItems);
      this.drawInventory(visibleItems);
      this.drawDetails(visibleItems);
    }
    this.drawFooter();
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    if (direction === 'left' || direction === 'right') {
      const current = Math.max(0, CATEGORIES.findIndex((entry) => entry.id === this.category));
      const delta = direction === 'left' ? -1 : 1;
      const next = CATEGORIES[Phaser.Math.Wrap(current + delta, 0, CATEGORIES.length)];
      this.registry.set('bag.category', next.id);
      this.registry.remove('bag.selected');
      this.scene.restart();
      return;
    }

    if ((direction === 'up' || direction === 'down') && this.category !== 'runes') {
      const items = this.itemsForCategory();
      if (items.length > 0) {
        const current = Math.max(0, items.findIndex((entry) => entry.definition.id === this.selectedItemId));
        const delta = direction === 'up' ? -1 : 1;
        const next = items[Phaser.Math.Wrap(current + delta, 0, items.length)];
        this.registry.set('bag.selected', next.definition.id);
        this.scene.restart();
        return;
      }
    }

    if (ConsoleInput.consumeA()) {
      if (this.category === 'equipment' && this.selectedItemId) this.scene.start('TeamScene');
    }
    if (ConsoleInput.consumeB()) this.scene.start('MenuScene');
  }

  private drawCategories(): void {
    CATEGORIES.forEach((category, index) => {
      const y = 132 + index * 72;
      const selected = category.id === this.category;
      const button = Ui960Kit.textureButton(this, 129, y, 210, 60, '', () => {
        this.registry.set('bag.category', category.id);
        this.registry.remove('bag.selected');
        this.scene.restart();
      }, {
        selected,
        normalTexture: 'ui960a-bag-category',
        selectedTexture: 'ui960a-bag-category-selected',
        fontSize: UI960_FONT.small
      });
      Ui960Kit.label(this, 52, y - 11, category.icon, UI960_FONT.heading, selected ? UI.text.gold : UI.text.accent, true).setDepth(button.button.depth + 1);
      Ui960Kit.label(this, 78, y - 9, category.label, UI960_FONT.small, selected ? UI.text.primary : UI.text.secondary, true).setDepth(button.button.depth + 1);
    });
  }

  private drawInventory(items: Array<{ definition: ItemDefinition; quantity: number }>): void {
    Ui960Kit.label(this, 252, 96, 'INVENTARIO', UI960_FONT.small, UI.text.gold, true);
    Ui960Kit.label(this, 500, 99, `${items.length} tipos`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);

    if (items.length === 0) {
      Ui960Kit.label(this, 375, 268, 'No hay objetos\nen esta categoría.', UI960_FONT.body, UI.text.muted, true)
        .setOrigin(0.5)
        .setAlign('center');
      return;
    }

    items.slice(0, 4).forEach((entry, index) => {
      const y = 164 + index * 80;
      const selected = entry.definition.id === this.selectedItemId;
      const row = Ui960Kit.textureButton(this, 375, y, 250, 72, '', () => {
        this.registry.set('bag.selected', entry.definition.id);
        this.scene.restart();
      }, {
        selected,
        normalTexture: 'ui960a-bag-item-row',
        selectedTexture: 'ui960a-bag-item-row-selected',
        fontSize: UI960_FONT.small
      });

      this.add.image(286, y, selected ? 'ui960a-item-frame-thin-selected' : 'ui960a-item-frame-thin')
        .setDisplaySize(54, 54)
        .setDepth(row.button.depth + 1);

      const textureKey = this.itemTextureKey(entry.definition);
      if (textureKey) {
        this.add.image(286, y, textureKey).setDisplaySize(44, 44).setDepth(row.button.depth + 2);
      } else {
        Ui960Kit.label(this, 286, y - 14, this.itemGlyph(entry.definition), UI960_FONT.heading, selected ? UI.text.gold : UI.text.accent, true)
          .setOrigin(0.5, 0)
          .setDepth(row.button.depth + 2);
      }

      Ui960Kit.label(this, 320, y - 17, entry.definition.name, UI960_FONT.small, UI.text.primary, true)
        .setWordWrapWidth(124, true)
        .setDepth(row.button.depth + 2);
      Ui960Kit.label(this, 486, y - 10, `×${entry.quantity}`, UI960_FONT.tiny, UI.text.secondary, true)
        .setOrigin(1, 0)
        .setDepth(row.button.depth + 2);
    });

    if (items.length > 4) {
      Ui960Kit.label(this, 500, 455, `+${items.length - 4} más`, UI960_FONT.tiny, UI.text.muted, true).setOrigin(1, 0);
    }
  }

  private drawDetails(items: Array<{ definition: ItemDefinition; quantity: number }>): void {
    Ui960Kit.frame(this, 'ui960a-panel-content-medium', 516, 112, 420, 300);
    Ui960Kit.label(this, 540, 128, 'DETALLES', UI960_FONT.heading, UI.text.primary, true);

    const selected = items.find((entry) => entry.definition.id === this.selectedItemId) ?? items[0];
    if (!selected) {
      Ui960Kit.label(this, 726, 260, 'Selecciona\nuna categoría.', UI960_FONT.body, UI.text.muted, true).setOrigin(0.5).setAlign('center');
      this.drawDetailActions(null);
      return;
    }

    const { definition, quantity } = selected;
    this.add.image(584, 206, 'ui960a-bag-detail-frame').setDisplaySize(112, 112);
    const textureKey = this.itemTextureKey(definition);
    if (textureKey) this.add.image(584, 206, textureKey).setDisplaySize(86, 86);
    else Ui960Kit.label(this, 584, 177, this.itemGlyph(definition), '38px', UI.text.accent, true).setOrigin(0.5, 0);

    Ui960Kit.label(this, 656, 157, definition.name, UI960_FONT.body, UI.text.primary, true).setWordWrapWidth(242, true);
    Ui960Kit.label(this, 656, 205, `Cantidad: ${quantity}`, UI960_FONT.small, UI.text.secondary, true);
    Ui960Kit.label(this, 656, 231, this.categoryLabel(definition.category ?? 'equipment'), UI960_FONT.tiny, UI.text.accent, true);
    Ui960Kit.separator(this, 726, 263, 330);
    Ui960Kit.label(this, 542, 279, definition.description ?? 'Objeto de inventario.', UI960_FONT.tiny, UI.text.secondary)
      .setWordWrapWidth(360, true)
      .setLineSpacing(3);
    Ui960Kit.label(this, 542, 344, this.formatBonuses(definition.statBonuses), UI960_FONT.tiny, UI.text.gold, true)
      .setWordWrapWidth(360, true);

    this.drawDetailActions(definition);
  }

  private drawRuneCollection(): void {
    Ui960Kit.label(this, 252, 96, 'COLECCIÓN DE RUNAS', UI960_FONT.small, UI.text.gold, true);
    for (let index = 0; index < RUNE_SLOT_COUNT; index += 1) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 286 + col * 88;
      const y = 164 + row * 82;
      const runeId = this.save.runes.unlockedIds[index];
      const unlocked = Boolean(runeId);
      this.add.image(x, y, unlocked ? 'ui960a-item-frame-thin-selected' : 'ui960a-item-frame-thin').setDisplaySize(64, 64);
      Ui960Kit.label(this, x, y - 18, unlocked ? '◇' : '?', UI960_FONT.heading, unlocked ? UI.text.gold : UI.text.muted, true).setOrigin(0.5, 0);
      Ui960Kit.label(this, x, y + 16, unlocked ? this.shortRuneName(runeId) : '???', '10px', unlocked ? UI.text.primary : UI.text.muted, true).setOrigin(0.5, 0);
    }
  }

  private drawRuneDetails(): void {
    Ui960Kit.frame(this, 'ui960a-panel-content-medium', 516, 112, 420, 300);
    Ui960Kit.label(this, 540, 128, 'RUNAS', UI960_FONT.heading, UI.text.primary, true);
    this.add.image(584, 206, 'ui960a-bag-detail-frame').setDisplaySize(112, 112);
    Ui960Kit.label(this, 584, 171, '◇', '54px', UI.text.accent, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 656, 167, 'COLECCIÓN RÚNICA', UI960_FONT.body, UI.text.primary, true);
    Ui960Kit.label(this, 656, 208, `${this.save.runes.unlockedIds.length}/${RUNE_SLOT_COUNT} descubiertas`, UI960_FONT.small, UI.text.gold, true);
    Ui960Kit.separator(this, 726, 263, 330);
    Ui960Kit.label(this, 542, 285, 'Las runas no son objetos consumibles. Se equipan desde la ficha de cada Eco.', UI960_FONT.small, UI.text.secondary)
      .setWordWrapWidth(350, true);
  }

  private drawDetailActions(item: ItemDefinition | null): void {
    const isEquipment = (item?.category ?? 'equipment') === 'equipment';
    Ui960Kit.button(this, 756, 389, 150, 40, isEquipment ? 'VER BUILD' : 'USAR', () => {
      if (isEquipment) this.scene.start('TeamScene');
    }, { selected: Boolean(item), disabled: !item, fontSize: UI960_FONT.tiny });

    Ui960Kit.button(this, 890, 389, 86, 40, this.sortMode === 'name' ? 'A→Z' : '×#', () => {
      this.registry.set('bag.sort', this.sortMode === 'name' ? 'quantity' : 'name');
      this.scene.restart();
    }, { fontSize: UI960_FONT.tiny });
  }

  private drawFooter(): void {
    Ui960Kit.separator(this, 480, 474, 870);
    const footer = this.category === 'runes'
      ? `Oro ${this.save.gold} · Runas descubiertas: ${this.save.runes.unlockedIds.length}`
      : `Oro ${this.save.gold} · Orden: ${this.sortMode === 'name' ? 'Nombre' : 'Cantidad'}`;
    Ui960Kit.label(this, 44, 497, footer, UI960_FONT.tiny, UI.text.secondary, true);
    Ui960Kit.button(this, 866, 505, 126, 40, 'ATRÁS', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
  }

  private itemsForCategory(): Array<{ definition: ItemDefinition; quantity: number }> {
    if (this.category === 'runes') return [];
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
    const key = `item-${item.id}`;
    return this.textures.exists(key) ? key : null;
  }

  private itemGlyph(item: ItemDefinition): string {
    if (item.id === 'long-sword') return '†';
    if (item.id === 'ruby-crystal') return '◆';
    if (item.id === 'amplifying-tome') return '▤';
    return '◇';
  }

  private shortRuneName(id: string): string {
    const label = id.replace(/[-_]/g, ' ').toUpperCase();
    return label.length <= 8 ? label : `${label.slice(0, 7)}…`;
  }

  private categoryLabel(category: ItemCategory): string {
    if (category === 'runic') return 'RÚNICO';
    return CATEGORIES.find((entry) => entry.id === category)?.label ?? category.toUpperCase();
  }

  private formatBonuses(bonuses: Partial<StatBlock>): string {
    const labels = Object.entries(bonuses)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => `${DataRegistry.stat(key as keyof StatBlock).short} +${value}`);
    return labels.length > 0 ? labels.join(' · ') : 'Sin bonificaciones';
  }
}
