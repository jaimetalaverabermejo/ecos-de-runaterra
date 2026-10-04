import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const plan = json('src/contenido/borradores/jonia/plan-region.json');
const champions = readdirSync('src/contenido/campeones').filter(id =>
  ['ionia', 'jonia'].includes(json(`src/contenido/campeones/${id}/personaje.json`).regionPrincipalId));
assert.equal(plan.zonas.length, 21);
assert.equal(new Set(plan.zonas.map(zone => zone.id)).size, 21);
assert.equal(plan.personajes.length, champions.length + 1);
assert.equal(new Set(plan.personajes.map(ch => ch.ecoId)).size, plan.personajes.length);
for (const id of [...champions, 'kennen']) assert(plan.personajes.some(ch => ch.ecoId === id), `Missing ${id}`);
for (const zone of [...plan.zonas, ...plan.perfilesRevisita, ...plan.errantes.perfiles]) {
  assert.equal(zone.apariciones.reduce((sum, entry) => sum + entry.peso, 0), 100, zone.id ?? zone.zonaId);
  for (const entry of zone.apariciones) {
    assert(plan.personajes.some(ch => ch.ecoId === entry.ecoId), `Unknown planned echo ${entry.ecoId}`);
    const guaranteedKennen = ['jo01_koeshin', 'jo02_white_cliffs'].includes(zone.id) && entry.ecoId === 'kennen';
    assert.equal(entry.banderaRequerida, guaranteedKennen ? null : `echo:${entry.ecoId}-resonance`);
  }
}
for (const ch of plan.personajes) {
  const zone = plan.zonas.find(zone => zone.id === ch.zonaId);
  assert(zone, `Unknown zone for ${ch.ecoId}`);
  if (['varus', 'kayn'].includes(ch.ecoId)) {
    assert.equal(ch.desbloqueoHabilitado, false);
    assert.equal(ch.accionDesbloqueo, null);
    assert.equal(ch.maestriaEvento, null);
  } else {
    const profiles = [zone, ...plan.errantes.perfiles.filter(profile => profile.zonaId === zone.id)];
    assert(profiles.some(profile => profile.apariciones.some(entry => entry.ecoId === ch.ecoId)), `No encounter after unlocking ${ch.ecoId}`);
  }
}
for (const zone of [...plan.zonas, ...plan.perfilesRevisita, ...plan.errantes.perfiles]) {
  assert(!zone.apariciones.some(entry => ['varus', 'kayn'].includes(entry.ecoId)), 'Late-game echoes in first-visit plan');
}
for (const zone of plan.zonas) {
  assert(!zone.apariciones.some(entry => ['yasuo', 'yone'].includes(entry.ecoId)), 'Wanderers available too early');
}
for (const profile of plan.errantes.perfiles) {
  assert.equal(profile.banderaRequerida, 'story:ionia-wanderers-awakened');
}
for (const id of ['yasuo', 'yone']) {
  assert.deepEqual(plan.personajes.find(ch => ch.ecoId === id).prerrequisitos, [{ tipo: 'bandera', id: 'story:ionia-wanderers-awakened' }]);
}
const appearances = json('src/contenido/campeones/kennen/apariciones.json');
for (const id of ['jo01_koeshin', 'jo02_white_cliffs']) {
  const base = `src/data/world/regions/ionia/zones/${id}`;
  const map = json(`${base}/map.json`);
  const table = json(`${base}/encounters.json`);
  assert.equal(map.tiled.encounterTableId, table.id);
  assert.deepEqual(table.entries, [{ championId: 'kennen', weight: 100, minMastery: 7, maxMastery: 8 }]);
  const entry = appearances.find(entry => entry.regionId === 'ionia' && entry.zonaId === id);
  assert(entry, `Missing current appearance ${id}`);
  assert.equal(entry.maestriaMinima, 7);
  assert.equal(entry.maestriaMaxima, 8);
  assert.deepEqual(entry.condiciones, []);
}
for (const reservation of plan.reservasMapasExistentes) {
  const map = json(`src/data/world/regions/ionia/zones/${reservation.mapaId}/map.json`);
  const authored = json(`public/${map.tiled.url.replace(/^\.\//, '').replace('.runtime.json', '.tmj')}`);
  const note = authored.layers.find(layer => layer.name === 'DesignNotes').objects.find(object => object.id === reservation.objetoId);
  assert(note.properties.some(prop => prop.name === 'plannedChampion' && prop.value === reservation.ecoId));
  assert(!authored.layers.find(layer => layer.name === 'Portals').objects.some(object => object.id === note.id));
}
console.log('Validated regional plan: Varus/Kayn reserved, Yasuo/Yone gated to advanced profiles, route weights and active Kennen M7–8 tables.');
