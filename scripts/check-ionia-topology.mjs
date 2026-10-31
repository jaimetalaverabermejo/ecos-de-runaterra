/** The 31 October authored island graph, physical approaches and return safety. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const ports=read('src/data/world/regions/ionia/ferries.json');
 const ids=['jo01_koeshin','jo02_white_cliffs','jo03_lhradi','jo04_rice_fields','jo05_placidium','jo06_estuary','jo08_peaks','jo07_wehle','jo09_forest_landing','jo10_oblivion_garden','jo11_omikayalan','jo12_roots','jo13_vastaya_refuge','jo14_faelor_coast','jo15_faelor_enclosure','jo16_orders_village','jo17_kinkou','jo19_wanderers','jo18_shadow_ravine','jo20_trial_shrine','jo21_reunion'];
 const pairs=[[1,2],[2,3],[3,4],[4,5],[5,6],[6,8],[8,7],[7,2],[9,10],[10,11],[11,12],[12,13],[11,13],[14,15],[16,17],[17,19],[19,18],[19,20]];
 const byNumber=new Map(ids.map(id=>[Number(id.slice(2,4)),id]));
 const expected=pairs.flatMap(([a,b])=>[`${byNumber.get(a)}>${byNumber.get(b)}`,`${byNumber.get(b)}>${byNumber.get(a)}`]).sort();
 const infos=new Map();
 for(const id of ids){
  const cfg=D.map(id),m=read('public/'+cfg.tiled.url.replace('./','')),ls=new Map(m.layers.map(l=>[l.name,l]));
  const tile=(n,c,r)=>ls.get(n)?.data?.[r*m.width+c]??0;
  const rects=['Collisions','BridgeRails'].flatMap(n=>ls.get(n)?.objects??[]).filter(o=>!o.properties?.some(p=>p.name==='blockedUntilFlag'));
  const free=(x,y)=>x>=11&&y>=8&&x<m.width*32-11&&y<m.height*32-8&&!rects.some(o=>x+11>o.x&&x-11<o.x+o.width&&y+8>o.y&&y-8<o.y+o.height)&&[-11,11].every(dx=>[-8,8].every(dy=>{const c=Math.floor((x+dx)/32),r=Math.floor((y+dy)/32);return !tile('Vallas',c,r)&&!['Obstacles','Agua','Ledges_down','Ledges_left','Ledges_right'].some(n=>tile(n,c,r)&&!tile('Paths',c,r));}));
  assert(free(cfg.spawn.x,cfg.spawn.y),id+': default spawn');
  const start=[Math.floor(cfg.spawn.x/32),Math.floor(cfg.spawn.y/32)],q=[start],seen=new Set([start.join(',')]);
  for(const [c,r]of q)for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=c+dc,b=r+dr,k=`${a},${b}`;if(!seen.has(k)&&free(a*32+16,b*32+16)){seen.add(k);q.push([a,b]);}}
  const reach=p=>free(p.x,p.y)&&seen.has(`${Math.floor(p.x/32)},${Math.floor(p.y/32)}`);
  infos.set(id,{cfg,m,ls,free,seen,reach});
 }
 const actual=[];
 for(const [id,g]of infos){
  for(const o of g.ls.get('Portals')?.objects??[]){
   const props=Object.fromEntries(o.properties.map(p=>[p.name,p.value]));
   if(!infos.has(props.targetMap))continue;
   actual.push(`${id}>${props.targetMap}`);
   const target=infos.get(props.targetMap),spawn=target.cfg.spawns[props.targetSpawn];assert(spawn&&target.reach(spawn),`${id}: arrival ${props.targetMap}/${props.targetSpawn}`);
   const authored=target.ls.get('Spawns').objects.find(o=>o.name===props.targetSpawn);
   assert(authored&&authored.x===spawn.x&&authored.y===spawn.y,`${id}: Tiled/config arrivals must agree`);
   assert([...g.seen].some(k=>{const[c,r]=k.split(',').map(Number),x=c*32+16,y=r*32+16;return x>=o.x&&x<=o.x+o.width&&y>=o.y&&y<=o.y+o.height;}),id+': reachable step exit '+o.name);
   for(const other of target.ls.get('Portals').objects.filter(o=>o.properties.some(p=>p.name==='trigger'&&p.value==='step'))){assert(!(spawn.x+11>other.x&&spawn.x-11<other.x+other.width&&spawn.y+8>other.y&&spawn.y-8<other.y+other.height),`${id}: immediate return bounce`);}
  }
 }
 assert.deepEqual(actual.sort(),expected,'Only the requested land links exist, bidirectionally');
 const {IONIA_LAND_ROUTES,IONIA_SEA_ROUTES}=await server.ssrLoadModule('/src/data/IoniaTravelRoutes.ts');
 assert.deepEqual(IONIA_LAND_ROUTES.flatMap(([a,b])=>[`${a}>${b}`,`${b}>${a}`]).sort(),expected,'The informational map must use the same footpaths');
 assert.equal(IONIA_SEA_ROUTES.length,10,'Five ports form ten distinct sea routes');
 for(const port of ports){
  const g=infos.get(port.mapId),s=g.cfg.spawns[port.spawn];assert(g.reach(s),port.mapId+': safe landing');
  const authored=g.ls.get('Spawns').objects.find(o=>o.name===port.spawn);assert.equal(authored.x,s.x);assert.equal(authored.y,s.y);
  const o=g.ls.get('Interactions').objects.find(o=>o.name==='ionia-ferry');assert(o);
  const p=Object.fromEntries(o.properties.map(p=>[p.name,p.value]));assert.equal(p.dialogueId,port.dialogueId);
  assert([...g.seen].some(k=>{const[c,r]=k.split(',').map(Number),x=c*32+16,y=r*32+16;return Math.hypot(Math.max(o.x-x,0,x-o.x-o.width),Math.max(o.y-y,0,y-o.y-o.height))<=48;}),port.mapId+': boarding reachable from landing');
  assert.equal((g.ls.get('Portals').objects??[]).filter(o=>o.name.startsWith('sail_')).length,0,'No obsolete one-destination boat portals');
 }
 assert.equal(infos.get('jo18_shadow_ravine').ls.get('Portals').objects.filter(o=>o.properties.some(p=>p.name==='targetMap'&&ids.includes(p.value))).length,1);
 assert.equal(infos.get('jo21_reunion').ls.get('Portals').objects.filter(o=>o.properties.some(p=>p.name==='targetMap'&&ids.includes(p.value))).length,0);
 console.log('Jonia: 21 exteriors, 18 bidirectional land links, 5 reachable ferry landings, matching Tiled/config spawns, no bounce or obsolete island links: OK.');
} finally {await server.close();}
