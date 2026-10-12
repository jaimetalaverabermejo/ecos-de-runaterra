import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { createServer } from 'vite';

// Execute the real scene methods with deterministic Arcade/tween integration.
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const { DataRegistry: D } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { DuelTeamService: T } = await server.ssrLoadModule('/src/systems/world/DuelTeamService.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  const source = fs.readFileSync('src/scenes/WorldScene.ts', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export class WorldScene', 'class WorldScene');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const Phaser = { Scene: class {}, Math: { Distance: { Between: (x, y, xx, yy) => Math.hypot(x - xx, y - yy) }, Clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)) },
    Geom: { Line: class { constructor(x, y, xx, yy) { Object.assign(this, { x, y, xx, yy }); } }, Intersects: { LineToRectangle: (line, r) => {
      for (let t = 0; t <= 1; t += 0.01) { const x = line.x + (line.xx - line.x) * t, y = line.y + (line.yy - line.y) * t; if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return true; }
      return false;
    } } } };
  const Scene = new Function('Phaser', 'WORLD_PLAYER_VISUAL_SIZE', 'DataRegistry', 'UI', 'QuestService', 'WorldActionService', 'SaveService', 'DuelTeamService', 'ProgressionService', 'BattleEngine', compiled + '\nreturn WorldScene;')(
    Phaser, 96, D, { font: { family: 'test' } }, { recordEvent() {} }, { applyAll() {} }, { save() {} }, T,
    { defaultSkillRanks: () => ({}), earnedManualSkillPoints: () => 0 }, { statsFor: () => ({ hp: 100 }) });
  for (const duel of D.duels().filter((d) => d.id.startsWith('ionia-route-'))) {
    const s = new Scene(), placement = D.npc(duel.npcId), body = { x: placement.x, y: placement.y, setPosition(x, y) { this.x = x; this.y = y; } };
    body.body = { vx: 0, vy: 0, setVelocity(x, y) { this.vx = x; this.vy = y; }, reset(x, y) { body.setPosition(x, y); } };
    const n = { placement, body, visual: { depth: placement.y + 100 }, facing: placement.facing, patrolIndex: 0, pauseUntil: 0 };
    const timers = [], markers = [], registry = new Map(); let destination;
    Object.assign(s, { save: createNewGame(), npcs: [n], player: { x: 0, y: 0, body: { setVelocity() {} } }, playerVisual: { depth: 100, anims: { stop() {} } }, worldColliders: [],
      time: { now: 0, delayedCall: (_, fn) => timers.push(fn) },
      registry: { get: (k) => registry.get(k), set: (k, v) => registry.set(k, v), remove: (k) => registry.delete(k) },
      scene: { start: (id) => { destination = id; } }, cameras: { main: { flash() {}, shake() {} } },
      tweens: { add: (config) => { if ('progress' in config.targets) { for (let i = 1; i <= 20; i++) { config.targets.progress = i / 20; config.onUpdate(); } config.onComplete(); } } },
      add: { text: (x, y, text) => { const marker = { y, text, active: true, setOrigin() { return this; }, setDepth() { return this; }, destroy() { this.active = false; } }; markers.push(marker); return marker; } },
      syncNpcVisual() {}, updatePlayerVisual() {}, facePlayerToward() {}, updateNearbyNpc() {}, updateNearbyTiledInteraction() {},
      isFollowerActive: () => false, isGuideActive: () => false,
      beginDialogueDefinition: (_, definition) => { s.dialogueDefinition = definition; s.dialogueLayer = { destroy() {} }; } });
    s.save.party = [{ instanceId: 'test', championId: 'teemo', mastery: 7, currentHp: 100 }];
    for (let i = 0; i < 45; i++) { s.time.now += 100; s.updateNpcs(); body.x += body.body.vx * 0.1; body.y += body.body.vy * 0.1; }
    assert(Math.hypot(body.x - placement.x, body.y - placement.y) > 5, `${duel.id}: patrol displacement`);
    s.player.x = body.x; s.player.y = body.y + 30; const paused = { x: body.x, y: body.y };
    s.updateNpcs(); assert.equal(body.body.vx, 0); assert.equal(body.body.vy, 0);
    assert.deepEqual({ x: body.x, y: body.y }, paused);
    assert.equal(n.facing, placement.facing, 'Watch the corridor again after stopping');
    body.body.reset(placement.x, placement.y); n.pauseUntil = s.time.now + 5000;
    const vertical = placement.facing === 'down', distance = (placement.duelSight.rangeTiles - 1) * 32;
    s.player.x = body.x + (vertical ? 20 : distance); s.player.y = body.y + (vertical ? distance : 20);
    s.updateNpcDuelSight(); assert(!n.alerted, 'Outside the sight lane');
    s.player.x = body.x - (vertical ? 0 : 64); s.player.y = body.y - (vertical ? 64 : 0);
    s.updateNpcDuelSight(); assert(!n.alerted, 'Behind the trainer');
    s.player.x = body.x + (vertical ? 0 : distance); s.player.y = body.y + (vertical ? distance : 0);
    s.worldColliders = [{ getBounds: () => ({ x: body.x + (vertical ? -16 : 48), y: body.y + (vertical ? 48 : -16), width: 32, height: 32 }) }];
    s.updateNpcDuelSight(); assert(!n.alerted, 'A wall must block detection'); s.worldColliders = [];
    s.save.worldProgress.flags.push(`duel:${duel.id}:won`); s.updateNpcDuelSight(); assert(!n.alerted, 'Saved victory must suppress detection');
    s.save.worldProgress.flags.pop(); s.updateNpcDuelSight();
    assert(n.alerted && s.npcEventLock && markers.some((m) => m.text === '!' && m.active));
    s.updateNpcDuelSight(); assert.equal(timers.length, 1, 'Only one challenge can run');
    timers.shift()();
    assert(!s.npcEventLock && s.dialogueLayer); assert.equal(s.pendingDuelStart.duelId, duel.id);
    assert(Math.abs(Math.hypot(s.player.x - body.x, s.player.y - body.y) - 42) < 0.01, 'Complete approach to conversation distance');
    s.closeDialogue(); timers.shift()();
    assert.equal(destination, 'BattleScene'); assert.equal(registry.get('pendingDuel').duelId, duel.id);
    assert.deepEqual(registry.get('pendingDuel').team.map((e) => e.championId), duel.team.map((e) => e.championId));
  }
  console.log('Actual scene methods: patrol/pause, wall and facing checks, one alert, full approach, dialogue-to-battle and saved victory suppression for all 16 trainers: OK.');
} finally { await server.close(); }
