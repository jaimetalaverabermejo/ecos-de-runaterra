import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const code=fs.readFileSync('src/systems/world/FerryService.ts','utf8').replace('export class','class');
const Ferry=new Function(stripTypeScriptTypes(code)+';return FerryService;')();
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 assert.deepEqual(D.validate(),[]);
 for(const flags of [[],['story:orders-letter'],['story:orders-letter','story:ionia-complete']]) {
  let map='jo07_wehle';
  for(let i=0;i<6;i++) {const trip=Ferry.destination(map,'embarcar',JSON.parse(JSON.stringify(flags)));assert(trip);assert(D.map(trip.mapId).spawns[trip.spawn]);map=trip.mapId;}
  assert.equal(map,'jo07_wehle');
 }
 assert.equal(Ferry.destination('jo09_forest_landing','embarcar-orders',[]),undefined);
 assert.equal(Ferry.destination('jo09_forest_landing','embarcar-orders',['story:orders-letter']).mapId,'jo16_orders_village');
 for(const id of ['wehle-captain','forest-ferryman']){
  const d=D.dialogue(id);assert(d.nodes[0].choices.some(c=>c.nextNodeId==='embarcar'&&!c.conditions?.length));
 }
 const option=D.dialogue('forest-ferryman').nodes[0].choices.find(c=>c.nextNodeId==='embarcar-orders');assert.equal(option.conditions[0].id,'story:orders-letter');
 const world=fs.readFileSync('src/scenes/WorldScene.ts','utf8');assert(world.includes('this.sailWithCrew(ferry)'));assert(!world.slice(world.indexOf('private sailWithCrew'),world.indexOf('private drawJhinAftermath')).includes('getObjectLayer'));
 console.log('Crew ferries: repeated round trips before/after story and reload, valid arrivals, explicit destination menu, letter gate and no portal dependency: OK.');
} finally {await server.close();}
