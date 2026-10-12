import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
try {
 const {ADVENTURE_CHECKPOINTS:points,createAdventureCheckpoint:create}=await server.ssrLoadModule('/src/systems/testing/AdventureCheckpoints.ts');
 const {DataRegistry:D}=await server.ssrLoadModule('/src/data/DataRegistry.ts');
 for(const point of points){const save=create(point.id);assert.equal(save.currentMapId,point.mapId);assert.equal(save.gold,point.gold);assert(save.party.length>0&&save.party.every(c=>c.mastery===point.level&&c.currentHp>0));for(const id of Object.keys(save.inventory))assert(D.item(id));assert(save.worldProgress.flags.includes('qa:adventure'));assert(!save.unlockedRecipes.includes('recipe-speed-core'));assert(!save.unlockedRecipes.includes('recipe-wardens-mail'));assert(!save.quests['ionia-lost-brooch']);assert.equal(save.checkpoint.mapId,point.mapId);assert.equal(save.playerPosition.x,save.checkpoint.x);const copy=create(point.id);save.gold=0;assert.equal(copy.gold,point.gold);}
 assert(create('rumble').worldProgress.flags.includes('ability:sprint-unlocked'));assert(!create('rumble').worldProgress.flags.includes('story:bandle-storm-guide-done'));
 assert(!create('kennen').worldProgress.flags.includes('duel:kennen-portal-boss:won'));
 assert(create('ionia').worldProgress.flags.includes('story:kennen-portal-activated'));
 assert(!create('yi').worldProgress.flags.includes('story:ionia-yi-met'));assert(create('brooch').worldProgress.flags.includes('story:ionia-yi-met'));
 console.log('Seven independent adventure starts, level/gold/flags, fresh recipe and quest delivery: OK.');
}finally{await server.close();}
