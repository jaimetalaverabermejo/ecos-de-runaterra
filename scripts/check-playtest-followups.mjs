import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
  const load=async(p,n)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[n];
  const D=await load('data/DataRegistry','DataRegistry'),N=await load('systems/quests/QuestNoticeService','QuestNoticeService');
  const T=await load('systems/quests/QuestTrackingService','QuestTrackingService'),C=await load('systems/world/ConditionService','ConditionService');
  const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
  const state={signature:'',pending:true,until:0};
  assert(N.update(state,'a',100,false));
  assert(!N.update(state,'a',100+N.durationMs,false),'Unchanged objective must expire');
  assert(!N.update(state,'a',20000,false),'Walking or map recreation must not renew it');
  assert(!N.update(state,'b',20001,true),'Progress during dialogue remains hidden');
  assert(N.update(state,'b',40000,false),'Read time must not consume the new-objective reminder');
  assert(!N.update(state,'b',40000+N.durationMs,false));
  state.pending=true;assert(N.update(state,'b',60000,false),'Menu return renews the same objective');
  const yasuo=D.npc('forest-yasuo'),s=createNewGame();assert(C.matchesAll(s,yasuo.conditions));
  s.worldProgress.flags.push('story:yasuo-met');assert(C.matchesAll(s,yasuo.conditions),'Old saves can see his departure');
  s.worldProgress.flags.push('story:yasuo-departed');assert(!C.matchesAll(s,yasuo.conditions));
  const lines=D.dialogue('forest-yasuo-intro').nodes.flatMap(n=>n.lines).join(' ');
  assert(!/mi Eco|Vinculador|entre encuentros|Soy un errante|Yone/.test(lines),'Dialogue must not reveal capture rules or future chapter metadata');
  for(const id of ['ionia-lee-guide','ionia-lee-trial','ionia-lee-after'])assert.equal(D.npc(id).overworldScale,.76);
  const intro=D.dialogue('lee-trial-intro');assert(intro.nodes[0].choices.some(c=>c.nextNodeId==='esperar'));
  const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
  const Scene=new Function('Phaser','WORLD_PLAYER_VISUAL_SIZE',stripTypeScriptTypes(source,{mode:'strip'})+'\nreturn WorldScene;')({Scene:class{}},52);
  for(const id of ['inicio','esperar','entrenar']) {
    const sc=new Scene();let launched=0;
    Object.assign(sc,{save:createNewGame(),dialogueDefinition:{id:'lee-trial-intro'},dialogueNode:{id},pendingDuelStart:{npc:{},duelId:'ionia-lee-trial'},updateNearbyNpc(){},updateNearbyTiledInteraction(){},pendingEchoReleasesHere:()=>[],veigarSecrets:{onDialogueClosed(){}},startNpcDuelSequence(){launched++;}});
    sc.closeDialogue();assert.equal(launched,id==='entrenar'?1:0,`${id}: training must require acceptance`);
  }
  s.worldProgress.flags.push('story:ionia-jhin-warned');
  for(const [map,part]of [['jo03_lhradi','dentro'],['jo03_lhradi_theatre_sala','superior derecha'],['jo03_lhradi_theatre_backstage','más abajo']]){s.currentMapId=map;assert(T.next(s,'ionia-jhin-trail').includes(part));}
  const route=['jo03_lhradi','jo03_lhradi_theatre_sala','jo03_lhradi_theatre_backstage','jo03_lhradi_house_04'];
  for(let i=0;i<route.length-1;i++){
    const j=JSON.parse(fs.readFileSync('public/'+D.map(route[i]).tiled.url.replace('./','')));
    assert(j.layers.find(l=>l.name==='Portals').objects.some(o=>o.properties.some(p=>p.name==='targetMap'&&p.value===route[i+1])),`${route[i]} → ${route[i+1]}`);
  }
  const workshop=JSON.parse(fs.readFileSync('public/'+D.map(route[3]).tiled.url.replace('./','')));
  for(const door of workshop.layers.find(l=>l.name==='Portals').objects)assert(door.properties.some(p=>p.name==='targetSpawn'&&p.value==='from_taller'));
  console.log('Timed quest reminders/progress/menu, non-spoiling Yasuo departure/legacy saves, Lee scale/explicit training acceptance, correct theatre/workshop navigation: OK.');
}finally{await server.close();}
