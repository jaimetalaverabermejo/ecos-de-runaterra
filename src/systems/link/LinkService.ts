import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionInstance } from '../../data/types';
import type { SaveGame } from '../../state/GameState';

const LINKER_ID = 'echo-linker-hextech';

export class LinkService {
  static linkerId(): string {
    return LINKER_ID;
  }

  static hasLinker(save: SaveGame): boolean {
    return (save.inventory[LINKER_ID] ?? 0) > 0;
  }

  static linkerLevel(save: SaveGame): number {
    return this.hasLinker(save) ? Math.max(1, Math.round(save.artifactLevels[LINKER_ID] ?? 1)) : 0;
  }

  static linkerPower(save: SaveGame): number {
    const level = this.linkerLevel(save);
    if (level <= 0) return 0;
    return [0, 1, 1.25, 1.55, 1.9, 2.25][Math.min(5, level)] ?? 2.25;
  }

  static chance(
    save: SaveGame,
    user: ChampionInstance,
    target: ChampionInstance,
    currentHp: number,
    maxHp: number,
    statusMultiplier = 1
  ): number {
    if (!this.hasLinker(save)) return 0;
    const targetDefinition = DataRegistry.champion(target.championId);
    const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 1;
    const missingHpRatio = 1 - hpRatio;
    const base = 0.12 + missingHpRatio * 0.58;
    const masteryDifference = target.mastery - user.mastery;
    const masteryMultiplier = Math.max(0.38, Math.min(1.25, 1 - masteryDifference * 0.08));
    const artifactVsDifficulty = this.linkerPower(save) / Math.max(0.35, targetDefinition.linkDifficulty);
    return Math.max(0.03, Math.min(0.9, base * masteryMultiplier * artifactVsDifficulty * Math.max(0.8, statusMultiplier)));
  }

  static feedback(chance: number): string {
    if (chance < 0.16) return 'La resonancia apenas responde al Vinculador.';
    if (chance < 0.32) return 'La señal es inestable, pero existe una conexión.';
    if (chance < 0.55) return 'La resonancia comienza a estabilizarse…';
    return 'La señal del Eco encaja con el patrón del Vinculador…';
  }
}
