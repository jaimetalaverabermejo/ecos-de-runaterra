import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const load=async(p,name)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[name];
 const D=await load('data/DataRegistry','DataRegistry'),C=await load('systems/world/ConditionService','ConditionService');
 const W=await load('systems/world/WorldActionService','WorldActionService'),S=await load('systems/save/SaveService','SaveService');
 const E=await load('systems/encounters/EchoAppearanceService','EchoAppearanceService'),R=await load('systems/encounters/RoamingEchoService','RoamingEchoService');
 const P=await load('systems/progression/ProgressionService','ProgressionService'),L=await load('systems/link/LinkService','LinkService');
 const F=await load('systems/encounters/WildEscapeService','WildEscapeService'),H=await load('systems/sanctuary/SanctuaryService','SanctuaryService');
 const M=await load('systems/combat/CombatMechanicsEngine','CombatMechanicsEngine');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 assert.deepEqual(D.validate(),[]);
 const speak=(s,id)=>D.dialogue(id).nodes.forEach(n=>W.applyAll(s,n.actions));
 const see=(s,id)=>C.matchesAll(s,D.npc(id).conditions);
 const variant=(s,id)=>{const n=D.npc(id);return n.dialogueVariants?.find(v=>C.matchesAll(s,v.conditions))?.dialogueId??n.dialogueId;};
 const story=(s,id)=>W.applyAll(s,read(`src/data/stories/${id}.json`).completionActions);
 let s=createNewGame();s.gold=543;s.currentMapId='jo09_forest_landing';
 const oldMoney=s.gold,oldParty=JSON.stringify(s.party);
 for(const z of ['jo09_forest_landing','jo10_oblivion_garden','jo11_omikayalan','jo12_roots','jo13_vastaya_refuge']){
  const fresh=E.entriesForEncounter(s,`ionia-${z}`,'ionia',z);assert.deepEqual(fresh.map(e=>e.championId),['kennen']);
  s.worldProgress.flags.push('echo:master-yi-resonance');assert(E.entriesForZone(s,'ionia',z).some(e=>e.championId==='master-yi'));assert(!E.entriesForZone(s,'ionia',z).some(e=>e.championId==='kennen'));s.worldProgress.flags.pop();
 }
 assert.equal(variant(s,'forest-ahri-garden'),'forest-ahri-wait');
 speak(s,'forest-arrival');story(s,'forest-syndra-outburst');assert(see(s,'forest-nao'));assert(!see(s,'forest-syndra-arrival'));
 speak(s,'forest-wounded');s=S.deserializeSave(JSON.stringify(s));speak(s,'forest-trace');story(s,'forest-syndra-flee-1');story(s,'forest-syndra-flee-2');assert.equal(variant(s,'forest-ahri-garden'),'forest-ahri-listen');speak(s,'forest-ahri-listen');
 speak(s,'forest-lillia');speak(s,'forest-rock-inspect');assert.equal(variant(s,'forest-yunara-field'),'forest-yunara');speak(s,'forest-yunara');speak(s,'forest-chime');speak(s,'forest-yunara-return');
 story(s,'forest-daisy-awakening');assert(see(s,'forest-ivern-trial'));assert(!see(s,'forest-ivern-after'));
 const retry=S.deserializeSave(JSON.stringify(s));assert(see(retry,'forest-ivern-trial'));assert(!retry.worldProgress.flags.includes('story:forest-passage-open'));
 W.applyAll(s,D.duel('ionia-forest-ivern').victoryActions);assert(s.worldProgress.flags.includes('story:forest-passage-open'));assert.equal(s.quests['ionia-sleeping-passage'].status,'completed');
 const afterGold=s.gold;W.applyAll(s,D.duel('ionia-forest-ivern').victoryActions);assert.equal(s.gold,afterGold);
 assert(!see(s,'forest-ivern-trial'));assert(see(s,'forest-ivern-after'));
 story(s,'forest-syndra-control');assert(!see(s,'forest-ahri-garden'));assert(see(s,'forest-nao-sanctuary'));assert(see(s,'forest-ahri-sanctuary'));
 speak(s,'forest-repair');story(s,'forest-syndra-restitution');assert.equal(s.quests['ionia-unquiet-spheres'].status,'completed');
 s=S.deserializeSave(JSON.stringify(s));assert.equal(variant(s,'forest-xayah-gate'),'forest-refuge-ready');speak(s,'forest-refuge-ready');assert(see(s,'forest-xayah-trial'));
 W.applyAll(s,D.duel('ionia-forest-refuge').victoryActions);assert.equal(s.quests['ionia-refuge-trust'].status,'completed');assert(see(s,'forest-xayah-after'));assert(see(s,'ionia-forest-linker-15-trainer'));
 for(const c of ['ahri','syndra','lillia','ivern','yunara','xayah','rakan'])assert(s.worldProgress.flags.includes(`echo:${c}-resonance`));
 assert.equal(JSON.stringify(s.party),oldParty,'Stories unlock resonance, never hand out captures');assert(s.gold>oldMoney);
 for(const z of ['jo09_forest_landing','jo10_oblivion_garden','jo11_omikayalan','jo12_roots','jo13_vastaya_refuge']){
  for(const c of ['master-yi','wukong','karma','lee-sin'])W.apply(s,{type:'set-flag',id:`echo:${c}-resonance`});
  const entries=E.entriesForZone(s,'ionia',z),local=entries.filter(e=>!['master-yi','wukong','karma','lee-sin','kennen'].includes(e.championId)).reduce((sum,e)=>sum+e.weight,0),total=entries.reduce((sum,e)=>sum+e.weight,0);
  assert(local/total>=.65&&local/total<=.75,`${z}: locals must gain 65–75% after their story`);
 }
 // Exact roaming roll, persistent HP through serialization, no status persistence or duplicate captures.
 let roam=createNewGame();roam.inventory['echo-linker-hextech']=1;speak(roam,'forest-yasuo-intro');
 assert.equal(R.encounter(roam,'jo04_rice_fields',.01),null);assert.equal(R.encounter(roam,'jo04_rice_fields',.5),null);assert.equal(R.encounter(roam,'jo04_rice_fields',.0099).mastery,30);
 let y=R.encounter(roam,'jo04_rice_fields',0);const max=y.currentHp;R.remember(roam,y,37);roam=S.deserializeSave(JSON.stringify(roam));assert.equal(R.encounter(roam,'jo12_roots',0).currentHp,37);
 H.activate(roam,{...roam.checkpoint});assert.equal(R.encounter(roam,'jo04_rice_fields',0).currentHp,37,'Rest must not undo attrition');
 const player={...structuredClone(y),championId:'teemo',instanceId:'player',mastery:12};const chance=L.chance(roam,player,y,1,max,1.5);assert(chance>0&&chance<.01);assert(L.chance(roam,player,y,max,max,1.5)<chance);
 roam.artifactLevels['echo-linker-hextech']=3;const upgraded=L.chance(roam,player,y,1,max,1.5);assert(upgraded>chance*7&&upgraded<.25);
 assert(L.chance(roam,{...player,mastery:20},y,1,max,1.5)>upgraded);assert(F.wantsToFlee(D.champion('yasuo'),[],false,0.999));
 for(const kind of ['root','stun','sleep','airborne','trap'])assert(!F.wantsToFlee(D.champion('yasuo'),[{kind,remainingTurns:1}],false,0));
 assert(!F.wantsToFlee(D.champion('yasuo'),[],true,0));
 R.remember(roam,y,0);assert.equal(R.encounter(roam,'jo04_rice_fields',0),null);H.activate(roam,{...roam.checkpoint});assert.equal(R.encounter(roam,'jo04_rice_fields',0).currentHp,max);
 R.captured(roam,y);assert.equal(R.encounter(roam,'jo04_rice_fields',0),null);assert(!roam.roamingEchoes.yasuo);
 const legacy=createNewGame();delete legacy.roamingEchoes;legacy.party=[{...player,mastery:23}];assert.equal(S.deserializeSave(JSON.stringify(legacy)).party[0].mastery,23);assert.deepEqual(S.deserializeSave(JSON.stringify(legacy)).roamingEchoes,{});
 // Margarita uses the production summon implementation, damage interception and end-turn attack.
 const ivern={...structuredClone(player),championId:'ivern',instanceId:'ivern',mastery:15};const store=M.createStore(),forms={};const skill=D.skill('ivern-daisy');
 M.onActionResolved(ivern,{type:'skill',skillId:skill.id},skill,true,'player',200,store,forms);
 const summon=M.summon(ivern,store);assert.equal(summon.name,'Margarita');assert.equal(summon.hp,150);const hit=M.interceptDamage(ivern,40,store);assert(hit.intercepted>0&&hit.ownerDamage<40);assert(M.finishTurn(ivern,[],store,forms).summonAttack.damage>0);
 // Production battle exit paths must write the roaming snapshot, not just mutate a temporary champion.
 const battleSource=fs.readFileSync('src/scenes/BattleScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class BattleScene','class BattleScene');
 const Battle=new Function('Phaser','RoamingEchoService','DataRegistry','SaveService','SanctuaryService','QuestService','WorldActionService','ProgressionService',stripTypeScriptTypes(battleSource,{mode:'strip'})+'\nreturn BattleScene;')({Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(v,b))}},R,D,{save(){}},H,{recordEvent(){}},W,P);
 for(const exit of ['finishWildEscape','flee','finishPartyDefeat']){
  const save=createNewGame();save.worldProgress.flags.push('story:yasuo-met');const wild=R.encounter(save,'jo04_rice_fields',0);save.party=[structuredClone(player)];
  const sc=new Battle();Object.assign(sc,{save,playerChampion:save.party[0],wildChampion:wild,playerHp:80,wildHp:42,playerStats:{speed:999},wildStats:{speed:1},registry:{get(){},set(){},remove(){}},scene:{start(){}},refreshUi(){},disableActions(){},cleanupBattleSession(){},awaitContinue:async()=>{},setMessage(){},wait:async()=>{},isNpcDuel:()=>false,beginActorTurn:async()=>true,refreshCombatStats(){}});
  const random=Math.random;try{Math.random=()=>0;await sc[exit]();}finally{Math.random=random;}
  assert.equal(save.roamingEchoes.yasuo.champion.currentHp,42,exit);
 }
 // The real double-victory path applies narrative actions before returning to the world.
 const doubleSource=fs.readFileSync('src/scenes/DoubleBattleScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class DoubleBattleScene','class DoubleBattleScene');
 const Double=new Function('Phaser','DataRegistry','WorldActionService','SaveService',stripTypeScriptTypes(doubleSource,{mode:'strip'})+'\nreturn DoubleBattleScene;')({Scene:class{}},D,W,{save(){}});
 const ds=createNewGame();speak(ds,'forest-refuge-ready');const reg=new Map(),double=Object.create(Double.prototype);Object.assign(double,{save:ds,session:{id:'duel:ionia-forest-refuge',kind:'duel',persistPlayerState:true,victoryFlag:'duel:ionia-forest-refuge:won',rewardGold:220},playerActive:[],gains:[],activeSlots:2,registry:{set:(k,v)=>reg.set(k,v),remove:k=>reg.delete(k)},scene:{start(){}},destroyActionUi(){},awaitContinue:async()=>{}});
 await double.finishVictory();assert(ds.worldProgress.flags.includes('echo:xayah-resonance'));assert(ds.worldProgress.flags.includes('echo:rakan-resonance'));assert.equal(reg.get('world.pendingDialogueId'),'forest-refuge-won');
 // Execute the actual NPC movement method for every forest actor and Yasuo.
 const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Phaser={Scene:class{},Math:{Distance:{Between:(x,y,a,b)=>Math.hypot(x-a,y-b)},Clamp:(v,a,b)=>Math.max(a,Math.min(v,b))}};
 const Scene=new Function('Phaser','DataRegistry','WORLD_PLAYER_VISUAL_SIZE','SaveService',stripTypeScriptTypes(source,{mode:'strip'})+'\nreturn WorldScene;')(Phaser,D,52,{save(){}});
 for(const entry of read('src/contenido/mundo/npcs/ionia-forest.json')){
  const placement=D.npc(entry.id),body={x:placement.x,y:placement.y,setPosition(x,y){this.x=x;this.y=y;}};body.body={vx:0,vy:0,setVelocity(x,y){this.vx=x;this.vy=y;}};
  const n={placement,body,visual:{depth:body.y+100},facing:placement.facing,patrolIndex:0,pauseUntil:0},sc=new Scene();Object.assign(sc,{save:createNewGame(),npcs:[n],player:{x:0,y:0},time:{now:0},syncNpcVisual(){},isFollowerActive:()=>false,isGuideActive:()=>false});
  let moved=0;for(let k=0;k<80;k++){sc.time.now+=100;sc.updateNpcs();body.x+=body.body.vx*.1;body.y+=body.body.vy*.1;moved+=Math.hypot(body.body.vx,body.body.vy)*.1;}assert(moved>10,entry.id);
  sc.player={x:body.x,y:body.y+25};sc.updateNpcs();assert.equal(body.body.vx,0);assert.equal(body.body.vy,0);sc.player={x:0,y:0};let resumed=0;for(let k=0;k<40;k++){sc.time.now+=100;sc.updateNpcs();resumed+=Math.hypot(body.body.vx,body.body.vy);}assert(resumed>0,entry.id);
 }
 // Execute the actual recovery method against the rebuilt map's real collision rectangles.
 const gm=D.map('jo10_oblivion_garden'),gj=read('public/'+gm.tiled.url.replace('./','')),layers=new Map(gj.layers.map(l=>[l.name,l])),tiles=layers.get('Paths').data;
 const colliders=[];
 for(const name of ['Obstacles','Agua','Vallas'])for(const [i,g]of (layers.get(name)?.data??[]).entries())if(g&&(name==='Vallas'||!tiles[i])){const x=i%gj.width*32,y=Math.floor(i/gj.width)*32;colliders.push({getBounds:()=>({x,y,right:x+32,bottom:y+32})});}
 const tree=layers.get('Obstacles').data.findIndex((g,i)=>g>=1331&&g<1531&&Math.floor(i/gj.width)>25&&!tiles[i]);assert(tree>=0);
 const oldX=tree%gj.width*32+16,oldY=Math.floor(tree/gj.width)*32+16;
 const legacyGarden=createNewGame();legacyGarden.currentMapId=gm.id;legacyGarden.gold=765;legacyGarden.party=[structuredClone(player)];const keep=JSON.stringify(legacyGarden.party);
 const scene=new Scene(),body={x:oldX,y:oldY};body.body={reset(x,y){body.x=x;body.y=y;}};
 const pathLayer={getTileAtWorldXY(x,y){return {index:(tiles[Math.floor(y/32)*gj.width+Math.floor(x/32)]??0)-1};},forEachTile(fn){tiles.forEach((g,i)=>fn({index:g-1,pixelX:i%gj.width*32,pixelY:Math.floor(i/gj.width)*32,width:32,height:32}));}};
 Object.assign(scene,{save:legacyGarden,player:body,tiledMap:{heightInPixels:gm.height},tiledLayers:new Map([['Paths',pathLayer]]),worldColliders:colliders,resetPlayerTrail(){}});
 scene.recoverGardenPosition();assert(Math.hypot(body.x-oldX,body.y-oldY)>10);assert(pathLayer.getTileAtWorldXY(body.x,body.y).index>=0);assert.equal(legacyGarden.gold,765);assert.equal(JSON.stringify(legacyGarden.party),keep);
 const safe={x:body.x,y:body.y};scene.recoverGardenPosition();assert.deepEqual({x:body.x,y:body.y},safe);assert.equal(legacyGarden.worldProgress.flags.filter(f=>f==='world:jo10-forest-layout-v2').length,1);
 body.x=oldX;body.y=oldY;scene.recoverGardenPosition();assert(Math.hypot(body.x-oldX,body.y-oldY)>10,'Blocked checkpoint also recovers after first migration');
 console.log(`Forest shared arcs/retries/reload/rewards, 65–75% local pools, 50 moving actors, Yasuo 1%/HP/KO/rest/unique capture, linker N1 ${(chance*100).toFixed(3)}% vs N3 ${(upgraded*100).toFixed(3)}%, actual Daisy summon: OK.`);
}finally{await server.close();}
