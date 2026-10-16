import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try{
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {ProgressionService:P}=await server.ssrLoadModule('/src/systems/progression/ProgressionService.ts');
 const make=(championId,mastery)=>({instanceId:'test',championId,mastery,masteryExperience:0,skillRanks:P.defaultSkillRanks(mastery),unspentSkillPoints:0,currentHp:999,runeTraits:[],equippedItems:[]});
 assert.equal(P.maxMastery(),50);
 for(const full of [false,true]){
  const c=make('teemo',7);let wins=0;
  const win=(id,level,source)=>{wins++;P.awardExperience(c,P.battleExperience(make(id,level),c.mastery,source));};
  for(const r of [1,2,4,6]){
   for(const d of D.duels().filter(d=>d.id.startsWith(`ionia-route-${r}-`)).slice(0,full?4:3))for(const e of d.team)win(e.championId,e.mastery,'trainer');
   for(let i=0;i<(full?18:10);i++)win('kennen',({1:6,2:6,4:6,6:7})[r],'wild');
   if(r===4)win('jhin',13,'leader');
  }
  win('kennen',11,'leader');win('lee-sin',13,'leader');
  assert(c.mastery>=10&&c.mastery<=12,`First island: ${c.mastery}`);
  const firstExit=c.mastery;
  for(const [z,maxWild] of [['jo09',9],['jo10',10],['jo11',10],['jo12',11],['jo13',11]]){
   const all=D.duels().filter(d=>d.id.startsWith('ionia-forest-linker-')&&D.npc(d.npcId).mapId.startsWith(z));
   const train=()=>{for(const d of all.slice(0,full?all.length:Math.max(0,all.length-1)))for(const e of d.team)win(e.championId,e.mastery,'trainer');};
   if(z!=='jo13')train();
   for(let i=0;i<(full?18:10);i++)win('master-yi',maxWild,'wild');
   if(z==='jo11'){assert(c.mastery<15,'Do not outlevel Ivern before meeting him');win('ivern',15,'leader');}
   if(z==='jo13'){assert(c.mastery<=15,'Do not arrive at Xayah/Rakan overleveled');win('xayah',16,'leader');win('rakan',16,'leader');train();}
  }
  assert(c.mastery>=15&&c.mastery<=16,`Forest exit: ${c.mastery}`);
  console.log(`${full?'Complete':'Normal'} model: first island N${firstExit}, forest exit N${c.mastery} (${wins} defeated Ecos; includes 90/162 wild encounters, full XP for the active Echo).`);
 }
 const {EchoAppearanceService:E}=await server.ssrLoadModule('/src/systems/encounters/EchoAppearanceService.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 for(const id of ['sett','jhin']){
  const save=createNewGame();assert(!E.canAppear(save,id,'ionia','jo04_rice_fields'));save.worldProgress.flags.push(`echo:${id}-resonance`);
  for(const zone of ['jo04_rice_fields','jo06_estuary'])assert(E.canAppear(save,id,'ionia',zone));
  assert(D.appearances(id).some(a=>D.map(a.zoneId).tiled?.disableWildEncounters!==true),'Resonance needs a playable encounter route');
 }
 // Exercise the real transition tables, their story gates and actual duel construction.
 const transit=createNewGame();transit.worldProgress.flags.push(...['rumble','corki','kled','kennen','master-yi','wukong'].map(c=>`echo:${c}-resonance`));
 const mountain=E.entriesForEncounter(transit,'bandle-meadow','bandle-city','portal-mountains');assert(mountain.length>=4);assert(mountain.every(e=>e.minMastery===5&&e.maxMastery===5));
 const portalTeam=D.duel('portal-mountains-duel-01').team;assert.deepEqual(portalTeam.map(e=>e.mastery),[5,5]);
 const bossEntry=D.duel('kennen-portal-boss').team[0];assert.equal(bossEntry.mastery,7);assert(bossEntry.mastery>=Math.max(...portalTeam.map(e=>e.mastery))+2);
 for(const zone of ['jo01_koeshin','jo02_white_cliffs']){
  const entries=E.entriesForEncounter(transit,D.map(zone).tiled.encounterTableId,'ionia',zone);assert(entries.length>=2);assert(entries.every(e=>e.minMastery===5&&e.maxMastery===6));
  assert(entries.every(e=>e.minMastery>=Math.max(...mountain.map(e=>e.maxMastery))),'No level regression when entering Jonia');
 }
 const {BattleEngine:B}=await server.ssrLoadModule('/src/systems/combat/BattleEngine.ts');
 const {CombatTempoEngine:T}=await server.ssrLoadModule('/src/systems/combat/CombatTempoEngine.ts');
 const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Scene=new Function('Phaser','ProgressionService','BattleEngine','WORLD_PLAYER_VISUAL_SIZE',stripTypeScriptTypes(source,{mode:'strip'})+'\nreturn WorldScene;')({Scene:class{}},P,B,52);
 const enemy=new Scene().createDuelChampion(bossEntry);assert.equal(enemy.mastery,7);assert.equal(P.normalizeChampion(enemy).skillRanks.r,1);
 assert.equal(P.defaultSkillRanks(5).r,0,'Captured mountain echoes must train to unlock their R');assert.equal(P.defaultSkillRanks(7).r,0,'Boss technique is not granted to the player early');
 const tempo=T.createStore(),ultimate=D.skill('kennen-slicing-maelstrom');assert(!T.canUseSkill(enemy,ultimate,tempo).allowed);T.finishTurn(enemy,tempo);T.finishTurn(enemy,tempo);assert(T.canUseSkill(enemy,ultimate,tempo).allowed);
 console.log('Bandle → Jonia: M5 wilds / M5+5 trainer / Kennen M7 with timed R → M5–6 wilds and M6–8 trainers; no early R for captures: OK.');
 const trainers=D.duels().filter(d=>d.id.startsWith('ionia-forest-linker-'));
 assert.equal(trainers.length,16);assert.equal(trainers.filter(d=>d.format==='double').length,2);
 for(const d of trainers){
  const zone=D.npc(d.npcId).mapId,boss=zone.startsWith('jo09')||zone.startsWith('jo10')||zone.startsWith('jo11')?15:16;
  assert(d.team.every(e=>e.mastery<=boss-2));
  if(!zone.startsWith('jo13'))assert(d.team.every(e=>e.mastery<=boss-3));
  if(d.team.length>=3&&!zone.startsWith('jo13'))assert(Math.max(...d.team.map(e=>e.mastery))<=12);
 }
 const defeated=make('kennen',10);
 assert(P.battleExperience(defeated,12,'wild')<P.battleExperience(defeated,12,'trainer'));
 assert(P.battleExperience(defeated,18,'trainer')/P.experienceToNext(18)<P.battleExperience(defeated,12,'trainer')/P.experienceToNext(12));
 console.log('Three difficulty/XP tiers, boss gaps >=2 (normally >=3), slower growth against low-level foes, no regional hard cap: OK.');
}finally{await server.close();}
