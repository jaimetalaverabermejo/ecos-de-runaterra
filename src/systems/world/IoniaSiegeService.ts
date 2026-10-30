import type { SaveGame } from '../../state/GameState';

/** Keeps occupation and escort stages consistent on arrival, defeat and old saves. */
export class IoniaSiegeService {
  static sync(save: SaveGame): void {
    const flags = save.worldProgress.flags;
    const has = (id: string) => flags.includes(id);
    const set = (id: string, value: boolean): void => {
      const index = flags.indexOf(id);
      if (value && index < 0) flags.push(id);
      if (!value && index >= 0) flags.splice(index, 1);
    };
    const occupied = has('story:orders-siege-warning') && !has('story:ionia-complete');
    set('story:jonia-occupation', occupied);
    if (save.currentMapId === 'jo05_placidium_house_09') {
      save.currentMapId = 'jo05_placidium';
      save.playerPosition = has('story:orders-siege-third') ? { x: 2096, y: 784 } : { x: 1728, y: 2530 };
    }
    if (save.checkpoint.mapId === 'jo05_placidium_house_09') {
      save.checkpoint.mapId = 'jo05_placidium';
      save.checkpoint.x = 1728;
      save.checkpoint.y = 2530;
    }
    if (!occupied || !has('story:orders-irelia-briefed')) return;
    // Old saves already outside the inn must not repeat its briefing/departure.
    if (save.currentMapId === 'jo05_placidium') set('story:irelia-outside', true);
    if (!has('story:irelia-outside')) return;
    const stages = ['first', 'second', 'third'];
    const stage = stages.findIndex(id => !has(`story:orders-siege-${id}`));
    for (let i = 1; i <= 3; i++) {
      if (stage !== i - 1 || has(`irelia-ascent-${i}-arrived`)) set(`story:irelia-guide-${i}`, false);
      else set(`story:irelia-guide-${i}`, true);
    }
    if (stage < 0 && !has('story:irelia-at-summit')) set('story:irelia-guide-final', true);
  }
}
