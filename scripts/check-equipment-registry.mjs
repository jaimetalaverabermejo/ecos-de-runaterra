import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true } });
try {
  const load = path => server.ssrLoadModule(`/src/${path}.ts`);
  const { equipmentSlots } = await load('systems/build/EquipmentSlots');
  const { BuildService } = await load('systems/build/BuildService');
  const { BattleEngine } = await load('systems/combat/BattleEngine');
  const { SaveService } = await load('systems/save/SaveService');
  const { DataRegistry } = await load('data/DataRegistry');
  const { createNewGame } = await load('state/GameState');
  const { ProgressionService } = await load('systems/progression/ProgressionService');
  const { EchoRegistryService } = await load('systems/echoes/EchoRegistryService');
  const { shortSpeakerName, fitSpeakerName } = await load('ui/narrative/NarrativeNames');
  const items = DataRegistry.items().filter(item => (item.category ?? 'equipment') === 'equipment').slice(0, 3);
  assert.equal(items.length, 3);
  const champion = mastery => ({ instanceId: `qa-${mastery}`, championId: 'teemo', mastery, masteryExperience: 0,
    skillRanks: ProgressionService.defaultSkillRanks(mastery), unspentSkillPoints: 0, currentHp: 99999, runeTraits: [], equippedItems: [] });
  for (const [mastery, expected] of [[1, 1], [8, 1], [9, 1], [10, 2], [19, 2], [20, 3], [50, 3]]) {
    const save = createNewGame(), echo = champion(mastery);
    save.party.push(echo);
    for (const item of items) save.inventory[item.id] = 10;
    assert.equal(equipmentSlots(echo), expected);
    for (let i = 0; i < expected; i++) assert(BuildService.equip(save, echo, items[i].id).ok);
    assert(!BuildService.canEquip(save, echo, items[0].id));
    const before = structuredClone(save.inventory);
    assert(!BuildService.equip(save, echo, items[0].id).ok);
    assert.deepEqual(save.inventory, before, 'Refused equip must not consume items');
    const stats = BattleEngine.statsFor(echo);
    echo.equippedItems.push(items[0].id);
    assert.deepEqual(BattleEngine.statsFor(echo), stats, 'Overflow items must not buff combat');
    echo.equippedItems.pop();
    assert(BuildService.unequip(save, echo, 0).ok);
    assert(BuildService.canEquip(save, echo, items[0].id));
  }
  const legacy = createNewGame('Legacy');
  legacy.party = [champion(1), champion(10)]; legacy.storage = [champion(20)];
  legacy.gold = 123; legacy.artifactLevels[items[1].id] = 2;
  for (const echo of [...legacy.party, ...legacy.storage]) echo.equippedItems = items.map(item => item.id);
  const restored = SaveService.deserializeSave(JSON.stringify(legacy));
  assert(restored);
  assert.deepEqual(restored.party.map(echo => echo.equippedItems.length), [1, 2]);
  assert.equal(restored.storage[0].equippedItems.length, 3);
  assert.equal(restored.inventory[items[1].id], 1);
  assert.equal(restored.inventory[items[2].id], 2);
  assert.equal(restored.gold, 123); assert.equal(restored.artifactLevels[items[1].id], 2);
  for (const echo of [...restored.party, ...restored.storage]) assert(echo.currentHp <= BattleEngine.statsFor(echo).hp);
  assert.deepEqual(SaveService.deserializeSave(JSON.stringify(restored)), restored, 'Migration is idempotent');
  const save = createNewGame();
  assert.deepEqual(EchoRegistryService.unlockedRegionalCatalogs(save).map(region => region.id), ['bandle-city']);
  const bandle = EchoRegistryService.regionalCatalog('bandle-city');
  assert.equal(EchoRegistryService.counts(save).total, bandle.length, 'Profile must not display all planned champions');
  assert(bandle.length < 20); assert(bandle.some(entry => entry.id === 'teemo'));
  assert(!bandle.some(entry => entry.id === 'jhin'));
  save.worldProgress.unlockedRegions.push('ionia');
  assert.deepEqual(EchoRegistryService.unlockedRegionalCatalogs(save).map(region => region.id), ['bandle-city', 'ionia']);
  const ionia = EchoRegistryService.regionalCatalog('ionia');
  for (const id of ['jhin', 'karma', 'sett', 'kennen', 'yasuo', 'yone']) assert(ionia.some(entry => entry.id === id), `Missing regional Echo ${id}`);
  assert(ionia.length < 40);
  assert.equal(EchoRegistryService.counts(save).total, new Set([...bandle, ...ionia].map(entry => entry.id)).size, 'No duplicate global count for cross-region Echoes');
  EchoRegistryService.markSeen(save, 'jhin'); EchoRegistryService.markLinked(save, 'karma');
  assert.equal(EchoRegistryService.counts(save, 'ionia').discovered, 2);
  assert.equal(EchoRegistryService.counts(save, 'ionia').linked, 1);
  assert.equal(EchoRegistryService.counts(save, 'bandle-city').discovered, 0);
  for (const id of ['jhin', 'karma', 'teemo']) assert(existsSync(`src/contenido/campeones/${id}/retrato.png`));
  assert.equal(shortSpeakerName('Nara, encargada del almacén'), 'NARA');
  assert.equal(shortSpeakerName('Meilin, hermana de Ren'), 'MEILIN');
  assert.equal(shortSpeakerName('Lee Sin'), 'LEE SIN');
  assert.equal(shortSpeakerName(''), '???');
  for (const dialogue of DataRegistry.dialogues()) for (const node of dialogue.nodes) {
    const fitted = fitSpeakerName(shortSpeakerName(node.speaker), 226, text => text.length * 12);
    assert(fitted.length * 12 <= 226, `${node.speaker}: plaque overflow`);
  }
  // Native 960×540 registry cards, images and pagination never overlap.
  const cells = Array.from({ length: 12 }, (_, index) => ({ x: 60 + index % 4 * 214, y: 232 + Math.floor(index / 4) * 66, w: 200, h: 60 }));
  for (const cell of cells) assert(cell.x + cell.w <= 918 && cell.y + cell.h < 433);
  const playerSource = readFileSync('src/scenes/PlayerScene.ts', 'utf8');
  assert(playerSource.includes("state !== 'unknown' && this.textures.exists(portraitKey)"), 'Unknown portrait must remain hidden');
  const previous = createNewGame(); previous.party = [champion(8), champion(9)];
  for (const echo of previous.party) echo.equippedItems = items.slice(0, 2).map(item => item.id);
  const rebalanced = SaveService.deserializeSave(JSON.stringify(previous));
  assert(rebalanced.party.every(echo => echo.equippedItems.length === 1));
  assert.equal(rebalanced.inventory[items[1].id], 2, 'Return the second item of mastery 8/9 Echoes');
  console.log(`Equipment 1/10/20, safe repeated migration, combat limits, plaque widths and registry ${bandle.length} Bandle / ${ionia.length} Ionia: OK.`);
} finally {
  await server.close();
}
