import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try{
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {ConditionService:C}=await server.ssrLoadModule('/src/systems/world/ConditionService.ts');
 const {WorldActionService:W}=await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
 const {SaveService:S}=await server.ssrLoadModule('/src/systems/save/SaveService.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {worldStories,syncWorldStoryProgress}=await server.ssrLoadModule('/src/systems/world/WorldStoryCatalog.ts');
 assert.deepEqual(D.validate(),[]);
 const point=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),l=D.npc('forest-lillia'),y=D.npc('forest-yunara-field');
 const map=read('public/'+D.map('jo11_omikayalan').tiled.url.replace('./','')),ch=map.layers.find(l=>l.name==='Interactions').objects.find(o=>o.name==='Recoger el carillón de raíz'),c=point(ch.x+12,ch.y+12);
 for(const[a,b]of [[l,y],[l,c],[y,c]])assert(dist(a,b)>700,'Every search leg must require travelling, not looking across one screen');
 for(const id of ['forest-xayah-gate','forest-xayah-trial','forest-xayah-after']){const x=D.npc(id),r=D.npc('forest-rakan');assert(dist(x,r)<=25);assert.equal(x.behavior.type,'static');}
 for(const id of ['forest-syndra-sanctuary','forest-ahri-sanctuary','forest-nao-sanctuary']){const n=D.npc(id);assert.equal(n.mapId,'jo09_forest_landing');assert(dist(n,D.npc('forest-ferryman'))>450);}
 const awake=worldStories.find(s=>s.id==='forest-daisy-awakening');assert.equal(awake.followUpDuelId,'ionia-forest-ivern');assert(D.duel(awake.followUpDuelId));
 for(const st of worldStories)if(st.followUpDuelId)assert(D.duel(st.followUpDuelId));
 const ending=worldStories.find(s=>s.id==='forest-syndra-restitution');assert(ending.beats.some(b=>b.effect==='syndra-attire'));assert(ending.completionActions.some(a=>a.type==='set-flag'&&a.id==='story:syndra-attire'));
 const save=createNewGame();save.gold=939;save.worldProgress.flags.push('story:forest-control','story:forest-spheres-complete','story:forest-lillia-guide');const before=JSON.stringify(save.party);
 syncWorldStoryProgress(save);assert(!save.worldProgress.flags.includes('story:forest-lillia-guide'));
 const n=D.npc('forest-syndra-sanctuary'),variant=n.dialogueVariants.find(v=>C.matchesAll(save,v.conditions));assert.equal(variant.dialogueId,'forest-syndra-attire','Old completed saves can see the outfit without replaying the quest');
 W.applyAll(save,worldStories.find(s=>s.id==='forest-syndra-attire').completionActions);
 const reloaded=S.deserializeSave(JSON.stringify(save));assert(reloaded.worldProgress.flags.includes('story:syndra-attire'));assert.equal(reloaded.gold,939);assert.equal(JSON.stringify(reloaded.party),before);
 assert.equal(n.dialogueVariants.find(v=>C.matchesAll(reloaded,v.conditions)).dialogueId,'forest-syndra-after');
 console.log('Separated search legs, close refuge couple, quiet shore reunion, direct Daisy battle, optional legacy costume scene and persistent identity without repeat rewards: OK.');
}finally{await server.close();}
