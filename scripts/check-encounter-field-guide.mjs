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
  const terrain = JSON.parse(readFileSync('public/assets/world/encounter-terrain.json', 'utf8'));
  const guide = new EncounterFieldGuide(terrain);
  const save = createNewGame();
  const noxus = DataRegistry.map('NO02_Cruce_Caravanas');
  assert.equal(terrain[noxus.tiled.url], true, 'The Noxus grass is present in the shipped map');
  assert.deepEqual(guide.sightings([noxus], save), [], 'Disabled grass must not advertise the Bandle fallback');

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
  console.log('Encounter guide: authored terrain, disabled Noxus, active tables, progression and roaming encounters OK.');
} finally {
  await server.close();
}
