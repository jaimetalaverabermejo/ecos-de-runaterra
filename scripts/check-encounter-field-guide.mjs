import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const { DataRegistry } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { EncounterFieldGuide } = await server.ssrLoadModule('/src/systems/encounters/EncounterFieldGuide.ts');
  const { EchoAppearanceService, encounterLocation } = await server.ssrLoadModule('/src/systems/encounters/EchoAppearanceService.ts');
  const { RoamingEchoService } = await server.ssrLoadModule('/src/systems/encounters/RoamingEchoService.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  const { QuestService } = await server.ssrLoadModule('/src/systems/quests/QuestService.ts');
  const terrain = JSON.parse(readFileSync('public/assets/world/encounter-terrain.json', 'utf8'));
  const guide = new EncounterFieldGuide(terrain);
  const save = createNewGame();
  const noxus = DataRegistry.map('NO02_Cruce_Caravanas');
  const supplies = DataRegistry.map('NO04_Suministros');
  const capital = DataRegistry.map('NO05_Capital_Exterior');
  const noxusEchoes = createNewGame();
  assert.equal(terrain[noxus.tiled.url], true, 'The Noxus grass is present in the shipped map');
  assert.deepEqual([...guide.echoes(noxus, noxusEchoes)], ['kled'], 'Kled needs no Bandle resonance in Noxus');
  assert(!guide.echoes(DataRegistry.map('dark_forest'), noxusEchoes).has('kled'), 'Bandle still requires Kled’s resonance');
  assert.equal(guide.echoes(supplies, noxusEchoes).size, 0, 'Locked encounters must not fall back to Bandle');
  assert.equal(guide.echoes(capital, noxusEchoes).size, 0);
  assert(!guide.echoes(noxus, noxusEchoes).has('mel'));
  noxusEchoes.worldProgress.flags.push('story:mel-noxus-arrived');
  assert(guide.echoes(noxus, noxusEchoes).has('mel'));
  assert(guide.echoes(capital, noxusEchoes).has('mel'));

  for (const [champion, questId, flag, map] of [
    ['darius', 'noxus-names-of-the-levy', 'story:noxus-basilich-copy', capital],
    ['samira', 'noxus-crate-seventeen', 'story:noxus-sareth-receipt', noxus],
    ['rell', 'noxus-not-supplies', 'story:noxus-relocation-found', supplies]
  ]) {
    const alreadyAvailable = () => guide.echoes(map, noxusEchoes).has(champion);
    assert(guide.echoes(map).has(champion));
    assert(!alreadyAvailable());
    assert(QuestService.start(noxusEchoes, questId));
    for (const step of DataRegistry.quest(questId).steps) {
      for (const objective of step.objectives) {
        QuestService.recordEvent(noxusEchoes, { type: objective.type, targetId: objective.targetId, amount: objective.required });
      }
    }
    assert.equal(noxusEchoes.quests[questId].status, 'ready');
    assert(!alreadyAvailable(), champion + ' stays locked until the quest is turned in');
    assert(QuestService.complete(noxusEchoes, questId));
    assert(alreadyAvailable());
    assert(guide.locations(champion, noxusEchoes).some(row => row.startsWith('Noxus') && !row.includes('Según')));
    noxusEchoes.worldProgress.flags.push(flag);
    const oldSave = createNewGame();
    oldSave.worldProgress.flags.push(flag);
    assert(guide.echoes(map, oldSave).has(champion), 'Existing saves with the final story flag are supported');
  }
  assert.deepEqual(noxusEchoes.echoRegistry, createNewGame().echoRegistry, 'Unlocking an appearance does not link it');

  for (const map of DataRegistry.maps()) {
    const potential = guide.echoes(map);
    const active = guide.echoes(map, save);
    for (const id of active) assert(potential.has(id), `${map.id}: active ${id} must also count as a possible encounter`);
    if (!map.tiled || map.tiled.disableWildEncounters || !terrain[map.tiled.url]) continue;
    const { regionId, zoneId } = encounterLocation(map);
    const entries = EchoAppearanceService.entriesForEncounter(save, map.tiled.encounterTableId ?? 'bandle-meadow', regionId, zoneId);
    for (const entry of entries) assert(active.has(entry.championId), `${map.id}: guide must list the actual encounter pool`);
  }

  const peaks = DataRegistry.map('jo08_peaks');
  assert(guide.echoes(peaks).has('yasuo'));
  assert(!guide.echoes(peaks, save).has('yasuo'));
  const before = JSON.stringify(save);
  guide.locations('lee-sin', save);
  guide.sightings([peaks], save);
  assert.equal(JSON.stringify(save), before, 'Reading the guide must not modify the save');
  save.worldProgress.flags.push('story:yasuo-met');
  assert(guide.echoes(peaks, save).has('yasuo'));
  assert.equal(RoamingEchoService.encounter(save, 'jo08_peaks', 0)?.championId, 'yasuo');
  console.log('Encounter guide: authored terrain, Noxus story unlocks, existing saves and roaming encounters OK.');
} finally {
  await server.close();
}
