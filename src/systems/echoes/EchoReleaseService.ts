import type { SaveGame } from '../../state/GameState';

export class EchoReleaseService {
  static queue(save: SaveGame, championId: string): void {
    const flag = `echo:${championId}-release-pending`;
    if (!save.worldProgress.flags.includes(`echo:${championId}-release-seen`) && !save.worldProgress.flags.includes(flag)) save.worldProgress.flags.push(flag);
  }
  static pending(save: SaveGame): string[] {
    return save.worldProgress.flags.flatMap(flag => /^echo:(.+)-release-pending$/.exec(flag)?.[1] ?? []);
  }
  static complete(save: SaveGame, championId: string): void {
    save.worldProgress.flags = save.worldProgress.flags.filter(flag => flag !== `echo:${championId}-release-pending`);
    const seen = `echo:${championId}-release-seen`;
    if (!save.worldProgress.flags.includes(seen)) save.worldProgress.flags.push(seen);
  }
}
