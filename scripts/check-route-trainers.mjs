import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const server = await createServer({ server: { middlewareMode: true } });
try {
  const { DataRegistry: D } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  const { DuelTeamService: T } = await server.ssrLoadModule('/src/systems/world/DuelTeamService.ts');
  const duels = D.duels().filter((d) => d.id.startsWith('ionia-route-'));
  assert.equal(duels.length, 16);
  const limits = { 1: [6, 7], 2: [6, 8], 4: [6, 8], 6: [7, 10] };
  const humans = new Set(['ionia-monk', 'ionia-guardian', 'ionia-militia']);
  const positions = read('docs/diseno/jonia/entrenadores-ruta.json');
  for (const duel of duels) {
    const route = Number(duel.id.split('-')[2]);
    const [min, max] = limits[route];
    assert(duel.team.every((e) => e.mastery >= min && e.mastery <= max));
    if (duel.team.length === 1) {
      assert(humans.has(duel.team[0].championId), `${duel.id}: solo opponent must fight personally`);
      assert(!duel.team[0].unlockedChampionId, 'Human combatants must never switch to captured Echoes');
    } else assert(duel.team.every(e => !D.isCombatant(e.championId)), 'Multi-Echo trainers must retain their Echo teams');
    const npc = D.npc(duel.npcId);
    assert(npc.duelSight?.fixedFacing && !npc.autoTalk);
    assert.equal(npc.behavior.type, 'patrol');
    for (const id of [duel.introDialogueId, duel.victoryDialogueId]) {
      assert(!/oro|dinero|recompensa|cobrar/i.test(D.dialogue(id).nodes.flatMap((n) => n.lines).join(' ')));
    }
    const save = createNewGame();
    assert.deepEqual(T.resolve(save, duel.team).map((e) => e.championId), duel.team.map((e) => e.championId));
    for (const entry of duel.team.filter((e) => e.unlockedChampionId)) {
      save.echoRegistry[entry.unlockedChampionId] = 'seen';
      save.worldProgress.flags.push(`echo:${entry.unlockedChampionId}-resonance`);
      assert.equal(T.resolve(save, [entry])[0].championId, entry.championId, 'Seeing/resonance alone cannot reveal a trainer echo');
      save.echoRegistry[entry.unlockedChampionId] = 'linked';
      assert.equal(T.resolve(save, [entry])[0].championId, entry.unlockedChampionId);
      assert.equal(T.resolve(save, [entry])[0].mastery, entry.mastery);
    }
    const map = D.map(npc.mapId), json = read('public/' + map.tiled.url.replace('./', ''));
    const tile = (name, c, r) => json.layers.find((l) => l.name === name)?.data?.[r * json.width + c] ?? 0;
    const rects = json.layers.filter((l) => ['Collisions', 'BridgeRails'].includes(l.name)).flatMap((l) => l.objects);
    const free = (x, y) => x >= 9 && y >= 7 && x < map.width - 9 && y < map.height - 7
      && !rects.some((o) => x + 9 > o.x && x - 9 < o.x + o.width && y + 7 > o.y && y - 7 < o.y + o.height)
      && [-9, 9].every((dx) => [-7, 7].every((dy) => {
        const c = Math.floor((x + dx) / 32), r = Math.floor((y + dy) / 32);
        return !tile('Vallas', c, r) && !['Obstacles', 'Agua'].some((n) => tile(n, c, r) && !tile('Paths', c, r))
          && !['Ledges_down', 'Ledges_left', 'Ledges_right'].some((n) => tile(n, c, r));
      }));
    const { corridor: c } = positions.find((p) => p.duelId === duel.id);
    assert(c.tiles >= 4 && c.tiles <= 5);
    const vertical = c.axis === 'vertical';
    for (let k = 0; k < c.tiles * 32 - 32; k += 4) {
      assert(free(npc.x + (vertical ? 0 : k), npc.y + (vertical ? k : 0)), `${duel.id}: blocked approach`);
    }
    const points = npc.behavior.points;
    for (let k = 0; k <= 24; k++) {
      assert(free(points[0].x + (points[1].x - points[0].x) * k / 24, points[0].y + (points[1].y - points[0].y) * k / 24), `${duel.id}: blocked patrol`);
    }
  }
  for (const route of Object.keys(limits)) {
    const teams = duels.filter((d) => d.id.startsWith(`ionia-route-${route}-`)).map((d) => d.team);
    assert.deepEqual(teams.map((t) => t.length).sort(), [1, 1, 2, 3]);
    const trio = teams.find((t) => t.length === 3), single = teams.filter((t) => t.length === 1);
    assert(Math.max(...trio.map((e) => e.mastery)) < Math.max(...single.flat().map((e) => e.mastery)));
  }
  console.log('16 sight trainers: clear 4–5 tile corridors/patrols, eight human solo opponents and eight preserved multi-Echo teams and non-monetary dialogue: OK.');
} finally { await server.close(); }
