import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const walk = root => readdirSync(root, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(`${root}/${entry.name}`) : [`${root}/${entry.name}`]);
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const definitions = walk('src/data/world/regions').filter(path => path.endsWith('/map.json')).map(json);
const maps = new Map(definitions.map(map => [map.id, map]));
let portals = 0;
for (const definition of definitions) {
  if (!definition.tiled) continue;
  const runtimePath = `public/${definition.tiled.url.replace(/^\.\//, '')}`;
  assert(existsSync(runtimePath), `Runtime missing: ${runtimePath}`);
  const runtime = json(runtimePath);
  for (const tileset of definition.tiled.tilesets) {
    assert(existsSync(`public/${tileset.url.replace(/^\.\//, '')}`), `${definition.id}: missing image ${tileset.url}`);
    assert(runtime.tilesets.some(set => set.name === tileset.name), `${definition.id}: missing tileset ${tileset.name}`);
  }
  for (const layer of runtime.layers) {
    if (layer.data) assert.equal(layer.data.length, runtime.width * runtime.height, `${definition.id}: invalid layer ${layer.name}`);
    if (layer.name !== 'Portals') continue;
    for (const portal of layer.objects) {
      const props = Object.fromEntries((portal.properties ?? []).map(prop => [prop.name, prop.value]));
      const target = maps.get(props.targetMap);
      assert(target, `${definition.id}: unknown portal destination ${props.targetMap}`);
      if (props.targetSpawn) {
        const targetRuntime = target.tiled ? json(`public/${target.tiled.url.replace(/^\.\//, '')}`) : undefined;
        assert(target.spawns?.[props.targetSpawn] || targetRuntime?.layers.find(l => l.name === 'Spawns')?.objects.some(o => o.name === props.targetSpawn), `${definition.id}: unknown spawn ${props.targetSpawn}`);
      }
      portals++;
    }
  }
  if (definition.id.startsWith('jo0') || definition.id === 'portal_mountains') {
    const obstacles = runtime.layers.find(l => l.name === 'Obstacles');
    const paths = runtime.layers.find(l => l.name === 'Paths');
    for (const [id, spawn] of Object.entries(definition.spawns ?? {})) {
      const index = Math.floor(spawn.y / runtime.tileheight) * runtime.width + Math.floor(spawn.x / runtime.tilewidth);
      assert(!obstacles?.data[index] || paths?.data[index], `${definition.id}: blocked spawn ${id}`);
      for (const portal of runtime.layers.find(l => l.name === 'Portals')?.objects ?? []) {
        assert(!(spawn.x > portal.x && spawn.x < portal.x + portal.width && spawn.y > portal.y && spawn.y < portal.y + portal.height), `${definition.id}: spawn ${id} inside portal ${portal.name}`);
      }
    }
  }
}
for (const path of definitions.filter(map => map.tiled).map(map => `public/${map.tiled.url.replace(/^\.\//, '').replace('.runtime.json', '.tmj')}`)) {
  for (const set of json(path).tilesets) for (const key of ['image', 'source']) {
    if (set[key]) assert(existsSync(resolve(dirname(path), set[key])), `${path}: missing ${set[key]}`);
  }
}
console.log(`Validated ${definitions.length} map definitions and ${portals} portal destinations; all active Tiled maps resolve their tilesets.`);
