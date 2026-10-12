import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {QuestService:Q}=await server.ssrLoadModule('/src/systems/quests/QuestService.ts');
 const {WorldActionService:W}=await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
 const {EconomyProgressionService:E}=await server.ssrLoadModule('/src/systems/progression/EconomyProgressionService.ts');
 const {SaveService:S}=await server.ssrLoadModule('/src/systems/save/SaveService.ts');
 assert.deepEqual(D.validate(),[]);
 const save=createNewGame();save.worldProgress.unlockedRegions.push('ionia');save.worldProgress.flags.push('story:kennen-portal-activated');E.sync(save);
 assert(!save.unlockedRecipes.includes('recipe-speed-core'));
 const welcome=D.dialogue('jo01_koeshin_house_01-resident');for(const node of welcome.nodes)W.applyAll(save,node.actions);E.sync(save);
 assert(save.unlockedRecipes.includes('recipe-speed-core'));const count=save.unlockedRecipes.length;E.sync(save);assert.equal(save.unlockedRecipes.length,count);
 const old=createNewGame();old.unlockedRecipes=['recipe-speed-core','recipe-wardens-mail'];old.gold=777;const restored=S.deserializeSave(JSON.stringify(old));assert.equal(restored.gold,777);assert.deepEqual(restored.unlockedRecipes,old.unlockedRecipes);
 const quest='ionia-lost-brooch',traveler='jo02_white_cliffs_house_01-resident';
 Q.start(save,quest);Q.recordEvent(save,{type:'talk',targetId:traveler});assert(!Q.complete(save,quest));assert(!save.unlockedRecipes.includes('recipe-wardens-mail'));
 W.apply(save,{type:'add-item',itemId:'travelers-brooch',quantity:1});Q.recordEvent(save,{type:'interact',targetId:'ionia-lost-brooch-pickup'});assert.equal(save.quests[quest].status,'active');
 Q.recordEvent(save,{type:'talk',targetId:traveler});assert.equal(save.quests[quest].status,'ready');assert(Q.complete(save,quest));assert(!save.inventory['travelers-brooch']);assert(save.unlockedRecipes.includes('recipe-wardens-mail'));assert(!Q.complete(save,quest));
 assert.equal(D.item('phage').name,'Bacteriófago');assert.equal(D.item('wardens-mail').name,'Malla del guardián');assert.equal(D.item('speed-legendary').name,'Filoveloz de Navori');
 assert(fs.existsSync('public/assets/items/epic/phage.png'));
 const yis=D.npcs().filter(n=>n.championId==='master-yi'&&n.id.startsWith('ionia-master-yi'));assert(yis.length>=3);assert(yis.every(n=>n.mapId==='jo01_koeshin_house_02'));
 const guide=D.npcs().find(n=>n.id==='ionia-kennen-guide');assert.equal(guide.follower.completeOnMapId,'jo01_koeshin_house_02');
 const gnar=D.npcs().find(n=>n.id==='gnar-cave-raging');assert.equal(gnar.y,80);assert.equal(gnar.autoTalk.radius,48);assert.equal(D.npcs().find(n=>n.id==='kennen-portal-guardian').y,352);
 assert(D.map('three-house').name.includes('Casa del árbol'));assert.equal(D.map('jo05_placidium').name,'Jonia - Nabori');
 const dep=read('docs/diseno/jonia/interiores/despliegue.json');
 for(const f of dep.facades){const d=D.map(f.mapId),m=read('public/'+d.tiled.url.replace('./',''));const [x0,y0,x1,y1]=f.bounds,[fx0,fy0,fx1,fy1]=f.collisionFootprint;assert(fy0>y0&&fy0<=y0+(y1-y0)*.34);assert(fx0>x0&&fx1<x1);assert.equal(fy1,y1);
  const objects=m.layers.find(l=>l.name==='Collisions').objects.filter(o=>o.properties?.some(p=>p.name==='buildingId'&&p.value===f.houseId));assert(objects.length);assert(objects.every(o=>o.y>=fy0&&o.x>=fx0&&o.x+o.width<=fx1));
  const structures=m.layers.find(l=>l.name==='Structures'),above=m.layers.find(l=>l.name==='AbovePlayer');let roof=0;for(let r=y0/32;r<fy0/32;r++)for(let c=x0/32;c<x1/32;c++){const i=r*m.width+c;assert.equal(structures.data[i],0);if(above.data[i])roof++;}assert(roof>0);
 }
 const cliff=D.map('jo02_white_cliffs'),map=read('public/'+cliff.tiled.url.replace('./',''));const pickup=map.layers.find(l=>l.name==='Interactions').objects.find(o=>o.name==='ionia-lost-brooch-pickup');const props=Object.fromEntries(pickup.properties.map(p=>[p.name,p.value]));assert.equal(props.visibleFlag,'story:ionia-lost-brooch-started');const i=Math.floor(pickup.y/32)*map.width+Math.floor(pickup.x/32);assert(map.layers.find(l=>l.name==='TallGrass').data[i]);assert(!map.layers.flatMap(l=>l.objects??[]).some(o=>o.name==='ionia-wardens-mail-scroll'));
 console.log('Narrative recipe delivery, lost-object return without repeats, save compatibility, correct item names, indoor Yi, closer Bandle encounters and 20 roof/footprint pairs: OK.');
} finally {await server.close();}
