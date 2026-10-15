import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const { DataRegistry: D } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  const { WorldActionService: W } = await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
  const { ConditionService: C } = await server.ssrLoadModule('/src/systems/world/ConditionService.ts');
  const { SaveService: S } = await server.ssrLoadModule('/src/systems/save/SaveService.ts');
  const { EchoAppearanceService: E } = await server.ssrLoadModule('/src/systems/encounters/EchoAppearanceService.ts');
  const { LeeSinTrial: L } = await server.ssrLoadModule('/src/systems/combat/LeeSinTrial.ts');
  assert.deepEqual(D.validate(), []);
  const speak = (save, id) => { for (const node of D.dialogue(id).nodes) W.applyAll(save, node.actions); };
  const visible = (save, id) => C.matchesAll(save, D.npc(id).conditions);
  const variant = (save, id) => { const n=D.npc(id); return n.dialogueVariants?.find(v=>C.matchesAll(save,v.conditions))?.dialogueId ?? n.dialogueId; };
  let save=createNewGame(); save.gold=321; const party=JSON.stringify(save.party);
  assert.equal(variant(save,'ionia-lee-guide'),'lee-intro');
  speak(save,'lee-intro'); assert(save.quests['ionia-lee-perception']);
  assert(!visible(save,'ionia-lee-trial')); assert(!visible(save,'lee-rescue-guard'));
  // Both testimonies can be read in either order, and survive a real save round trip.
  speak(save,'lee-ara'); save=S.deserializeSave(JSON.stringify(save)); speak(save,'lee-min'); speak(save,'lee-footprints');
  assert(visible(save,'lee-rescue-guard')); assert(!visible(save,'lee-jun'));
  const beforeLoss=JSON.stringify(save.quests); save=S.deserializeSave(JSON.stringify(save)); assert.equal(JSON.stringify(save.quests),beforeLoss);
  W.applyAll(save,D.duel('lee-rescue').victoryActions); speak(save,'lee-rescued');
  assert(!visible(save,'lee-rescue-guard') && !visible(save,'lee-nima')); assert(visible(save,'lee-jun-home'));
  assert.equal(variant(save,'ionia-lee-guide'),'lee-return'); speak(save,'lee-return');
  assert(visible(save,'ionia-lee-trial')); assert(!visible(save,'ionia-lee-guide'));
  // Reloading after victory but before its dialogue must still offer that dialogue.
  W.apply(save,{type:'set-flag',id:'duel:ionia-lee-trial:won'});save=S.deserializeSave(JSON.stringify(save));assert(visible(save,'ionia-lee-trial'));
  speak(save,'lee-trial-won');assert.equal(save.quests['ionia-lee-perception'].status,'completed');
  assert(save.worldProgress.flags.includes('echo:lee-sin-resonance'));assert(visible(save,'ionia-lee-after'));
  assert.equal(JSON.stringify(save.party),party,'Never grant or require a captured Echo');
  const gold=save.gold;speak(save,'lee-trial-won');assert.equal(save.gold,gold,'No duplicate rewards');
  const parcel=createNewGame();speak(parcel,'estuary-recovery-intro');speak(parcel,'estuary-parcel-found');speak(parcel,'estuary-recovery-return');
  assert.equal(parcel.quests['ionia-estuary-parcel'].status,'completed');const earned=parcel.gold;speak(parcel,'estuary-recovery-return');assert.equal(parcel.gold,earned);
  for(const zone of ['jo06_estuary','jo08_peaks']) {
    const fresh=createNewGame();assert(E.entriesForEncounter(fresh,`ionia-${zone}`,'ionia',zone).length>0);
    assert(!E.canAppear(fresh,'lee-sin','ionia',zone));fresh.worldProgress.flags.push('echo:lee-sin-resonance');assert(E.canAppear(fresh,'lee-sin','ionia',zone));
  }
  const skills=['lee-sin-sonic-wave','lee-sin-safeguard','lee-sin-tempest'];
  assert.deepEqual([0,1,2,3].map(t=>L.intent(t,skills,skills).action),[...skills.map(skillId=>({type:'skill',skillId})),{type:'wait'}]);
  assert.equal(L.intent(0,skills,[]).action.type,'wait');assert(L.intent(0,skills,[]).cue.includes('PAUSA'));
  const entries=read('src/contenido/mundo/npcs/ionia-island.json');
  const maps=new Map();
  for(const id of new Set(entries.map(n=>n.mapaId))) {
    const cfg=D.map(id),m=read('public/'+cfg.tiled.url.replace('./',''));const tile=(n,c,r)=>m.layers.find(l=>l.name===n)?.data?.[r*m.width+c]??0;
    const rects=m.layers.filter(l=>['Collisions','BridgeRails'].includes(l.name)).flatMap(l=>l.objects).filter(o=>!o.properties?.some(p=>p.name==='blockedUntilFlag'));
    const free=(x,y)=>x>=11&&y>=8&&x<m.width*32-11&&y<m.height*32-8&&!rects.some(o=>x+11>o.x&&x-11<o.x+o.width&&y+8>o.y&&y-8<o.y+o.height)&&[-11,11].every(dx=>[-8,8].every(dy=>{const c=Math.floor((x+dx)/32),r=Math.floor((y+dy)/32);return !tile('Vallas',c,r)&&!['Obstacles','Agua'].some(n=>tile(n,c,r)&&!tile('Paths',c,r))&&!['Ledges_down','Ledges_left','Ledges_right'].some(n=>tile(n,c,r));}));
    const start=[Math.floor(cfg.spawn.x/32),Math.floor(cfg.spawn.y/32)],q=[start],seen=new Set([start.join(',')]);
    for(const [c,r] of q)for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c+dc,y=r+dr,key=`${x},${y}`;if(!seen.has(key)&&free(x*32+16,y*32+16)){seen.add(key);q.push([x,y]);}}
    for(const l of m.layers.filter(l=>l.name==='Interactions'))for(const o of l.objects)assert(seen.has(`${Math.floor((o.x+o.width/2)/32)},${Math.floor((o.y+o.height/2)/32)}`),`${id}: inaccessible ${o.name}`);
    maps.set(id,{free,seen});
  }
  // Execute the actual scene's movement method, rather than only inspect patrol metadata.
  const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import .*;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
  const Phaser={Scene:class{},Math:{Distance:{Between:(x,y,xx,yy)=>Math.hypot(x-xx,y-yy)},Clamp:(v,a,b)=>Math.max(a,Math.min(v,b))}};
  const Scene=new Function('Phaser','DataRegistry','WORLD_PLAYER_VISUAL_SIZE',stripTypeScriptTypes(source,{mode:'strip'})+'\nreturn WorldScene;')(Phaser,D,52);
  for(const entry of entries) {
    const placement=D.npc(entry.id),{free,seen}=maps.get(placement.mapId);assert(seen.has(`${Math.floor(placement.x/32)},${Math.floor(placement.y/32)}`),`${entry.id}: unreachable`);
    const points=placement.behavior.points;
    for(let k=0;k<=16;k++)assert(free(points[0].x+(points[1].x-points[0].x)*k/16,points[0].y+(points[1].y-points[0].y)*k/16),`${entry.id}: wall in patrol`);
    const body={x:placement.x,y:placement.y,setPosition(x,y){this.x=x;this.y=y;}};body.body={vx:0,vy:0,setVelocity(x,y){this.vx=x;this.vy=y;}};
    const n={placement,body,visual:{depth:body.y+100},facing:placement.facing,patrolIndex:0,pauseUntil:0};
    const s=new Scene();Object.assign(s,{save:createNewGame(),npcs:[n],player:{x:0,y:0},time:{now:0},syncNpcVisual(){},isFollowerActive:()=>false,isGuideActive:()=>false});
    let distance=0;
    for(let i=0;i<80;i++){s.time.now+=100;s.updateNpcs();const x=body.x,y=body.y;body.x+=body.body.vx*.1;body.y+=body.body.vy*.1;distance+=Math.hypot(body.x-x,body.y-y);}
    assert(distance>10,`${entry.id}: no real displacement`);s.player={x:body.x,y:body.y+25};s.updateNpcs();assert.equal(body.body.vx,0);assert.equal(body.body.vy,0);
    s.player={x:0,y:0};let resumed=0;for(let k=0;k<40;k++){s.time.now+=100;s.updateNpcs();resumed+=Math.hypot(body.body.vx,body.body.vy);body.x+=body.body.vx*.1;body.y+=body.body.vy*.1;}assert(resumed>0,`${entry.id}: did not resume`);
  }
  assert(!D.maps().some(m=>m.id==='jo14_faelor_coast'));
  console.log(`Main island: full Lee/parcel arcs, retry/reload/reward safety, conditional encounters, announced combat rhythm, and ${entries.length} reachable actors moving/pausing/resuming: OK.`);
}finally{await server.close();}
