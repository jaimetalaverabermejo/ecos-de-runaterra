import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {MelDiplomacyService:M}=await server.ssrLoadModule('/src/systems/world/MelDiplomacyService.ts');
 const {FerryService:F}=await server.ssrLoadModule('/src/systems/world/FerryService.ts');
 const {WorldActionService:A}=await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 assert.deepEqual(D.validate(),[]);
 const save=createNewGame(),flags=save.worldProgress.flags;
 const trusted=['akali','shen','zed'].map(c=>'story:orders-'+c+'-trusted');flags.push(...trusted);
 const gate=()=>M.beforeTransition('jo20_trial_shrine','jo20_trial_shrine_interior_01',flags);
 assert.equal(gate(),'mel-embassy');
 const play=(id)=>{for(const n of D.dialogue(id).nodes)A.applyAll(save,n.actions??[]);};
 play('mel-embassy');assert.equal(gate(),undefined);
 flags.push('story:spirit-rune-carried','story:orders-siege-warning');
 assert(!M.crossingAllowed(flags),'Rune alone must not bypass the defense');
 assert.equal(M.beforeTransition('jo05_placidium','jo05_placidium_house_04',flags),'mel-navori-warning');
 play('mel-navori-warning');assert.equal(M.beforeTransition('jo05_placidium','jo05_placidium_house_04',flags),undefined);
 flags.push('story:ionia-complete');assert(!M.crossingAllowed(flags),'Passage requires accepting Mel');
 const offer=D.dialogue('mel-passage-offer');
 for(const id of ['inicio','decision','esperar'])A.applyAll(save,offer.nodes.find(n=>n.id===id).actions??[]);
 assert(!M.crossingAllowed(flags),'Deferring the offer must not accept it');
 A.applyAll(save,offer.nodes.find(n=>n.id==='aceptar').actions??[]);
 assert(M.crossingAllowed(flags));assert(F.destination('jo07_wehle','sail:NO01_Puerto',flags));
 assert.equal(F.destination('jo21_reunion','sail:NO01_Puerto',flags),undefined);
 assert.equal(D.npc('orders-siege-messenger').mapId,'jo21_reunion_interior_01');
 assert.equal(D.npc('orders-siege-messenger').follower.completeOnMapId,'jo05_placidium');
 assert(F.destination('NO01_Puerto','sail:jo07_wehle',[]),'Return is always open');
 const bastion=()=>M.beforeTransition('NO05_Capital_Exterior','NO06_Bastion_Interior',save.worldProgress.flags);
 assert.equal(bastion(),'noxus-bastion-evidence');
 play('mel-port-arrival');
 const mansion=D.map('NO03_Mansion_Basilich');
 const witness=D.npc('noxus-levy-oren');
 assert.equal(D.npc('noxus-levy-darius').mapId,mansion.id);
 assert.equal(witness.mapId,mansion.zoneId);
 assert.equal(witness.follower.completeOnMapId,mansion.id);
 assert.equal(D.npc('noxus-levy-oren-at-register').mapId,mansion.id);
 play('noxus-levy-register');play('noxus-levy-oren');
 assert(flags.includes(witness.follower.activeFlag));
 A.applyAll(save,[{type:'set-flag',id:witness.follower.activeFlag,value:false},{type:'set-flag',id:witness.follower.completionFlag,value:true}]);
 play(witness.follower.completionDialogueId);
 assert.equal(save.quests['noxus-names-of-the-levy'].status,'completed');
 play('noxus-crate-samira');
 assert(save.worldProgress.flags.includes(D.npc('noxus-crate-samira').follower.activeFlag));
 const convoy=D.duel('noxus-crate-skirmish');assert.equal(convoy.ally.championId,'samira');
 assert.equal(D.npc('noxus-crate-guard-ballestero').mapId,D.npc('noxus-crate-guard').mapId);
 A.applyAll(save,convoy.victoryActions);play(convoy.victoryDialogueId);
 assert(!save.worldProgress.flags.includes(D.npc('noxus-crate-samira').follower.activeFlag));
 assert.equal(save.quests['noxus-crate-seventeen'].status,'completed');
 play('noxus-supplies-rell');
 assert(save.worldProgress.flags.includes(D.npc('plans-supplies-rell').follower.activeFlag));
 const escort=D.duel('noxus-supplies-skirmish');assert.equal(escort.ally.championId,'rell');
 assert.equal(D.npc('noxus-supplies-guard-ballestero').mapId,D.npc('noxus-supplies-guard').mapId);
 A.applyAll(save,escort.victoryActions);play(escort.victoryDialogueId);
 assert(!save.worldProgress.flags.includes(D.npc('plans-supplies-rell').follower.activeFlag));
 assert.equal(bastion(),'noxus-bastion-evidence');
 play('noxus-supplies-iria');play('noxus-supplies-dalen');
 assert.equal(save.quests['noxus-not-supplies'].status,'completed');
 assert.equal(bastion(),'mel-bastion-entry');
 play('mel-bastion-entry');
 assert.equal(M.beforeTransition('NO05_Capital_Exterior','NO06_Bastion_Interior',save.worldProgress.flags),undefined);
 play('plans-steraks-gage-offer');
 play('plans-sterak-caravan');
 assert(save.worldProgress.flags.includes('story:noxus-sterak-route'));
 play('plans-steraks-gage-witness');play('plans-steraks-gage-finish');
 assert.equal(save.quests['plans-steraks-gage'].status,'completed');
 play('mel-court-introduction');
 assert.equal(save.quests['mel-between-shores'].status,'completed');
 // Old completed games can pick up the arc without redoing the council or siege.
 const old=createNewGame();old.worldProgress.flags.push('story:spirit-rune-carried','story:ionia-complete');
 assert.equal(M.beforeTransition('jo20_trial_shrine','jo20_trial_shrine_interior_01',old.worldProgress.flags),undefined);
 assert.equal(M.beforeTransition('jo05_placidium','jo05_placidium_house_04',['story:orders-siege-warning']),'mel-navori-warning-late');
 // Sample full actor routes with the same tile/rectangle collision rules as WorldScene.
 const npcs=['mel-transition','noxus-first-investigation'].flatMap(file=>JSON.parse(fs.readFileSync('src/contenido/mundo/npcs/'+file+'.json','utf8')));
 const recipeActors=JSON.parse(fs.readFileSync('src/contenido/mundo/npcs/campaign-recipe-actors.json','utf8'));
 npcs.push(...recipeActors.filter(n=>['plans-supplies-rell','plans-supplies-recruit'].includes(n.id)));
 const ambient=JSON.parse(fs.readFileSync('src/contenido/mundo/npcs/noxus-ambient.json','utf8'));
 npcs.push(...ambient.filter(n=>/^nx-(plaza-|port-(innkeeper|warehouse)$|mansion-guard$|02-0(19|20|21)$)/.test(n.id)));
 for(const n of npcs){
  const m=D.map(n.mapaId),r=JSON.parse(fs.readFileSync('public/'+m.tiled.url.replace('./',''),'utf8'));
  const tile=(name,x,y)=>r.layers.find(l=>l.name===name)?.data?.[Math.floor(y/32)*r.width+Math.floor(x/32)]??0;
  const rects=r.layers.filter(l=>['Collisions','BridgeRails'].includes(l.name)).flatMap(l=>l.objects??[]).filter(o=>!(o.properties??[]).some(p=>p.name==='activeFromFlag'));
  const free=(x,y)=>x>=12&&y>=12&&x<m.width-12&&y<m.height-12
   && !r.layers.some(l=>l.type==='tilelayer'&&(l.name==='Obstacles'||l.name==='Agua'||l.name==='Vallas'||l.properties?.some(p=>p.name==='collides'&&p.value))&&tile(l.name,x,y)&&(!['Obstacles','Agua'].includes(l.name)||!tile('Paths',x,y)))
   && !rects.some(o=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height);
  const portDeparture=n.id==='mel-port' ? [{x:n.x,y:n.y},{x:1872,y:n.y},{x:1872,y:368},{x:1904,y:368}] : undefined;
  for(const points of [n.comportamiento.puntos,n.guia?.puntos,portDeparture].filter(Boolean)){
   for(let i=0;i<points.length;i++){
    const a=points[i],b=points[Math.min(i+1,points.length-1)],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);
    for(let j=0;j<=steps;j++){const t=steps?j/steps:0,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
     for(const dx of [-11,11])for(const dy of [-8,8])assert(free(x+dx,y+dy),`${n.id}: collision at ${x+dx},${y+dy}`);
    }
   }
  }
 }
 // Execute WorldScene's movement code, measuring displacement, pause and resumption.
 const src=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Phaser={Scene:class{},Math:{Distance:{Between:(x,y,a,b)=>Math.hypot(x-a,y-b)},Clamp:(v,a,b)=>Math.max(a,Math.min(v,b))}};
 const Scene=new Function('Phaser','DataRegistry','WORLD_PLAYER_VISUAL_SIZE','SaveService',stripTypeScriptTypes(src,{mode:'strip'})+'\nreturn WorldScene;')(Phaser,D,52,{save(){}});
 for(const entry of npcs){
  const placement=D.npc(entry.id),body={x:placement.x,y:placement.y,setPosition(x,y){this.x=x;this.y=y;}};
  body.body={vx:0,vy:0,setVelocity(x,y){this.vx=x;this.vy=y;},reset(x,y){body.x=x;body.y=y;}};
  const n={placement,body,facing:placement.facing,patrolIndex:0,pauseUntil:0},sc=new Scene();
  Object.assign(sc,{save:createNewGame(),npcs:[n],player:{x:0,y:0},time:{now:0},syncNpcVisual(){},isFollowerActive:()=>false});
  const step=()=>{sc.time.now+=100;sc.updateNpcs();body.x+=body.body.vx*.1;body.y+=body.body.vy*.1;};
  const start={x:body.x,y:body.y};for(let k=0;k<30;k++)step();
  assert(Math.hypot(body.x-start.x,body.y-start.y)>8,entry.id+': must move');
  sc.player={x:body.x,y:body.y+25};sc.updateNpcs();assert.equal(body.body.vx,0);assert.equal(body.body.vy,0);
  sc.player={x:0,y:0};let resumed=0;for(let k=0;k<40;k++){step();resumed+=Math.hypot(body.body.vx,body.body.vy);}assert(resumed>0,entry.id+': resume');
  if(placement.guide){
   sc.save.worldProgress.flags.push(placement.guide.activeFlag);n.patrolIndex=0;
   let traveled=0;
   for(let k=0;k<5000&&n.patrolIndex<placement.guide.points.length;k++){
    sc.player={x:body.x,y:body.y+60};const before={x:body.x,y:body.y};step();traveled+=Math.hypot(body.x-before.x,body.y-before.y);
   }
   const route=placement.guide.points;
   const routeLength=route.slice(1).reduce((sum,point,i)=>sum+Math.hypot(point.x-route[i].x,point.y-route[i].y),0);
   assert.equal(n.patrolIndex,route.length,'Mel must reach the council');
   assert.deepEqual({x:body.x,y:body.y},route.at(-1),'Mel must stop at the authored arrival');
   assert(routeLength>0 && traveled>=routeLength-8,'Mel must walk the authored escort route');
  }
 }
 console.log('Mel: council ordering, Navori, declined/accepted passage, reversible travel, court gate, journal, legacy saves and full patrol/escort geometry: OK.');
}finally{await server.close();}
