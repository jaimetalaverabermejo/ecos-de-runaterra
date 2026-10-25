import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
 const load = async (p,n) => (await server.ssrLoadModule('/src/'+p+'.ts'))[n];
 const D=await load('data/DataRegistry','DataRegistry'),B=await load('systems/combat/BattleEngine','BattleEngine');
 const P=await load('systems/progression/ProgressionService','ProgressionService'),T=await load('systems/combat/CombatTempoEngine','CombatTempoEngine');
 const M=await load('systems/combat/CombatMechanicsEngine','CombatMechanicsEngine'),S=await load('systems/combat/StatusEngine','StatusEngine');
 const E=await load('systems/echoes/EchoRegistryService','EchoRegistryService'),L=await load('systems/link/LinkService','LinkService');
 const W=await load('systems/world/WorldActionService','WorldActionService'),C=await load('systems/world/ConditionService','ConditionService');
 const Save=await load('systems/save/SaveService','SaveService'),createNewGame=await load('state/GameState','createNewGame');
 const assets=(await load('contenido/CatalogoCombatientes','CatalogoCombatientes')).assets();
 const art=(await load('contenido/CatalogoContenido','CatalogoContenido')).assetsCampeones();
 const profile=await load('ui/combat/CombatAnimationProfiles','animationProfile');
 assert.deepEqual(D.validate(),[]);assert.equal(D.combatants().length,7);assert.equal(assets.length,7);
 assert.equal(art.filter(a=>a.championId==='swain').length,4);assert.equal(D.character('swain').name,'Swain');
 assert(D.echoes().some(e=>e.id==='swain'));assert(!D.duels().some(d=>d.team.some(e=>e.championId==='swain')));
 const world=fs.readFileSync('src/scenes/WorldScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class WorldScene','class WorldScene');
 const Phaser={Scene:class{},Math:{Distance:{Between:(x,y,a,b)=>Math.hypot(x-a,y-b)},Clamp:(v,a,b)=>Math.max(a,Math.min(v,b))}};
 const Scene=new Function('Phaser','WORLD_PLAYER_VISUAL_SIZE','BattleEngine','ProgressionService','SaveService',stripTypeScriptTypes(world,{mode:'strip'})+'\nreturn WorldScene;')(Phaser,52,B,P,{save(){}});
 const factory=new Scene(),save=createNewGame();save.inventory['echo-linker-hextech']=1;
 const user=factory.createDuelChampion({championId:'teemo',mastery:17});
 for(const unit of D.combatants()) {
  assert.equal(unit.capturable,false);assert.throws(()=>D.echo(unit.id));
  assert(!D.echoCatalog().some(e=>e.id===unit.id));assert(!D.appearances().some(a=>a.championId===unit.id));
  const fighter=factory.createDuelChampion({championId:unit.id,mastery:17});assert(fighter.currentHp>100);
  assert.equal(fighter.currentHp,B.statsFor(fighter).hp);assert.equal(fighter.unspentSkillPoints,0);
  const skills=B.unlockedSkills(fighter);assert.equal(skills.length,unit.id==='noxus-commander'?3:2);
  assert.equal(M.skillIds(fighter,{},M.createStore()).length,skills.length);
  assert(skills.every(s=>fighter.skillRanks[s.slot]===1));
  const q=skills[0],damage=B.resolveSkill(q,1,B.statsFor(fighter),B.statsFor(user)).damage;assert(damage>0);
  assert.notEqual(profile(q,true,unit.id).family,'P3','Physical soldiers must not shoot generic magic orbs');
  const tempo=T.createStore();T.initialize(fighter,tempo);assert(T.canUseSkill(fighter,q,tempo).allowed);
  const guard=skills[1];T.startSkillCooldown(fighter,guard,tempo);assert(!T.canUseSkill(fighter,guard,tempo).allowed);
  for(let i=0;i<4;i++)T.finishTurn(fighter,tempo);assert(T.canUseSkill(fighter,guard,tempo).allowed);
  assert.equal(L.chance(save,user,fighter,1,fighter.currentHp),0);
  E.markSeen(save,unit.id);E.markLinked(save,unit.id);assert(!Object.hasOwn(save.echoRegistry,unit.id));
  assert(assets.some(a=>a.textureKey===unit.id+'-battle-front'&&a.url));
 }
 // Real status processing for commander support: both allies receive shield and attack boost.
 const commander=D.battleDefinition('noxus-commander'),shield=D.skill(commander.skillIds[1]),order=D.skill(commander.skillIds[2]);
 for(const ally of ['noxus-spearman','noxus-commander']) {
  const statuses=[];S.applySkillEffects(shield,1,[],statuses,true,1,'commander',{selectedTargetIsAlly:true});
  assert.equal(S.absorbDamage(statuses,40).damage,10,ally);
  S.applySkillEffects(order,1,[],statuses,true,1,'commander',{selectedTargetIsAlly:true});
  const stats=D.battleDefinition(ally).baseStats;assert(S.effectiveStats(stats,statuses).attack>stats.attack);
 }
 // Only formerly solo encounters become humans; multi-Echo teams retain their full kits.
 const routes=D.duels().filter(d=>/^ionia-(route-|forest-linker-)/.test(d.id));assert.equal(routes.length,32);
 const humans=routes.filter(d=>d.team.some(e=>D.isCombatant(e.championId)));assert.equal(humans.length,8);
 for(const duel of humans)assert(duel.team.length===1&&!duel.team[0].unlockedChampionId);
 const echoTeams=routes.filter(d=>!humans.includes(d));assert.equal(echoTeams.length,24);assert(echoTeams.every(d=>d.team.length>=2));
 // Optional offers must respect declining, through the actual dialogue-close method.
 for(let n=1;n<=4;n++)for(const node of ['inicio','salir','entrenar']) {
  const sc=new Scene();let started=0;
  Object.assign(sc,{save:createNewGame(),dialogueDefinition:{id:`ionia-orders-training-${n}-offer`},dialogueNode:{id:node},pendingDuelStart:{npc:{},duelId:`ionia-orders-training-${n}`},updateNearbyNpc(){},updateNearbyTiledInteraction(){},pendingEchoReleasesHere:()=>[],veigarSecrets:{onDialogueClosed(){}},startNpcDuelSequence(){started++;}});
  sc.closeDialogue();assert.equal(started,node==='entrenar'?1:0);
 }
 // Stage gates use the live collision rectangles and actual victory actions, never dialogue completion.
 function geometry(id,flags=[]) {
  const cfg=D.map(id),m=read('public/'+cfg.tiled.url.replace('./','')),ls=new Map(m.layers.map(l=>[l.name,l]));
  const tile=(name,x,y)=>ls.get(name)?.data?.[y*m.width+x]??0;
  const rects=['Collisions','BridgeRails'].flatMap(n=>ls.get(n)?.objects??[]).filter(o=>{
   const p=Object.fromEntries((o.properties??[]).map(p=>[p.name,p.value]));
   return (!p.activeFromFlag||flags.includes(p.activeFromFlag))&&(!p.blockedUntilFlag||!flags.includes(p.blockedUntilFlag));
  });
  const free=(x,y)=>x>=11&&y>=8&&x<cfg.width-11&&y<cfg.height-8&&!rects.some(o=>x+11>o.x&&x-11<o.x+o.width&&y+8>o.y&&y-8<o.y+o.height)
   &&[-11,11].every(dx=>[-8,8].every(dy=>{const a=Math.floor((x+dx)/32),b=Math.floor((y+dy)/32);return !tile('Vallas',a,b)&&!['Obstacles','Agua'].some(n=>tile(n,a,b)&&!tile('Paths',a,b));}));
  const start=[Math.floor(cfg.spawn.x/32),Math.floor(cfg.spawn.y/32)],q=[start],seen=new Set([start.join(',')]);
  for(const[x,y]of q)for(const[a,b]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(!seen.has(`${a},${b}`)&&free(a*32+16,b*32+16)){seen.add(`${a},${b}`);q.push([a,b]);}
  return {free,reach:(x,y)=>seen.has(`${Math.floor(x/32)},${Math.floor(y/32)}`)};
 }
 const invasion=createNewGame();invasion.worldProgress.flags.push('story:orders-irelia-briefed','story:karma-memorial-open','story:placidum-summit-open');
 const summit=D.npc('orders-swain');assert(!C.matchesAll(invasion,summit.conditions));
 for(const suffix of ['first','second','third']) {
  const id='orders-siege-'+suffix,duel=D.duel(id),npc=D.npc(id),g=geometry('jo05_placidium',invasion.worldProgress.flags);
  assert(C.matchesAll(invasion,npc.conditions));assert(g.reach(npc.x,npc.y),`${id}: opponent must be approachable`);
  assert(!g.reach(summit.x,summit.y),`${id}: gate must stop ascent`);
  // Intro cannot win the encounter.
  W.applyAll(invasion,D.dialogue(duel.introDialogueId).nodes.flatMap(n=>n.actions??[]));assert(!invasion.worldProgress.flags.includes('story:'+id));
  invasion.worldProgress.flags.push('duel:'+id+':won');W.applyAll(invasion,duel.victoryActions);
  assert(!C.matchesAll(invasion,npc.conditions));assert(!invasion.worldProgress.flags.includes('story:ionia-complete'));
 }
 assert(C.matchesAll(invasion,summit.conditions));assert(geometry('jo05_placidium',invasion.worldProgress.flags).reach(summit.x,summit.y));
 assert(!D.npc('orders-swain').service,'Final story battle remains reserved until the Irelia AI ally is connected');
 W.applyAll(invasion,D.dialogue('orders-swain').nodes.flatMap(n=>n.actions??[]));assert(!invasion.worldProgress.flags.includes('story:ionia-complete'));
 const reloaded=Save.deserializeSave(JSON.stringify(invasion));assert(reloaded.worldProgress.flags.includes('story:orders-siege-third'));
 assert(!reloaded.worldProgress.flags.includes('echo:swain-resonance'));
 // New placements: walkable full routes plus actual displacement, conversation pause, and resume.
 for(const n of read('src/contenido/mundo/npcs/ionia-combatants.json')) {
  const p=D.npc(n.id),flags=[...invasion.worldProgress.flags,'story:karma-pagoda-open'],g=geometry(p.mapId,flags);
  assert(g.reach(p.x,p.y),p.id+': reachable');const pts=p.behavior.points;
  for(let i=0;i<pts.length;i++)for(let k=0;k<=32;k++){const a=pts[i],b=pts[(i+1)%pts.length];assert(g.free(a.x+(b.x-a.x)*k/32,a.y+(b.y-a.y)*k/32),p.id+': full patrol');}
  const body={x:p.x,y:p.y,setPosition(x,y){this.x=x;this.y=y;}};body.body={vx:0,vy:0,setVelocity(x,y){this.vx=x;this.vy=y;}};
  const npc={placement:p,body,visual:{depth:body.y+100},facing:p.facing,patrolIndex:0,pauseUntil:0},sc=new Scene();Object.assign(sc,{save:createNewGame(),npcs:[npc],player:{x:0,y:0},time:{now:0},syncNpcVisual(){},isFollowerActive:()=>false,isGuideActive:()=>false});
  let moved=0;for(let k=0;k<80;k++){sc.time.now+=100;sc.updateNpcs();body.x+=body.body.vx*.1;body.y+=body.body.vy*.1;moved+=Math.hypot(body.body.vx,body.body.vy)*.1;}assert(moved>10,p.id);
  sc.player={x:body.x,y:body.y+25};sc.updateNpcs();assert.equal(body.body.vx,0);assert.equal(body.body.vy,0);sc.player={x:0,y:0};let resumed=0;for(let k=0;k<40;k++){sc.time.now+=100;sc.updateNpcs();resumed+=Math.hypot(body.body.vx,body.body.vy);}assert(resumed>0,p.id);
 }
 console.log('Seven non-Echo combatants: real battle kits/cooldowns/support, capture/collection guards, 8 human encounters + 24 preserved Echo teams, consent, three physical siege gates/reload, moving cast and Swain narrative gate without a fake regional victory: OK.');
} finally { await server.close(); }
