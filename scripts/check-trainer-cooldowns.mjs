import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const { DataRegistry: D } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { CombatTempoEngine: T } = await server.ssrLoadModule('/src/systems/combat/CombatTempoEngine.ts');
  const { StatusEngine } = await server.ssrLoadModule('/src/systems/combat/StatusEngine.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  const source = fs.readFileSync('src/scenes/BattleScene.ts', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export class BattleScene', 'class BattleScene');
  const Scene = new Function('Phaser', 'DataRegistry', 'CombatTempoEngine', 'StatusEngine', 'QuestService', 'ProgressionService', 'WorldActionService', 'SaveService', stripTypeScriptTypes(source, { mode: 'strip' }) + '\nreturn BattleScene;')(
    { Scene: class {} }, D, T, StatusEngine, { recordEvent() {} }, { awardPartyExperience: () => [] }, { applyAll() {} }, { save() {} });
  const champion = (id, instanceId) => ({ championId: id, instanceId, mastery: 7, currentHp: 100, masteryExperience: 0, skillRanks: { q: 1, w: 1, e: 1, r: 1 }, unspentSkillPoints: 0, equippedItems: [], runeTraits: [] });
  const skills = D.echo('teemo').skillIds.map((id) => D.skill(id));
  const q = skills.find((s) => s.slot === 'q');
  const r = skills.find((s) => s.slot === 'r');
  assert(q && r);
  const setup = () => {
    const s = new Scene(), registry = new Map(), save = createNewGame(), player = champion('teemo', 'player');
    save.party = [player];
    const rivals = ['poppy', 'tristana', 'lulu'].map((id, i) => champion(id, 'rival-' + i));
    registry.set('pendingDuel', { duelId: 'ionia-route-1-duel-3', trainerName: 'Haru', rewardGold: 150, victoryFlag: 'duel:ionia-route-1-duel-3:won', enemyIndex: 0, team: rivals });
    Object.assign(s, { save, playerChampion: player, wildChampion: rivals[0], playerHp: 100, wildHp: 100,
      registry: { get: (k) => registry.get(k), set: (k, v) => registry.set(k, v), remove: (k) => registry.delete(k) },
      scene: { restart() {}, start() {} }, awaitContinue: async () => {}, disableActions() {} });
    const tempo = s.ensureTempoStore(); T.initialize(player, tempo); T.initialize(rivals[0], tempo); registry.set('battle.started', true);
    return { s, player, rivals, registry, tempo };
  };
  // Q on the preceding turn, then Teemo's R deals the finishing hit.
  const { s, player, rivals, registry, tempo } = setup();
  T.startSkillCooldown(player, q, tempo);
  s.pendingTempoTurn = 'player'; s.completePendingTempoTurn();
  assert.equal(tempo.combatants.player.cooldowns[T.cooldownKey(q)], T.cooldownTurns(q));
  const turns = tempo.combatants.player.turnsCompleted;
  await s.beginActorTurn('player', { type: 'skill', skillId: r.id });
  T.startSkillCooldown(player, r, tempo); s.wildHp = 0;
  await s.finishVictory();
  assert(T.canUseSkill(player, q, tempo).allowed, 'Q must be ready after the intervening R knockout turn');
  assert.equal(tempo.combatants.player.cooldowns[T.cooldownKey(r)], T.cooldownTurns(r), 'R keeps its legitimate cooldown');
  assert.equal(tempo.combatants.player.turnsCompleted, turns + 1);
  s.completePendingTempoTurn(); assert.equal(tempo.combatants.player.turnsCompleted, turns + 1, 'No duplicate decrement');
  assert.equal(registry.get('battle.tempo'), tempo, 'Trainer replacements retain the same store');
  s.battleEnded = false; s.wildChampion = rivals[1]; s.wildHp = 100;
  T.initialize(player, tempo, true); T.initialize(rivals[1], tempo, true);
  assert(T.canUseSkill(player, q, tempo).allowed, 'Replacement initialization must not inject Q cooldown');
  await s.beginActorTurn('player', { type: 'basic' }); s.wildHp = 0; await s.finishVictory();
  assert.equal(tempo.combatants.player.cooldowns[T.cooldownKey(r)], T.cooldownTurns(r) - 1);
  assert.equal(tempo.combatants.player.turnsCompleted, turns + 2);
  // A ready Q stays ready; a Q used for the KO still gets its proper one-turn CD.
  for (const usedQ of [false, true]) {
    const test = setup(); await test.s.beginActorTurn('player', usedQ ? { type: 'skill', skillId: q.id } : { type: 'basic' });
    if (usedQ) T.startSkillCooldown(test.player, q, test.tempo);
    test.s.wildHp = 0; await test.s.finishVictory();
    assert.equal(test.tempo.combatants.player.cooldowns[T.cooldownKey(q)] ?? 0, usedQ ? T.cooldownTurns(q) : 0);
  }
  // A rival that dies during its own poison/delayed turn does not consume an extra player turn.
  const enemy = setup(); T.startSkillCooldown(enemy.player, q, enemy.tempo);
  const before = enemy.tempo.combatants.player.cooldowns[T.cooldownKey(q)];
  await enemy.s.beginActorTurn('enemy'); enemy.s.wildHp = 0; await enemy.s.finishVictory();
  assert.equal(enemy.tempo.combatants.player.cooldowns[T.cooldownKey(q)], before);
  assert.equal(enemy.tempo.combatants.player.turnsCompleted, 0);
  assert.equal(enemy.tempo.combatants['rival-0'].turnsCompleted, 1);
  console.log('Actual KO/replacement path: Teemo Q → R, ready Q, finishing Q, legitimate R CD, no double tick and enemy-turn KO: OK.');
} finally { await server.close(); }
