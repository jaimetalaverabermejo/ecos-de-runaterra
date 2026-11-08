import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const nodes = [];
function node(kind, x = 0, y = 0, extra = {}) {
  const value = { kind, x, y, width: 0, children: [], ...extra };
  for (const method of ['setOrigin', 'setStrokeStyle', 'setDepth', 'setFillStyle', 'setScale',
    'lineStyle', 'beginPath', 'moveTo', 'lineTo', 'strokePath']) value[method] = () => value;
  value.setVisible = visible => { value.visible = visible; return value; };
  value.setPosition = (x, y) => { Object.assign(value, { x, y }); return value; };
  value.setDisplaySize = (w, h) => { Object.assign(value, { width: w, height: h }); return value; };
  value.setText = text => { value.text = text; return value; };
  value.setFontSize = size => { value.size = size; return value; };
  value.setWordWrapWidth = () => value;
  value.add = children => { value.children.push(...(Array.isArray(children) ? children : [children])); return value; };
  value.removeAll = () => { value.children = []; return value; };
  nodes.push(value);
  return value;
}
const scene = { add: {
  text: (x, y, text, style) => node('text', x, y, { text, style }),
  rectangle: (x, y, width, height, color) => node('rectangle', x, y, { width, height, color }),
  image: (x, y, key, frame) => node('image', x, y, { key, frame }),
  container: (x, y, children = []) => node('container', x, y, { children }),
  graphics: ({ x, y } = {}) => node('graphics', x, y)
} };
const UI = { font: { family: 'test-font' }, text: { accent: '#75d4e8', primary: '#fff', secondary: '#aaa', gold: '#fc0' },
  colors: { hp: 0x00ff00, hpMid: 0xffff00, hpLow: 0xff0000 } };
const UiKit = { label: (scene, x, y, text, size, color, bold = false) => scene.add.text(x, y, text,
  { fontFamily: UI.font.family, fontSize: size, color, fontStyle: bold ? 'bold' : 'normal' }) };
const strip = source => stripTypeScriptTypes(source.replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/export /g, ''));
const hud = new Function('UiKit', 'UI', strip(fs.readFileSync('src/ui/combat/CombatHud.ts', 'utf8'))
  + '\nreturn {combatStatusBadges, drawStatusBadges, masteryLabel, linkedEchoGlyph, shieldBarGeometry, updateShieldBar};')(UiKit, UI);
const status = (kind, power = 0) => ({ kind, remainingTurns: 2, power });
assert.deepEqual(hud.combatStatusBadges([status('poison'), status('burn'), status('stun'), status('poison'),
  status('shield'), status('stat'), { ...status('airborne'), remainingTurns: 0 }]).map(b => b.text), ['ATU', 'VEN', 'QUE']);
assert.equal(hud.combatStatusBadges([status('airborne')])[0].text, 'AIR');
assert.notEqual(hud.combatStatusBadges([status('root')])[0].text, 'AIR');
const mastery = hud.masteryLabel(scene, 12, 21, 18);
assert.equal(mastery.text, 'm18');
assert.deepEqual(mastery.style, { fontFamily: 'test-font', fontSize: '12px', color: UI.text.accent, fontStyle: 'normal' });
assert.deepEqual(hud.shieldBarGeometry(75, 100, 20, 280), { start: 210, width: 56 });
assert.deepEqual(hud.shieldBarGeometry(100, 100, 200, 280), { start: 0, width: 280 });
const shield = node('shield');
hud.updateShieldBar(shield, 50, 100, [status('shield', 20)], 72, 26, 194);
assert.equal(shield.visible, true); assert(Math.abs(shield.displayWidth - 38.8) < 1e-9);
hud.updateShieldBar(shield, 50, 100, [], 72, 26, 194);
assert.equal(shield.visible, false); assert.equal(shield.displayWidth, 0);
const badgeLayer = node('container');
hud.drawStatusBadges(scene, badgeLayer, ['stun', 'airborne', 'sleep', 'polymorph', 'banish', 'poison', 'burn'].map(k => status(k)));
assert.equal(badgeLayer.children.length, 10); // Four conditions plus an overflow badge.
assert.equal(badgeLayer.children.at(-1).text, '+3');
assert(badgeLayer.children.every(n => n.x + (n.kind === 'rectangle' ? n.width : 0) <= 174));
hud.drawStatusBadges(scene, badgeLayer, []); assert.equal(badgeLayer.children.length, 0);

const Phaser = { Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)) } };
const team = new Function('Phaser', 'UiKit', 'UI', ...Object.keys(hud),
  strip(fs.readFileSync('src/ui/combat/BattleTeamPanel.ts', 'utf8')) + '\nreturn {addHealthRow};')(
  Phaser, UiKit, UI, ...Object.values(hud));
for (const statuses of [[], [status('poison')], [status('poison'), status('burn')]]) {
  const panel = node('container');
  const row = team.addHealthRow(scene, panel, 7, { name: 'Teemo', mastery: 8, hp: 100, maxHp: 100,
    statuses, linked: true, player: false });
  assert.equal(row.fill.width, 194); assert.equal(row.fill.x, 72);
  assert.equal(row.statusLayer.y, 9); assert.equal(row.barY, 33);
  assert(panel.children.some(n => n.kind === 'text' && n.text === 'm8' && n.style.fontStyle === 'normal'));
  assert.equal(panel.children.filter(n => n.kind === 'graphics').length, 1);
}
const unlinkedPanel = node('container');
team.addHealthRow(scene, unlinkedPanel, 7, { name: 'Kled', mastery: 8, hp: 100, maxHp: 100, player: false });
assert.equal(unlinkedPanel.children.filter(n => n.kind === 'graphics').length, 0);

const doubleSource = fs.readFileSync('src/scenes/DoubleBattleScene.ts', 'utf8');
const refresh = doubleSource.slice(doubleSource.indexOf('  private refreshCombatantUi('), doubleSource.indexOf('  private beginSelectionRound('));
const Double = new Function('Phaser', 'UI', 'syncCombatStatusVfx', 'SpecialEffectEngine', 'BattleEngine',
  'CombatTempoEngine', 'CombatMechanicsEngine', 'StatusEngine', 'CHAMPION_HP_WIDTH', ...Object.keys(hud),
  stripTypeScriptTypes(`class Double {${refresh}}`) + '\nreturn Double;')(
  Phaser, UI, () => {}, { formId: () => undefined, statsWithResources: (_c, stats) => stats },
  { statsFor: () => ({ hp: 100 }) }, { applyStatBonuses: (_c, stats) => stats },
  { inRealm: () => false, applyStatBonuses: (_c, stats) => stats },
  { effectiveStats: stats => stats }, 194, ...Object.values(hud));
const double = new Double();
Object.assign(double, scene);
let active = [status('shield', 20), status('poison'), status('burn')];
double.statusesFor = () => active;
const panel = node('container');
const row = team.addHealthRow(scene, panel, 7, { name: 'Teemo', mastery: 8, hp: 100, maxHp: 100, player: false, statuses: active });
const unit = { champion: { championId: 'teemo', instanceId: 'teemo' }, hp: 75, maxHp: 100,
  hpFill: row.fill, hpText: row.text, shieldFill: row.shieldFill, statusLayer: row.statusLayer, barY: row.barY };
double.refreshCombatantUi(unit);
assert.equal(unit.hpFill.displayWidth, 145.5);
assert.equal(unit.hpText.text, '75/100'); assert.equal(unit.shieldFill.visible, true);
assert.deepEqual(unit.statusLayer.children.filter(n => n.kind === 'text').map(n => n.text), ['VEN', 'QUE']);
active = []; double.refreshCombatantUi(unit);
assert.equal(unit.shieldFill.visible, false); assert.equal(unit.statusLayer.children.length, 0);

// Actual 1v1 panel creation/update: same long bar, no type icons, shield expires cleanly.
const battle = fs.readFileSync('src/scenes/BattleScene.ts', 'utf8');
const create = battle.slice(battle.indexOf('  private createHpPanel('), battle.indexOf('  private createActions('));
const update = battle.slice(battle.indexOf('  private updateHpUi('), battle.indexOf('  private refreshCombatVisuals('));
const Single = new Function('UiKit', 'UI', 'DataRegistry', 'EchoRegistryService', 'Phaser', ...Object.keys(hud),
  stripTypeScriptTypes(`class Single {${create}\n${update}}`) + '\nreturn Single;')(
  UiKit, UI, { battleDefinition: () => ({ name: 'Teemo' }), isCombatant: () => false },
  { state: () => 'linked' }, Phaser, ...Object.values(hud));
const single = new Single(); Object.assign(single, scene, { statsForChampion: () => ({ hp: 100 }), hpColor: () => 0x00ff00 });
for (const variant of ['player', 'enemy']) {
  const ui = single.createHpPanel(variant, { championId: 'teemo', mastery: 8 });
  single.updateHpUi(ui, 100, [status('shield', 20), status('burn')]);
  assert.equal(ui.maxWidth, 280); assert.equal(ui.fill.displayWidth, 280);
  assert.equal(ui.shieldFill.visible, true);
  assert.equal(ui.statusLayer.children.at(-1).text, 'QUE');
  single.updateHpUi(ui, 50, []);
  assert.equal(ui.shieldFill.visible, false); assert.equal(ui.statusLayer.children.length, 0);
}
assert(!nodes.some(n => n.kind === 'image' && /type|status|echo-linker/.test(n.frame ?? n.key)));
console.log('Combat HUD OK: normal cyan mastery, fixed HP widths, simultaneous/expired states, overflow, integrated shields and linked glyph.');
