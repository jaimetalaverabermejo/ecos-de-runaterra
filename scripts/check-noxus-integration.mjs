import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {FerryService:F}=await server.ssrLoadModule('/src/systems/world/FerryService.ts');
 const {SanctuaryService:S}=await server.ssrLoadModule('/src/systems/sanctuary/SanctuaryService.ts');
 const {BattleEngine:B}=await server.ssrLoadModule('/src/systems/combat/BattleEngine.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {atlasView,currentAtlasZone,atlasDefinitionId}=await server.ssrLoadModule('/src/data/MapAtlas.ts');
 assert.deepEqual(D.validate(),[]);
 const meta=read('public/assets/world/regions/Noxus/manifest.json');
 for(const [id,expected] of Object.entries(meta.releaseProtectedSourceHashes)){
  const raw=fs.readFileSync(meta.maps.find(m=>m.id===id).path,'utf8').replaceAll('\r\n','\n');
  assert.equal(createHash('sha256').update(raw).digest('hex'),expected,'Preserve latest authored source '+id);
 }
 const maps=D.maps().filter(m=>m.regionId==='noxus');assert.equal(maps.length,10);
 assert(D.worldRegion('noxus').enabled);assert.equal(D.regionMap('noxus-region-map').points.length,9);
 for(const map of maps){
  assert(map.tiled.disableWildEncounters,'Do not fall back to Bandle encounters before Noxus fauna is authored');
  const runtime=read('public/'+map.tiled.url.replace('./',''));
  assert.equal(runtime.width*32,map.width);assert.equal(runtime.height*32,map.height);
  for(const set of runtime.tilesets)assert(map.tiled.tilesets.some(s=>s.name===set.name),'Missing registered tileset '+set.name);
  for(const o of runtime.layers.find(l=>l.name==='Portals').objects){
   const p=Object.fromEntries((o.properties??[]).map(v=>[v.name,v.value]));
   assert(D.map(p.targetMap).spawns[p.targetSpawn],'Missing return spawn');
  }
 }
 const defs=D.regionMap(atlasDefinitionId('noxus')).points;
 assert.equal(currentAtlasZone('NO06_Bastion_Interior','NO05_Capital_Exterior',defs),'NO05_Capital_Exterior');
 assert.equal(atlasView('noxus').points.length,9);
 assert.equal(F.destination('jo21_reunion','sail:NO01_Puerto',[]),undefined);
 assert.deepEqual(F.destination('jo21_reunion','sail:NO01_Puerto',['story:spirit-rune-carried']),{mapId:'NO01_Puerto',spawn:'from_ionia'});
 assert.deepEqual(F.destination('NO01_Puerto','sail:jo21_reunion',[]),{mapId:'jo21_reunion',spawn:'from_harbor'});
 assert(F.menu(D.dialogue('ionia-ferry-reunion'),'jo21_reunion',['story:spirit-rune-carried']).nodes[0].choices.some(c=>c.nextNodeId==='sail:NO01_Puerto'));
 assert(F.menu(D.dialogue('noxus-ferry-port'),'NO01_Puerto',[]).nodes[0].choices.some(c=>c.nextNodeId==='sail:jo21_reunion'));
 assert.equal(meta.sanctuaries.length,3);
 for(const site of meta.sanctuaries){
  const cfg=D.map(site.mapId),runtime=read('public/'+cfg.tiled.url.replace('./',''));
  const shrine=runtime.layers.find(l=>l.name==='Interactions').objects.find(o=>o.name===site.id);assert(shrine);
  const props=Object.fromEntries(shrine.properties.map(p=>[p.name,p.value]));assert.equal(props.action,'heal_ecos');assert.equal(props.requiresInteract,true);D.dialogue(props.dialogueId);
  const reserve=runtime.layers.find(l=>l.name==='Zones').objects.find(o=>o.name===site.id+'-reserve');assert(reserve.properties.some(p=>p.name==='enableEchoReserve'&&p.value===true));
  const save=createNewGame();save.gold=777;save.currentMapId=site.mapId;
  const echo={instanceId:'heal',championId:'lulu',mastery:16,masteryExperience:0,skillRanks:{q:2,w:2,e:2,r:1},unspentSkillPoints:0,currentHp:1,runeTraits:[],equippedItems:[]};
  save.party=[echo];save.storage=[{...echo,instanceId:'reserve'}];
  S.activate(save,{sanctuaryId:site.id,name:site.name,mapId:site.mapId,...site.arrival});
  assert.equal(save.gold,777);assert.equal(save.checkpoint.mapId,site.mapId);
  for(const c of [...save.party,...save.storage])assert.equal(c.currentHp,B.statsFor(c).hp);
  const recovery=S.recoverAfterDefeat(save);assert.equal(recovery.checkpoint.mapId,site.mapId);assert.equal(save.worldProgress.currentRegionId,'noxus');
 }
 console.log('Noxus: ten registered maps, nine atlas zones, reversible sea crossing, three healing/reserve/checkpoint sites, no premature wild encounters: OK.');
} finally {await server.close();}
