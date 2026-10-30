import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
 const load = async (p, name) => (await server.ssrLoadModule('/src/' + p + '.ts'))[name];
 const D = await load('data/DataRegistry', 'DataRegistry'), W = await load('systems/world/WorldActionService', 'WorldActionService');
 const C = await load('systems/world/ConditionService', 'ConditionService'), S = await load('systems/save/SaveService', 'SaveService');
 const { ownedWorldRunes, WORLD_RUNES } = await server.ssrLoadModule('/src/data/WorldRunes.ts');
 const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
 const { createAdventureCheckpoint } = await server.ssrLoadModule('/src/systems/testing/AdventureCheckpoints.ts');
 assert.deepEqual(D.validate(), []);
 const ids = ['jo16_orders_village', 'jo17_kinkou', 'jo18_shadow_ravine', 'jo19_wanderers', 'jo20_trial_shrine', 'jo21_reunion'];
 function geometry(cfg) {
  const m = read('public/' + cfg.tiled.url.replace('./', '')), layers = new Map(m.layers.map(l => [l.name, l]));
  const tile = (n,c,r) => layers.get(n)?.data?.[r*m.width+c] ?? 0;
  const rects = ['Collisions', 'BridgeRails'].flatMap(n => layers.get(n)?.objects ?? []).filter(o => !o.properties?.some(p => p.name === 'blockedUntilFlag'));
  const free = (x,y) => x>=11 && y>=8 && x<cfg.width-11 && y<cfg.height-8 && !rects.some(o => x+11>o.x && x-11<o.x+o.width && y+8>o.y && y-8<o.y+o.height)
   && [-11,11].every(dx => [-8,8].every(dy => { const c=Math.floor((x+dx)/32),r=Math.floor((y+dy)/32); return !tile('Vallas',c,r) && !['Obstacles','Agua'].some(n => tile(n,c,r)&&!tile('Paths',c,r)); }));
  assert(free(cfg.spawn.x,cfg.spawn.y), cfg.id + ': default arrival');
  const q=[[Math.floor(cfg.spawn.x/32),Math.floor(cfg.spawn.y/32)]], seen=new Set(q.map(p=>p.join(',')));
  for(const [c,r] of q) for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]) { const a=c+dc,b=r+dr,k=`${a},${b}`; if(!seen.has(k)&&free(a*32+16,b*32+16)){seen.add(k);q.push([a,b]);} }
  return {m,layers,free,reach:(x,y)=>seen.has(`${Math.floor(x/32)},${Math.floor(y/32)}`)};
 }
 let count=0;
 for(const cfg of D.maps().filter(m => ids.includes(m.zoneId))) {
  const g=geometry(cfg);
  for(const [name,p] of Object.entries(cfg.spawns)) assert(g.free(p.x,p.y)&&g.reach(p.x,p.y),`${cfg.id}: arrival ${name}`);
  for(const o of g.layers.get('Portals').objects) {
   const p=Object.fromEntries(o.properties.map(p=>[p.name,p.value])), target=D.map(p.targetMap), arrival=target.spawns[p.targetSpawn]; assert(arrival);
   assert(g.reach(o.x+o.width/2,o.y+o.height/2),`${cfg.id}: exit ${o.name}`);
   const tj=read('public/'+target.tiled.url.replace('./',''));
   for(const other of tj.layers.find(l=>l.name==='Portals').objects) if(other.properties.some(p=>p.name==='trigger'&&p.value==='step')) assert(!(arrival.x>=other.x-11&&arrival.x<=other.x+other.width+11&&arrival.y>=other.y-8&&arrival.y<=other.y+other.height+8),`${cfg.id}: immediate return loop`);
  }
  for(const n of D.npcs(cfg.id)) {
   assert(g.reach(n.x,n.y),n.id+': reachable');
   if (n.behavior.type === 'static') { assert(n.id.startsWith('orders-rune-'), n.id + ': only the requested council is stationary'); continue; }
   assert.equal(n.behavior.type,'patrol');
   const pts=n.behavior.points;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];for(let k=0;k<=32;k++)assert(g.free(a.x+(b.x-a.x)*k/32,a.y+(b.y-a.y)*k/32),n.id+': complete patrol');}
  }
  if(cfg.id===cfg.zoneId) {
   const first=g.m.tilesets.find(t=>t.name==='Soraka_Curacion_32x32').firstgid;
   assert.deepEqual(g.layers.get('HealingLanterns').data.filter(Boolean).map(v=>v-first),[2,3,8,9]);
   const o=g.layers.get('Interactions').objects.find(o=>o.properties.some(p=>p.name==='action'&&p.value==='heal_ecos'));assert(g.free(o.x+16,o.y+16));
  }
  const save=createNewGame();save.currentMapId=cfg.id;save.playerPosition={...cfg.spawn};save.gold=1234;const restored=S.deserializeSave(JSON.stringify(save));assert.equal(restored.currentMapId,cfg.id);assert.equal(restored.gold,1234);count++;
 }
 assert.equal(count,20);
 const speak=(save,id)=>D.dialogue(id).nodes.forEach(n=>W.applyAll(save,n.actions));
 let save=createAdventureCheckpoint('orders');assert(save.quests['ionia-orders-spirit-rune']);assert(!save.inventory['spirit-world-rune']);
 const visible=id=>C.matchesAll(save,D.npc(id).conditions);
 assert(!visible('orders-akali-trial'));assert(!visible('orders-rune-custody'));
 for(const id of ['orders-akali-contact','orders-courier','orders-dispatch'])speak(save,id);
 for(const [ch,prereqs] of [['akali',[]],['shen',['orders-material','orders-spiritual']],['zed',['orders-shadow-scout']]]) {
  for(const id of prereqs)speak(save,id);
  assert(visible(`orders-${ch}-trial`));assert(!visible('orders-rune-custody'));
  const d=D.duel(`orders-${ch}-trial`);assert.equal(d.format,'single');assert.equal(d.team[0].championId,ch);
  // Loss/reload does not grant trust. Only the actual victory actions advance the story.
  assert(!save.worldProgress.flags.includes(`story:orders-${ch}-trusted`));save=S.deserializeSave(JSON.stringify(save));
  W.applyAll(save,d.victoryActions);speak(save,d.victoryDialogueId);assert(!visible(`orders-${ch}-trial`));
 }
 assert(visible('orders-rune-custody'));speak(save,'orders-rune-custody');assert(!save.inventory['spirit-world-rune']);assert(save.worldProgress.flags.includes('story:orders-council-ready'));speak(save,'orders-rune-pickup');assert.equal(save.inventory['spirit-world-rune'],1);assert.equal(WORLD_RUNES.length,9);assert.deepEqual(ownedWorldRunes(save).map(r=>r.id),['spirit']);assert.equal(save.quests['ionia-orders-spirit-rune'].status,'completed');assert(!visible('orders-rune-custody'));
 save=S.deserializeSave(JSON.stringify(save));assert.equal(save.inventory['spirit-world-rune'],1);
 speak(save,'orders-siege-warning');assert(save.quests['ionia-placidium-defense']);assert(visible('orders-irelia-command'));const irelia = D.npc('orders-irelia-command');
 const variant = irelia.dialogueVariants?.find(v => C.matchesAll(save,v.conditions));
 assert.equal(variant?.dialogueId ?? irelia.dialogueId,'orders-irelia-command');
 speak(save,variant?.dialogueId ?? irelia.dialogueId);
 const Access = await load('systems/world/KarmaAccessService','KarmaAccessService'); Access.sync(save);
 assert(save.worldProgress.flags.includes('story:placidum-summit-open'));
 assert(save.worldProgress.flags.includes('story:karma-memorial-open'));
 assert(!save.worldProgress.flags.includes('story:ionia-complete'));
 assert(!C.matchesAll(save,D.npc('ionia-irelia-final-trial').conditions));
 for(const id of ['kayn','varus'])assert(!save.worldProgress.flags.includes(`echo:${id}-resonance`));
 // Exercise the existing actual WorldScene movement method for the newly authored cast.
 const src=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Phaser={Scene:class{},Math:{Distance:{Between:(x,y,a,b)=>Math.hypot(x-a,y-b)},Clamp:(v,a,b)=>Math.max(a,Math.min(v,b))}};
 const Scene=new Function('Phaser','DataRegistry','WORLD_PLAYER_VISUAL_SIZE','SaveService',stripTypeScriptTypes(src,{mode:'strip'})+'\nreturn WorldScene;')(Phaser,D,52,{save(){}});
 for(const entry of read('src/contenido/mundo/npcs/ionia-orders.json')) {
  if (entry.comportamiento.tipo === 'estatico') { assert(entry.excepcionMovimientoAutorizada); continue; }
  const placement=D.npc(entry.id),body={x:placement.x,y:placement.y,setPosition(x,y){this.x=x;this.y=y;}};body.body={vx:0,vy:0,setVelocity(x,y){this.vx=x;this.vy=y;}};
  const n={placement,body,visual:{depth:body.y+100},facing:placement.facing,patrolIndex:0,pauseUntil:0},sc=new Scene();Object.assign(sc,{save:createNewGame(),npcs:[n],player:{x:0,y:0},time:{now:0},syncNpcVisual(){},isFollowerActive:()=>false,isGuideActive:()=>false});
  let moved=0;for(let k=0;k<80;k++){sc.time.now+=100;sc.updateNpcs();body.x+=body.body.vx*.1;body.y+=body.body.vy*.1;moved+=Math.hypot(body.body.vx,body.body.vy)*.1;}assert(moved>10,entry.id);
  sc.player={x:body.x,y:body.y+25};sc.updateNpcs();assert.equal(body.body.vx,0);assert.equal(body.body.vy,0);sc.player={x:0,y:0};let resumed=0;for(let k=0;k<40;k++){sc.time.now+=100;sc.updateNpcs();resumed+=Math.hypot(body.body.vx,body.body.vy);}assert(resumed>0,entry.id);
 }
 console.log('Orders: 6 exteriors, 14 interiors, all routes/round trips/patrols, actual movement/pause/resume, three genuine trial gates, unique rune custody, reload and invasion preparation: OK.');
} finally { await server.close(); }
