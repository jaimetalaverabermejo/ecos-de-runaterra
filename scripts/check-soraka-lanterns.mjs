import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const load=async(p,n)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[n];
 const D=await load('data/DataRegistry','DataRegistry'), Sanctuary=await load('systems/sanctuary/SanctuaryService','SanctuaryService');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const B=await load('systems/combat/BattleEngine','BattleEngine');
 const {IONIA_LAND_ROUTES:edges}=await server.ssrLoadModule('/src/data/IoniaTravelRoutes.ts');
 const plan=read('docs/diseno/jonia/healing-and-fauna-v2.json');assert.equal(plan.healing.length,10);
 const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8'),start=source.indexOf('  private useTiledSanctuary('),end=source.indexOf('  private createStoryMarker(',start);
 const F=new Function('SanctuaryService','SaveService','DataRegistry',stripTypeScriptTypes('class F {\n'+source.slice(start,end)+'\n}')+'\nreturn F;')(Sanctuary,{save(){}},D);
 let count=0;
 for(const site of plan.healing) {
  const cfg=D.map(site.map),m=read('public/'+cfg.tiled.url.replace('./',''));
  const interactions=m.layers.find(l=>l.name==='Interactions')?.objects.filter(o=>o.properties.some(p=>p.name==='action'&&p.value==='heal_ecos'))??[];
  if(site.kind==='existing') {assert(m.layers.some(l=>l.objects?.some(o=>o.properties.some(p=>p.name==='healEchos'&&p.value===true))));continue;}
  assert.equal(interactions.length,1,site.map+': one intentional healing point');
  const o=interactions[0],pr=Object.fromEntries(o.properties.map(p=>[p.name,p.value]));assert.equal(pr.requiresInteract,true);
  const save=createNewGame();save.gold=777;save.currentMapId=site.map;save.party.push({instanceId:'heal-test',championId:'lulu',mastery:16,masteryExperience:0,skillRanks:{q:2,w:2,e:2,r:1},unspentSkillPoints:0,currentHp:1,runeTraits:[],equippedItems:[]});save.storage.push({...save.party[0],instanceId:'reserve-test'});
  const f=new F();Object.assign(f,{save,player:{x:site.x,y:site.y,body:{setVelocity(){}}},playerVisual:{anims:{stop(){}}},beginWorldDialogue:d=>assert.equal(d.id,pr.dialogueId)});
  f.useTiledSanctuary({id:o.name,name:pr.displayName,sanctuaryId:pr.sanctuaryId,dialogueId:pr.dialogueId});
  assert.equal(save.gold,777);assert.equal(save.checkpoint.mapId,site.map);assert.equal(save.checkpoint.x,site.x);
  for(const c of [...save.party,...save.storage])assert.equal(c.currentHp,B.statsFor(c).hp);count++;
 }
 const healed=new Set(plan.healing.map(s=>s.zone)),zones=D.maps().filter(m=>m.regionId==='ionia'&&m.id===m.zoneId);
 assert.equal(zones.length,21);
 // Footpaths must not force three unhealed zones; every boat can return to a healing port.
 function walk(id,path=[]) {assert(path.length<=2,`Too many unhealed maps: ${path}`);for(const edge of edges){if(!edge.includes(id))continue;const next=edge[0]===id?edge[1]:edge[0];if(healed.has(next)||path.includes(next))continue;walk(next,[...path,next]);}}
 for(const z of zones)if(!healed.has(z.id))walk(z.id,[z.id]);
 console.log('Ten spaced healing zones: five large sanctuaries, two indoor altars, three hidden outdoor points; real healing/storage/checkpoints and at most two consecutive unhealed maps: OK.');
} finally {await server.close();}
