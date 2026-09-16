import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BuildService } from '../systems/build/BuildService';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { InventoryService } from '../systems/inventory/InventoryService';
import { SaveService } from '../systems/save/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { drawItemIcon } from '../ui/items/ItemIcon';
import { UI } from '../ui/theme/UiTheme';

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
    configureSceneLayout(this);
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

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x47636c).setAlpha(0.32);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.68).setOrigin(0);

    UiKit.framedPanel(this, 6, 6, 500, 276);
    this.drawHeader();
    this.drawEquipped();
    this.drawInventory(items);
    this.drawFooter();
  }

  private drawHeader(): void {
    const definition = DataRegistry.champion(this.champion.championId);
    const stats = BattleEngine.statsFor(this.champion);

    this.add.rectangle(10, 10, 492, 40, UI.colors.panelRaised, 1).setOrigin(0);
    UiKit.label(this, 22, 14, `${definition.name.toUpperCase()} · BUILD`, UI.font.title, UI.text.primary, true);
    UiKit.label(this, 22, 35, `${this.champion.equippedItems.length}/${BuildService.MAX_SLOTS} objetos equipados`, UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 488, 14, `VID ${this.champion.currentHp}/${stats.hp}`, UI.font.small, UI.text.primary, true).setOrigin(1, 0);
    UiKit.label(this, 488, 34, `ATQ ${stats.attack} · POD ${stats.power} · DEF ${stats.defense} · RES ${stats.resistance} · VEL ${stats.speed}`, UI.font.tiny, UI.text.secondary, true).setOrigin(1, 0);
  }

  private drawEquipped(): void {
    UiKit.panel(this, 12, 56, 196, 184, 'BUILD ACTUAL');
    UiKit.label(this, 24, 84, 'Toca un objeto para desequiparlo.', UI.font.tiny, UI.text.muted);

    const slotXs = [48, 110, 172];
    for (let i = 0; i < BuildService.MAX_SLOTS; i += 1) {
      const x = slotXs[i];
      const itemId = this.champion.equippedItems[i];
      const box = this.add.rectangle(x, 126, 52, 56, itemId ? 0x12384e : 0x0b1d2d, 1)
        .setStrokeStyle(2, itemId ? UI.colors.gold : UI.colors.borderSoft);

      if (!itemId) {
        UiKit.label(this, x, 117, `HUECO ${i + 1}`, UI.font.tiny, UI.text.muted, true).setOrigin(0.5, 0);
        UiKit.label(this, x, 135, 'VACÍO', UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0);
        continue;
      }

      const item = DataRegistry.item(itemId);
      drawItemIcon(this, item, x, 118, 30, true);
      UiKit.label(this, x, 137, this.shortName(item.name), UI.font.tiny, UI.text.primary, true).setOrigin(0.5, 0);
      box.setInteractive({ useHandCursor: true });
      box.on(Phaser.Input.Events.POINTER_UP, () => this.unequip(i));
    }

    UiKit.runeDivider(this, 110, 165, 164);
    const bonuses = this.totalBuildBonuses();
    UiKit.label(this, 24, 177, 'BONUS TOTAL', UI.font.small, UI.text.accent, true);
    UiKit.label(this, 24, 196, this.formatBonuses(bonuses) || 'Sin bonificaciones.', UI.font.small, this.champion.equippedItems.length ? UI.text.gold : UI.text.muted, true)
      .setWordWrapWidth(170, true);
  }

  private drawInventory(items: ItemDefinition[]): void {
    UiKit.panel(this, 214, 56, 286, 184, 'EQUIPO EN BOLSA');
    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    UiKit.label(this, 454, 62, `${this.page + 1}/${pageCount}`, UI.font.tiny, UI.text.secondary, true).setOrigin(1, 0);

    if (pageCount > 1) {
      UiKit.button(this, 469, 69, 22, 18, '‹', () => this.changePage(-1), { accent: 'neutral', fontSize: UI.font.small });
      UiKit.button(this, 490, 69, 22, 18, '›', () => this.changePage(1), { accent: 'neutral', fontSize: UI.font.small });
    }

    if (items.length === 0) {
      UiKit.label(this, 357, 137, 'No tienes objetos de Equipo\ndisponibles en la Bolsa.', UI.font.body, UI.text.muted, true)
        .setOrigin(0.5)
        .setAlign('center');
      return;
    }

    const pageItems = items.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
    pageItems.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 224 + col * 135;
      const y = 88 + row * 46;
      const selected = item.id === this.selectedItemId;
      const card = this.add.rectangle(x + 62, y + 19, 126, 40, selected ? 0x123e55 : UI.colors.panelAlt, 1)
        .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      drawItemIcon(this, item, x + 19, y + 19, 30, selected);
      UiKit.label(this, x + 40, y + 4, this.shortName(item.name), UI.font.tiny, UI.text.primary, true).setWordWrapWidth(70);
      UiKit.label(this, x + 40, y + 24, this.formatBonuses(item.statBonuses) || 'Sin bonus', UI.font.tiny, UI.text.accent, true);
      UiKit.label(this, x + 116, y + 24, `×${InventoryService.quantity(this.save, item.id)}`, UI.font.tiny, UI.text.secondary, true).setOrigin(1, 0);
      card.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('build.selected', item.id);
        this.scene.restart({ partyIndex: this.partyIndex });
      });
    });
  }

  private drawFooter(): void {
    UiKit.runeDivider(this, 256, 247, 462);
    const status = this.registry.get('build.status') as string | undefined;
    if (status) this.registry.remove('build.status');

    const selected = this.selectedItemId ? DataRegistry.item(this.selectedItemId) : null;
    const defaultText = selected
      ? `${selected.name}: ${this.formatBonuses(selected.statBonuses) || 'sin bonificación directa'}`
      : 'Compra o fabrica objetos para añadirlos a una build.';
    UiKit.label(this, 18, 258, status ?? defaultText, UI.font.tiny, status ? UI.text.gold : UI.text.secondary, true)
      .setWordWrapWidth(310, true);

    UiKit.button(this, 384, 268, 92, 24, 'EQUIPAR', () => this.equipSelected(), {
      accent: this.selectedItemId && BuildService.canEquip(this.save, this.champion, this.selectedItemId) ? 'gold' : 'neutral',
      disabled: !this.selectedItemId || !BuildService.canEquip(this.save, this.champion, this.selectedItemId),
      fontSize: UI.font.small
    });
    UiKit.button(this, 470, 268, 62, 24, 'ATRÁS', () => this.scene.start('ChampionDetailScene', { partyIndex: this.partyIndex }), {
      accent: 'blue', fontSize: UI.font.tiny
    });
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
    return name.length <= 16 ? name : `${name.slice(0, 14)}…`;
  }
}
