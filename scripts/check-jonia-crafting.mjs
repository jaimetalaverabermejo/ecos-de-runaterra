import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const load=p=>server.ssrLoadModule('/src/'+p+'.ts');
 const {DataRegistry:D}=await load('data/DataRegistry');
 const {createNewGame}=await load('state/GameState');
 const {WorldActionService:A}=await load('systems/world/WorldActionService');
 const {ConditionService:C}=await load('systems/world/ConditionService');
 const {QuestService:Q}=await load('systems/quests/QuestService');
 const {SaveService:S}=await load('systems/save/SaveService');
 const {EconomyProgressionService:E}=await load('systems/progression/EconomyProgressionService');
 const {CraftingService:F}=await load('systems/crafting/CraftingService');
 const {BattleEngine:B}=await load('systems/combat/BattleEngine');
 const {ProgressionService:P}=await load('systems/progression/ProgressionService');
 const {equipmentSlots}=await load('systems/build/EquipmentSlots');
 assert.deepEqual(D.validate(),[]);
 const tasks=D.quests().filter(q=>q.id.startsWith('ionia-crafting-'));assert.equal(tasks.length,6);
 for(const q of tasks){
  let save=createNewGame();save.worldProgress.flags.push('story:campaign');
  for(const c of q.prerequisites??[])if(c.type==='flag')save.worldProgress.flags.push(c.id);
  const select=id=>{const n=D.npc(id);return D.dialogue(n.dialogueVariants?.find(v=>C.matchesAll(save,v.conditions))?.dialogueId??n.dialogueId);};
  const actions=(d,ids)=>{for(const n of d.nodes)if(!ids||ids.includes(n.id))A.applyAll(save,n.actions??[]);};
  const offer=select(q.startNpcId);assert.equal(offer.id,q.id+'-offer');
  actions(offer,['inicio','decision','despues']);assert(!save.quests[q.id],'Deferring cannot start a task');
  actions(offer,['aceptar']);assert.equal(save.quests[q.id].status,'active');
  assert.equal(select(q.startNpcId).id,q.id+'-active');
  for(const step of q.steps){
   const target=step.objectives[0].targetId;
   const actor=D.npcs().find(n=>n.dialogueVariants?.some(v=>v.dialogueId===target+'-dialogue'));
   assert(actor,'Every objective must have a reachable existing actor');
   assert(C.matchesAll(save,actor.conditions),'Objective actor must be present');
   const d=select(actor.id);assert.equal(d.id,target+'-dialogue');actions(d);
   const once=JSON.stringify(save.quests[q.id]);actions(d);assert.equal(JSON.stringify(save.quests[q.id]),once,'Repeated step must not advance twice');
   save=S.deserializeSave(JSON.stringify(save));assert(save);
  }
  assert.equal(save.quests[q.id].status,'ready');const delivery=select(q.completionNpcId);assert.equal(delivery.id,q.id+'-finish');actions(delivery);
  assert.equal(save.quests[q.id].status,'completed');
  for(const recipe of [...(q.startRewards?.unlockRecipes??[]),...(q.rewards.unlockRecipes??[])])assert(save.unlockedRecipes.includes(recipe));
  const gold=save.gold,recipes=JSON.stringify(save.unlockedRecipes);actions(delivery);assert.equal(save.gold,gold);assert.equal(JSON.stringify(save.unlockedRecipes),recipes);
  assert.notEqual(select(q.startNpcId).id,q.id+'-offer','Completed task must restore the original NPC dialogue');
 }
 // Recover rewards for existing completed saves, without replay, duplicate gold, or changes to quests.
 const old=createNewGame();old.gold=321;
 for(const id of ['ionia-wandering-wind','ionia-unquiet-spheres'])old.quests[id]={revision:1,status:'completed',objectiveProgress:{}};
 old.worldProgress.flags.push('story:ionia-complete');const oldQuests=JSON.stringify(old.quests);E.sync(old);E.sync(old);
 assert.equal(old.gold,321);assert.equal(JSON.stringify(old.quests),oldQuests);
 for(const id of ['power-relic','speed-legendary','trinity-force'])assert(old.unlockedRecipes.includes('recipe-'+id));
 // Full recursive paths: every legendary can actually be assembled from the shop's basic components.
 const storeIds=new Set(D.shop('lhradi-market').entries.map(e=>e.itemId));
 const authored=JSON.parse(fs.readFileSync('docs/diseno/catalogos/objetos-v1.json','utf8'));
 const ids=[...authored.componentes,...authored.epicos,...authored.legendarios].map(item=>item.implementationId??item.id);
 const gear=D.items().filter(item=>(item.category??'equipment')==='equipment');
 assert.equal(gear.length,72);
 assert(gear.every(item => Boolean(item.legendaryPassive) === (item.tier === 'legendary')));
 assert(ids.every(id=>gear.some(item=>item.id===id)));
 assert.equal(D.recipes().length,63);
 const resultIds=new Set(D.recipes().map(recipe=>recipe.resultItemId));
 assert.equal(resultIds.size,D.recipes().length);
 const newRecipe=D.recipe('recipe-infinity-edge'), campaign=createNewGame();
 assert(!F.isUnlocked(campaign,newRecipe));
 campaign.worldProgress.flags.push('story:ionia-complete');
 assert(F.isUnlocked(campaign,newRecipe));
 assert(!F.isUnlocked(campaign,D.recipe('recipe-power-wand')));
 const {optimizeBuild}=await load('systems/build/BuildOptimizer');
 for(const [id,m,slots] of [['teemo',5,1],['quinn',10,2],['galio',20,3],['lux',50,3]]){
  const loadout=optimizeBuild({championId:id,mastery:m,skillRanks:P.defaultSkillRanks(m),equippedItems:[]});
  assert.equal(loadout.itemIds.length,slots);
  assert(loadout.itemIds.every(itemId=>gear.some(item=>item.id===itemId)));
 }
 for(const id of resultIds){
  const save=createNewGame();save.worldProgress.flags.push('story:campaign');save.gold=100000;
  for(const r of D.recipes())save.unlockedRecipes.push(r.id);
  const craft=(id,parents=[])=>{
   assert(!parents.includes(id),'Recipe graph must be acyclic');
   const r=D.recipes().find(r=>r.resultItemId===id);
   if(!r){assert(storeIds.has(id),'Missing ingredient source '+id);save.inventory[id]=(save.inventory[id]??0)+1;return;}
   for(const x of r.ingredients)for(let i=0;i<x.quantity;i++)craft(x.itemId,[...parents,id]);
   assert(F.craft(save,r).ok,'Uncraftable '+id);
  };
  craft(id);assert.equal(save.inventory[id],1);
  const r=D.recipe('recipe-'+id),before=JSON.stringify(save);assert(!F.craft(save,r).ok);assert.equal(JSON.stringify(save),before,'Failed crafting must be atomic');
 }
 assert(D.item('speed-legendary').statBonuses.attack>0);assert(D.item('speed-legendary').statBonuses.speed>0);assert(D.item('power-relic').statBonuses.power>0);
 // Instantiate actual duel combatants using the production WorldScene constructor method.
 const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Scene=new Function('Phaser','DataRegistry','ProgressionService','BattleEngine','WORLD_PLAYER_VISUAL_SIZE',stripTypeScriptTypes(source,{mode:'strip'})+'\nreturn WorldScene;')({Scene:class{}},D,P,B,52);
 const leaders=['ionia-lee-trial','ionia-jhin-unmasking','ionia-forest-ivern','ionia-forest-refuge','orders-akali-trial','orders-shen-trial','orders-zed-trial','orders-siege-final','ionia-irelia-unlock'];
 let count=0;
 for(const id of leaders)for(const entry of D.duel(id).team){
  assert(entry.equippedItems.length<=equipmentSlots(entry),'No overflow equipment '+id);
  assert(entry.equippedItems.every(id=>['epic','legendary'].includes(D.item(id).tier)),'Leaders require epic or legendary equipment');
  const sc=new Scene(),combatant=sc.createDuelChampion(entry),stats=B.statsFor(combatant),bare=B.statsFor({...combatant,equippedItems:[]});
  assert.equal(combatant.currentHp,stats.hp,'Leader must begin at equipped max HP');
  for(const stat of ['hp','attack','power','defense','resistance','speed']){
   const bonus=entry.equippedItems.reduce((sum,id)=>sum+(D.item(id).statBonuses?.[stat]??0),0);
   if(bonus>0)assert(stats[stat]>bare[stat],`${id}: inactive ${stat} equipment`);
  }
  count++;
 }
 // Artwork fallbacks may only reference loaded, existing textures; never hide missing icons.
 const boot=fs.readFileSync('src/scenes/BootScene.ts','utf8');
 for(const [id,path] of [['recurve-bow','epic/arco-curvo.png'],['giants-belt','epic/cinturon.png']]){assert(fs.existsSync('public/assets/items/'+path));assert(boot.includes("'item-"+id+"'"));}
 for(const id of ['sheen','spectres-cowl','crystalline-bracer','trinity-force','thornmail','spirit-visage']){
  const item=D.item(id);assert(item.iconParts.length===2);for(const p of item.iconParts){D.item(p);assert(boot.includes("'item-"+p+"'")||fs.existsSync('public/assets/items/components/'+p+'.png'));}
 }
 console.log(`Jonia crafting: six playable NPC quests, defer/reload/return/no-repeat, legacy rewards, 63 complete equipment chains, valid icons and ${count} production leader combatants with active equipment: OK.`);
} finally {await server.close();}
