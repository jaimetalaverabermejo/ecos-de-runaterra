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
 for(const id of ['jo07_wehle',...ids]){
  const cfg=D.map(id),json=read('public/'+cfg.tiled.url.replace('./',''));const layers=new Map(json.layers.map(l=>[l.name,l]));
  const tile=(n,c,r)=>layers.get(n)?.data?.[r*json.width+c]??0;
  const rects=['Collisions','BridgeRails'].flatMap(n=>layers.get(n)?.objects??[]);
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
   assert.equal(cfg.tiled.disableWildEncounters,true,'Forest stories/encounters must remain deferred');assert.equal(D.npcs(id).length,0,'Do not deploy champions or story actors yet');
   assert.equal(layers.get('Interactions').objects.length,0);assert.equal(layers.get('Zones').objects.length,0);
   const save=createNewGame();save.currentMapId=id;save.playerPosition={...cfg.spawn};save.gold=777;save.worldProgress.flags.push('forest-map-save-test');const loaded=S.deserializeSave(JSON.stringify(save));assert.equal(loaded.currentMapId,id);assert.equal(loaded.gold,777);assert(loaded.worldProgress.flags.includes('forest-map-save-test'));
   if(id==='jo12_roots'){assert.equal(tile('Vallas',38,42),0);assert.equal(tile('Vallas',39,42),0);}
   if(id!=='jo13_vastaya_refuge'){const exit=portals.find(p=>p.name==='to_next');assert(exit.y<128,`${id}: northern half disconnected`);}
  }
 }
 const targets=id=>maps.get(id).portals.map(p=>p.properties.find(p=>p.name==='targetMap').value);
 assert(targets('jo07_wehle').includes(ids[0]));assert(targets(ids[0]).includes('jo07_wehle'));
 for(let i=0;i<ids.length-1;i++){assert(targets(ids[i]).includes(ids[i+1]));assert(targets(ids[i+1]).includes(ids[i]));}
 assert.deepEqual(targets(ids.at(-1)),[ids.at(-2)]);
 for(const [id,name]of [['jo07_wehle','sail_to_forest'],['jo09_forest_landing','sail_to_wehle']]){const p=maps.get(id).portals.find(p=>p.name===name),props=Object.fromEntries(p.properties.map(p=>[p.name,p.value]));assert.equal(props.trigger,'interact');assert(props.displayName);}
 assert(!D.maps().some(m=>m.id==='jo14_faelor_coast'));
 console.log('Forest JO09–JO13: all maps/spawns/exits reachable, round-trip boat and route, no return loops, JO12 stair, safe save reload, stories/encounters deferred: OK.');
}finally{await server.close();}
