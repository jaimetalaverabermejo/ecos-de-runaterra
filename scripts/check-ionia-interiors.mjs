import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const catalog = read('docs/diseno/jonia/interiores/catalogo.json');
assert.equal(catalog.mapas.length, 16);
assert.equal(catalog.mapas.filter(m => m.tipo === 'generica').length, 10);
const maps = new Map();
for (const entry of catalog.mapas) {
  const m = read(entry.path);
  assert.equal(m.tilewidth, 32); assert.equal(m.tileheight, 32);
  assert.equal(m.orientation, 'orthogonal');
  const runtime = read(entry.path.replace('.tmj', '.runtime.json'));
  assert.equal(runtime.tilesets.length, 3);
  for (const set of runtime.tilesets) {
    assert.equal(set.margin, 0); assert.equal(set.spacing, 0);
    assert(set.tiles?.some(t => t.properties?.some(p => p.name === 'assetId')), 'Lost TSX tile metadata');
  }
  const ids = m.layers.filter(l => l.objects).flatMap(l => l.objects.map(o => o.id));
  assert.equal(new Set(ids).size, ids.length, `${entry.id}: duplicate object id`);
  assert(m.nextobjectid > Math.max(...ids), `${entry.id}: stale counter`);
  for (const set of m.tilesets) assert(fs.existsSync(path.resolve(path.dirname(entry.path), set.source)), 'Broken TSX path');
  const obstacle = m.layers.find(l => l.name === 'Obstacles').data;
  const blocked = new Set(obstacle.flatMap((v, i) => v ? [i] : []));
  for (const rect of m.layers.find(l => l.name === 'Collisions').objects) {
    for (let y = rect.y / 32; y < (rect.y + rect.height) / 32; y++) for (let x = rect.x / 32; x < (rect.x + rect.width) / 32; x++) blocked.add(y * m.width + x);
  }
  const free = (x, y) => x >= 0 && y >= 0 && x < m.width && y < m.height && !blocked.has(y * m.width + x);
  const start = Math.floor(entry.entrada.y / 32) * m.width + Math.floor(entry.entrada.x / 32);
  const q = [start], seen = new Set(q);
  for (let i = 0; i < q.length; i++) {
    const x = q[i] % m.width, y = Math.floor(q[i] / m.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = (y + dy) * m.width + x + dx;
      if (free(x + dx, y + dy) && !seen.has(next)) { seen.add(next); q.push(next); }
    }
  }
  for (const o of m.layers.filter(l => ['Spawns', 'NpcSpawns'].includes(l.name)).flatMap(l => l.objects)) {
    assert(seen.has(Math.floor(o.y / 32) * m.width + Math.floor(o.x / 32)), `${entry.id}: inaccessible ${o.name}`);
  }
  for (const p of entry.residentPatrol) for (const dx of [-11, 11]) for (const dy of [-8, 8]) {
    assert(free(Math.floor((p.x + dx) / 32), Math.floor((p.y + dy) / 32)), `${entry.id}: patrol body clips furniture`);
  }
  for (const o of m.layers.find(l => l.name === 'Portals').objects) {
    assert([...seen].some(k => Math.hypot(Math.max(o.x - (k % m.width * 32 + 16), 0, k % m.width * 32 + 16 - o.x - o.width), Math.max(o.y - (Math.floor(k / m.width) * 32 + 16), 0, Math.floor(k / m.width) * 32 + 16 - o.y - o.height)) <= 32), `${entry.id}: inaccessible portal ${o.name}`);
  }
  maps.set(entry.id, m);
}
for (const m of maps.values()) for (const o of m.layers.find(l => l.name === 'Portals').objects) {
  const p = Object.fromEntries(o.properties.map(p => [p.name, p.value]));
  if (maps.has(p.targetMap)) assert(maps.get(p.targetMap).layers.find(l => l.name === 'Spawns').objects.some(s => s.name === p.targetSpawn), 'Broken theater room link');
  else {
    const file = `src/data/world/regions/ionia/zones/${p.targetMap}/map.json`;
    assert(fs.existsSync(file), `Missing default outside ${p.targetMap}`);
    assert(read(file).spawns[p.targetSpawn], `Missing default return ${p.targetSpawn}`);
  }
}
for (const { png, tsx } of Object.values(catalog.tiles)) {
  const image = fs.readFileSync(png);
  assert.equal(image.readUInt32BE(16) % 32, 0); assert.equal(image.readUInt32BE(20) % 32, 0);
  assert(fs.readFileSync(tsx, 'utf8').includes('../tiles/'));
}
console.log('Validated 16 interior templates, paths, TSX metadata, exits, connected theater, reachable NPC patrols and collision footprints.');
