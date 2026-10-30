import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {ConditionService:C}=await server.ssrLoadModule('/src/systems/world/ConditionService.ts');
 const {IoniaSiegeService:S}=await server.ssrLoadModule('/src/systems/world/IoniaSiegeService.ts');
 const {IoniaHealingService:H}=await server.ssrLoadModule('/src/systems/world/IoniaHealingService.ts');
 const {WorldActionService:W}=await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {ProgressionService:P}=await server.ssrLoadModule('/src/systems/progression/ProgressionService.ts');
 const {worldStories}=await server.ssrLoadModule('/src/systems/world/WorldStoryCatalog.ts');
 const {createAdventureCheckpoint}=await server.ssrLoadModule('/src/systems/testing/AdventureCheckpoints.ts');
 const testStart=createAdventureCheckpoint('siege');assert.equal(testStart.inventory['spirit-world-rune'],1);W.applyAll(testStart,D.dialogue('orders-siege-warning').nodes.flatMap(n=>n.actions??[]));assert(testStart.quests['ionia-placidium-defense']);
 assert.deepEqual(D.validate(),[]);
 const zones=D.maps().filter(m=>m.regionId==='ionia'&&m.id===m.zoneId);let fauna=0;
 const creatures=read('src/contenido/mundo/actores/ionia.json').concat(read('src/contenido/mundo/actores/bandle.json')).filter(a=>a.tipo==='criatura').map(a=>a.id);
 function geometry(id) {
  const cfg=D.map(id),m=read('public/'+cfg.tiled.url.replace('./','')),layers=new Map(m.layers.map(l=>[l.name,l]));
  const tile=(n,x,y)=>layers.get(n)?.data?.[y*m.width+x]??0;
  const rects=['Collisions','BridgeRails'].flatMap(n=>layers.get(n)?.objects??[]).filter(o=>!o.properties?.some(p=>['blockedUntilFlag','activeFromFlag'].includes(p.name)));
  const free=(x,y)=>x>=12&&y>=9&&x<cfg.width-12&&y<cfg.height-9&&!rects.some(o=>x+11>o.x&&x-11<o.x+o.width&&y+8>o.y&&y-8<o.y+o.height)&&[-11,11].every(dx=>[-8,8].every(dy=>{const a=Math.floor((x+dx)/32),b=Math.floor((y+dy)/32);return !tile('Vallas',a,b)&&!['Obstacles','Agua'].some(n=>tile(n,a,b)&&!tile('Paths',a,b));}));
  return {free,m};
 }
 for(const zone of zones){const animals=D.npcs(zone.id).filter(n=>creatures.includes(n.actorId));assert(animals.length>=4,zone.id+': varied life in every exterior');fauna+=animals.length;}
 assert.equal(fauna,129);
 const cache=new Map();
 for(const file of ['ionia-habitat-fauna','ionia-orders-fauna','ionia-siege-occupation'])for(const n of D.npcs().filter(n=>read('src/contenido/mundo/npcs/'+file+'.json').some(raw=>raw.id===n.id))){
  if(!cache.has(n.mapId))cache.set(n.mapId,geometry(n.mapId));const {free}=cache.get(n.mapId);assert(free(n.x,n.y),n.id+': solid ground');
  for(const pts of [n.behavior.points??[],n.guide?.points??[]])for(let i=1;i<pts.length;i++)for(let j=0;j<=12;j++)assert(free(pts[i-1].x+(pts[i].x-pts[i-1].x)*j/12,pts[i-1].y+(pts[i].y-pts[i-1].y)*j/12),n.id+': full movement segment');
 }
 const save=createNewGame();save.currentMapId='jo05_placidium';save.worldProgress.flags.push('story:orders-siege-warning');S.sync(save);
 assert(!C.matchesAll(save,D.npc('jo05_placidium-ambient-1').conditions));
 const occupiers=D.npcs('jo05_placidium').filter(n=>n.id.startsWith('navori-occupation-'));
 assert(occupiers.length>=40);assert(occupiers.filter(n=>C.matchesAll(save,n.conditions)).length>=30);
 save.worldProgress.flags.push('story:orders-irelia-briefed');S.sync(save);assert(save.worldProgress.flags.includes('story:irelia-guide-1'));
 for(const [i,stage] of ['first','second','third'].entries()) {
  assert(D.npc(`irelia-ascent-${i+1}`).guide.points.length>5);
  save.worldProgress.flags.push(`irelia-ascent-${i+1}-arrived`);S.sync(save);assert(!save.worldProgress.flags.includes(`story:irelia-guide-${i+1}`));
  W.applyAll(save,D.duel('orders-siege-'+stage).victoryActions);S.sync(save);
 }
 assert(save.worldProgress.flags.includes('story:irelia-guide-final'));
 assert.equal(D.npc('orders-swain').autoTalk.activeFlag,'story:irelia-at-summit');
 assert(D.dialogue('orders-swain').nodes.length>=8);assert(D.dialogue('orders-irelia-command').nodes[0].lines.length>=7);
 const final=D.duel('orders-siege-final');assert.equal(final.team[0].mastery,18);assert.deepEqual(final.team[0].equippedItems,['power-relic','phage']);assert.equal(final.ally.championId,'irelia');
 for(const e of [...final.team,final.ally])for(const [slot,rank] of Object.entries(e.skillRanks??{}))assert(rank<=P.maxRank(slot));
 const exterior=geometry('jo05_placidium').m;assert(!exterior.layers.some(l=>l.objects?.some(o=>o.properties?.some(p=>p.name==='targetMap'&&p.value==='jo05_placidium_house_09'))));
 const legacy=createNewGame();legacy.currentMapId='jo05_placidium_house_09';legacy.gold=1234;S.sync(legacy);assert.equal(legacy.currentMapId,'jo05_placidium');assert.equal(legacy.gold,1234);
 legacy.checkpoint={mapId:'jo17_kinkou',sanctuaryId:'jo17_kinkou-rest',name:'Old lantern',x:10,y:10};H.migrate(legacy);assert.equal(legacy.checkpoint.mapId,'jo16_orders_village');assert.equal(legacy.gold,1234);
 const relocated=createNewGame();relocated.gold=777;relocated.checkpoint={mapId:'jo16_orders_village',sanctuaryId:'jo16_orders_village-healing-v2',name:'Santuario',x:1360,y:1424};H.migrate(relocated);assert.deepEqual([relocated.checkpoint.x,relocated.checkpoint.y],[1632,1296]);assert.equal(relocated.gold,777);H.migrate(relocated);assert.equal(relocated.checkpoint.y,1296);
 const village=geometry('jo16_orders_village');assert(village.free(1632,1296),'Moved shrine approach must be walkable');const prayer=village.m.layers.find(l=>l.name==='Interactions').objects.find(o=>o.name==='jo16_orders_village-healing-v2');assert.deepEqual([prayer.x+prayer.width/2,prayer.y+prayer.height/2],[1632,1296]);
 for(let i=1;i<=3;i++){const st=worldStories.find(s=>s.id===`jonia-flank-${i}`);assert(st.beats.every(b=>b.grayscale===false));assert(st.completionActions.length);}
 W.applyAll(save,final.victoryActions);S.sync(save);assert(!save.worldProgress.flags.includes('story:jonia-occupation'));assert(occupiers.every(n=>!C.matchesAll(save,n.conditions)));assert(C.matchesAll(save,D.npc('jo05_placidium-ambient-1').conditions));
 console.log('129 habitat creatures, 44 occupying soldiers, complete guide/patrol geometry, civilians sheltered/restored, staged escort, grouped finale, equipped Swain, outdoor Placidium and legacy saves: OK.');
} finally {await server.close();}
