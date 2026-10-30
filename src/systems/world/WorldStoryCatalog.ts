import type { SaveGame } from '../../state/GameState';
import type { StoryDefinition } from '../../data/storyTypes';
export const worldStories = Object.values(import.meta.glob('../../data/stories/*.json', { eager: true, import: 'default' })) as StoryDefinition[];
export const storyById = (id: string) => worldStories.find(s => s.id === id);
export const playsInWorld = (story: StoryDefinition) => !story.beats.every(b => b.grayscale);
export interface WorldActorBinding { npcId?: string; actorId?: string; championId?: string; x?: number; y?: number; enterAt?: number; }
export interface WorldBeatMotion { actor: string; points: Array<{x:number;y:number}>; }
export interface WorldStoryBlocking { actors: Record<string,WorldActorBinding>; motions?: Record<number,WorldBeatMotion[]>; }
const p=(x:number,y:number)=>({x,y});
export const worldBlocking: Record<string,WorldStoryBlocking> = {
 "jonia-flank-1":{"actors": {"irelia": {"npcId": "irelia-ascent-1"}, "enemy1": {"npcId": "navori-occupation-3-0"}, "enemy2": {"npcId": "navori-occupation-3-1"}}, "motions": {"0": [{"actor": "enemy1", "points": [{"x": 336, "y": 2256}]}, {"actor": "enemy2", "points": [{"x": 432, "y": 2224}]}, {"actor": "irelia", "points": [{"x": 400, "y": 2352}, {"x": 400, "y": 2320}, {"x": 432, "y": 2320}]}]}},
 "jonia-flank-2":{"actors": {"irelia": {"npcId": "irelia-ascent-2"}, "enemy1": {"npcId": "navori-occupation-4-0"}, "enemy2": {"npcId": "navori-occupation-4-1"}}, "motions": {"0": [{"actor": "enemy1", "points": [{"x": 528, "y": 1392}]}, {"actor": "enemy2", "points": [{"x": 528, "y": 1328}]}, {"actor": "irelia", "points": [{"x": 496, "y": 1488}, {"x": 496, "y": 1456}, {"x": 528, "y": 1456}]}]}},
 "jonia-flank-3":{"actors": {"irelia": {"npcId": "irelia-ascent-3"}, "enemy1": {"npcId": "navori-occupation-5-0"}, "enemy2": {"npcId": "navori-occupation-5-1"}, "karma": {"npcId": "siege-karma-support"}}, "motions": {"0": [{"actor": "enemy1", "points": [{"x": 1040, "y": 848}]}, {"actor": "enemy2", "points": [{"x": 1136, "y": 848}]}, {"actor": "irelia", "points": [{"x": 1008, "y": 848}, {"x": 1008, "y": 816}, {"x": 1040, "y": 816}]}]}},
 'forest-syndra-outburst': {actors:{syndra:{npcId:'forest-syndra-arrival'},elan:{npcId:'forest-nao'}},motions:{2:[{actor:'syndra',points:[p(592,1680),p(656,1680),p(656,1648),p(656,1616),p(688,1616),p(688,1584),p(688,1552),p(720,1552),p(720,1520)]}]}},
 'forest-syndra-control': {actors:{ahri:{championId:'ahri'},syndra:{npcId:'forest-syndra-clearing'}}},
 'forest-syndra-restitution': {actors:{ahri:{npcId:'forest-ahri-sanctuary'},syndra:{npcId:'forest-syndra-sanctuary'},nao:{npcId:'forest-nao-sanctuary'}}},
 'forest-syndra-attire': {actors:{ahri:{npcId:'forest-ahri-sanctuary'},syndra:{npcId:'forest-syndra-sanctuary'}}},
 'forest-syndra-flee-1':{actors:{syndra:{npcId:'forest-syndra-trail-1'}},motions:{0:[{actor:'syndra',points:[p(944,1424),p(912,1424),p(880,1424),p(880,1392),p(880,1360),p(880,1328),p(848,1328),p(848,1296),p(848,1264),p(848,1232)]}]}},
 'forest-syndra-flee-2':{actors:{syndra:{npcId:'forest-syndra-trail-2'}},motions:{0:[{actor:'syndra',points:[p(752,880),p(752,848),p(624,848),p(624,784),p(656,784),p(656,624),p(752,624)]}]}},
 'jhin-third-shot': {actors:{elan:{npcId:'jhin-elan-walk-2'},miliciana:{npcId:'jhin-harbor-militia'}},motions:{2:[{actor:'miliciana',points:[p(704,1232),p(688,1232)]}]}},
 'jhin-protect-aya': {actors:{aya:{npcId:'ionia-jhin-witness'},miliciana:{actorId:'ionia-miliciana-navori',x:640,y:528}},motions:{1:[{actor:'miliciana',points:[p(608,528),p(576,528)]}]}},
 'jhin-arrest':{actors:{jhin:{championId:'jhin'},miliciana:{actorId:'ionia-miliciana-navori',x:336,y:336},aya:{actorId:'ionia-artesana',x:368,y:336}},motions:{0:[{actor:'miliciana',points:[p(336,304),p(304,304)]}],2:[{actor:'jhin',points:[p(272,304),p(304,336)]}]}},
 'forest-daisy-awakening': {actors:{ivern:{npcId:'forest-ivern-waiting'},daisy:{npcId:'forest-daisy'}},motions:{
  0:[{actor:'ivern',points:[p(1840,912),p(1808,912),p(1776,912),p(1744,912),p(1712,912),p(1680,912),p(1648,912),p(1648,880)]}],
  2:[{actor:'daisy',points:[p(1728,848),p(1728,880),p(1728,912),p(1728,944),p(1760,944),p(1792,944),p(1824,944),p(1824,912)]}]
 }},
};

export function syncWorldStoryProgress(save:SaveGame):void {
 const flags=save.worldProgress.flags,has=(id:string)=>flags.includes(id),grant=(id:string)=>{if(!has(id))flags.push(id);};
 if(!has('story:overworld-scenes-v1')){
  if(has('story:forest-control')&&!has('story:forest-returning'))grant('story:forest-roots-arrived');
  grant('story:overworld-scenes-v1');
 }
 // Old saves may still have the long escort active, even while blocked at Daisy.
 // The reunion now happens back at the landing, independently of that passage.
 if(has('story:forest-control')){
  grant('story:forest-roots-arrived');save.worldProgress.flags=flags.filter(f=>f!=='story:forest-returning');
 }
 save.worldProgress.flags=save.worldProgress.flags.filter(f=>f!=='story:forest-lillia-guide');
}
