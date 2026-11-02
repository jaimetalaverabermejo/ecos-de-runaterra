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
 assert(M.crossingAllowed(flags));assert(F.destination('jo21_reunion','sail:NO01_Puerto',flags));
 assert(F.destination('NO01_Puerto','sail:jo21_reunion',[]),'Return is always open');
 assert.equal(M.beforeTransition('NO05_Capital_Exterior','NO06_Bastion_Interior',flags),'mel-bastion-entry');
 play('mel-port-arrival');play('mel-bastion-entry');
 assert.equal(M.beforeTransition('NO05_Capital_Exterior','NO06_Bastion_Interior',flags),undefined);
 play('mel-court-introduction');
 assert.equal(save.quests['mel-between-shores'].status,'completed');
 // Old completed games can pick up the arc without redoing the council or siege.
 const old=createNewGame();old.worldProgress.flags.push('story:spirit-rune-carried','story:ionia-complete');
 assert.equal(M.beforeTransition('jo20_trial_shrine','jo20_trial_shrine_interior_01',old.worldProgress.flags),undefined);
 assert.equal(M.beforeTransition('jo05_placidium','jo05_placidium_house_04',['story:orders-siege-warning']),'mel-navori-warning-late');
 // Sample full actor routes with the same tile/rectangle collision rules as WorldScene.
 const npcs=JSON.parse(fs.readFileSync('src/contenido/mundo/npcs/mel-transition.json','utf8'));
 for(const n of npcs){
  const m=D.map(n.mapaId),r=JSON.parse(fs.readFileSync('public/'+m.tiled.url.replace('./',''),'utf8'));
  const tile=(name,x,y)=>r.layers.find(l=>l.name===name)?.data?.[Math.floor(y/32)*r.width+Math.floor(x/32)]??0;
  const rects=r.layers.filter(l=>['Collisions','BridgeRails'].includes(l.name)).flatMap(l=>l.objects??[]).filter(o=>!(o.properties??[]).some(p=>p.name==='activeFromFlag'));
  const free=(x,y)=>x>=12&&y>=12&&x<m.width-12&&y<m.height-12
   && !r.layers.some(l=>l.type==='tilelayer'&&(l.name==='Obstacles'||l.name==='Agua'||l.name==='Vallas'||l.properties?.some(p=>p.name==='collides'&&p.value))&&tile(l.name,x,y)&&(!['Obstacles','Agua'].includes(l.name)||!tile('Paths',x,y)))
   && !rects.some(o=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height);
  for(const points of [n.comportamiento.puntos,n.guia?.puntos].filter(Boolean)){
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
   assert.equal(n.patrolIndex,placement.guide.points.length,'Mel must reach the council');assert(traveled>2000);
  }
 }
 console.log('Mel: council ordering, Navori, declined/accepted passage, reversible travel, court gate, journal, legacy saves and full patrol/escort geometry: OK.');
}finally{await server.close();}
