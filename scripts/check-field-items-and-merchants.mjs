import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const { FieldItemService: Field } = await server.ssrLoadModule('/src/systems/inventory/FieldItemService.ts');
  const { BattleEngine: Battle } = await server.ssrLoadModule('/src/systems/combat/BattleEngine.ts');
  const { DataRegistry: D } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { ShopService: Shop } = await server.ssrLoadModule('/src/systems/shop/ShopService.ts');
  const { SaveService: Saves } = await server.ssrLoadModule('/src/systems/save/SaveService.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  const itemId = 'minor-healing-potion';
  const save = createNewGame();
  const eco = { instanceId: 'field-test', championId: 'lulu', mastery: 16, masteryExperience: 0,
    skillRanks: { q: 2, w: 2, e: 2, r: 1 }, unspentSkillPoints: 0, currentHp: 1, runeTraits: [], equippedItems: [] };
  save.party = [eco]; save.gold = 100; save.inventory[itemId] = 0;
  for (const id of ['bandle-workshop', 'lhradi-market']) {
    const entries = D.shop(id).entries.filter(e => e.itemId === itemId);
    assert.equal(entries.length, 1); assert.equal(entries[0].price, 50);
  }
  const entry = D.shop('lhradi-market').entries.find(e => e.itemId === itemId);
  assert(Shop.buy(save, entry).ok); assert.equal(save.gold, 50);
  const otherHp = 12;
  save.party.push({ ...eco, instanceId: 'other', currentHp: otherHp });
  assert(Field.use(save, itemId, eco.instanceId).ok); assert.equal(eco.currentHp, 36);
  assert.equal(save.party[1].currentHp, otherHp); assert.equal(save.inventory[itemId], undefined);
  const before = JSON.stringify(save);
  assert(!Field.use(save, itemId, eco.instanceId).ok); assert.equal(JSON.stringify(save), before);
  save.inventory[itemId] = 3;
  const maxHp = Battle.statsFor(eco).hp;
  eco.currentHp = maxHp;
  for (const target of ['missing', eco.instanceId]) {
    const snapshot = JSON.stringify(save);
    assert(!Field.use(save, itemId, target).ok); assert.equal(JSON.stringify(save), snapshot);
  }
  eco.currentHp = 0;
  assert(!Field.use(save, itemId, eco.instanceId).ok); assert.equal(save.inventory[itemId], 3);
  eco.currentHp = maxHp - 4;
  const capped = Field.use(save, itemId, eco.instanceId);
  assert(capped.ok); assert.equal(capped.healed, 4); assert.equal(eco.currentHp, maxHp); assert.equal(save.inventory[itemId], 2);
  assert(!Field.supports(D.item('long-sword')));
  const restored = Saves.deserializeSave(JSON.stringify(save));
  assert.equal(restored.party[0].currentHp, maxHp); assert.equal(restored.inventory[itemId], 2); assert.equal(restored.gold, 50);

  const vendors = read('src/contenido/mundo/npcs/ionia-navori.json').filter(n => n.servicio?.tipo === 'tienda');
  assert.deepEqual(vendors.map(n => n.mapaId).sort(), ['jo03_lhradi', 'jo09_forest_landing', 'jo16_orders_village'].sort());
  const src = read('public/assets/world/regions/Jonia/Zones/JO03_Lhradi/JO03_Lhradi.tmj');
  const sourceSet = src.tilesets.find(s => s.source.endsWith('/Bandle casas.tsx'));
  const source = fs.readFileSync('src/scenes/WorldScene.ts', 'utf8');
  const body = source.split('  private updateNpcs(): void {')[1].split('\n  private stopNpc(')[0].trim().replace(/\}\s*$/, '');
  const update = new Function('Phaser', `return function () {${body}}`)({ Math: { Distance: { Between: (x, y, xx, yy) => Math.hypot(x - xx, y - yy) } } });
  for (const vendor of vendors) {
    assert.equal(vendor.actorId, 'otter-merchant'); assert.equal(vendor.servicio.tiendaId, 'lhradi-market');
    const cfg = D.map(vendor.mapaId), m = read('public/' + cfg.tiled.url.replace('./', ''));
    const layers = new Map(m.layers.map(l => [l.name, l]));
    const rects = ['Collisions', 'BridgeRails'].flatMap(n => layers.get(n)?.objects ?? []).filter(o => !o.properties?.some(p => p.name === 'blockedUntilFlag'));
    const tile = (name, c, r) => layers.get(name)?.data?.[r * m.width + c] ?? 0;
    const free = (x, y) => x >= 11 && y >= 8 && x < cfg.width - 11 && y < cfg.height - 8
      && !rects.some(o => x + 11 > o.x && x - 11 < o.x + o.width && y + 8 > o.y && y - 8 < o.y + o.height)
      && [-11, 11].every(dx => [-8, 8].every(dy => {
        const c = Math.floor((x + dx) / 32), r = Math.floor((y + dy) / 32);
        return !tile('Vallas', c, r) && !['Obstacles', 'Agua'].some(n => tile(n, c, r) && !tile('Paths', c, r));
      }));
    const queue = [[Math.floor(cfg.spawn.x / 32), Math.floor(cfg.spawn.y / 32)]];
    const seen = new Set(queue.map(p => p.join(',')));
    for (const [c, r] of queue) for (const [cc, rr] of [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]]) {
      const key = `${cc},${rr}`;
      if (!seen.has(key) && free(cc * 32 + 16, rr * 32 + 16)) { seen.add(key); queue.push([cc, rr]); }
    }
    assert(queue.some(([c, r]) => Math.hypot(c * 32 + 16 - vendor.x, r * 32 + 16 - vendor.y) <= 50), vendor.id + ': reachable from arrival');
    const coords = vendor.mapaId === 'jo03_lhradi' ? [47, 40] : vendor.mapaId === 'jo09_forest_landing' ? [12, 35] : [14, 48];
    const set = m.tilesets.find(s => s.name === 'Bandle casas');
    for (const name of ['Structures', 'AbovePlayer']) for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const raw = src.layers.find(l => l.name === name).data[(40 + r) * src.width + 47 + c];
      assert.equal(tile(name, coords[0] + c, coords[1] + r), raw ? set.firstgid + raw - sourceSet.firstgid : 0, vendor.id + ': same exterior art');
    }
    const npc = { placement: { behavior: { type: 'patrol', points: vendor.comportamiento.puntos, speed: vendor.comportamiento.velocidad, pauseMs: vendor.comportamiento.pausaMs } }, patrolIndex: 0, pauseUntil: 0,
      body: { x: vendor.x, y: vendor.y, body: { vx: 0, vy: 0, setVelocity(x, y) { this.vx = x; this.vy = y; } }, setPosition(x, y) { this.x = x; this.y = y; } } };
    const scene = { time: { now: 0 }, npcs: [npc], player: { x: 0, y: 0 }, isFollowerActive: () => false, isGuideActive: () => false, stopNpc(n) { n.body.body.setVelocity(0, 0); }, syncNpcVisual() {} };
    const step = () => { scene.time.now += 100; update.call(scene); npc.body.x += npc.body.body.vx * .1; npc.body.y += npc.body.body.vy * .1; assert(free(npc.body.x, npc.body.y), vendor.id + ': patrol on free floor'); };
    for (let i = 0; i < 18; i++) step();
    assert(Math.abs(npc.body.x - vendor.x) > 5, vendor.id + ': moves');
    scene.player = { x: npc.body.x, y: npc.body.y + 30 };
    const paused = npc.body.x;
    for (let i = 0; i < 10; i++) step(); assert.equal(npc.body.x, paused);
    scene.player = { x: 0, y: 0 };
    for (let i = 0; i < 20; i++) step(); assert(Math.abs(npc.body.x - paused) > 3, vendor.id + ': resumes');
  }
  console.log('50-gold potions; field healing, caps, KO/full-HP/no-stock rejection, persistence; three identical reachable outdoor shops and real merchant movement/pause/resume: OK.');
} finally { await server.close(); }
