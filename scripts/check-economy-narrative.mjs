import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true } });
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
try {
  const load = path => server.ssrLoadModule(`/src/${path}.ts`);
  const { DataRegistry } = await load('data/DataRegistry');
  const { createNewGame } = await load('state/GameState');
  const { CraftingService } = await load('systems/crafting/CraftingService');
  const { EconomyProgressionService } = await load('systems/progression/EconomyProgressionService');
  const { QuestService } = await load('systems/quests/QuestService');
  const { WorldActionService } = await load('systems/world/WorldActionService');
  const { EchoReleaseService } = await load('systems/echoes/EchoReleaseService');
  const { SaveService } = await load('systems/save/SaveService');
  const { JournalService } = await load('systems/quests/JournalService');
  assert.deepEqual(DataRegistry.validate(), []);
  const bandle = DataRegistry.shop('bandle-workshop'), ionia = DataRegistry.shop('lhradi-market');
  assert.deepEqual(bandle.entries, ionia.entries);
  assert.equal(bandle.entries.length, 9);
  const prices = new Map(bandle.entries.map(entry => [entry.itemId, entry.price]));
  assert.equal(prices.get('amplifying-tome'), 400);
  assert(!prices.has('power-wand'));
  for (const entry of bandle.entries) {
    assert.equal(DataRegistry.item(entry.itemId).tier, 'component');
    assert(fs.existsSync(`public/assets/items/components/${entry.itemId}.png`));
  }
  for (const id of ['recipe-lost-chapter', 'recipe-speed-core', 'recipe-wardens-mail', 'recipe-phage', 'recipe-power-wand']) {
    const recipe = DataRegistry.recipe(id), result = DataRegistry.item(recipe.resultItemId);
    const total = recipe.ingredients.reduce((sum, ingredient) => sum + prices.get(ingredient.itemId) * ingredient.quantity, recipe.goldCost ?? 0);
    assert.equal(total, result.basePrice, `${id}: inconsistent total cost`);
    const save = createNewGame();
    for (const ingredient of recipe.ingredients) save.inventory[ingredient.itemId] = ingredient.quantity;
    save.unlockedRecipes.push(id); save.gold = (recipe.goldCost ?? 0) - 1;
    const before = structuredClone(save);
    assert(!CraftingService.canCraft(save, recipe)); assert(!CraftingService.craft(save, recipe).ok);
    assert.deepEqual(save, before, 'Failed assembly cannot consume components or money');
    save.gold++;
    assert(CraftingService.craft(save, recipe).ok);
    assert.equal(save.gold, 0); assert.equal(save.inventory[recipe.resultItemId], 1);
    assert(recipe.ingredients.every(ingredient => !save.inventory[ingredient.itemId]));
  }
  const travel = createNewGame();
  QuestService.start(travel, 'corki-first-epic');
  EconomyProgressionService.sync(travel); assert.equal(travel.gold, 600);
  EconomyProgressionService.sync(travel); assert.equal(travel.gold, 600);
  travel.worldProgress.unlockedRegions.push('ionia');
  EconomyProgressionService.sync(travel); assert(travel.unlockedRecipes.includes('recipe-speed-core'));
  assert(!travel.unlockedRecipes.includes('recipe-power-relic')); assert(!travel.unlockedRecipes.includes('recipe-speed-legendary'));
  const reloaded = SaveService.deserializeSave(JSON.stringify(travel));
  assert.equal(reloaded.gold, 600); assert.deepEqual(SaveService.deserializeSave(JSON.stringify(reloaded)), reloaded);
  for (const [questId, champion] of [['ionia-sett-debt','sett'], ['ionia-jhin-trail','jhin'], ['ionia-karma-memory','karma']]) {
    const save = createNewGame(); QuestService.start(save, questId);
    for (const step of [...DataRegistry.quest(questId).steps].reverse()) for (const objective of step.objectives) QuestService.recordEvent(save, { type: objective.type, targetId: objective.targetId });
    assert(WorldActionService.apply(save, { type: 'complete-quest', questId }));
    assert.deepEqual(EchoReleaseService.pending(save), [champion], 'Nested quest completion must queue the spirit effect');
    const restored = SaveService.deserializeSave(JSON.stringify(save));
    assert(EchoReleaseService.pending(restored).includes(champion), 'Cinematic restart must retain the effect');
    EchoReleaseService.complete(restored, champion);
    assert(!EchoReleaseService.pending(SaveService.deserializeSave(JSON.stringify(restored))).includes(champion), 'Shown release must not replay');
    assert.equal(DataRegistry.quest(questId).category, 'champion');
    if (champion === 'sett') { EconomyProgressionService.sync(restored); assert(restored.unlockedRecipes.includes('recipe-phage')); }
  }
  const journal = createNewGame(); journal.worldProgress.unlockedRegions.push('ionia'); journal.worldProgress.currentRegionId = 'ionia';
  journal.quests['corki-first-epic'] = { status:'completed',objectiveProgress:{} };
  QuestService.start(journal, 'ionia-sett-debt'); QuestService.start(journal, 'bandle-first-link');
  assert.equal(JournalService.entries(journal,'active')[0].id,'ionia-sett-debt');
  assert(!JournalService.entries(journal,'active').some(quest=>quest.id==='corki-first-epic'));
  assert(JournalService.entries(journal,'completed').some(quest=>quest.id==='corki-first-epic'));
  assert(!JournalService.entries(createNewGame(),'available').some(quest=>quest.regionId==='ionia'));
  const source = fs.readFileSync('src/scenes/WorldScene.ts','utf8');
  const captureBody = source.split('  private captureNpcContinuity(): void {')[1].split('\n  private pendingEchoReleasesHere(')[0].trim().replace(/\}\s*$/,'');
  const code = `function capture(){${captureBody.replace(/\s+satisfies NpcResume\b/g, '')}}`;
  const capture = new Function(`${code};return capture;`)();
  let snapshot;
  const scene = { save:journal,time:{now:1000},npcs:[{placement:{id:'moving-sett'},body:{x:654,y:712},homeX:592,homeY:720,autoTalkTriggered:true,facing:'left',patrolIndex:1,target:{x:670,y:712},pauseUntil:1200}],registry:{set:(key,value)=>{snapshot=value;}} };
  journal.currentMapId='jo03_lhradi';capture.call(scene);
  assert.equal(snapshot.entries['moving-sett'].x,654);
  assert.equal(snapshot.entries['moving-sett'].patrolIndex,1);
  assert.equal(snapshot.entries['moving-sett'].homeX,592, 'Random movement home must not drift to the conversational position');
  assert(snapshot.entries['moving-sett'].autoTalkTriggered, 'Auto-talk must not restart after a refresh');
  assert.equal(snapshot.entries['moving-sett'].pauseMs,200);
  scene.npcs[0].target.x=900;assert.equal(snapshot.entries['moving-sett'].target.x,670);
  const restoreBody = source.match(/if \(previous\) \{([\s\S]*?)\n      \}/)[1];
  const runtime = {homeX:654,homeY:712};
  new Function('runtime','previous',restoreBody).call({time:{now:3000},syncNpcVisual(){}},runtime,snapshot.entries['moving-sett']);
  assert.equal(runtime.homeX,592);assert.equal(runtime.pauseUntil,3200);assert.equal(runtime.target.x,670);assert.equal(runtime.facing,'left');
  assert(source.includes('const position = previous ??'), 'Scene return must use live snapshot, not authored spawn');
  assert(source.includes('if (!this.npcResume) this.cameras.main.fadeIn'), 'Dialogue refresh must not flash');
  assert(!source.includes('delayedCall(100, () => this.playEchoReleaseSequence'), 'Deferred release must not race the world update queue');
  const pendingBody=source.split('  private pendingEchoReleasesHere(): string[] {')[1].split('\n  private ')[0].trim().replace(/\}\s*$/,'');
  const pending=new Function('DataRegistry','EchoReleaseService',`return function(){${pendingBody}}`)(DataRegistry,EchoReleaseService);
  const releaseSave=createNewGame();releaseSave.currentMapId='jo03_lhradi';EchoReleaseService.queue(releaseSave,'sett');
  const releaseScene={save:releaseSave,registry:{get:()=>undefined},player:{x:0,y:0},npcs:[{placement:{championId:'sett'},body:{x:500,y:500}}]};
  assert.deepEqual(pending.call(releaseScene),[], 'Do not consume an off-screen spirit');
  releaseScene.player={x:500,y:530};assert.deepEqual(pending.call(releaseScene),['sett']);
  releaseScene.registry.get=()=> 'victory-dialogue';assert.deepEqual(pending.call(releaseScene),[], 'Victory dialogue must precede the effect');
  const maps = ['bandle-city/zones/bandle_village/bandle_village','bandle-city/zones/Dark_forest/Dark_forest','bandle-city/zones/Gnar_valley/Gnar_valley','bandle-city/zones/Portal_mountains/portal_mountains','Jonia/Zones/JO01_Koeshin/JO01_Koeshin','Jonia/Zones/JO02_Acantilados_Blancos/JO02_Acantilados_Blancos','Jonia/Zones/JO03_Lhradi/JO03_Lhradi','Jonia/Zones/JO04_Camino_Arrozales/JO04_Camino_Arrozales','Jonia/Zones/JO05_Placidium_Navori/JO05_Placidium_Navori','Jonia/Zones/JO06_Senda_Estuario/JO06_Senda_Estuario','Jonia/Zones/JO07_Puerto_Wehle/JO07_Puerto_Wehle'];
  let gold=0,bags=0,scrolls=0;
  for (const path of maps) {
    const map=read(`public/assets/world/regions/${path}.tmj`);
    const ids=map.layers.flatMap(layer=>(layer.objects??[]).map(object=>object.id));
    assert.equal(ids.length,new Set(ids).size);assert(map.nextobjectid>Math.max(...ids));
    for (const object of map.layers.find(layer=>layer.name==='Interactions').objects) {
      if(object.name?.startsWith('economy-')) {const props=Object.fromEntries(object.properties.map(p=>[p.name,p.value]));gold+=props.gold;bags++;}
      if(object.name==='ionia-wardens-mail-scroll')scrolls++;
    }
  }
  assert.equal(gold,4200);assert.equal(bags,13);assert.equal(scrolls,1);
  console.log('9 basic components, five intermediate craft paths, 4200 exploration gold, transactional fees, one-time migration, queued spirit releases, NPC continuity and active regional journal: OK.');
} finally { await server.close(); }
