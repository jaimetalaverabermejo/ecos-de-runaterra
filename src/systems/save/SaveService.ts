import { createNewGame, type SaveGame } from '../../state/GameState';

const SAVE_KEY = 'ecos-de-runaterra.save.v1';

export class SaveService {
  static load(): SaveGame {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createNewGame();

    try {
      const parsed = JSON.parse(raw) as SaveGame;
      if (parsed.version !== 1) return createNewGame();
      return parsed;
    } catch {
      return createNewGame();
    }
  }

  static save(state: SaveGame): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  static clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
