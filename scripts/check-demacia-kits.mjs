import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
const random = Math.random;
try {
  const load = async (path, key) => (await server.ssrLoadModule(`/src/${path}.ts`))[key];
  const combat = key => load(`systems/combat/${key}`, key);
  const [D, B, M, T, S, F, RoundCombatEngine, DemaciaCombat, Types, defaultSkillTarget] = await Promise.all([
    load('data/DataRegistry', 'DataRegistry'), combat('BattleEngine'), combat('CombatMechanicsEngine'),
    combat('CombatTempoEngine'), combat('StatusEngine'), combat('SpecialEffectEngine'),
    combat('RoundCombatEngine'), combat('DemaciaCombat'), combat('TypeEffectivenessService'),
    load('systems/combat/BattleFormat', 'defaultSkillTarget')
  ]);
  const noop = () => {};
  const asyncNoop = async () => {};
  const deps = {
    DataRegistry: D, BattleEngine: B, CombatMechanicsEngine: M, CombatTempoEngine: T, StatusEngine: S,
    SpecialEffectEngine: F, RoundCombatEngine, DemaciaCombat, TypeEffectivenessService: Types, defaultSkillTarget,
    Phaser: { Scene: class {}, Math: { Clamp: (n, lo, hi) => Math.min(hi, Math.max(lo, n)) } },
    pulseCombatEvent: noop, playCombatVfx: asyncNoop, playCombatVfxGroup: asyncNoop, skillVfx: () => ({})
  };
  const scene = name => {
    const source = readFileSync(`src/scenes/${name}.ts`, 'utf8')
      .replace(/^import[\s\S]*?;\r?\n/gm, '').replace(`export class ${name}`, `class ${name}`);
    return new Function(...Object.keys(deps), stripTypeScriptTypes(source) + `\nreturn ${name};`)(...Object.values(deps));
  };
  const Double = scene('DoubleBattleScene');
  const Single = scene('BattleScene');
  let serial = 0;
  const unit = (id, side, slot = 0) => {
    const champion = { championId: id, instanceId: `${id}-${serial++}`, mastery: 20, masteryExperience: 0,
      currentHp: 1, unspentSkillPoints: 0, skillRanks: { q: 1, w: 1, e: 1, r: 1 }, equippedItems: [], runeTraits: [] };
    const stats = B.statsFor(champion);
    champion.currentHp = stats.hp;
    return { champion, side, slot, stats, hp: stats.hp, maxHp: stats.hp };
  };
  const doubled = (id, allyId = 'poppy', enemyId = 'garen') => {
    const player = unit(id, 'player'), ally = unit(allyId, 'player', 1);
    const enemy = unit(enemyId, 'enemy'), other = unit('teemo', 'enemy', 1);
    const sc = new Double();
    Object.assign(sc, {
      playerActive: [player, ally], enemyActive: [enemy, other], playerReserves: [], enemyReserves: [],
      session: { kind: 'showdown', persistPlayerState: false }, statuses: {}, forms: {}, resources: {},
      tempo: T.createStore(), mechanics: M.createStore(), wait: asyncNoop, awaitContinue: asyncNoop,
      setMessage: noop, refreshAllUi: noop, refreshCombatantUi: noop, hitFeedback: noop
    });
    sc.rounds.round = 2;
    for (const entry of [player, ally, enemy, other]) sc.initializeCombatant(entry, true);
    return { sc, player, ally, enemy, other };
  };
  const cast = (sc, actor, id, target) => {
    const targetMode = sc.skillTargetMode(D.skill(id), actor);
    return sc.resolveTurnEntry(actor, {
      action: { type: 'skill', skillId: id }, targetMode, targetInstanceIds: [target.champion.instanceId]
    });
  };
  const single = (id, enemyId) => {
    const a = unit(id, 'player'), b = unit(enemyId, 'enemy'), sc = new Single();
    const registry = new Map(Object.entries({
      'battle.forms': {}, 'battle.resources': {}, 'battle.statuses': {}, 'battle.tempo': T.createStore(), 'battle.mechanics': M.createStore()
    }));
    Object.assign(sc, { registry, playerChampion: a.champion, wildChampion: b.champion, playerHp: a.hp, wildHp: b.hp,
      wait: asyncNoop, awaitContinue: asyncNoop, animateAction: asyncNoop, announceAppliedStatuses: asyncNoop,
      setMessage: noop, hitFeedback: noop, refreshUi: noop, rebuildActions: noop, finishVictory: asyncNoop,
      handlePlayerKnockout: asyncNoop, playerHpUi: {}, wildHpUi: {}, syncCombatantVisual: noop });
    sc.refreshCombatStats();
    return sc;
  };
  const finishRound = sc => sc.rounds.finishRound([...sc.playerActive, ...sc.enemyActive].map(u => sc.roundUnit(u)), () => true, sc.tempo);
  assert.deepEqual(D.validate(), []);
  for (const id of ['fiora', 'galio', 'jarvan-iv', 'lux', 'kayle', 'morgana', 'lucian', 'xin-zhao', 'quinn', 'vayne', 'locke', 'sona', 'shyvana', 'sylas']) {
    const echo = D.echo(id), entry = unit(id, 'player');
    assert.equal(echo.skillIds.length, 4);
    assert.notEqual(echo.contentStatus, 'planeado');
    const tempo = T.createStore(), ultimate = D.skill(echo.skillIds[3]);
    assert(!T.canUseSkill(entry.champion, ultimate, tempo).allowed);
    T.finishTurn(entry.champion, tempo);
    assert(T.canUseSkill(entry.champion, ultimate, tempo).allowed);
  }

  Math.random = () => .5;
  let { sc, player, ally, enemy, other } = doubled('shyvana');
  await cast(sc, player, 'shyvana-q', enemy);
  assert.equal(F.resourceValue(player.champion, sc.resources, 'furia'), 50);
  await cast(sc, player, 'shyvana-w', enemy);
  assert.equal(F.resourceValue(player.champion, sc.resources, 'furia'), 100);
  await cast(sc, player, 'shyvana-r', enemy);
  assert.equal(F.resourceValue(player.champion, sc.resources, 'furia'), 0);
  assert.equal(F.formState(player.champion, sc.forms).remainingTurns, 2);
  assert(S.frightened(sc.statusesFor(enemy)));
  const beforeFear = player.hp;
  await cast(sc, enemy, 'garen-decisive-strike', player);
  assert.equal(player.hp, beforeFear);
  await sc.finishDoubleTurn(player);
  assert.equal(F.formState(player.champion, sc.forms).remainingTurns, 1);
  await sc.finishDoubleTurn(player);
  assert.equal(F.formId(player.champion, sc.forms), undefined);

  const solo = single('shyvana', 'garen');
  const values = [.5, .5, .1, .95];
  Math.random = () => values.shift() ?? .5;
  await solo.performAction('player', { type: 'skill', skillId: 'shyvana-q' }, true);
  assert.equal(F.resourceValue(solo.playerChampion, solo.ensureResourceStore(), 'furia'), 25, 'One missed bite generates no fury');

  ({ sc, player, ally, enemy, other } = doubled('sylas', 'poppy', 'shyvana'));
  Math.random = () => .95;
  const beforeE = enemy.hp, beforeOther = other.hp;
  await cast(sc, player, 'sylas-e', enemy);
  assert.equal(enemy.hp, beforeE);
  assert.equal(other.hp, beforeOther);
  assert(!sc.statusesFor(enemy).some(status => status.kind === 'airborne'));
  assert.equal(S.evasionMissChance(sc.statusesFor(player)), .20);
  Math.random = () => .5;
  await cast(sc, player, 'sylas-r', enemy);
  assert.equal(other.hp, beforeOther, 'The stolen ultimate never triggers Petricite Burst');
  assert.equal(F.formId(player.champion, sc.forms), 'dragon-prestado');
  assert.equal(B.statsFor(player.champion).attack, B.statsFor(player.champion, 'dragon-prestado').attack);
  assert.deepEqual(F.skillIds(player.champion, sc.forms), D.echo('sylas').skillIds);

  ({ sc, player, ally, enemy, other } = doubled('morgana', 'poppy', 'sylas'));
  await cast(sc, player, 'morgana-e', ally);
  const protectedHp = ally.hp;
  await cast(sc, enemy, 'sylas-q', ally);
  assert.equal(ally.hp, protectedHp, 'Black Shield blocks both hits');
  assert(!sc.statusesFor(ally).some(status => status.kind === 'block' || status.stat === 'speed'));
  await cast(sc, other, 'teemo-blinding-dart', ally);
  assert(ally.hp < protectedHp, 'A second action can damage the ally');

  ({ sc, player, ally, enemy, other } = doubled('lucian'));
  enemy.hp = 1;
  const redirectedHp = other.hp;
  await cast(sc, player, 'lucian-r', enemy);
  assert.equal(enemy.hp, 0);
  assert(other.hp < redirectedHp);
  assert.equal(S.blockingKind(sc.statusesFor(player)), 'recharge');

  ({ sc, player, ally, enemy, other } = doubled('vayne'));
  const r = D.skill('vayne-r');
  await cast(sc, player, r.id, player);
  assert(T.initialize(player.champion, sc.tempo).deferredCooldowns[r.id]);
  finishRound(sc);
  assert(!sc.targetCandidates(enemy, 'enemy').includes(player));
  assert(sc.targetCandidates(enemy, 'all-enemies').includes(player));
  await cast(sc, player, 'vayne-w', enemy);
  assert(!sc.targetCandidates(enemy, 'enemy').includes(player));
  finishRound(sc);
  assert(sc.targetCandidates(enemy, 'enemy').includes(player));
  assert.equal(sc.rounds.evasion(sc.roundUnit(player)), .30);
  finishRound(sc);
  assert.equal(T.initialize(player.champion, sc.tempo).cooldowns[r.id], 3);

  ({ sc, player, ally, enemy, other } = doubled('kayle'));
  const enemyHp = enemy.hp, otherHp = other.hp, allyHp = ally.hp;
  await cast(sc, player, 'kayle-r', ally);
  assert.equal(ally.hp, allyHp);
  assert(enemy.hp < enemyHp && other.hp < otherHp);
  await cast(sc, enemy, 'garen-decisive-strike', ally);
  assert.equal(ally.hp, allyHp);

  ({ sc, player, enemy, other } = doubled('morgana'));
  player.hp -= 40;
  const morganaHp = player.hp;
  await cast(sc, player, 'morgana-w', enemy);
  assert.equal(player.hp, morganaHp, 'The initial pulse does not heal');
  finishRound(sc);
  const beforePulse = enemy.hp + other.hp;
  for (const target of [enemy, other]) {
    S.applySimpleStatus(sc.statusesFor(target), 'root', 'test-root', 'Inmovilización', 1, 1, 'test');
  }
  await sc.finishDoubleTurn(enemy); // Control consumed before the second pulse still qualifies this round.
  finishRound(sc);
  const drained = beforePulse - enemy.hp - other.hp;
  assert(drained * .25 > player.maxHp * .06, 'The two targets must exercise the shared cap');
  assert.equal(player.hp - morganaHp, Math.floor(player.maxHp * .06));

  ({ sc, player, enemy, other } = doubled('morgana'));
  player.hp -= 40;
  const beforeUncontrolled = player.hp;
  await cast(sc, player, 'morgana-w', enemy);
  finishRound(sc);
  finishRound(sc);
  assert.equal(player.hp, beforeUncontrolled, 'An uncontrolled pulse does not heal');

  ({ sc, player, enemy, other } = doubled('sylas', 'poppy', 'sylas'));
  const hijack = D.skill('sylas-r');
  assert.deepEqual(sc.targetCandidates(player, 'enemy', hijack), [other]);
  other.hp = 0;
  await cast(sc, player, hijack.id, enemy);
  assert(!T.initialize(player.champion, sc.tempo).cooldowns[hijack.id]);
  const mirror = single('sylas', 'sylas');
  assert(!DemaciaCombat.canTargetSkill(hijack, mirror.wildChampion));
  await mirror.performAction('player', { type: 'skill', skillId: hijack.id }, true);
  assert(!T.initialize(mirror.playerChampion, mirror.ensureTempoStore()).cooldowns[hijack.id]);

  ({ sc, player, enemy } = doubled('sylas', 'poppy', 'gnar'));
  const stolenGnar = sc.rounds.demacia.skill(sc.roundUnit(player), hijack, sc.roundUnit(enemy));
  assert.equal(DemaciaCombat.rule(stolenGnar, 'impactoMuro'), true);
  await cast(sc, player, hijack.id, enemy);
  assert.equal(F.formId(player.champion, sc.forms), undefined);

  // Verify the authored data and actual resolver use the same coefficient at every rank.
  for (const echo of D.echoes()) {
    const skillIds = new Set([...echo.skillIds, ...D.forms(echo.id).flatMap(form => form.skillIds ?? [])]);
    for (const skillId of skillIds) {
      for (const effect of D.skill(skillId).effects.filter(effect => effect.type === 'damage')) {
        assert(B.usesStatRatio(effect), skillId + ' must scale with Attack or Power');
        assert(['attack', 'power'].includes(effect.stat), skillId + ' must identify its offensive stat');
      }
    }
  }
  const lucianR = D.skill('lucian-r');
  const st = { hp: 194, attack: 56, power: 18, defense: 21, resistance: 24, speed: 27 };
  assert.deepEqual(B.resolveSkill(lucianR, 1, st, st).damageInstances, [25, 25, 25, 25, 25]);
  assert(B.resolveSkill(lucianR, 3, st, st).damage > B.resolveSkill(lucianR, 1, st, st).damage);
  assert(B.resolveSkill(lucianR, 1, { ...st, attack: 64 }, st).damage > B.resolveSkill(lucianR, 1, st, st).damage);
  ({ sc, player, enemy, other } = doubled('kayle'));
  for (const rank of [3, 4, 5]) {
    player.champion.skillRanks.q = rank;
    const q = sc.rounds.demacia.skill(sc.roundUnit(player), D.skill('kayle-q'));
    assert.equal(q.selectionTarget === 'all-enemies', rank >= 4);
    assert.equal(q.effects.some(effect => effect.statusKind === 'burn'), rank === 5);
  }

  assert.deepEqual(B.capStats({ hp: 315, attack: 115, power: -5, defense: 101, resistance: 99, speed: 120 }),
    { hp: 315, attack: 100, power: 0, defense: 100, resistance: 99, speed: 100 });
  const cappedSamira = unit('samira', 'player').champion;
  cappedSamira.mastery = 50;
  cappedSamira.equippedItems = ['trinity-force', 'thornmail', 'speed-legendary'];
  const cappedStats = B.statsFor(cappedSamira);
  assert.equal(cappedStats.attack, 100);
  assert.equal(cappedStats.hp, 525);
  assert.equal(B.statsFor({ ...cappedSamira, mastery: 20, equippedItems: [] }).hp, 175);
  assert.equal(M.applyStatBonuses(cappedSamira, { ...cappedStats, defense: 110 }, M.createStore()).defense, 100);

  console.log('Demacia: 14 Showdown kits, turn-one R gate, independent hits in singles, per-target fury, fear, stolen Shyvana, Black Shield, Lucian retarget, Vayne and mixed Kayle targeting OK.');
} finally {
  Math.random = random;
  await server.close();
}
