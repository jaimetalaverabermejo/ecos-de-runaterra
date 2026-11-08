import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync('src/ui/combat/CombatBackgrounds.ts', 'utf8');
const compiled = stripTypeScriptTypes(source);
const { COMBAT_BACKGROUNDS, combatBackgroundForMap } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
for (const background of Object.values(COMBAT_BACKGROUNDS)) {
  const png = fs.readFileSync(path.join('public', background.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', background.url);
  assert.equal(png.readUInt32BE(16), 960, background.url);
  assert.equal(png.readUInt32BE(20), 540, background.url);
}
const urban = new Set(['NO01_Puerto', 'NO03_Basilich', 'NO05_Capital_Exterior', 'NO06_Bastion_Interior', 'NO09_Delverhold']);
let count = 0;
for (const region of ['bandle-city', 'ionia', 'noxus']) {
  const zones = `src/data/world/regions/${region}/zones`;
  for (const zone of fs.readdirSync(zones)) {
    const filename = path.join(zones, zone, 'map.json');
    if (!fs.existsSync(filename)) continue;
    const map = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const expected = region === 'bandle-city' ? 'bandle' : region === 'ionia' ? 'ionia'
      : urban.has(map.id) ? 'noxus-city' : 'noxus-field';
    assert.equal(combatBackgroundForMap(map), expected, map.id);
    count++;
  }
}
assert.equal(combatBackgroundForMap(), 'generic', 'standalone/no save');
assert.equal(combatBackgroundForMap({ id: 'unknown' }), 'generic');
assert.equal(combatBackgroundForMap({ id: 'future', regionId: 'shurima' }), 'generic');
assert.equal(combatBackgroundForMap({ id: 'future', regionId: 'demacia' }), 'demacia-field');
assert.equal(combatBackgroundForMap({ id: 'future', regionId: 'demacia', battleEnvironment: 'city' }), 'demacia-city');
assert.equal(combatBackgroundForMap({ id: 'future', regionId: 'freljord' }), 'freljord');
assert.equal(combatBackgroundForMap({ id: 'future-interior', regionId: 'noxus', zoneId: 'NO03_Basilich' }), 'noxus-city');
assert.equal(combatBackgroundForMap({ id: 'NO03_Basilich', regionId: 'noxus', battleEnvironment: 'field' }), 'noxus-field');
// Exercise the actual shared drawing function with scene/registry doubles:
// standalone modes must ignore an existing adventure save; stale sessions must
// not change a normal single battle's map scenery.
const visuals = fs.readFileSync('src/ui/combat/CombatVisuals.ts', 'utf8');
const drawSource = visuals.slice(visuals.indexOf('export function drawCombatBackdrop'), visuals.indexOf('export function playCombatVfx('));
const draw = new Function('DataRegistry', 'COMBAT_BACKGROUNDS', 'combatBackgroundForMap',
  stripTypeScriptTypes(drawSource.replace('export function', 'function')) + '\nreturn drawCombatBackdrop;')(
  { maps: () => [{ id: 'NO03_Basilich', regionId: 'noxus' }] }, COMBAT_BACKGROUNDS, combatBackgroundForMap);
for (const [sceneKey, kind, saveId, expected] of [
  ['BattleScene', undefined, 'NO03_Basilich', 'noxus-city'],
  ['DoubleBattleScene', 'duel', 'NO03_Basilich', 'noxus-city'],
  ['DoubleBattleScene', 'showdown', 'NO03_Basilich', 'generic'],
  ['DoubleBattleScene', 'sandbox', 'NO03_Basilich', 'generic'],
  ['BattleScene', 'showdown', 'NO03_Basilich', 'noxus-city'],
  ['BattleScene', undefined, 'missing-map', 'generic'],
  ['DoubleBattleScene', 'showdown', undefined, 'generic']
]) {
  const images = [];
  const node = { setDisplaySize: () => node, setDepth: () => node, setOrigin: () => node };
  draw({
    sys: { settings: { key: sceneKey } },
    registry: { get: key => key === 'save' ? { currentMapId: saveId } : key === 'battle.teamSession' ? { kind } : undefined },
    cameras: { main: { setBackgroundColor() {} } }, textures: { exists: () => true },
    add: { image: (x, y, key) => { images.push({ x, y, key }); return node; }, rectangle: () => node, line: () => node }
  });
  assert.deepEqual(images, [{ x: 480, y: 270, key: COMBAT_BACKGROUNDS[expected].key }]);
}
console.log(`Combat backgrounds OK: 8 PNGs, ${count} existing maps, future regions and generic fallback.`);
