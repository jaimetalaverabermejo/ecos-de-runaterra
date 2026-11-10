import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const load = path => server.ssrLoadModule('/src/' + path + '.ts');
  const { DataRegistry } = await load('data/DataRegistry');
  const { BattleEngine } = await load('systems/combat/BattleEngine');
  const { RoundCombatEngine } = await load('systems/combat/RoundCombatEngine');
  const { StatusEngine } = await load('systems/combat/StatusEngine');
  const { conflictsWithEquipment } = await load('systems/build/EquipmentSlots');
  const { createNewGame } = await load('state/GameState');
  const { BuildService } = await load('systems/build/BuildService');

  const physical = DataRegistry.skill('lucian-q');
  const magical = DataRegistry.skill('lux-e');
  const defense = DataRegistry.skill('lux-w');
  assert(physical.equipmentCanCrit);
  assert(!magical.equipmentCanCrit);

  function unit(id, side, items = [], championId = 'lucian') {
    return {
      champion: { instanceId: id, championId, mastery: 20, skillRanks: { q: 1, w: 1, e: 1, r: 1 }, equippedItems: items },
      hp: 200, maxHp: 200, side, statuses: [],
      stats: { hp: 200, attack: 60, power: 60, speed: 30, defense: 30, resistance: 30 }
    };
  }
  const samePlane = () => true;
  function battle(actor, ...targets) {
    const rounds = new RoundCombatEngine();
    const roster = [actor, ...targets];
    rounds.startRound(roster, samePlane);
    return { rounds, roster, gear: rounds.gear, next: () => rounds.finishRound(roster, samePlane) };
  }
  function hit(game, attacker, target, skill, amount, kind = 'physical') {
    const result = game.gear.packet(attacker, target, skill, amount, target.hp, true, game.rounds.round, kind);
    target.hp = Math.max(0, target.hp - result.damage);
    game.rounds.revive(target);
    return result;
  }

  const caster = unit('caster', 'enemy');
  const zhonya = unit('zhonya', 'player', ['zhonyas-hourglass']);
  const stasis = battle(caster, zhonya);
  StatusEngine.applyShield(zhonya.statuses, 'first', 'Escudo', 10, 2, defense.id);
  stasis.rounds.startAction(caster, physical);
  assert.equal(hit(stasis, caster, zhonya, physical, 50).damage, 40);
  assert.equal(hit(stasis, caster, zhonya, physical, 180).damage, 0);
  assert.equal(zhonya.hp, 160);
  assert(stasis.rounds.untouchable(zhonya));
  assert.equal(hit(stasis, caster, zhonya, physical, 190).damage, 0);
  stasis.next();
  assert(!stasis.rounds.untouchable(zhonya));
  assert.equal(hit(stasis, caster, zhonya, physical, 190).damage, 190);

  const angel = unit('angel', 'player', ['guardian-angel'], 'sion');
  const resurrection = battle(caster, angel);
  hit(resurrection, caster, angel, physical, 220);
  assert.equal(angel.hp, 0);
  assert(resurrection.gear.pending(angel));
  assert(!resurrection.rounds.isZombie(angel));
  resurrection.next();
  assert.equal(angel.hp, 60);
  assert(!resurrection.gear.pending(angel));
  hit(resurrection, caster, angel, physical, 100);
  assert(resurrection.rounds.isZombie(angel));

  const bow = unit('bow', 'player', ['immortal-shieldbow']);
  const lifeline = battle(caster, bow);
  lifeline.rounds.startAction(caster, physical);
  assert.equal(hit(lifeline, caster, bow, physical, 150).absorbed, 30);
  assert.equal(bow.hp, 80);
  assert.equal(hit(lifeline, caster, bow, physical, 60).absorbed, 0);
  assert.equal(bow.hp, 20);

  const marksman = unit('marksman', 'player', ['kraken-slayer']);
  const one = unit('one', 'enemy');
  const two = unit('two', 'enemy');
  const kraken = battle(marksman, one, two);
  for (let cast = 1; cast <= 3; cast++) {
    kraken.rounds.startAction(marksman, physical);
    hit(kraken, marksman, one, physical, 4);
    hit(kraken, marksman, one, physical, 4);
    hit(kraken, marksman, two, physical, 4);
    kraken.gear.finish(marksman, physical, kraken.rounds.round);
    if (cast < 3) assert.equal(one.hp, 200 - cast * 8);
    kraken.next();
  }
  assert(one.hp < 176 && two.hp === 188);

  const mage = unit('mage', 'player', ['liandrys-torment'], 'lux');
  const tank = unit('tank', 'enemy', ['kaenic-rookern']);
  const burn = battle(mage, tank);
  burn.rounds.startAction(mage, magical);
  assert.equal(hit(burn, mage, tank, magical, 8).damage, 8);
  assert.equal(hit(burn, mage, tank, magical, 8, 'magical').damage, 0);
  assert.equal(hit(burn, mage, tank, magical, 8, 'magical').damage, 0);
  burn.gear.finish(mage, magical, burn.rounds.round);
  assert.equal(tank.hp, 192);
  burn.next();
  assert.equal(tank.hp, 188);
  burn.next();
  assert.equal(tank.hp, 184);
  burn.next();
  assert.equal(tank.hp, 184);
  assert(tank.statuses.some(status => status.id === 'gear-rookern'));

  const solo = unit('solo', 'player', ['spirit-visage', 'moonstone-renewer'], 'lux');
  const shield = battle(solo, caster);
  shield.rounds.startAction(solo, defense);
  StatusEngine.applyShield(solo.statuses, 'lux', 'Escudo', 60, 2, defense.id);
  shield.gear.finish(solo, defense, shield.rounds.round);
  assert.equal(solo.statuses.reduce((sum, status) => sum + status.power, 0), 79);

  const rng = Math.random;
  try {
    Math.random = () => 0;
    const adc = unit('adc', 'player', ['infinity-edge']);
    const crit = battle(adc, caster);
    crit.rounds.startAction(adc, physical);
    assert.equal(crit.gear.critical(adc, magical).equipmentCritical, false);
    const normal = BattleEngine.resolveSkill(physical, 1, adc.stats, caster.stats);
    const powered = BattleEngine.resolveSkill(physical, 1, adc.stats, caster.stats, crit.gear.critical(adc, physical));
    assert(powered.notes.includes('CRÍTICO') && powered.damage > normal.damage);
  } finally { Math.random = rng; }

  assert(conflictsWithEquipment(['guardian-angel'], 'zhonyas-hourglass'));
  assert(conflictsWithEquipment(['steraks-gage'], 'immortal-shieldbow'));
  assert(!conflictsWithEquipment(['steraks-gage'], 'guardian-angel'));
  const save = createNewGame();
  save.party.push({ ...angel.champion, currentHp: 60, equippedItems: ['guardian-angel', 'zhonyas-hourglass'] });
  const before = save.inventory['zhonyas-hourglass'] ?? 0;
  BuildService.reconcileSlots(save);
  BuildService.reconcileSlots(save);
  assert.deepEqual(save.party.at(-1).equippedItems, ['guardian-angel']);
  assert.equal(save.inventory['zhonyas-hourglass'], before + 1);

  console.log('Legendarios: estasis, resurrección previa a Sion, Salvavidas, Kraken multigolpe y multiobjetivo, escudo mágico, quemadura, curas, crítico y equipamiento compatible OK.');
} finally { await server.close(); }
