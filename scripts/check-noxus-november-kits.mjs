import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
const previousRandom=Math.random;
try {
 const load=async(p,n)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[n];
 const D=await load('data/DataRegistry','DataRegistry'),B=await load('systems/combat/BattleEngine','BattleEngine');
 const M=await load('systems/combat/CombatMechanicsEngine','CombatMechanicsEngine'),T=await load('systems/combat/CombatTempoEngine','CombatTempoEngine');
 const S=await load('systems/combat/StatusEngine','StatusEngine'),F=await load('systems/combat/SpecialEffectEngine','SpecialEffectEngine');
 const P=await load('systems/progression/ProgressionService','ProgressionService'),Types=await load('systems/combat/TypeEffectivenessService','TypeEffectivenessService');
 const Art=await load('contenido/CatalogoContenido','CatalogoContenido');
 const make=(championId,items=[])=>{const c={instanceId:championId+'-'+crypto.randomUUID(),championId,mastery:17,masteryExperience:0,skillRanks:{q:1,w:1,e:1,r:1},unspentSkillPoints:0,currentHp:1,runeTraits:[],equippedItems:items};c.currentHp=B.statsFor(c).hp;return c;};
 const Phaser={Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}};
 const noOp=()=>{},asyncNoOp=async()=>{};
 const defaultSkillTarget=await load('systems/combat/BattleFormat','defaultSkillTarget');
 const dependencies={defaultSkillTarget,Phaser,DataRegistry:D,BattleEngine:B,CombatMechanicsEngine:M,CombatTempoEngine:T,StatusEngine:S,SpecialEffectEngine:F,ProgressionService:P,TypeEffectivenessService:Types,pulseCombatEvent:noOp,playCombatVfx:asyncNoOp,playCombatVfxGroup:asyncNoOp,skillVfx:()=>({}),formatProgressionGain:()=>''};
 const code=fs.readFileSync('src/scenes/DoubleBattleScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class DoubleBattleScene','class DoubleBattleScene');
 const Scene=new Function(...Object.keys(dependencies),stripTypeScriptTypes(code,{mode:'strip'})+'\nreturn DoubleBattleScene;')(...Object.values(dependencies));
 const create=()=>{const sc=new Scene();Object.assign(sc,{forms:{},resources:{},statuses:{},tempo:T.createStore(),mechanics:M.createStore(),playerReserves:[],enemyReserves:[],session:{kind:'sandbox',persistPlayerState:false},wait:asyncNoOp,awaitContinue:asyncNoOp,setMessage:noOp,beginTurn:async()=>true,refreshAllUi(){for(const u of [...this.playerActive,...this.enemyActive]){u.stats=M.applyStatBonuses(u.champion,S.effectiveStats(B.statsFor(u.champion,F.formId(u.champion,this.forms)),this.statusesFor(u)),this.mechanics);u.maxHp=u.stats.hp;u.hp=Math.min(u.hp,u.maxHp);}},refreshCombatantUi:noOp});return sc;};
 const unit=(id,side,slot)=>{const c=make(id);return {champion:c,side,slot,hp:c.currentHp,maxHp:c.currentHp,stats:B.statsFor(c)};};

 assert.deepEqual(D.validate(),[]); Math.random=()=>.5;
 const cast=async(sc,actor,id,target,mode='enemy')=>{
   T.initialize(actor.champion,sc.tempo,true).cooldowns={};
   await sc.resolveTurnEntry(actor,{action:{type:'skill',skillId:id},targetMode:mode,targetInstanceIds:mode==='all-enemies'?sc.targetCandidates(actor,mode).map(u=>u.champion.instanceId):[target.champion.instanceId]});
 };
 const setup=(id)=>{const sc=create(),a=unit(id,'player',0),b=unit('swain','enemy',0),c=unit('riven','enemy',1),ally=unit('mel','player',1);sc.playerActive=[a,ally];sc.enemyActive=[b,c];sc.hitFeedback=noOp;return {sc,a,b,c,ally};};
 // Field resources survive target replacement, never leak between casters, and consume after all targets.
 let {sc,a,b,c}=setup('katarina');
 await cast(sc,a,'katarina-bouncing-blade',b);
 await cast(sc,a,'katarina-preparation',a,'self');
 assert.equal(M.markStacks(c.champion.instanceId,'katarina-dagger',a.champion.instanceId,sc.mechanics),2);
 const before=[b.hp,c.hp]; await cast(sc,a,'katarina-shunpo',b);
 assert(b.hp<before[0]&&c.hp<before[1]);
 assert.equal(M.markStacks('', 'katarina-dagger', a.champion.instanceId,sc.mechanics),0);
 const katStats=a.stats,def=c.stats;
 const noDagger=B.resolveSkill(D.skill('katarina-shunpo'),1,katStats,def,{markStacksById:{'katarina-dagger':0}}).damage;
 const two=B.resolveSkill(D.skill('katarina-shunpo'),1,katStats,def,{markStacksById:{'katarina-dagger':2}}).damage;
 assert(two>noDagger*2);
 ({sc,a,b,c}=setup('xayah'));
 await cast(sc,a,'xayah-double-daggers',b);
 assert.equal(M.markStacks(c.champion.instanceId,'xayah-feather',a.champion.instanceId,sc.mechanics),2);
 const featherBefore=[b.hp,c.hp];await cast(sc,a,'xayah-bladecaller',b,'all-enemies');
 assert(b.hp<featherBefore[0]&&c.hp<featherBefore[1]);assert.equal(M.markStacks('', 'xayah-feather',a.champion.instanceId,sc.mechanics),0);
 // Realm is unerring, isolates both pairs, steals absolute stats, lasts cast+two actions, starts CD on exit.
 let ally;({sc,a,b,c,ally}=setup('mordekaiser'));
 const bBefore=b.hp;
 await cast(sc,a,'mordekaiser-realm-of-death',b);
 assert(M.inRealm(a.champion.instanceId,sc.mechanics)); assert(b.hp<bBefore,'Immediate storm pulse');
 assert.equal(T.initialize(a.champion,sc.tempo).cooldowns['mordekaiser-realm-of-death'],undefined);
 assert(!M.samePlane(a.champion.instanceId,c.champion.instanceId,sc.mechanics));
 assert(M.samePlane(ally.champion.instanceId,c.champion.instanceId,sc.mechanics));
 assert.deepEqual(sc.targetCandidates(a,'all-enemies').map(u=>u.champion.instanceId),[b.champion.instanceId]);
 assert(sc.targetCandidates(ally,'all-allies').every(u=>u!==a));
 const base=B.statsFor(a.champion),boost=M.applyStatBonuses(a.champion,base,sc.mechanics);assert(boost.power>base.power);assert.equal(boost.hp,base.hp);
 M.advanceRealmRound(sc.mechanics);
 await sc.finishDoubleTurn(a);assert(M.inRealm(a.champion.instanceId,sc.mechanics));
 assert.deepEqual(M.advanceRealmRound(sc.mechanics),[]);
 await sc.finishDoubleTurn(a);assert(M.inRealm(a.champion.instanceId,sc.mechanics));
 assert.deepEqual(M.advanceRealmRound(sc.mechanics),[a.champion.instanceId]);
 assert(!M.inRealm(a.champion.instanceId,sc.mechanics));
 ({sc,a,b,c}=setup('mordekaiser'));
 S.applyShield(sc.statusesFor(b),'ordinary','Escudo',10,2,'ordinary');
 assert(M.enterRealm(a.champion,b.champion,b.stats,sc.statusesFor(b),sc.mechanics),'Damage shield cannot prevent realm');
 M.reconcileRealms([],sc.mechanics);
 S.applySimpleStatus(sc.statusesFor(b),'block','spell','Escudo de hechizos',1,1,'test',undefined,true,{bloqueaHabilidades:true});
 assert(!M.enterRealm(a.champion,b.champion,b.stats,sc.statusesFor(b),sc.mechanics));assert(!sc.statusesFor(b).some(s=>s.id==='spell'));
 S.applySimpleStatus(sc.statusesFor(b),'shield','black','Escudo negro',1,1,'test',undefined,true,{inmuneControl:true});
 assert(!M.enterRealm(a.champion,b.champion,b.stats,sc.statusesFor(b),sc.mechanics));assert(sc.statusesFor(b).some(s=>s.id==='black'));
 // Reserve counts actual damage, caps at 30%, empties on W; failed Q doesn't advance storm.
 M.recordDamage(a.champion,99999,a.maxHp,sc.mechanics);assert.equal(M.initialize(a.champion,sc.mechanics).counters.reserve,a.maxHp*.3);
 M.initialize(a.champion,sc.mechanics).counters['storm-turns']=0; M.initialize(a.champion,sc.mechanics).counters['storm-turns']=0; await cast(sc,a,'mordekaiser-indestructible',a,'self');assert(sc.statusesFor(a).some(s=>s.id==='mordekaiser-reserve'));assert.equal(M.initialize(a.champion,sc.mechanics).counters.reserve,0);
 const store=M.createStore(),m=a.champion,q=D.skill('mordekaiser-obliterate');
 M.onActionResolved(m,{type:'skill',skillId:q.id},q,false,b.champion.instanceId,a.maxHp,store,{});assert.equal(M.initialize(m,store).counters['storm-hits'],undefined);
 // Draven charges affect Q only and ego requires attributed direct kills.
 ({sc,a,b,c}=setup('draven'));const ds=M.initialize(a.champion,sc.mechanics);ds.counters.axes=3;
 assert.equal(M.skillPowerMultiplier(a.champion,D.skill('draven-spinning-axe'),b.champion.instanceId,sc.mechanics,{}),1.45/.7);
 assert.equal(M.skillPowerMultiplier(a.champion,D.skill('draven-stand-aside'),b.champion.instanceId,sc.mechanics,{}),1);
 for(let i=0;i<4;i++)M.onDirectKnockout(a.champion,null,sc.mechanics);assert.equal(ds.counters.ego,3);
 b.hp=1;await cast(sc,a,'draven-whirling-death',b);assert.equal(b.hp,0);assert(c.hp<c.maxHp);
 M.clearOnKnockout(a.champion,sc.mechanics);assert.equal(M.initialize(a.champion,sc.mechanics).counters.ego,undefined);
 // Samira gates R, counts each action once, consumes 4–6 charges, does not apply passive bonus to R.
 ({sc,a,b,c}=setup('samira'));const ss=M.initialize(a.champion,sc.mechanics);
 T.initialize(a.champion,sc.tempo,true);assert(!M.canUseSkill(a.champion,D.skill('samira-inferno-trigger'),sc.tempo,sc.mechanics).allowed);
 ss.counters.style=6;assert(M.canUseSkill(a.champion,D.skill('samira-inferno-trigger'),sc.tempo,sc.mechanics).allowed);
 assert(Math.abs(M.outgoingSkill(a.champion,D.skill('samira-inferno-trigger'),sc.mechanics).effects[0].power-2.4)<1e-10);
 assert.equal(M.skillPowerMultiplier(a.champion,D.skill('samira-inferno-trigger'),b.champion.instanceId,sc.mechanics,{}),1);
 await cast(sc,a,'samira-inferno-trigger',b,'all-enemies');assert.equal(ss.counters.style,0);
 await cast(sc,a,'samira-blade-whirl',a,'self');assert.equal(M.incomingMultiplier(c.champion,a.champion,D.skill('riven-broken-wings'),sc.mechanics),.5);
 assert.equal(M.incomingMultiplier(b.champion,a.champion,D.skill('swain-vision-of-empire'),sc.mechanics),0);
 // Darius direct-R reset only; Rell steals cap and expire; Ambessa speed caps.
 ({sc,a,b,c}=setup('darius'));b.hp=1;await cast(sc,a,'darius-noxian-guillotine',b);assert.equal(T.initialize(a.champion,sc.tempo).cooldowns['darius-noxian-guillotine'],undefined);
 ({sc,a,b,c}=setup('rell'));for(let i=0;i<5;i++)M.targetEffects(a.champion,b.champion,D.skill('rell-shattering-strike'),1,a.stats,[],[],sc.mechanics);
 const original=B.statsFor(b.champion);assert.equal(M.applyStatBonuses(b.champion,original,sc.mechanics).defense,Math.round(original.defense*.7));
 for(let i=0;i<4;i++)M.finishTurn(a.champion,[],sc.mechanics,{});assert.deepEqual(M.applyStatBonuses(b.champion,original,sc.mechanics),original);
 ({sc,a,b,c}=setup('ambessa'));for(let i=0;i<9;i++)M.onActionResolved(a.champion,{type:'skill',skillId:'ambessa-cunning-sweep'},D.skill('ambessa-cunning-sweep'),true,b.champion.instanceId,a.maxHp,sc.mechanics,{});
 assert.equal(M.initialize(a.champion,sc.mechanics).counters.agility,5);

 // Run complete production individual actions too, with rendering and input replaced only.
 const single=fs.readFileSync('src/scenes/BattleScene.ts','utf8');
 const singleCode=single.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class BattleScene','class BattleScene');
 const SingleScene=new Function(...Object.keys(dependencies),stripTypeScriptTypes(singleCode,{mode:'strip'})+'\nreturn BattleScene;')(...Object.values(dependencies));
 const singleSetup=(id)=>{
  const one=new SingleScene(), registry=new Map(), hero=make(id),foe=make('swain');
  for(const [key,value] of Object.entries({forms:{},statuses:{},resources:{},tempo:T.createStore(),mechanics:M.createStore()}))registry.set('battle.'+key,value);
  Object.assign(one,{registry,playerChampion:hero,wildChampion:foe,playerHp:hero.currentHp,wildHp:foe.currentHp,playerHpUi:{},wildHpUi:{},
   wait:asyncNoOp,awaitContinue:asyncNoOp,refreshUi(){this.refreshCombatStats();},syncFormVisualAndHp:noOp,rebuildActions:noOp,finishVictory:asyncNoOp,handlePlayerKnockout:asyncNoOp,
   animateAction:asyncNoOp,hitFeedback:noOp,announceAppliedStatuses:asyncNoOp,setMessage:noOp});
  one.refreshCombatStats();return one;
 };
 const singleCast=async(one,id)=>{T.initialize(one.playerChampion,one.ensureTempoStore(),true).cooldowns={};await one.performAction('player',{type:'skill',skillId:id},true);};
 let one=singleSetup('katarina');
 await singleCast(one,'katarina-bouncing-blade');await singleCast(one,'katarina-preparation');
 assert.equal(M.markStacks('', 'katarina-dagger',one.playerChampion.instanceId,one.ensureMechanicsStore()),2);
 const priorHp=one.wildHp;await singleCast(one,'katarina-shunpo');assert(one.wildHp<priorHp);assert.equal(M.markStacks('', 'katarina-dagger',one.playerChampion.instanceId,one.ensureMechanicsStore()),0);
 one=singleSetup('mordekaiser');const prior=one.wildHp;await singleCast(one,'mordekaiser-realm-of-death');
 assert(one.wildHp<prior);assert(M.inRealm(one.playerChampion.instanceId,one.ensureMechanicsStore()));
 assert(one.playerStats.power>B.statsFor(one.playerChampion).power);
 one=singleSetup('draven');one.wildHp=1;await singleCast(one,'draven-whirling-death');assert.equal(one.wildHp,0);assert.equal(M.initialize(one.playerChampion,one.ensureMechanicsStore()).counters.ego,1);
 one=singleSetup('samira');M.initialize(one.playerChampion,one.ensureMechanicsStore()).counters.style=6;
 await singleCast(one,'samira-inferno-trigger');assert.equal(M.initialize(one.playerChampion,one.ensureMechanicsStore()).counters.style,0);
 one=singleSetup('ambessa');await singleCast(one,'ambessa-repudiation');assert(one.statusesFor(one.playerChampion).some(s=>s.kind==='shield'));
 one=singleSetup('darius');one.playerHp=10;await singleCast(one,'darius-decimate');assert(one.playerHp>10);assert(M.bleedDamage(one.wildChampion,one.ensureMechanicsStore())>0);
 one=singleSetup('rell');await singleCast(one,'rell-full-tilt');assert(one.statusesFor(one.wildChampion).some(s=>s.kind==='stun'));
 console.log('November kits: production single/double resolvers, field marks, realm isolation/expiry/protection, storm/reserve, ego/axes, style gate, direct resets, armor theft and speed caps OK.');
} finally {Math.random=previousRandom;await server.close();}
