import type { ItemId } from '../../data/types';
import type { SaveGame } from '../../state/GameState';

export class InventoryService {
  static quantity(save: SaveGame, itemId: ItemId): number {
    return save.inventory[itemId] ?? 0;
  }

  static has(save: SaveGame, itemId: ItemId, quantity = 1): boolean {
    return this.quantity(save, itemId) >= quantity;
  }

  static add(save: SaveGame, itemId: ItemId, quantity = 1): void {
    if (quantity <= 0) return;
    save.inventory[itemId] = this.quantity(save, itemId) + quantity;
  }

  static remove(save: SaveGame, itemId: ItemId, quantity = 1): boolean {
    if (quantity <= 0) return true;
    if (!this.has(save, itemId, quantity)) return false;
    const next = this.quantity(save, itemId) - quantity;
    if (next <= 0) delete save.inventory[itemId];
    else save.inventory[itemId] = next;
    return true;
  }
}
