import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ItemCategory, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { UI } from '../ui/theme/UiTheme';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';

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

  private drawCategories(): void {
    Ui960Kit.panel(this, 26, 108, 202, 348, { alpha: 0.96 });
    CATEGORIES.forEach((category, index) => {
      const y = 136 + index * 61;
      const selected = category.id === this.category;
      const button = Ui960Kit.button(this, 127, y, 170, 48, '', () => {
        this.registry.set('bag.category', category.id);
        this.registry.remove('bag.selected');
        this.scene.restart();
      }, { selected, fontSize: UI960_FONT.small });
      Ui960Kit.label(this, 58, y - 11, category.icon, UI960_FONT.heading, selected ? UI.text.gold : UI.text.accent, true).setDepth(button.button.depth + 1);
      Ui960Kit.label(this, 82, y - 9, category.label, UI960_FONT.small, selected ? UI.text.primary : UI.text.secondary, true).setDepth(button.button.depth + 1);
    });
  }

  private drawInventory(items: Array<{ definition: ItemDefinition; quantity: number }>): void {
    Ui960Kit.panel(this, 244, 108, 430, 348, { alpha: 0.96 });
    Ui960Kit.label(this, 266, 126, 'INVENTARIO', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.label(this, 650, 130, `${items.length} tipos`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);
    Ui960Kit.separator(this, 459, 158, 360);

    if (items.length === 0) {
      Ui960Kit.label(this, 459, 278, 'No hay objetos\nen esta categoría.', UI960_FONT.body, UI.text.muted, true)
        .setOrigin(0.5)
        .setAlign('center');
      return;
    }

    items.slice(0, 9).forEach((entry, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 270 + col * 128;
      const y = 178 + row * 88;
      const selected = entry.definition.id === this.selectedItemId;
      const card = Ui960Kit.panel(this, x, y, 116, 78, { selected, alt: true, alpha: 0.94 });
      card.setInteractive({ useHandCursor: true });

      const textureKey = this.itemTextureKey(entry.definition);
      if (textureKey) this.add.image(x + 36, y + 35, textureKey).setDisplaySize(54, 54);
      else Ui960Kit.label(this, x + 36, y + 20, this.itemGlyph(entry.definition), UI960_FONT.heading, selected ? UI.text.gold : UI.text.accent, true).setOrigin(0.5, 0);

      Ui960Kit.label(this, x + 70, y + 13, this.shortName(entry.definition.name), UI960_FONT.tiny, UI.text.primary, true)
        .setWordWrapWidth(40, true)
        .setAlign('center');
      Ui960Kit.label(this, x + 106, y + 54, `×${entry.quantity}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);

      card.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('bag.selected', entry.definition.id);
        this.scene.restart();
      });
    });
  }

  private drawDetails(items: Array<{ definition: ItemDefinition; quantity: number }>): void {
    Ui960Kit.panel(this, 690, 108, 244, 348, { alpha: 0.96 });
    Ui960Kit.label(this, 712, 126, 'DETALLES', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 812, 158, 190);

    const selected = items.find((entry) => entry.definition.id === this.selectedItemId) ?? items[0];
    if (!selected) {
      Ui960Kit.label(this, 812, 270, 'Selecciona\nuna categoría.', UI960_FONT.body, UI.text.muted, true).setOrigin(0.5).setAlign('center');
      this.drawDetailActions(null);
      return;
    }

    const { definition, quantity } = selected;
    Ui960Kit.slot(this, 812, 214, 96, true);
    const textureKey = this.itemTextureKey(definition);
    if (textureKey) this.add.image(812, 214, textureKey).setDisplaySize(80, 80);
    else Ui960Kit.label(this, 812, 191, this.itemGlyph(definition), '38px', UI.text.accent, true).setOrigin(0.5, 0);

    Ui960Kit.label(this, 812, 269, definition.name, UI960_FONT.body, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(210, true).setAlign('center');
    Ui960Kit.label(this, 712, 318, `Cantidad: ${quantity}`, UI960_FONT.small, UI.text.secondary, true);
    Ui960Kit.label(this, 712, 344, this.categoryLabel(definition.category ?? 'equipment'), UI960_FONT.tiny, UI.text.accent, true);
    Ui960Kit.label(this, 712, 370, definition.description ?? 'Objeto de inventario.', UI960_FONT.tiny, UI.text.secondary)
      .setWordWrapWidth(202, true)
      .setLineSpacing(3);
    Ui960Kit.label(this, 712, 418, this.formatBonuses(definition.statBonuses), UI960_FONT.tiny, UI.text.gold, true)
      .setWordWrapWidth(202, true);

    this.drawDetailActions(definition);
  }

  private drawRuneCollection(): void {
    Ui960Kit.panel(this, 244, 108, 430, 348, { alpha: 0.96 });
    Ui960Kit.label(this, 266, 126, 'COLECCIÓN DE RUNAS', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.label(this, 650, 130, `${this.save.runes.unlockedIds.length}/${RUNE_SLOT_COUNT}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);
    Ui960Kit.separator(this, 459, 158, 360);

    for (let index = 0; index < RUNE_SLOT_COUNT; index += 1) {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 292 + col * 92;
      const y = 205 + row * 92;
      const runeId = this.save.runes.unlockedIds[index];
      const unlocked = Boolean(runeId);
      Ui960Kit.slot(this, x, y, 70, unlocked);
      Ui960Kit.label(this, x, y - 17, unlocked ? '◇' : '?', UI960_FONT.heading, unlocked ? UI.text.gold : UI.text.muted, true).setOrigin(0.5, 0);
      Ui960Kit.label(this, x, y + 18, unlocked ? this.shortRuneName(runeId) : '???', '11px', unlocked ? UI.text.primary : UI.text.muted, true).setOrigin(0.5, 0);
    }
  }

  private drawRuneDetails(): void {
    Ui960Kit.panel(this, 690, 108, 244, 348, { alpha: 0.96 });
    Ui960Kit.label(this, 712, 126, 'RUNAS', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 812, 158, 190);
    this.add.circle(812, 220, 46, 0x0b2532, 1).setStrokeStyle(3, UI.colors.cyanGlow);
    Ui960Kit.label(this, 812, 190, '◇', '54px', UI.text.accent, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 812, 285, 'COLECCIÓN', UI960_FONT.body, UI.text.primary, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 712, 326, 'Las runas no son objetos consumibles.', UI960_FONT.small, UI.text.secondary).setWordWrapWidth(202, true);
    Ui960Kit.label(this, 712, 388, 'Se equiparán desde la ficha de cada Eco.', UI960_FONT.tiny, UI.text.accent, true).setWordWrapWidth(202, true);
  }

  private drawDetailActions(item: ItemDefinition | null): void {
    const isEquipment = (item?.category ?? 'equipment') === 'equipment';
    Ui960Kit.button(this, 758, 438, 120, 36, isEquipment ? 'VER BUILD' : 'USAR', () => {
      if (isEquipment) this.scene.start('TeamScene');
    }, { selected: Boolean(item), disabled: !item, fontSize: UI960_FONT.tiny });

    Ui960Kit.button(this, 874, 438, 86, 36, this.sortMode === 'name' ? 'A→Z' : '×#', () => {
      this.registry.set('bag.sort', this.sortMode === 'name' ? 'quantity' : 'name');
      this.scene.restart();
    }, { fontSize: UI960_FONT.tiny });
  }

  private drawFooter(): void {
    Ui960Kit.separator(this, 480, 480, 870);
    const footer = this.category === 'runes'
      ? `Oro ${this.save.gold} · Runas descubiertas: ${this.save.runes.unlockedIds.length}`
      : `Oro ${this.save.gold} · Orden: ${this.sortMode === 'name' ? 'Nombre' : 'Cantidad'}`;
    Ui960Kit.label(this, 44, 500, footer, UI960_FONT.tiny, UI.text.secondary, true);
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

  private shortName(name: string): string {
    if (name.length <= 12) return name;
    const words = name.split(' ');
    if (words.length > 1) return `${words[0]}\n${words.slice(1).join(' ')}`;
    return `${name.slice(0, 10)}…`;
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
