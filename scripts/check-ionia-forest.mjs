import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try{
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {SaveService:S}=await server.ssrLoadModule('/src/systems/save/SaveService.ts');
 assert.deepEqual(D.validate(),[]);
 const ids=['jo09_forest_landing','jo10_oblivion_garden','jo11_omikayalan','jo12_roots','jo13_vastaya_refuge'];
 const maps=new Map();
 for(const id of ['jo04_rice_fields','jo07_wehle',...ids]){
  const cfg=D.map(id),json=read('public/'+cfg.tiled.url.replace('./',''));const layers=new Map(json.layers.map(l=>[l.name,l]));
  const tile=(n,c,r)=>layers.get(n)?.data?.[r*json.width+c]??0;
  const rects=['Collisions','BridgeRails'].flatMap(n=>layers.get(n)?.objects??[]).filter(o=>!o.properties?.some(p=>p.name==='blockedUntilFlag'));
  const free=(x,y)=>x>=11&&y>=8&&x<cfg.width-11&&y<cfg.height-8&&!rects.some(o=>x+11>o.x&&x-11<o.x+o.width&&y+8>o.y&&y-8<o.y+o.height)&&[-11,11].every(dx=>[-8,8].every(dy=>{const c=Math.floor((x+dx)/32),r=Math.floor((y+dy)/32);return !tile('Vallas',c,r)&&!['Obstacles','Agua'].some(n=>tile(n,c,r)&&!tile('Paths',c,r))&&!['Ledges_down','Ledges_left','Ledges_right'].some(n=>tile(n,c,r));}));
  const start=[Math.floor(cfg.spawn.x/32),Math.floor(cfg.spawn.y/32)],q=[start],seen=new Set([start.join(',')]);
  for(const [c,r]of q)for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=c+dc,b=r+dr,key=`${a},${b}`;if(!seen.has(key)&&free(a*32+16,b*32+16)){seen.add(key);q.push([a,b]);}}
  for(const [name,p]of Object.entries(cfg.spawns))assert(free(p.x,p.y)&&seen.has(`${Math.floor(p.x/32)},${Math.floor(p.y/32)}`),`${id}: blocked/unreachable spawn ${name}`);
  const portals=layers.get('Portals').objects;
  for(const p of portals){
   const properties=Object.fromEntries(p.properties.map(p=>[p.name,p.value]));const target=D.map(properties.targetMap);assert(target.spawns[properties.targetSpawn]);
   assert(seen.has(`${Math.floor((p.x+p.width/2)/32)},${Math.floor((p.y+p.height/2)/32)}`),`${id}: inaccessible portal ${p.name}`);
   const arrival=target.spawns[properties.targetSpawn];const targetJson=read('public/'+target.tiled.url.replace('./',''));
   for(const other of targetJson.layers.find(l=>l.name==='Portals').objects){const props=Object.fromEntries(other.properties.map(p=>[p.name,p.value]));if(props.trigger==='step')assert(!(arrival.x>=other.x-11&&arrival.x<=other.x+other.width+11&&arrival.y>=other.y-8&&arrival.y<=other.y+other.height+8),`${id}: immediate return loop at ${properties.targetMap}`);}
  }
  maps.set(id,{cfg,json,free,portals});
  if(ids.includes(id)){
   assert.equal(cfg.tiled.disableWildEncounters,false);assert(D.npcs(id).length>0);
   assert(layers.get('Zones').objects.some(o=>o.properties.some(p=>p.name==='healEchos'&&p.value===true)));
   for(const npc of D.npcs(id)){assert(seen.has(`${Math.floor(npc.x/32)},${Math.floor(npc.y/32)}`),`${npc.id}: unreachable`);const [a,b]=npc.behavior.points;for(let k=0;k<=24;k++)assert(free(a.x+(b.x-a.x)*k/24,a.y+(b.y-a.y)*k/24),`${npc.id}: blocked patrol`);}
   for(const o of layers.get('Interactions').objects)assert(seen.has(`${Math.floor((o.x+o.width/2)/32)},${Math.floor((o.y+o.height/2)/32)}`),`${o.name}: unreachable`);
   const save=createNewGame();save.currentMapId=id;save.playerPosition={...cfg.spawn};save.gold=777;save.worldProgress.flags.push('forest-map-save-test');const loaded=S.deserializeSave(JSON.stringify(save));assert.equal(loaded.currentMapId,id);assert.equal(loaded.gold,777);assert(loaded.worldProgress.flags.includes('forest-map-save-test'));
   if(id==='jo12_roots'){assert.equal(tile('Vallas',38,42),0);assert.equal(tile('Vallas',39,42),0);}
   if(id!=='jo13_vastaya_refuge'){const exit=portals.find(p=>p.name==='to_next');assert(exit.y<128,`${id}: northern half disconnected`);}
  }
 }
 // A flat woodland must preserve the authored willow and its walk-through roots.
 const garden=maps.get('jo10_oblivion_garden'),gl=Object.fromEntries(garden.json.layers.map(l=>[l.name,l]));
 assert(gl.ElevationGuide.objects.length===0);
 for(const name of ['Vallas','Ledges_down','Ledges_left','Ledges_right'])assert(gl[name].data.every(g=>g===0));
 for(const layer of garden.json.layers.filter(l=>l.type==='tilelayer'))assert(layer.data.every(raw=>{const g=raw&0x1fffffff;return !(g>=386&&g<1331)&&!(g>=1549&&g<2311);}),`${layer.name}: leftover cliff/stair tiles in flat garden`);
 assert(garden.cfg.tiled.tilesets.some(t=>t.name==='Jonia_Arboles_Tiled_32'));
 for(const [c,r]of [[12,10],[13,10],[12,11],[13,11]])assert(garden.free(c*32+16,r*32+16),'Authored hollow root passage must remain walkable');
 assert(!garden.free(10*32+16,11*32+16),'The solid roots beside the hollow still block movement');
 assert(!garden.free(12*32+16,16*32+16),'The lake is not a bridge');
 for(const id of ['forest-ahri-garden','forest-ahri-clearing','forest-syndra-clearing']){const npc=D.npc(id);assert.equal(npc.mapId,'jo10_oblivion_garden');assert(npc.x>=352&&npc.x<=544&&npc.y>=384&&npc.y<=448);}
 const willowScene=read('src/data/stories/forest-syndra-control.json');assert(willowScene.beats.every(b=>b.mapId==='jo10_oblivion_garden'&&b.mapScale===1));
 const yasuo=D.npc('forest-yasuo');assert(maps.get('jo04_rice_fields').free(yasuo.x,yasuo.y));
 // The new rock must close a real route, while every prerequisite remains on the accessible side.
 const om=maps.get('jo11_omikayalan'),gate=om.json.layers.find(l=>l.name==='Collisions').objects.find(o=>o.name==='sleeping-daisy-passage');assert(gate);
 const start=[Math.floor(om.cfg.spawn.x/32),Math.floor(om.cfg.spawn.y/32)],q=[start],closed=new Set([start.join(',')]);
 for(const [c,r]of q)for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=c+dc,b=r+dr,x=a*32+16,y=b*32+16,key=`${a},${b}`;if(!closed.has(key)&&om.free(x,y)&&!(x+11>gate.x&&x-11<gate.x+gate.width&&y+8>gate.y&&y-8<gate.y+gate.height)){closed.add(key);q.push([a,b]);}}
 assert(!closed.has(`${Math.floor(om.cfg.spawns.from_next.x/32)},${Math.floor(om.cfg.spawns.from_next.y/32)}`));
 for(const id of ['forest-yunara-field','forest-ivern-trial']){const n=D.npc(id);assert(closed.has(`${Math.floor(n.x/32)},${Math.floor(n.y/32)}`),`${id}: locked behind its own quest`);}
 for(const o of om.json.layers.find(l=>l.name==='Interactions').objects)assert(closed.has(`${Math.floor((o.x+o.width/2)/32)},${Math.floor((o.y+o.height/2)/32)}`),`${o.name}: locked behind the sleeping passage`);
 const targets=id=>maps.get(id).portals.map(p=>p.properties.find(p=>p.name==='targetMap').value);
 assert(targets('jo07_wehle').includes(ids[0]));assert(targets(ids[0]).includes('jo07_wehle'));
 for(let i=0;i<ids.length-1;i++){assert(targets(ids[i]).includes(ids[i+1]));assert(targets(ids[i+1]).includes(ids[i]));}
 assert.deepEqual(targets(ids.at(-1)),[ids.at(-2)]);
 for(const [id,name]of [['jo07_wehle','sail_to_forest'],['jo09_forest_landing','sail_to_wehle']]){const p=maps.get(id).portals.find(p=>p.name===name),props=Object.fromEntries(p.properties.map(p=>[p.name,p.value]));assert.equal(props.trigger,'interact');assert(props.displayName);}
 assert(!D.maps().some(m=>m.id==='jo14_faelor_coast'));
 console.log('Forest JO09–JO13: all maps/spawns/exits reachable, round-trip boat and route, no return loops, JO12 stair, safe save reload, moving forest cast, story interactions, healing and safe reload: OK.');
}finally{await server.close();}
