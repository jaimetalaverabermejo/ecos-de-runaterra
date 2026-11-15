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
  const win=(id,level)=>{wins++;P.awardExperience(c,P.battleExperience(make(id,level)));};
  for(const r of [1,2,4,6]){
   for(const d of D.duels().filter(d=>d.id.startsWith(`ionia-route-${r}-`)).slice(0,full?2:1))for(const e of d.team)win(e.championId,e.mastery);
   for(let i=0;i<(full?3:2);i++)win('kennen',({1:6,2:6,4:6,6:7})[r]);
   if(r===4)win('jhin',13);
  }
  win('kennen',11);win('lee-sin',13);
  assert(c.mastery>=10&&c.mastery<=12,`First island: ${c.mastery}`);
  const firstExit=c.mastery;
  for(const [z,maxWild] of [['jo09',9],['jo10',10],['jo11',10],['jo12',11],['jo13',11]]){
   const all=D.duels().filter(d=>d.id.startsWith('ionia-forest-linker-')&&D.npc(d.npcId).mapId.startsWith(z));
   const train=()=>{for(const d of all.slice(0,full?2:1))for(const e of d.team)win(e.championId,e.mastery);};
   if(z!=='jo13')train();
   for(let i=0;i<(full?3:2);i++)win('master-yi',maxWild);
   if(z==='jo11'){assert(c.mastery<= (full ? 17 : 14),`Before Ivern: M${c.mastery}`);win('ivern',15);}
   if(z==='jo13'){assert(c.mastery<= (full ? 19 : 15),`Before Xayah/Rakan: M${c.mastery}`);win('xayah',16);win('rakan',16);train();}
  }
  assert(c.mastery>=15&&c.mastery<= (full ? 20 : 16),`Forest exit: ${c.mastery}`);
  console.log(`${full?'Complete':'Normal'} model: first island N${firstExit}, forest exit N${c.mastery} (${wins} defeated Ecos; includes 18/27 wild encounters, full XP for the active Echo).`);
 }
 const {EchoAppearanceService:E}=await server.ssrLoadModule('/src/systems/encounters/EchoAppearanceService.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 for(const id of ['sett','jhin']){
  const save=createNewGame();assert(!E.canAppear(save,id,'ionia','jo04_rice_fields'));save.worldProgress.flags.push(`echo:${id}-resonance`);
  for(const zone of ['jo04_rice_fields','jo06_estuary'])assert(E.canAppear(save,id,'ionia',zone));
  assert(D.appearances(id).some(a=>D.map(a.zoneId).tiled?.disableWildEncounters!==true),'Resonance needs a playable encounter route');
 }
 const city=D.map('jo05_placidium');
 const citySave=createNewGame();
 for(const flag of [undefined,'echo:karma-resonance','echo:master-yi-resonance','echo:irelia-resonance']){
  if(flag)citySave.worldProgress.flags.push(flag);
  const entries=E.entriesForEncounter(citySave,city.tiled.encounterTableId,'ionia',city.zoneId);
  assert(entries.length>0&&entries.every(e=>e.minMastery===6&&e.maxMastery===7));
 }
 const port=D.map('jo07_wehle'),garden=D.map('jo10_oblivion_garden');
 const portSave=createNewGame();
 const pool=(save,map)=>E.entriesForEncounter(save,map.tiled.encounterTableId,'ionia',map.zoneId);
 const assertPort=()=>{
  const entries=pool(portSave,port);
  assert(entries.length>0);
  assert(entries.every(e=>e.minMastery===8&&e.maxMastery===9));
 };
 assertPort();
 for(const id of ['lee-sin','karma','master-yi'])portSave.worldProgress.flags.push(`echo:${id}-resonance`);
 assertPort();
 assert.equal(pool(portSave,port).length,3);
 const gardenEntries=pool(portSave,garden);
 assert(gardenEntries.length>0&&gardenEntries.every(e=>e.minMastery===9&&e.maxMastery===10));
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
 const lee=make('lee-sin',13);
 const reward=P.battleExperience(lee);
 assert(reward>=P.experienceToNext(8)/2&&reward<P.experienceToNext(9)*.55);
 assert(P.battleExperience(make('sion',13))>2*P.battleExperience(make('katarina',13)));
 assert(P.battleExperience(make('lee-sin',13))>P.battleExperience(make('lee-sin',9)));
 assert(P.battleExperience(make('lee-sin',50))>0);
 const trialSave=createNewGame();
 trialSave.party=[make('teemo',9),make('lulu',8),make('poppy',8),make('kennen',8)];
 trialSave.party.forEach((echo,index)=>{echo.instanceId=String(index);});
 trialSave.party[2].currentHp=0;
 const gains=P.awardPartyExperience(trialSave,lee,['0','3']);
 assert.deepEqual(gains.map(g=>g.experienceGained),[reward,Math.round(reward*.7),0,reward]);
 console.log('Fixed rewards by defeated Echo and base HP, with participant and bench shares: OK.');
}finally{await server.close();}
