import type { DuelEchoDefinition } from '../../data/narrativeTypes';
import type { SaveGame } from '../../state/GameState';

export class DuelTeamService {
  static resolve(save: SaveGame, team: readonly DuelEchoDefinition[]): DuelEchoDefinition[] {
    return team.map((entry) => {
      const alternative = entry.unlockedChampionId;
      const linked = alternative && (save.echoRegistry[alternative] === 'linked'
        || [...save.party, ...save.storage].some((echo) => echo.championId === alternative));
      return linked
        ? { ...entry, championId: alternative, formId: undefined, initialFormTurns: undefined }
        : { ...entry };
    });
  }
}
