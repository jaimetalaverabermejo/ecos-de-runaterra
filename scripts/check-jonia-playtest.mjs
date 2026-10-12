import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true}});
try {
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {WorldActionService:W}=await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
 const {QuestService:Q}=await server.ssrLoadModule('/src/systems/quests/QuestService.ts');
 const {SaveService:S}=await server.ssrLoadModule('/src/systems/save/SaveService.ts');
 assert.deepEqual(D.validate(),[]);
 for(const map of D.maps().filter(m=>m.tiled)){const json=read('public/'+map.tiled.url.replace('./',''));for(const set of map.tiled.tilesets)assert(json.tilesets.some(s=>s.name===set.name),`${map.id}: mismatched runtime tileset ${set.name}`);}
 assert.equal(D.map('jo05_placidium').name,'Jonia - Navori');
 const duels=D.duels().filter(d=>d.id.startsWith('ionia-route-'));assert.equal(duels.length,16);assert(duels.every(d=>d.rewardGold>=120&&d.rewardGold<=320));
 for(const duel of duels){const n=D.npc(duel.npcId);assert.equal(n.service.duelId,duel.id);assert(n.conditions.some(c=>c.type==='flag'&&c.id===`duel:${duel.id}:won`&&c.value===false));assert(D.npc(n.id+'-after').conditions.some(c=>c.type==='flag'&&c.value!==false));}
 const outdoor=D.maps().filter(m=>['jo01_koeshin','jo02_white_cliffs','jo03_lhradi','jo04_rice_fields','jo05_placidium','jo06_estuary','jo07_wehle'].includes(m.id));assert.equal(outdoor.length,7);
 const routes=['jo01_koeshin','jo02_white_cliffs','jo04_rice_fields','jo06_estuary'];
 for(const map of outdoor){const j=read('public/'+map.tiled.url.replace('./',''));const objects=j.layers.find(l=>l.name==='Interactions').objects.filter(o=>o.name.startsWith('exploration-'));assert.equal(objects.length,1);assert.equal(D.npcs(map.id).filter(n=>n.id.startsWith('ionia-route-')&&!n.id.endsWith('-after')).length,routes.includes(map.id)?4:0);assert.equal(Boolean(map.tiled.disableWildEncounters),!routes.includes(map.id));}
 const firstMap=D.map('jo03_lhradi_theatre_backstage'),back=read('public/'+firstMap.tiled.url.replace('./',''));assert(back.layers.find(l=>l.name==='Interactions').objects.some(o=>o.name==='jhin-first'));
 assert.equal(D.npc('ionia-jhin-witness').mapId,'jo03_lhradi_theatre_sala');
 const save=createNewGame();for(const node of D.dialogue('ionia-theatre-history-book').nodes)W.applyAll(save,node.actions);assert(save.quests['ionia-jhin-trail']);for(const node of D.dialogue('ionia-jhin-first').nodes)W.applyAll(save,node.actions);assert.equal(save.quests['ionia-jhin-trail'].objectiveProgress['jhin-first'],1);
 assert.equal(D.npc('ionia-karma-intro').mapId,'jo05_placidium_pagoda_upper');assert(D.npc('ionia-karma-pagoda-guide').guide.points.length>=2);
 const karma=createNewGame();for(const node of D.dialogue('ionia-karma-pagoda-invitation').nodes)W.applyAll(karma,node.actions);assert(karma.quests['ionia-karma-memory']);assert(karma.worldProgress.flags.includes('story:karma-pagoda-open'));assert(karma.worldProgress.flags.includes('story:karma-pagoda-guide-active'));
 const legacy=createNewGame();Q.start(legacy,'ionia-karma-memory');legacy.gold=777;const migrated=S.deserializeSave(JSON.stringify(legacy));assert.equal(migrated.gold,777);assert(migrated.worldProgress.flags.includes('story:karma-pagoda-open'));
 console.log('All tilesets bind; four one-time trainers per route, towns without trainers/random encounters, theatre and pagoda access/migration: OK.');
}finally{await server.close();}
