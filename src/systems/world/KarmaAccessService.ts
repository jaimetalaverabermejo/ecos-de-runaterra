import type { SaveGame } from '../../state/GameState';

export class KarmaAccessService {
  static sync(save: SaveGame): void {
    const flags = save.worldProgress.flags;
    const has = (id: string) => flags.includes(id);
    const grant = (id: string) => { if (!has(id)) flags.push(id); };
    const remove = (id: string) => { const index = flags.indexOf(id); if (index >= 0) flags.splice(index, 1); };
    if (has('story:ionia-karma-arc-resolved')) {
      grant('story:karma-memorial-journey');
      grant('story:karma-departed');
      grant('story:karma-memorial-restored');
      remove('story:karma-departing');
    }
    const started = has('story:karma-requested-by-suyin');
    if (!started) remove('story:karma-pagoda-open');
    if (started && has('story:karma-audience') && has('story:ionia-karma-keeper') && has('story:ionia-karma-suyin') && has('story:ionia-karma-tao')) {
      grant('story:karma-memorial-open');
    }
    if (has('story:ionia-noxus-attack') || has('echo:irelia-resonance')) {
      grant('story:placidum-summit-open');
    }
    grant('story:karma-access-revision-2026-10-14');
  }

  static migrate(save: SaveGame): void {
    // Keep real investigations from earlier versions playable without erasing
    // their evidence, rewards or progress. Fresh saves still require Suyin.
    const legacy = !save.worldProgress.flags.includes('story:karma-access-revision-2026-10-14');
    if (legacy && save.worldProgress.flags.includes('story:ionia-trial-complete')
      && !save.worldProgress.flags.includes('story:placidum-summit-open')) {
      save.worldProgress.flags.push('story:placidum-summit-open');
    }
    if (legacy
      && (save.quests['ionia-karma-memory'] || save.worldProgress.flags.includes('story:ionia-karma-memory'))) {
      for (const id of ['story:karma-requested-by-suyin', 'story:karma-pagoda-open']) {
        if (!save.worldProgress.flags.includes(id)) save.worldProgress.flags.push(id);
      }
      if (save.worldProgress.flags.includes('story:ionia-karma-keeper')) {
        if (!save.worldProgress.flags.includes('story:karma-audience')) save.worldProgress.flags.push('story:karma-audience');
      }
      if (save.worldProgress.flags.includes('story:ionia-karma-stone') || save.worldProgress.flags.includes('story:ionia-karma-inscription')
        || save.worldProgress.flags.includes('story:ionia-karma-arc-resolved')) {
        if (!save.worldProgress.flags.includes('story:karma-memorial-open')) save.worldProgress.flags.push('story:karma-memorial-open');
      }
    }
    this.sync(save);
    this.recoverPosition(save);
  }

  static recoverPosition(save: SaveGame): void {
    const has = (id: string) => save.worldProgress.flags.includes(id);
    if (['jo05_placidium_house_08', 'jo05_placidium_pagoda_upper'].includes(save.currentMapId) && !has('story:karma-pagoda-open')) {
      save.currentMapId = 'jo05_placidium';
      save.playerPosition = { x: 1440, y: 2560 };
    }
    if (save.currentMapId !== 'jo05_placidium') return;
    const onAscent = (x: number, y: number) => y < 2100 || (x < 576 && y < 2256);
    if (!has('story:karma-memorial-open') && onAscent(save.playerPosition.x, save.playerPosition.y)) {
      save.playerPosition = { x: 416, y: 2304 };
    } else if (!has('story:placidum-summit-open') && save.playerPosition.x >= 896 && save.playerPosition.y < 1100) {
      save.playerPosition = { x: 832, y: 832 };
    }
    if (save.checkpoint.mapId === 'jo05_placidium' && !has('story:karma-memorial-open') && onAscent(save.checkpoint.x, save.checkpoint.y)) {
      save.checkpoint.x = 416;
      save.checkpoint.y = 2304;
    }
  }
}
