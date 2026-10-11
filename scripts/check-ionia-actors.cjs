const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const placements = read('src/contenido/mundo/npcs/ionia-ambient.json');
const dialogs = read('src/contenido/mundo/dialogos/ionia-ambient.json');
const guide = read('docs/diseno/jonia/distribucion-actores.json');
const presets = [...read('src/contenido/mundo/actores/ionia.json'), ...read('src/contenido/mundo/actores/bandle.json')];
const maps = new Map();
for (const npc of placements) {
  assert(presets.some(a => a.id === npc.actorId), `${npc.id}: missing actor`);
  assert(dialogs.find(d => d.id === npc.dialogoId)?.nodos[0].lineas.length, `${npc.id}: missing interaction`);
  const zone = guide.zonas.find(z => z.mapaId === npc.mapaId);
  assert(zone && zone.numero <= 5, `${npc.id}: inactive map`);
  assert(npc.actorId === 'poro' || [...zone.npcPrincipales, ...zone.npcOcasionales, ...zone.faunaHabitual, ...zone.faunaOcasional].includes(npc.actorId), `${npc.id}: habitat disagrees with guide`);
  if (!maps.has(npc.mapaId)) {
    const def = read(`src/data/world/regions/ionia/zones/${npc.mapaId}/map.json`);
    const map = read('public/' + def.tiled.url.replace('./', ''));
    const tile = (name, c, r) => map.layers.find(l => l.name === name)?.data?.[r * map.width + c] || 0;
    const free = (c, r) => c >= 0 && r >= 0 && c < map.width && r < map.height && !tile('Vallas', c, r) && !tile('BridgeRails', c, r)
      && (!tile('Obstacles', c, r) || tile('Paths', c, r)) && (!tile('Agua', c, r) || tile('Paths', c, r));
    const start = Math.floor(def.spawn.y / 32) * map.width + Math.floor(def.spawn.x / 32), q = [start], seen = new Set(q);
    for (let i = 0; i < q.length; i++) {
      const c = q[i] % map.width, r = Math.floor(q[i] / map.width);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const key = (r + dr) * map.width + c + dc;
        if (free(c + dc, r + dr) && !seen.has(key)) { seen.add(key); q.push(key); }
      }
    }
    maps.set(npc.mapaId, { map, tile, free, seen });
  }
  const { map, tile, free, seen } = maps.get(npc.mapaId);
  const points = npc.comportamiento.puntos;
  assert(points.length >= 2 && Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) >= 24, `${npc.id}: trivial patrol`);
  // Sample the whole route, including the physics body's corners, rather than just endpoints.
  const actor = presets.find(a => a.id === npc.actorId);
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    for (let t = 0; t <= 1; t += 0.1) {
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      for (const dx of [-actor.anchoHitbox / 2, actor.anchoHitbox / 2]) for (const dy of [-actor.altoHitbox / 2, actor.altoHitbox / 2]) {
        const c = Math.floor((x + dx) / 32), r = Math.floor((y + dy) / 32);
        assert(free(c, r) && seen.has(r * map.width + c) && !tile('TallGrass', c, r), `${npc.id}: blocked or unreachable patrol`);
        assert(!['Ledges_down', 'Ledges_left', 'Ledges_right'].some(n => tile(n, c, r)), `${npc.id}: patrol on ledge`);
      }
    }
  }
}
for (const actor of read('src/contenido/mundo/actores/ionia.json')) {
  const png = fs.readFileSync(`src/contenido/mundo/actores/${actor.id}.png`);
  assert(png.readUInt32BE(16) === 288 && png.readUInt32BE(20) === 384, `${actor.id}: incompatible sheet`);
}
assert.equal(placements.filter(n => n.actorId === 'poro').length, 2, 'Keep poros sparse in Ionia');
console.log(`Validated ${placements.length} ambient interactions and accessible patrols, 32 sheets, habitats and sparse poros.`);
