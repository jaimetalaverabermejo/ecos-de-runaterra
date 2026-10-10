const fs = require('node:fs');
const assert = require('node:assert/strict');
const ids = ['jo01_koeshin', 'jo02_white_cliffs', 'jo03_lhradi', 'jo04_rice_fields', 'jo05_placidium'];
for (const id of ids) {
  const definition = JSON.parse(fs.readFileSync(`src/data/world/regions/ionia/zones/${id}/map.json`));
  const map = JSON.parse(fs.readFileSync(`public/${definition.tiled.url.replace('./', '')}`));
  const tile = (name, col, row) => map.layers.find(layer => layer.name === name)?.data?.[row * map.width + col] || 0;
  const free = (col, row) => col >= 0 && row >= 0 && col < map.width && row < map.height
    && !tile('Vallas', col, row)
    && (!tile('Obstacles', col, row) || tile('Paths', col, row))
    && (!tile('Agua', col, row) || tile('Paths', col, row));
  const start = Math.floor(definition.spawn.y / 32) * map.width + Math.floor(definition.spawn.x / 32);
  const queue = [start], seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const col = queue[i] % map.width, row = Math.floor(queue[i] / map.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = (row + dy) * map.width + col + dx;
      if (free(col + dx, row + dy) && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  const reachable = (x, y) => seen.has(Math.floor(y / 32) * map.width + Math.floor(x / 32));
  for (const [name, point] of Object.entries(definition.spawns)) {
    assert(reachable(point.x, point.y), `${id}: unreachable arrival ${name}`);
  }
  for (const layer of map.layers.filter(layer => ['Interactions', 'NpcSpawns'].includes(layer.name))) {
    for (const object of layer.objects) {
      assert(reachable(object.x + (object.width || 0) / 2, object.y + (object.height || 0) / 2), `${id}: unreachable ${object.name}`);
    }
  }
  const grass = map.layers.find(layer => layer.name === 'TallGrass');
  assert(grass.data.some((gid, index) => gid && seen.has(index)), `${id}: no accessible encounter grass`);
  for (const portal of map.layers.find(layer => layer.name === 'Portals').objects) {
    const props = Object.fromEntries(portal.properties.map(prop => [prop.name, prop.value]));
    assert([...seen].some(index => {
      const x = (index % map.width) * 32 + 16, y = Math.floor(index / map.width) * 32 + 16;
      const distance = Math.hypot(Math.max(portal.x - x, 0, x - portal.x - portal.width), Math.max(portal.y - y, 0, y - portal.y - portal.height));
      return distance <= (props.trigger === 'interact' ? 48 : 0);
    }), `${id}: inaccessible gate ${portal.name}`);
  }
  console.log(`${id}: arrivals, gates, objectives and encounter grass reachable.`);
}

const npcs = JSON.parse(fs.readFileSync('src/contenido/mundo/npcs/ionia-navori.json'));
for (const npc of npcs.filter(npc => npc.mapaId.includes('_house_'))) {
  const definition = JSON.parse(fs.readFileSync(`src/data/world/regions/ionia/zones/${npc.mapaId}/map.json`));
  const map = JSON.parse(fs.readFileSync(`public/${definition.tiled.url.replace('./', '')}`));
  const index = Math.floor(npc.y / 32) * map.width + Math.floor(npc.x / 32);
  assert(!map.layers.find(layer => layer.name === 'Obstacles')?.data[index], `${npc.id}: occupant inside furniture`);
}
console.log('All interior occupants stand on walkable floor.');
