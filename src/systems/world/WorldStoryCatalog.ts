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
 'forest-syndra-outburst': {actors:{syndra:{npcId:'forest-syndra-arrival'},elan:{npcId:'forest-nao'}},motions:{2:[{actor:'syndra',points:[p(592,1680),p(656,1680),p(656,1520)]}]}},
 'forest-syndra-control': {actors:{ahri:{championId:'ahri'},syndra:{npcId:'forest-syndra-clearing'}}},
 'forest-syndra-restitution': {actors:{ahri:{npcId:'forest-ahri-sanctuary'},syndra:{npcId:'forest-syndra-sanctuary'},nao:{npcId:'forest-nao-sanctuary'}}},
 'forest-syndra-flee-1':{actors:{syndra:{npcId:'forest-syndra-trail-1'}},motions:{0:[{actor:'syndra',points:[p(944,1424),p(912,1424),p(880,1424),p(880,1392),p(880,1360),p(880,1328),p(848,1328),p(848,1296),p(848,1264),p(848,1232)]}]}},
 'forest-syndra-flee-2':{actors:{syndra:{npcId:'forest-syndra-trail-2'}},motions:{0:[{actor:'syndra',points:[p(752,816),p(784,816),p(784,624),p(752,624)]}]}},
 'jhin-third-shot': {actors:{elan:{npcId:'jhin-elan-walk-2'},miliciana:{npcId:'jhin-harbor-militia'}},motions:{2:[{actor:'miliciana',points:[p(704,1232),p(688,1232)]}]}},
 'jhin-protect-aya': {actors:{aya:{npcId:'ionia-jhin-witness'},miliciana:{actorId:'ionia-miliciana-navori',x:640,y:528}},motions:{1:[{actor:'miliciana',points:[p(608,528),p(576,528)]}]}},
 'jhin-arrest':{actors:{jhin:{championId:'jhin'},miliciana:{actorId:'ionia-miliciana-navori',x:336,y:336},aya:{actorId:'ionia-artesana',x:368,y:336}},motions:{0:[{actor:'miliciana',points:[p(336,304),p(304,304)]}],2:[{actor:'jhin',points:[p(272,304),p(304,336)]}]}},
 'forest-daisy-awakening': {actors:{yunara:{championId:'yunara'},ivern:{championId:'ivern',x:1744,y:976}}},
};

export function syncWorldStoryProgress(save:SaveGame):void {
 const flags=save.worldProgress.flags,has=(id:string)=>flags.includes(id),grant=(id:string)=>{if(!has(id))flags.push(id);};
 if(!has('story:overworld-scenes-v1')){
  if(has('story:forest-control')&&!has('story:forest-returning'))grant('story:forest-roots-arrived');
  grant('story:overworld-scenes-v1');
 }
 if(save.currentMapId==='jo12_roots'&&has('story:forest-returning')){
  grant('story:forest-roots-arrived');save.worldProgress.flags=flags.filter(f=>f!=='story:forest-returning');
 }
}
