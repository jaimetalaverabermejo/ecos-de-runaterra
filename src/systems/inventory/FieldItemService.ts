import { DataRegistry } from '../../data/DataRegistry';
import type { ItemDefinition } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { BattleEngine } from '../combat/BattleEngine';
import { InventoryService } from './InventoryService';

export class FieldItemService {
  static supports(item: ItemDefinition): boolean {
    return item.category === 'consumable' && item.battleEffect?.type === 'heal';
  }

  static use(save: SaveGame, itemId: string, instanceId: string): { ok: boolean; message: string; healed: number } {
    const item = DataRegistry.item(itemId);
    const effect = item.battleEffect;
    const reject = (message: string) => ({ ok: false, message, healed: 0 });
    if (!this.supports(item) || effect?.type !== 'heal') return reject('Este objeto no se puede usar fuera del combate.');
    if (!InventoryService.has(save, itemId)) return reject('No te quedan unidades de este objeto.');
    const target = save.party.find(eco => eco.instanceId === instanceId);
    if (!target) return reject('Elige un Eco de tu equipo.');
    if (target.currentHp <= 0) return reject('Las pociones no reviven Ecos debilitados.');
    const maxHp = BattleEngine.statsFor(target).hp;
    const healed = Math.min(effect.amount, maxHp - target.currentHp);
    if (healed <= 0) return reject('Este Eco ya tiene la Vida completa.');
    if (effect.consumes && !InventoryService.remove(save, itemId)) return reject('No te quedan unidades de este objeto.');
    target.currentHp += healed;
    return { ok: true, healed, message: `${DataRegistry.champion(target.championId).name} recupera ${healed} de Vida.` };
  }
}
