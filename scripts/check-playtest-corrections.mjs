import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const { DataRegistry: D } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  const { KarmaAccessService: A } = await server.ssrLoadModule('/src/systems/world/KarmaAccessService.ts');
  const { ConditionService: C } = await server.ssrLoadModule('/src/systems/world/ConditionService.ts');
  const { WorldActionService: W } = await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
  const { SaveService: S } = await server.ssrLoadModule('/src/systems/save/SaveService.ts');
  assert.deepEqual(D.validate(), []);
  const dialogue = (save, id) => { for (const node of D.dialogue(id).nodes) W.applyAll(save, node.actions); A.sync(save); };
  const choice = (save, id) => { const n = D.npc(id); return n.dialogueVariants?.find((v) => C.matchesAll(save, v.conditions))?.dialogueId ?? n.dialogueId; };
  const mapData = (id) => { const d = D.map(id); return [d, read('public/' + d.tiled.url.replace('./', ''))]; };
  const walk = (id, flags = [], start) => {
    const [d, j] = mapData(id), layers = new Map(j.layers.map((l) => [l.name, l]));
    const tile = (n, c, r) => layers.get(n)?.data?.[r * j.width + c] ?? 0;
    const rects = ['Collisions', 'BridgeRails'].flatMap((n) => layers.get(n)?.objects ?? []).filter((o) => {
      const until = o.properties?.find((p) => p.name === 'blockedUntilFlag')?.value; return !until || !flags.includes(until);
    });
    const free = (c, r) => {
      if (c < 0 || r < 0 || c >= j.width || r >= j.height) return false;
      const x = c * 32 + 16, y = r * 32 + 16;
      if (rects.some((o) => x + 9 > o.x && x - 9 < o.x + o.width && y + 7 > o.y && y - 7 < o.y + o.height)) return false;
      return !tile('Vallas', c, r) && !['Obstacles', 'Agua'].some((n) => tile(n, c, r) && !tile('Paths', c, r));
    };
    const spawn = start ?? d.spawn, key = (c, r) => r * j.width + c;
    const queue = [[Math.floor(spawn.x / 32), Math.floor(spawn.y / 32)]], seen = new Set([key(...queue[0])]);
    for (const [c, r] of queue) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = key(c + dc, r + dr); if (free(c + dc, r + dr) && !seen.has(k)) { seen.add(k); queue.push([c + dc, r + dr]); }
    }
    return { j, tile, free, seen, reachable: (x, y) => seen.has(key(Math.floor(x / 32), Math.floor(y / 32))) };
  };
  const save = createNewGame(); A.sync(save);
  assert.equal(choice(save, 'ionia-karma-pagoda-guide'), 'ionia-karma-pagoda-wait');
  assert(!C.matchesAll(save, D.npc('ionia-karma-intro').conditions));
  let reachable = walk('jo05_placidium', save.worldProgress.flags);
  assert(!reachable.reachable(1440, 2480), 'Fresh save must not reach the pagoda doorway');
  assert(!reachable.reachable(560, 1264), 'Fresh save must not reach the memorial');
  assert(!reachable.reachable(2064, 624), 'Fresh save must not reach Irelia');
  dialogue(save, 'ionia-karma-suyin-opening');
  assert.equal(choice(save, 'ionia-karma-pagoda-guide'), 'ionia-karma-pagoda-invitation');
  assert(save.quests['ionia-karma-memory']); assert(!save.worldProgress.flags.includes('story:karma-pagoda-open'));
  const reloaded = S.deserializeSave(JSON.stringify(save));
  assert(!reloaded.worldProgress.flags.includes('story:karma-pagoda-open'), 'Reload must not bypass Yun on a new investigation');
  dialogue(save, 'ionia-karma-pagoda-invitation');
  assert(C.matchesAll(save, D.npc('ionia-karma-intro').conditions));
  assert.equal(choice(save, 'ionia-karma-intro'), 'ionia-karma-intro', 'First audience must show the actual introduction');
  reachable = walk('jo05_placidium', save.worldProgress.flags); assert(reachable.reachable(1440, 2480));
  dialogue(save, 'ionia-karma-intro'); dialogue(save, 'ionia-karma-keeper'); dialogue(save, 'ionia-karma-tao');
  assert(save.worldProgress.flags.includes('story:karma-memorial-open'));
  reachable = walk('jo05_placidium', save.worldProgress.flags);
  assert(reachable.reachable(560, 1264)); assert(reachable.reachable(592, 1232));
  assert(!reachable.reachable(2064, 624), 'The memorial must not open the summit');
  const guards = D.npcs('jo05_placidium').filter((n) => /ionia-(ascent|summit)-custodian/.test(n.id) && C.matchesAll(save, n.conditions));
  assert.equal(guards.length, 2); assert(guards.every((n) => n.id.includes('summit')));
  dialogue(save, 'ionia-karma-stone'); dialogue(save, 'ionia-karma-inscription');
  assert(save.worldProgress.flags.includes('story:ionia-karma-inscription'));
  save.worldProgress.flags.push('story:ionia-noxus-attack'); A.sync(save);
  assert(walk('jo05_placidium', save.worldProgress.flags).reachable(2064, 624), 'The later attack must open the summit');
  assert(C.matchesAll(save, D.npc('ionia-irelia-final-trial').conditions));
  const old = createNewGame(); old.gold = 777; dialogue(old, 'ionia-karma-intro'); dialogue(old, 'ionia-karma-keeper');
  old.worldProgress.flags = old.worldProgress.flags.filter((f) => !f.startsWith('story:karma-access-revision'));
  const migrated = S.deserializeSave(JSON.stringify(old)); assert.equal(migrated.gold, 777); assert(migrated.quests['ionia-karma-memory']);
  assert(migrated.worldProgress.flags.includes('story:karma-pagoda-open'));
  const stranded = createNewGame(); stranded.currentMapId = 'jo05_placidium'; stranded.playerPosition = { x: 2064, y: 624 }; A.migrate(stranded);
  assert(walk('jo05_placidium', stranded.worldProgress.flags).reachable(stranded.playerPosition.x, stranded.playerPosition.y));
  const loot = read('docs/diseno/exploracion-recompensas.json'); assert.equal(loot.length, 38);
  const cached = new Map();
  for (const entry of loot) {
    if (!cached.has(entry.mapId)) cached.set(entry.mapId, walk(entry.mapId));
    const grid = cached.get(entry.mapId), o = grid.j.layers.find((l) => l.name === 'Interactions').objects.find((o) => o.name === entry.objectId);
    assert(o); assert.equal(o.x, entry.after.x); assert.equal(o.y, entry.after.y);
    assert.deepEqual(o.properties, entry.properties, `${entry.objectId}: rewards/conditions altered`);
    const c = Math.floor((o.x + 12) / 32), r = Math.floor((o.y + 12) / 32);
    assert(grid.free(c, r) && grid.reachable(o.x + 12, o.y + 12), `${entry.objectId}: unreachable pickup`);
    assert(!grid.tile('Paths', c, r)); assert(entry.detourTiles >= 3);
    assert(!grid.tile('AbovePlayer', c, r), `${entry.objectId}: hidden under artwork`);
    for (const other of loot.filter((e) => e.mapId === entry.mapId && e.objectId !== entry.objectId)) {
      assert(Math.hypot(entry.after.x - other.after.x, entry.after.y - other.after.y) >= 160, 'Do not stack rewards');
    }
  }
  console.log('Suyin → Yun → Karma; blocked pagoda/ascent, accessible memorial and inscription, reserved summit/later attack, legacy saves and 38 reachable off-path rewards: OK.');
} finally { await server.close(); }
