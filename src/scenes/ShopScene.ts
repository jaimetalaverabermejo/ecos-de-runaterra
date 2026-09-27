import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ShopEntryDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { InventoryService } from '../systems/inventory/InventoryService';
import { SaveService } from '../systems/save/SaveService';
import { ShopService } from '../systems/shop/ShopService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { drawItemIcon } from '../ui/items/ItemIcon';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';

export class ShopScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedItemId = 'amplifying-tome';
  private shopId = 'bandle-workshop';
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    const activeShopId = this.registry.get('shop.activeId') as string | undefined;
    if (!activeShopId) {
      this.scene.start('WorldScene');
      return;
    }

    this.save = this.registry.get('save') as SaveGame;
    this.shopId = activeShopId;
    this.selectedItemId = (this.registry.get('shop.selected') as string | undefined) ?? 'amplifying-tome';

    Ui960Kit.backdrop(this, 'bandle-village-bg', 0x4a665f, 0.3, 0.72);
    this.drawHeader();
    this.drawCatalog();
    this.drawDetail();
    this.drawFooter();
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    const entries = DataRegistry.shop(this.shopId).entries;
    if (direction && entries.length > 0) {
      const current = Math.max(0, entries.findIndex((entry) => entry.itemId === this.selectedItemId));
      const delta = direction === 'up' || direction === 'left' ? -1 : 1;
      const next = entries[Phaser.Math.Wrap(current + delta, 0, entries.length)];
      this.registry.set('shop.selected', next.itemId);
      this.scene.restart();
      return;
    }
    if (ConsoleInput.consumeA()) {
      const entry = entries.find((candidate) => candidate.itemId === this.selectedItemId);
      if (entry) this.buy(entry);
    }
    if (ConsoleInput.consumeB()) this.closeShop();
  }

  private drawHeader(): void {
    const shop = DataRegistry.shop(this.shopId);
    const vendorName = (this.registry.get('shop.vendorName') as string | undefined) ?? 'Mercader';
    Ui960Kit.header(this, shop.name.toUpperCase(), `${vendorName.toUpperCase()} · COMPONENTES Y OBJETOS RÚNICOS`, `ORO ${this.save.gold}`);
  }

  private drawCatalog(): void {
    const shop = DataRegistry.shop(this.shopId);
    Ui960Kit.panel(this, 34, 112, 556, 342, { alpha: 0.96 });
    Ui960Kit.label(this, 56, 130, 'CATÁLOGO', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 312, 164, 500);

    shop.entries.slice(0, 6).forEach((entry, index) => {
      const item = DataRegistry.item(entry.itemId);
      const selected = entry.itemId === this.selectedItemId;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 58 + col * 260;
      const y = 188 + row * 82;
      const card = Ui960Kit.panel(this, x, y, 240, 70, { selected, alt: true, alpha: 0.94 });
      card.setInteractive({ useHandCursor: true });
      drawItemIcon(this, item, x + 42, y + 35, 50, selected);
      Ui960Kit.label(this, x + 80, y + 10, item.name, UI960_FONT.small, UI.text.primary, true).setWordWrapWidth(120, true);
      Ui960Kit.label(this, x + 80, y + 42, `${entry.price} oro`, UI960_FONT.tiny, UI.text.gold, true);
      Ui960Kit.label(this, x + 222, y + 42, `×${InventoryService.quantity(this.save, item.id)}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0);
      card.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('shop.selected', entry.itemId);
        this.scene.restart();
      });
    });
  }

  private drawDetail(): void {
    const shop = DataRegistry.shop(this.shopId);
    const entry = shop.entries.find((candidate) => candidate.itemId === this.selectedItemId) ?? shop.entries[0];
    const item = DataRegistry.item(entry.itemId);
    const canBuy = ShopService.canBuy(this.save, entry);

    Ui960Kit.panel(this, 608, 112, 318, 342, { alpha: 0.96 });
    Ui960Kit.label(this, 630, 130, 'DETALLE', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 767, 164, 262);
    Ui960Kit.slot(this, 767, 220, 96, true);
    drawItemIcon(this, item, 767, 220, 80, true);
    Ui960Kit.label(this, 767, 276, item.name, UI960_FONT.body, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(270, true).setAlign('center');
    Ui960Kit.label(this, 630, 320, item.tier.toUpperCase(), UI960_FONT.tiny, item.tier === 'epic' ? UI.text.purple : item.tier === 'legendary' ? UI.text.gold : UI.text.accent, true);
    Ui960Kit.label(this, 630, 348, item.description ?? '', UI960_FONT.tiny, UI.text.secondary).setWordWrapWidth(274, true);
    Ui960Kit.label(this, 630, 408, `Precio: ${entry.price} · Tienes: ${InventoryService.quantity(this.save, item.id)}`, UI960_FONT.tiny, UI.text.gold, true);
    Ui960Kit.button(this, 802, 430, 180, 40, 'COMPRAR', () => this.buy(entry), {
      selected: canBuy,
      disabled: !canBuy,
      fontSize: UI960_FONT.small
    });
  }

  private drawFooter(): void {
    Ui960Kit.separator(this, 480, 480, 870);
    const storyCampaign = this.save.worldProgress.flags.includes('story:campaign');
    const craftingUnlocked = !storyCampaign || this.save.worldProgress.flags.includes('story:crafting-unlocked');
    this.statusText = Ui960Kit.label(
      this,
      44,
      498,
      craftingUnlocked ? 'Compra componentes o accede al taller del mercader.' : 'El taller todavía no está disponible.',
      UI960_FONT.tiny,
      UI.text.secondary,
      true
    );
    Ui960Kit.button(this, 748, 505, 132, 40, craftingUnlocked ? 'TALLER' : 'TALLER 🔒', () => {
      if (craftingUnlocked) this.scene.start('CraftingScene');
    }, { selected: craftingUnlocked, disabled: !craftingUnlocked, fontSize: UI960_FONT.small });
    Ui960Kit.button(this, 878, 505, 110, 40, 'SALIR', () => this.closeShop(), { fontSize: UI960_FONT.small });
  }

  private buy(entry: ShopEntryDefinition): void {
    const result = ShopService.buy(this.save, entry);
    if (result.ok) SaveService.save(this.save);
    this.statusText.setText(result.message);
    this.time.delayedCall(450, () => this.scene.restart());
  }

  private closeShop(): void {
    SaveService.save(this.save);
    const returnScene = (this.registry.get('shop.returnScene') as string | undefined) ?? 'WorldScene';
    this.clearShopContext();
    this.scene.start(returnScene);
  }

  private clearShopContext(): void {
    this.registry.remove('shop.activeId');
    this.registry.remove('shop.selected');
    this.registry.remove('shop.returnScene');
    this.registry.remove('shop.vendorName');
    this.registry.remove('crafting.selected');
  }
}
