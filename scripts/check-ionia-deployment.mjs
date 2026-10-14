import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const dep = read('docs/diseno/jonia/interiores/despliegue.json');
assert.equal(dep.instances.length, 24); assert.equal(dep.facades.length, 20);
assert.equal(dep.instances.filter(instance => instance.reserved).length, 1);
assert.equal(dep.merchantStalls.length, 1);
const templates = read('docs/diseno/jonia/interiores/catalogo.json').mapas;
const maps = new Map();
for (const id of [...dep.instances.map(i => i.mapId), ...new Set(dep.facades.map(f => f.mapId))]) {
  const def = read(`src/data/world/regions/ionia/zones/${id}/map.json`);
  const m = read('public/' + def.tiled.url.replace('./', ''));
  const get = (n, c, r) => m.layers.find(l => l.name === n)?.data?.[r * m.width + c] || 0;
  // This validator checks permanent building geometry. Conditional story
  // barriers are checked separately in check-karma-access.mjs, in each phase.
  const rects = (m.layers.find(l => l.name === 'Collisions')?.objects || []).filter(o => !o.properties?.some(p => p.name === 'blockedUntilFlag'));
  const free = (x, y, hx = 11, hy = 8) => {
    for (const xx of [x - hx, x + hx]) for (const yy of [y - hy, y + hy]) {
      const c = Math.floor(xx / 32), r = Math.floor(yy / 32);
      if (c < 0 || r < 0 || c >= m.width || r >= m.height || get('Vallas', c, r)
        || (get('Obstacles', c, r) && !get('Paths', c, r)) || (get('Agua', c, r) && !get('Paths', c, r))) return false;
    }
    return !rects.some(o => x + hx > o.x && x - hx < o.x + o.width && y + hy > o.y && y - hy < o.y + o.height);
  };
  assert(free(def.spawn.x, def.spawn.y, 7, 5), `${id}: blocked default arrival`);
  const instance = dep.instances.find(i => i.mapId === id);
  if (instance) {
    const source = read(templates.find(t => t.id === instance.templateId).path);
    const actualLayers=m.layers.filter(l=>l.type==='tilelayer'), sourceLayers=source.layers.filter(l=>l.type==='tilelayer');
    assert.deepEqual(actualLayers.map(l=>l.name),sourceLayers.map(l=>l.name),`${id}: tile-layer order changed`);
    for(let li=0;li<actualLayers.length;li++) {
      const actual=actualLayers[li],original=sourceLayers[li];
      assert.deepEqual({...actual,data:[]},{...original,data:[]},`${id}: layer metadata altered`);
      for(let index=0;index<actual.data.length;index++) {
        const x=index%m.width*32,y=Math.floor(index/m.width)*32;
        const edited=(instance.customizedTileRegions??[]).some(([x0,y0,x1,y1])=>x>=x0&&x<x1&&y>=y0&&y<y1);
        if(!edited)assert.equal(actual.data[index],original.data[index],`${id}: artwork changed outside authored additions`);
      }
    }
    assert(def.tiled.tilesets.every(s => s.name.startsWith('jonia-interiores-')), `${id}: retained Bandle assets`);
  }
  maps.set(id, { m, def, free });
}
for (const { m } of maps.values()) for (const o of m.layers.find(l => l.name === 'Portals').objects) {
  const p = Object.fromEntries(o.properties.map(p => [p.name, p.value]));
  const filename = `src/data/world/regions/ionia/zones/${p.targetMap}/map.json`;
  if (!fs.existsSync(filename)) continue; // Cross-region exits remain covered by the world map validator.
  const target = read(filename);
  assert(target.spawns[p.targetSpawn], `Missing arrival ${p.targetMap}/${p.targetSpawn}`);
}
for (const f of dep.facades) {
  const { m, free } = maps.get(f.mapId);
  const door = m.layers.find(l => l.name === 'Portals').objects.find(o => o.name === f.doorId);
  assert(door, `Missing exterior gate ${f.doorId}`);
  assert(door.properties.some(p => p.name === 'entranceOnly' && p.value === true), `${f.houseId}: gate can be selected from a side wall`);
  assert(free(f.approach.x, f.approach.y, 7, 5), `${f.houseId}: cannot approach door`);
  const colliders = m.layers.find(l => l.name === 'Collisions').objects.filter(o => o.properties.some(p => p.name === 'buildingId' && p.value === f.houseId));
  assert(colliders.length, `${f.houseId}: facade without collision`);
  assert(!free(f.bounds[0] + 16, (f.bounds[1] + f.bounds[3]) / 2, 1, 1), `${f.houseId}: can cross left facade`);
}
for (const filename of fs.readdirSync('src/contenido/mundo/npcs')) {
  const entries = [read('src/contenido/mundo/npcs/' + filename)].flat();
  for (const n of entries) {
    const info = maps.get(n.mapaId); if (!info) continue;
    const marker = n.spawnId && info.m.layers.find(l => l.name === 'NpcSpawns')?.objects.find(o => o.name === n.spawnId);
    const start = marker || n;
    assert(info.free(start.x, start.y), `${n.id}: NPC inside facade or furniture`);
    const pts = n.comportamiento?.puntos || [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      for (let t = 0; t <= 1; t += 0.1) assert(info.free(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t), `${n.id}: patrol crosses new wall`);
    }
  }
}
console.log('Validated 20 solid exterior houses, 23 active interiors, one reserved interior, bounded carpet/stair additions and NPC routes.');
