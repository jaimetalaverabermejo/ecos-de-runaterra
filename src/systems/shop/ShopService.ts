import type { ShopEntryDefinition } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { InventoryService } from '../inventory/InventoryService';

export interface PurchaseResult {
  ok: boolean;
  message: string;
}

export class ShopService {
  static canBuy(save: SaveGame, entry: ShopEntryDefinition): boolean {
    return save.gold >= entry.price;
  }

  static buy(save: SaveGame, entry: ShopEntryDefinition): PurchaseResult {
    if (!this.canBuy(save, entry)) {
      return { ok: false, message: 'No tienes oro suficiente.' };
    }
    save.gold -= entry.price;
    InventoryService.add(save, entry.itemId, 1);
    return { ok: true, message: 'Compra realizada.' };
  }
}
