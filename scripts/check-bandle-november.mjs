import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {ConditionService:C}=await server.ssrLoadModule('/src/systems/world/ConditionService.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Scene=new Function('Phaser','DataRegistry','ConditionService','WORLD_PLAYER_VISUAL_SIZE',stripTypeScriptTypes(source,{mode:'strip'})+'\nreturn WorldScene;')({Scene:class{},Math:{Distance:{Between:(x,y,a,b)=>Math.hypot(x-a,y-b)}}},D,C,52);
 const scene=new Scene(),save=createNewGame();save.currentMapId='bandle_village';
 let dialogue,frame,moved=0;
 Object.assign(scene,{save,time:{now:150},transitionCooldownUntil:0,player:{body:{setVelocity(){}}},beginWorldDialogue(d){dialogue=d.id;}});
 await scene.handleTransition({targetMapId:'three-house'});
 assert.equal(dialogue,'bandle-treehouse-closed');assert(!scene.transitioning);
 const npc={placement:{actorId:'yordle-messenger'},body:{x:20,y:30},visual:{setPosition(){moved++;return this;},setDepth(){return this;}},sprite:{setFrame(n){frame=n;}},facing:'left'};
 scene.syncNpcVisual(npc,false);assert.equal(frame,10);
 npc.facing='right';scene.syncNpcVisual(npc,true);assert.equal(frame,7);assert.equal(moved,2);
 for(const id of ['ionia-kennen-arrival','ionia-kennen-travel']) assert(!D.dialogue(id).nodes.flatMap(n=>n.actions??[]).some(a=>a.type==='heal-party'));
 for(const flag of [false,true]) {
  save.worldProgress.flags=flag?['story:kennen-window-open']:[];
  for(const id of ['bandle-north-guard-1','bandle-north-guard-2']) assert.equal(C.matchesAll(save,D.npc(id).conditions),!flag);
 }
 for (const id of ['bandle-north-guard-1','bandle-north-guard-2']) {
  const placement=D.npc(id), body={x:placement.x,y:placement.y,setPosition(x,y){this.x=x;this.y=y;},body:{vx:0,vy:0,setVelocity(x,y){this.vx=x;this.vy=y;}}};
  const guard={placement,body,visual:{setPosition(){return this;},setDepth(){return this;}},pauseUntil:0,patrolIndex:0,facing:'down'};
  Object.assign(scene,{npcs:[guard],player:{x:0,y:0},isFollowerActive:()=>false,isGuideActive:()=>false});
  for(let i=0;i<20;i++){scene.time.now+=100;scene.updateNpcs();body.x+=body.body.vx*.1;body.y+=body.body.vy*.1;}
  assert(Math.hypot(body.x-placement.x,body.y-placement.y)>0,`${id} moves`);
  scene.player={x:body.x,y:body.y+20};scene.updateNpcs();assert.equal(body.body.vy,0);
  scene.player={x:0,y:0};guard.pauseUntil=0;guard.target={x:placement.x,y:placement.y+8};body.y=placement.y;
  scene.updateNpcs();assert(body.body.vy>0,`${id} resumes`);
 }
 console.log('Treehouse refuses premature entry; messenger horizontal frames and visual position; north guards disappear on unlock: OK.');
}finally{await server.close();}
