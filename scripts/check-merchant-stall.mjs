import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const npcs = read('src/contenido/mundo/npcs/ionia-navori.json');
const bandleVendor = read('src/contenido/mundo/npcs/bandle-village.json').find(npc => npc.id === 'runeterra-merchant-bandle');
const vendors = npcs.filter(npc => npc.servicio?.tipo === 'tienda');
assert.equal(vendors.length, 1);
const vendor = vendors[0];
assert.equal(vendor.actorId, bandleVendor.actorId);
assert.equal(vendor.nombre, bandleVendor.nombre);
assert.equal(vendor.mapaId, 'jo03_lhradi');
assert.equal(vendor.servicio.tiendaId, 'lhradi-market');
assert(!npcs.some(npc => npc.id === 'ionia-merchant-inside'));
const map = read('public/assets/world/regions/Jonia/Zones/JO03_Lhradi/JO03_Lhradi.tmj');
const bandle = read('public/assets/world/regions/bandle-city/zones/bandle_village/bandle_village.tmj');
const tileset = map.tilesets.find(set => set.source?.endsWith('/Bandle casas.tsx'));
for (const [sourceName, targetName] of [['Obstacles', 'Structures'], ['AbovePlayer', 'AbovePlayer']]) {
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const sourceGid = bandle.layers.find(layer => layer.name === sourceName).data[(32 + r) * bandle.width + 52 + c];
    const targetGid = map.layers.find(layer => layer.name === targetName).data[(40 + r) * map.width + 47 + c];
    assert.equal(targetGid, sourceGid ? tileset.firstgid + sourceGid - 193 : 0, 'Stall art must match Bandle exactly');
  }
}
assert(!map.layers.find(layer => layer.name === 'Portals').objects.some(object => object.name === 'door_house_8'));
const oldInterior = read('public/assets/world/regions/Jonia/Zones/JO03_Lhradi/Interiors/jo03_lhradi_house_08.tmj');
assert.equal(oldInterior.layers.find(layer => layer.name === 'Interactions').objects.length, 0);
assert(oldInterior.layers.find(layer => layer.name === 'Portals').objects.some(object => object.properties.some(prop => prop.name === 'targetMap' && prop.value === 'jo03_lhradi')));
assert(map.layers.find(layer => layer.name === 'Spawns').objects.some(object => object.name === 'from_house_8'));
assert(read('docs/diseno/jonia/interiores/despliegue.json').instances.find(instance => instance.mapId === 'jo03_lhradi_house_08').reserved);
// Run the actual WorldScene movement method with simulated Arcade integration.
// This checks displacement and pause/resume, not just the JSON patrol declaration.
const source = fs.readFileSync('src/scenes/WorldScene.ts', 'utf8');
const body = source.split('  private updateNpcs(): void {')[1].split('\n  private stopNpc(')[0].trim().replace(/\}\s*$/, '');
const update = new Function('Phaser', `return function () {${body}}`)({ Math: { Distance: { Between: (x, y, xx, yy) => Math.hypot(x - xx, y - yy) } } });
const npc = { placement: { behavior: { type: 'patrol', points: vendor.comportamiento.puntos, speed: vendor.comportamiento.velocidad, pauseMs: vendor.comportamiento.pausaMs } },
  patrolIndex: 0, pauseUntil: 0, body: { x: vendor.x, y: vendor.y, body: { vx: 0, vy: 0, setVelocity(x, y) { this.vx = x; this.vy = y; } }, setPosition(x, y) { this.x = x; this.y = y; } } };
const scene = { time: { now: 0 }, npcs: [npc], player: { x: 0, y: 0 }, isFollowerActive: () => false, isGuideActive: () => false,
  stopNpc(n) { n.body.body.setVelocity(0, 0); }, syncNpcVisual() {} };
const step = () => { scene.time.now += 100; update.call(scene); npc.body.x += npc.body.body.vx * 0.1; npc.body.y += npc.body.body.vy * 0.1; };
for (let i = 0; i < 18; i++) step();
assert(Math.abs(npc.body.x - vendor.x) > 5, 'Vendor must move');
scene.player = { x: npc.body.x, y: npc.body.y + 30 };
const paused = { x: npc.body.x, y: npc.body.y };
for (let i = 0; i < 10; i++) step();
assert.deepEqual({ x: npc.body.x, y: npc.body.y }, paused, 'Vendor must pause for nearby interaction');
scene.player = { x: 0, y: 0 };
for (let i = 0; i < 20; i++) step();
assert(Math.abs(npc.body.x - paused.x) > 3, 'Vendor must resume movement');
const openBody = source.split('  private openNpcShop(npc: NpcRuntime, shopId: string): void {')[1].split('\n  private useSanctuary(')[0].trim().replace(/\}\s*$/, '');
const calls = [];
const open = new Function('SaveService', `return function (npc, shopId) {${openBody}}`)({ save: () => calls.push('save') });
const registry = new Map();
const shopScene = { captureNpcContinuity() {}, player: { x: 1552, y: 1520, body: { setVelocity() {} } }, playerVisual: { anims: { stop() {} } }, facePlayerToward() {}, save: {},
  registry: { set: (key, value) => registry.set(key, value) }, scene: { start: name => calls.push(name) } };
open.call(shopScene, { body: npc.body, placement: { name: vendor.nombre } }, vendor.servicio.tiendaId);
assert.deepEqual(calls, ['save', 'ShopScene'], 'Outdoor talk must open shop, not transition to an interior');
assert.equal(registry.get('shop.activeId'), 'lhradi-market');
assert.equal(registry.get('shop.vendorName'), 'Mercader');
assert.equal(registry.get('shop.returnScene'), 'WorldScene');
assert.deepEqual(shopScene.save.playerPosition, { x: 1552, y: 1520 });
console.log('Same outdoor Bandle merchant/stall, safe reserved interior, actual movement method displacement/pause/resume: OK.');
