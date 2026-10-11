import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionInstance, ItemId } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { BattleEngine } from '../combat/BattleEngine';
import { InventoryService } from '../inventory/InventoryService';
import { equipmentSlots } from './EquipmentSlots';

export interface BuildActionResult {
  ok: boolean;
  message: string;
}

export class BuildService {
  static readonly MAX_SLOTS = 3;
  static slots = equipmentSlots;

  static reconcileSlots(save: SaveGame): void {
    for (const champion of [...save.party, ...save.storage]) {
      const excess = champion.equippedItems.splice(this.slots(champion));
      for (const itemId of excess) InventoryService.add(save, itemId, 1);
      champion.currentHp = Math.min(champion.currentHp, BattleEngine.statsFor(champion).hp);
    }
  }

  static canEquip(save: SaveGame, champion: ChampionInstance, itemId: ItemId): boolean {
    const item = DataRegistry.item(itemId);
    const equippable = item.category === undefined || item.category === 'equipment';
    return equippable
      && champion.equippedItems.length < this.slots(champion)
      && InventoryService.has(save, itemId, 1);
  }

  static equip(save: SaveGame, champion: ChampionInstance, itemId: ItemId): BuildActionResult {
    const item = DataRegistry.item(itemId);
    if (item.category !== undefined && item.category !== 'equipment') {
      return { ok: false, message: `${item.name} no se puede equipar.` };
    }
    if (champion.equippedItems.length >= this.slots(champion)) {
      return { ok: false, message: 'No quedan huecos libres. Nuevos huecos en maestría 8 y 20.' };
    }
    if (!InventoryService.remove(save, itemId, 1)) {
      return { ok: false, message: `No tienes ${item.name} disponible en la Bolsa.` };
    }

    champion.equippedItems.push(itemId);
    champion.currentHp = Math.min(champion.currentHp, BattleEngine.statsFor(champion).hp);
    return { ok: true, message: `${item.name} equipado.` };
  }

  static unequip(save: SaveGame, champion: ChampionInstance, slotIndex: number): BuildActionResult {
    const itemId = champion.equippedItems[slotIndex];
    if (!itemId) return { ok: false, message: 'Ese hueco está vacío.' };

    const item = DataRegistry.item(itemId);
    champion.equippedItems.splice(slotIndex, 1);
    InventoryService.add(save, itemId, 1);

    const newMaxHp = BattleEngine.statsFor(champion).hp;
    champion.currentHp = Math.min(champion.currentHp, newMaxHp);
    return { ok: true, message: `${item.name} vuelve a la Bolsa.` };
  }
}
