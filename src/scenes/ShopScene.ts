import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ShopEntryDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { InventoryService } from '../systems/inventory/InventoryService';
import { SaveService } from '../systems/save/SaveService';
import { ShopService } from '../systems/shop/ShopService';
import { UiKit } from '../ui/components/UiKit';
import { drawItemIcon } from '../ui/items/ItemIcon';
import { UI } from '../ui/theme/UiTheme';

export class ShopScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedItemId = 'amplifying-tome';
  private shopId = 'bandle-workshop';
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.shopId = (this.registry.get('shop.activeId') as string | undefined) ?? 'bandle-workshop';
    this.selectedItemId = (this.registry.get('shop.selected') as string | undefined) ?? 'amplifying-tome';

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-village-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x4a665f).setAlpha(0.34);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.68).setOrigin(0);

    UiKit.framedPanel(this, 6, 6, 500, 276);
    this.drawHeader();
    this.drawCatalog();
    this.drawDetail();
    this.drawFooter();
  }

  private drawHeader(): void {
    const shop = DataRegistry.shop(this.shopId);
    const vendorName = (this.registry.get('shop.vendorName') as string | undefined) ?? 'Mercader';

    this.add.rectangle(10, 10, 492, 40, UI.colors.panelRaised, 1).setOrigin(0);
    this.add.circle(31, 30, 14, 0x8a6a52, 1).setStrokeStyle(2, UI.colors.gold);
    this.add.ellipse(31, 33, 18, 10, 0xc6a985, 1).setStrokeStyle(1, 0x513c30);
    this.add.circle(31, 29, 2, 0x251b17, 1);
    UiKit.label(this, 52, 13, shop.name.toUpperCase(), UI.font.title, UI.text.primary, true);
    UiKit.label(this, 52, 34, `${vendorName.toUpperCase()} · COMPONENTES Y OBJETOS RÚNICOS`, UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 488, 18, `ORO ${this.save.gold}`, UI.font.heading, UI.text.gold, true).setOrigin(1, 0);
  }

  private drawCatalog(): void {
    const shop = DataRegistry.shop(this.shopId);
    UiKit.framedPanel(this, 12, 56, 284, 188);
    UiKit.label(this, 24, 62, 'CATÁLOGO', UI.font.heading, UI.text.primary, true);
    UiKit.runeDivider(this, 154, 80, 238);

    shop.entries.forEach((entry, index) => {
      const item = DataRegistry.item(entry.itemId);
      const selected = entry.itemId === this.selectedItemId;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 22 + col * 132;
      const y = 90 + row * 48;
      const card = this.add.rectangle(x + 61, y + 19, 122, 40, selected ? 0x123e55 : UI.colors.panelAlt, 1)
        .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      drawItemIcon(this, item, x + 20, y + 19, 31, selected);
      UiKit.label(this, x + 42, y + 4, item.name, UI.font.small, UI.text.primary, true).setWordWrapWidth(72);
      UiKit.label(this, x + 42, y + 25, `${entry.price} oro`, UI.font.tiny, UI.text.gold, true);
      UiKit.label(this, x + 113, y + 25, `×${InventoryService.quantity(this.save, item.id)}`, UI.font.tiny, UI.text.secondary, true).setOrigin(1, 0);
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

    UiKit.framedPanel(this, 302, 56, 198, 188);
    UiKit.label(this, 314, 62, 'DETALLE', UI.font.heading, UI.text.primary, true);
    UiKit.runeDivider(this, 400, 80, 154);
    drawItemIcon(this, item, 400, 113, 58, true);
    UiKit.label(this, 400, 146, item.name, UI.font.body, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(170, true).setAlign('center');
    UiKit.label(this, 318, 173, item.tier.toUpperCase(), UI.font.tiny, item.tier === 'epic' ? UI.text.purple : UI.text.accent, true);
    UiKit.label(this, 318, 190, item.description ?? '', UI.font.tiny, UI.text.secondary).setWordWrapWidth(164, true);
    UiKit.label(this, 318, 217, `Precio: ${entry.price} · Tienes: ${InventoryService.quantity(this.save, item.id)}`, UI.font.tiny, UI.text.gold, true);
    UiKit.button(this, 435, 230, 112, 24, 'COMPRAR', () => this.buy(entry), {
      accent: canBuy ? 'green' : 'neutral',
      disabled: !canBuy,
      fontSize: UI.font.small
    });
  }

  private drawFooter(): void {
    UiKit.runeDivider(this, 256, 252, 454);
    this.statusText = UiKit.label(this, 18, 261, 'El Mercader siempre encuentra algo útil.', UI.font.tiny, UI.text.secondary, true);
    UiKit.button(this, 407, 269, 76, 22, 'TALLER', () => this.scene.start('CraftingScene'), { accent: 'gold', fontSize: UI.font.small });
    UiKit.button(this, 480, 269, 58, 22, 'SALIR', () => this.closeShop(), { accent: 'neutral', fontSize: UI.font.tiny });
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
    this.registry.remove('shop.returnScene');
    this.registry.remove('shop.vendorName');
    this.scene.start(returnScene);
  }
}
