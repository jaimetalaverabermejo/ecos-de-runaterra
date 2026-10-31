import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {FerryService:Ferry}=await server.ssrLoadModule('/src/systems/world/FerryService.ts');
 const ports=JSON.parse(fs.readFileSync('src/data/world/regions/ionia/ferries.json'));
 assert.deepEqual(D.validate(),[]);assert.equal(ports.length,5);
 const full=['story:orders-letter','story:spirit-rune-carried'];let trips=0;
 for(const source of ports){
  const menu=D.dialogue(source.dialogueId);assert(Ferry.isDialogue(menu.id));
  for(const flags of [[],['story:orders-letter'],full]){
   const available=Ferry.menu(menu,source.mapId,flags).nodes[0].choices;
   assert(available.some(c=>c.nextNodeId==='quedarse'));
   for(const target of ports){
    const trip=Ferry.destination(source.mapId,'sail:'+target.mapId,flags);
    const expected=target!==source&&(!target.requiredFlag||flags.includes(target.requiredFlag));
    assert.equal(Boolean(trip),expected,source.mapId+' -> '+target.mapId);
    assert.equal(available.some(c=>c.nextNodeId==='sail:'+target.mapId),expected);
    if(trip){assert.deepEqual(D.map(trip.mapId).spawns[trip.spawn],target.arrival);trips++;}
   }
  }
  // Every fully unlocked pair supports a round trip, including Reunion from all boats.
  for(const target of ports.filter(p=>p!==source)){
   assert(Ferry.destination(source.mapId,'sail:'+target.mapId,full));
   assert(Ferry.destination(target.mapId,'sail:'+source.mapId,full));
  }
  assert.equal(Ferry.destination(source.mapId,'quedarse',full),undefined);
  assert.equal(Ferry.destination(source.mapId,'sail:jo20_trial_shrine',full),undefined);
 }
 assert.equal(Ferry.destination('jo20_trial_shrine','sail:jo21_reunion',full),undefined);
 assert(Ferry.destination('jo07_wehle','embarcar',[]));
 assert(Ferry.destination('jo09_forest_landing','embarcar',[]));
 assert.equal(Ferry.destination('jo09_forest_landing','embarcar-orders',[]),undefined);
 const world=fs.readFileSync('src/scenes/WorldScene.ts','utf8');assert(world.includes('this.sailWithCrew(ferry)'));assert(!world.slice(world.indexOf('private sailWithCrew'),world.indexOf('private drawJhinAftermath')).includes('getObjectLayer'));
 console.log(`Five ferry menus: ${trips} gated trips, every unlocked pair/return, cancel, invalid destinations and legacy crew aliases: OK.`);
} finally {await server.close();}
