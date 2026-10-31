import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createServer}from'vite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try{
 const load=async(p,n)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[n];
 const D=await load('data/DataRegistry','DataRegistry'),W=await load('systems/world/WorldActionService','WorldActionService'),C=await load('systems/world/ConditionService','ConditionService'),S=await load('systems/save/SaveService','SaveService');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const {worldBlocking,worldStories,playsInWorld,syncWorldStoryProgress}=await server.ssrLoadModule('/src/systems/world/WorldStoryCatalog.ts');
 assert.deepEqual(D.validate(),[]);
 for(const st of worldStories)assert.equal(playsInWorld(st),st.id!=='karma-flashback',st.id);
 const s=createNewGame(),talk=id=>D.dialogue(id).nodes.forEach(n=>W.applyAll(s,n.actions)),story=id=>W.applyAll(s,worldStories.find(st=>st.id===id).completionActions),see=id=>C.matchesAll(s,D.npc(id).conditions);
 talk('forest-arrival');story('forest-syndra-outburst');talk('forest-wounded');talk('forest-trace');assert(see('forest-syndra-trail-1'));assert(!see('forest-syndra-clearing'));
 story('forest-syndra-flee-1');assert(!see('forest-syndra-trail-1'));assert(see('forest-syndra-trail-2'));
 story('forest-syndra-flee-2');assert(see('forest-syndra-clearing'),'Syndra must be visible before the Ahri dialogue');talk('forest-ahri-listen');assert(see('forest-syndra-clearing'));
 for(const n of D.npcs().filter(n=>n.id.startsWith('forest-syndra')))assert.equal(n.actorId,'ionia-aldeana');
 const legacy=createNewGame();legacy.gold=777;legacy.worldProgress.flags.push('story:forest-ahri-guide');const restored=S.deserializeSave(JSON.stringify(legacy));assert.equal(restored.gold,777);assert(C.matchesAll(restored,D.npc('forest-syndra-clearing').conditions),'An ongoing old save must not need to replay the pursuit');
 const oldControl=createNewGame();oldControl.gold=888;oldControl.worldProgress.flags.push('story:forest-control','story:forest-ahri-guide');syncWorldStoryProgress(oldControl);assert(oldControl.worldProgress.flags.includes('story:forest-roots-arrived'));assert.equal(oldControl.gold,888);assert(!C.matchesAll(oldControl,D.npc('forest-syndra-clearing').conditions));
 const stuck=createNewGame();stuck.worldProgress.flags.push('story:forest-control','story:forest-returning','story:overworld-scenes-v1');syncWorldStoryProgress(stuck);assert(!stuck.worldProgress.flags.includes('story:forest-returning'));assert(stuck.worldProgress.flags.includes('story:forest-roots-arrived'));
 for(const id of ['forest-ahri-clearing','forest-syndra-clearing'])assert(!D.npc(id).follower);
 for(const n of D.npcs().filter(n=>n.championId==='yunara'))assert.equal(n.overworldScale,.52);
 assert.equal(D.npc('forest-lillia').mapId,'jo11_omikayalan');assert(!D.npc('forest-lillia').guide);
 for(const n of D.npcs().filter(n=>n.championId==='ahri'))assert.equal(n.overworldScale,.54);
 for(const id of ['ionia-lee-guide','ionia-lee-trial','ionia-lee-after'])assert.equal(D.npc(id).overworldScale,.76);
 for(const id of ['forest-healer-landing','forest-healer-garden'])assert(!D.npcs().some(n=>n.id===id),'Provisional healers are replaced by Soraka lanterns');
 for(const map of ['jo07_wehle','jo09_forest_landing']){
  const j=read('public/'+D.map(map).tiled.url.replace('./','')),o=j.layers.find(l=>l.name==='Interactions').objects.find(o=>o.name==='ionia-ferry');
  assert(o.properties.some(p=>p.name==='requiresInteract'&&p.value===true));
 }
 for(const id of ['wehle-captain','forest-ferryman']){const d=D.dialogue(id);assert(d.nodes[0].choices.some(c=>c.nextNodeId.startsWith('sail:')));assert(d.nodes[0].choices.some(c=>c.nextNodeId==='quedarse'));}
 // Every authored movement segment stays on walkable ground, not over trees or water.
 for(const[id,block]of Object.entries(worldBlocking)){
  const st=worldStories.find(st=>st.id===id),j=read('public/'+D.map(st.beats[0].mapId).tiled.url.replace('./','')),L=new Map(j.layers.map(l=>[l.name,l]));
  const free=(x,y)=>{const col=Math.floor(x/32),row=Math.floor(y/32),i=row*j.width+col;if(col<0||row<0||col>=j.width||row>=j.height)return false;const tile=n=>L.get(n)?.data?.[i]??0;return !tile('Vallas')&&(!tile('Obstacles')||tile('Paths'))&&(!tile('Agua')||tile('Paths'));};
  for(const motions of Object.values(block.motions??{}))for(const m of motions){const b=block.actors[m.actor];const n=b.npcId&&b.npcId!=='forest-daisy'?D.npc(b.npcId):b.championId?D.npcs(st.beats[0].mapId).find(n=>n.championId===b.championId):undefined;const origin=id.startsWith('jonia-flank-')&&n?.guide?n.guide.points.at(-1):n;let from={x:origin?.x??b.x??(m.actor==='daisy'?1728:undefined),y:origin?.y??b.y??(m.actor==='daisy'?816:undefined)};if(from.x===undefined||from.y===undefined)continue;
   for(const point of m.points){const steps=Math.ceil(Math.hypot(point.x-from.x,point.y-from.y)/6);for(let i=0;i<=steps;i++)assert(free(from.x+(point.x-from.x)*i/steps,from.y+(point.y-from.y)*i/steps),`${id}/${m.actor}: movement crosses a wall near ${point.x},${point.y}`);from=point;}
  }
 }
 assert(D.npc('ionia-jhin-elan').guide);assert(D.npc('jhin-elan-walk-2').guide);
 const elan=D.dialogue('ionia-jhin-elan').nodes[0];assert(elan.lines.join(' ').includes('Orin'));assert(!elan.actions.some(a=>a.type==='play-story'),'The first Elan conversation must begin accompaniment, not the shooting');
 console.log('In-world present scenes, two visible Syndra pursuit stages/legacy saves, adolescent cast, sizes, lantern replacement, crew-only ferries and walkable scripted movements: OK.');
}finally{await server.close();}
