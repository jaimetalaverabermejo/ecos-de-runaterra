import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {WorldActionService:W}=await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
 const {ConditionService:C}=await server.ssrLoadModule('/src/systems/world/ConditionService.ts');
 const {SaveService:S}=await server.ssrLoadModule('/src/systems/save/SaveService.ts');
 const {RoamingEchoService:R}=await server.ssrLoadModule('/src/systems/encounters/RoamingEchoService.ts');
 const {QuestTrackingService:T}=await server.ssrLoadModule('/src/systems/quests/QuestTrackingService.ts');
 const {DuelTeamService}=await server.ssrLoadModule('/src/systems/world/DuelTeamService.ts');
 assert.deepEqual(D.validate(),[]);
 const speak=(save,id,node='inicio')=>W.applyAll(save,D.dialogue(id).nodes.find(n=>n.id===node).actions);
 const visible=(save,id)=>C.matchesAll(save,D.npc(id).conditions);
 const choose=(save,id)=>{const n=D.npc(id);return n.dialogueVariants?.find(v=>C.matchesAll(save,v.conditions))?.dialogueId??n.dialogueId;};
 const noYone=save=>{
  for(const id of ['jo08_peaks','jo19_wanderers'])for(const roll of [0,.005,.01,.015])assert.notEqual(R.encounter(save,id,roll)?.championId,'yone');
  assert(!visible(save,'yone-veiled'));
 };
 const early=createNewGame();early.currentMapId='jo08_peaks';noYone(early);
 early.worldProgress.flags.push('echo:yone-resonance','story:ionia-wanderers-awakened');noYone(early);
 assert(!D.appearances('yone').length,'Yone cannot bypass the mission through ordinary encounter tables');
 let save=createNewGame();save.gold=777;
 assert(visible(save,'riven-wanderers'));assert.equal(choose(save,'riven-wanderers'),'riven-first');
 speak(save,'riven-first');assert(save.quests['ionia-broken-oath']);
 assert(T.next(save,'ionia-broken-oath').includes('Arrozales'));noYone(save);
 assert(!visible(save,'riven-peaks'));
 const firstText=D.dialogue('riven-first').nodes.flatMap(n=>n.lines).join(' ');
 assert(!/\b(?:Yasuo|Yone)\b/i.test(firstText));
 speak(save,'forest-yasuo-intro');assert.equal(save.echoRegistry.yasuo??'unknown','unknown');
 assert.equal(choose(save,'riven-wanderers'),'riven-known-wind');
 assert(T.next(save,'ionia-broken-oath').includes('Vuelve con Riven'));noYone(save);
 speak(save,'riven-known-wind');assert(!visible(save,'riven-wanderers'));assert(visible(save,'riven-peaks'));
 assert.equal(save.quests['ionia-broken-oath'].currentStepIndex,1);noYone(save);
 // Legacy saves with a previously released resonance need not repeat or capture the encounter.
 const legacy=createNewGame();legacy.worldProgress.flags.push('echo:yasuo-resonance');
 assert.equal(choose(legacy,'riven-wanderers'),'riven-known-wind');
 speak(legacy,'riven-known-wind');assert.equal(legacy.quests['ionia-broken-oath'].currentStepIndex,1);
 const known=createNewGame();known.worldProgress.flags.push('story:yasuo-met','story:yasuo-departed');
 speak(known,'riven-known-wind');assert.equal(known.quests['ionia-broken-oath'].currentStepIndex,1);
 save=S.deserializeSave(JSON.stringify(save));assert(visible(save,'riven-peaks'));
 speak(save,'riven-peaks-intro');assert(save.worldProgress.flags.includes('story:riven-following'));
 assert.equal(save.quests['ionia-broken-oath'].currentStepIndex,2);noYone(save);

 const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Phaser={Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),Distance:{Between:(x,y,a,b)=>Math.hypot(x-a,y-b)}}};
 const Scene=new Function('Phaser','DataRegistry','WorldActionService','SaveService','DuelTeamService','FerryService','UI','WORLD_PLAYER_VISUAL_SIZE',stripTypeScriptTypes(source,{mode:'strip'})+'\nreturn WorldScene;')(Phaser,D,W,{save(){}},DuelTeamService,{destination(){return undefined;}},{font:{family:'sans-serif'}},52);
 const finishFollower=(save,id,x,y)=>{
  save.currentMapId=D.npc(id).mapId;
  const sc=new Scene(),registry=new Map();let restarts=0;
  Object.assign(sc,{save,npcs:[{placement:D.npc(id),body:{x:x+16,y:y+32}}],player:{x,y,body:{setVelocity(){}}},registry:{set:(k,v)=>registry.set(k,v)},time:{delayedCall(_ms,fn){fn();}},scene:{restart(){restarts++;}}});
  sc.updateFollowerCompletions();assert.equal(restarts,1);
  return registry.get('world.pendingDialogueId');
 };
 assert.equal(finishFollower(save,'riven-peaks',496,720),'riven-clearing-arrival');
 assert.equal(save.quests['ionia-broken-oath'].currentStepIndex,3);assert(visible(save,'riven-tracker'));noYone(save);
 const duel=D.duel('ionia-riven-patrol');assert.equal(duel.ally.championId,'riven');assert.equal(duel.format,'double');
 assert.deepEqual(duel.team.map(e=>e.championId),['noxus-spearman','noxus-crossbowman']);
 // Execute the real dialogue-close method: declining cannot silently start the optional fight.
 for(const choice of ['salir','entrenar']){
  const sc=new Scene();let battles=0;
  Object.assign(sc,{save,dialogueDefinition:D.dialogue('riven-patrol-offer'),dialogueNode:{id:choice},pendingDuelStart:{npc:{},duelId:duel.id},npcs:[],
   registry:{get(){return undefined;}},veigarSecrets:{onDialogueClosed(){}},updateNearbyNpc(){},updateNearbyTiledInteraction(){},pendingEchoReleasesHere:()=>[],startNpcDuelSequence(){battles++;}});
  sc.closeDialogue();assert.equal(battles,choice==='entrenar'?1:0);
 }
 // One healthy owned Echo is enough; Riven stays in the temporary allied slot.
 const sc=new Scene(),registry=new Map();
 const owned={instanceId:'owned',championId:'teemo',mastery:18,masteryExperience:0,skillRanks:{q:3,w:2,e:2,r:1},unspentSkillPoints:0,currentHp:70,runeTraits:[],equippedItems:[]};save.party=[owned];
 Object.assign(sc,{save,player:{x:544,y:752,body:{setVelocity(){}}},playerVisual:{anims:{stop(){}}},facePlayerToward(){},
  registry:{set:(k,v)=>registry.set(k,v)},cameras:{main:{flash(){},shake(){}}},time:{delayedCall(_ms,fn){fn();}},scene:{start(){}},
  createDuelChampion:e=>({...structuredClone(owned),championId:e.championId,instanceId:'test:'+e.championId})});
 sc.startNpcDuel({body:{x:560,y:720}},duel.id);
 const session=registry.get('battle.doubleSession');assert.equal(session.aiAlly.championId,'riven');assert.equal(session.playerTeam.length,1);assert.equal(session.allowLink,false);
 // Defeat/reload leaves the patrol available; only victory progresses the encounter.
 save=S.deserializeSave(JSON.stringify(save));assert(visible(save,'riven-tracker'));noYone(save);
 W.applyAll(save,duel.victoryActions);assert(!visible(save,'riven-tracker'));
 assert(save.worldProgress.flags.includes('story:riven-witness-following'));noYone(save);
 assert.equal(finishFollower(save,'riven-clearing',432,496),'yone-veiled');
 assert(visible(save,'yone-veiled'));assert(visible(save,'riven-witness'));
 assert(!save.worldProgress.flags.includes('story:yone-met'));
 speak(save,'yone-veiled');const memory=read('src/data/stories/yone-memory.json');
 assert(memory.beats.every(b=>b.grayscale),'Only the explicit recollection uses StoryScene');
 W.applyAll(save,memory.completionActions);save=S.deserializeSave(JSON.stringify(save));
 assert.equal(choose(save,'yone-veiled'),'yone-resolution');
 const beforeGold=save.gold;speak(save,'yone-resolution');assert.equal(save.gold,beforeGold+150);
 assert.equal(save.quests['ionia-broken-oath'].status,'completed');assert(!visible(save,'yone-veiled'));assert(visible(save,'riven-wanderers-after'));
 speak(save,'yone-resolution');assert.equal(save.gold,beforeGold+150,'No repeated reward');
 assert(!save.party.some(e=>e.championId==='riven'||e.championId==='yone'),'No forced capture or companion ownership');
 const roamer=R.encounter(save,'jo19_wanderers',0);assert.equal(roamer.championId,'yone');assert.equal(roamer.mastery,30);
 assert.equal(R.encounter(save,'jo19_wanderers',.01),null);assert.equal(R.encounter(save,'jo04_rice_fields',.01),null);
 R.remember(save,roamer,27);save=S.deserializeSave(JSON.stringify(save));assert.equal(R.encounter(save,'jo19_wanderers',0).currentHp,27);
 R.remember(save,roamer,0);assert.equal(R.encounter(save,'jo19_wanderers',0),null);R.recoverDefeated(save);assert(R.encounter(save,'jo19_wanderers',0).currentHp>0);
 R.captured(save,roamer);assert.equal(R.encounter(save,'jo19_wanderers',0),null);

 // New actors and both escorts use real walkable map geometry and the production patrol method.
 const npcs=D.npcs().filter(n=>/^(?:riven-|yone-veiled)/.test(n.id));
 const maps=new Map();
 for(const id of ['jo08_peaks','jo19_wanderers']){
  const cfg=D.map(id),m=read('public/'+cfg.tiled.url.replace('./','')),layers=new Map(m.layers.map(l=>[l.name,l]));
  const rects=['Collisions','BridgeRails'].flatMap(n=>layers.get(n)?.objects??[]).filter(o=>!o.properties?.some(p=>p.name==='blockedUntilFlag'));
  const tile=(n,c,r)=>layers.get(n)?.data?.[r*m.width+c]??0;
  const free=(x,y)=>x>=12&&y>=10&&x<cfg.width-12&&y<cfg.height-10&&!rects.some(o=>x+12>o.x&&x-12<o.x+o.width&&y+10>o.y&&y-10<o.y+o.height)&&[-12,12].every(dx=>[-10,10].every(dy=>{const c=Math.floor((x+dx)/32),r=Math.floor((y+dy)/32);return !tile('Vallas',c,r)&&!['Obstacles','Agua'].some(n=>tile(n,c,r)&&!tile('Paths',c,r));}));
  const q=[[Math.floor(cfg.spawn.x/32),Math.floor(cfg.spawn.y/32)]],seen=new Set(q.map(p=>p.join(',')));
  for(const[c,r]of q)for(const[cc,rr]of[[c-1,r],[c+1,r],[c,r-1],[c,r+1]]){const k=`${cc},${rr}`;if(!seen.has(k)&&free(cc*32+16,rr*32+16)){seen.add(k);q.push([cc,rr]);}}
  maps.set(id,{free,seen});
 }
 for(const placement of npcs){
  const g=maps.get(placement.mapId);assert(g.seen.has(`${Math.floor(placement.x/32)},${Math.floor(placement.y/32)}`),placement.id+': reachable');
  const sc=new Scene(),n={placement,patrolIndex:0,pauseUntil:0,body:{x:placement.x,y:placement.y,setPosition(x,y){this.x=x;this.y=y;},body:{vx:0,vy:0,setVelocity(x,y){this.vx=x;this.vy=y;}}}};
  Object.assign(sc,{save:createNewGame(),npcs:[n],time:{now:0},player:{x:0,y:0},isFollowerActive:()=>false,isGuideActive:()=>false,syncNpcVisual(){},stopNpc(n){n.body.body.setVelocity(0,0);}});
  const step=()=>{sc.time.now+=100;sc.updateNpcs();n.body.x+=n.body.body.vx*.1;n.body.y+=n.body.body.vy*.1;assert(g.free(n.body.x,n.body.y),placement.id+': patrol');};
  for(let i=0;i<18;i++)step();assert(Math.abs(n.body.x-placement.x)>5,placement.id+': moves');
  sc.player={x:n.body.x,y:n.body.y+30};const paused=n.body.x;for(let i=0;i<10;i++)step();assert.equal(n.body.x,paused);
  sc.player={x:0,y:0};let resumed=0;for(let i=0;i<40;i++){step();resumed=Math.max(resumed,Math.abs(n.body.x-paused));}assert(resumed>3,placement.id+': resumes');
 }
 console.log('Riven: both entry paths, mystery/quest tracking, two real escort completions, explicit fight consent, solo Echo + AI ally, retry/reload/reward safety; gated unique Yone/HP/KO/capture and reachable moving cast: OK.');
} finally { await server.close(); }
