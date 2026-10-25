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
 assert.deepEqual(D.validate(),[]);Math.random=()=>.5;
 const swain=make('swain',['ruby-crystal']),mel=make('mel'),riven=make('riven');
 assert(D.echoes().some(e=>e.id==='swain')&&D.echoes().some(e=>e.id==='mel')&&D.echoes().some(e=>e.id==='riven'));
 assert(B.statsFor(swain).hp>B.statsFor(mel).hp);assert(B.statsFor(mel).speed>B.statsFor(swain).speed);assert(B.statsFor(riven).attack>B.statsFor(swain).attack);
 for(const id of ['swain','mel','riven'])assert.equal(Art.assetsCampeones().filter(a=>a.championId===id).length,4);
 // The transform includes item HP and never changes persistent base statistics.
 const naked=B.statsFor(swain),forms={};F.applyTransformation(swain,D.skill('swain-demonic-ascension'),{},forms);
 assert.equal(B.statsFor(swain,'demonic-ascension').hp,Math.round(naked.hp*1.4));assert.deepEqual(B.statsFor(swain),naked);
 assert.equal(M.fragmentHealing(swain,D.skill('swain-vision-of-empire'),200),10);
 assert.equal(M.fragmentHealing(swain,D.skill('swain-deaths-hand'),200),0);
 // Three hits share the total scaling; the third hit is stronger, not three full-power casts.
 const q=D.skill('riven-broken-wings'),qr=B.resolveSkill(q,1,B.statsFor(riven),B.statsFor(mel));
 assert.equal(qr.damageInstances.length,3);assert(qr.damageInstances[2]>qr.damageInstances[0]);
 const mechanics=M.createStore();for(let i=0;i<6;i++)M.onActionResolved(riven,{type:'skill',skillId:q.id},q,true,mel.instanceId,200,mechanics,{});
 assert.equal(M.initialize(riven,mechanics).counters['runic-blade'],3);assert.equal(M.basicAttackMultiplier(riven,mechanics),1.3);
 M.onActionResolved(riven,{type:'basic'},null,false,mel.instanceId,200,mechanics,{});assert.equal(M.initialize(riven,mechanics).counters['runic-blade'],3);
 M.onActionResolved(riven,{type:'basic'},null,true,mel.instanceId,200,mechanics,{});assert.equal(M.initialize(riven,mechanics).counters['runic-blade'],2);
 // Mel Q's three packets still apply just one mark; stacks cap at three and R consumes them.
 const mq=D.skill('mel-radiant-volley'),mr=D.skill('mel-golden-eclipse');
 for(let i=0;i<4;i++)M.onActionResolved(mel,{type:'skill',skillId:mq.id},mq,true,riven.instanceId,200,mechanics,{});
 assert.equal(M.markStacks(riven.instanceId,'mel-dazzle',mel.instanceId,mechanics),3);
 const markStacksById=M.markStacksById(mel,riven.instanceId,mr,mechanics,{});
 const empty=B.resolveSkill(mr,1,B.statsFor(mel),B.statsFor(riven),{defenderCurrentHp:20,defenderMaxHp:200,markStacksById:{}});assert.equal(empty.damage,0);
 const high=B.resolveSkill(mr,1,B.statsFor(mel),B.statsFor(riven),{defenderCurrentHp:190,defenderMaxHp:200,markStacksById});
 const low=B.resolveSkill(mr,1,B.statsFor(mel),B.statsFor(riven),{defenderCurrentHp:20,defenderMaxHp:200,markStacksById});assert(low.damage>high.damage);
 M.onActionResolved(mel,{type:'skill',skillId:mr.id},mr,true,riven.instanceId,200,mechanics,{});assert.equal(M.markStacks(riven.instanceId,'mel-dazzle',mel.instanceId,mechanics),0);
 // Mirror is not an ordinary block: basics don't consume it and it cannot reflect a reflection recursively.
 const mirror=D.skill('mel-rebuttal'),statuses=[];S.applySkillEffects(mirror,1,statuses,[]);
 assert.equal(S.consumeDirectBlock(statuses),null);assert.equal(M.consumeReflection(statuses,null),null);assert.equal(statuses.length,1);
 const reflected=M.consumeReflection(statuses,D.skill('swain-nevermove'));assert(reflected);assert.equal(statuses.length,0);assert.equal(M.consumeReflection(statuses,reflected),null);
 const returnStatuses=[];S.applySkillEffects(reflected,1,[],returnStatuses);assert(returnStatuses.some(s=>s.kind==='stun'));
 S.applySkillEffects(mirror,1,statuses,[]);M.expireReflection(statuses);assert.equal(statuses.length,0);
 // Riven R's recast shares cooldown; consuming/expiring the window cannot reset the base R.
 const rr=D.skill('riven-blade-of-the-exile'),wind=D.skill('riven-wind-slash');assert.equal(T.cooldownKey(rr),T.cooldownKey(wind));
 const rstore=M.createStore(),tempo=T.createStore();M.onActionResolved(riven,{type:'skill',skillId:rr.id},rr,true,riven.instanceId,200,rstore,{});
 assert(M.skillIds(riven,{},rstore).includes('riven-wind-slash'));M.onActionResolved(riven,{type:'skill',skillId:wind.id},wind,true,mel.instanceId,200,rstore,{});
 T.startSkillCooldown(riven,wind,tempo);assert(!T.canUseSkill(riven,rr,tempo).allowed);
 // Exercise the production 2v2 turn resolver, with rendering replaced by deterministic no-ops.
 const Phaser={Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}};
 const noOp=()=>{},asyncNoOp=async()=>{};
 const defaultSkillTarget=await load('systems/combat/BattleFormat','defaultSkillTarget');
 const dependencies={defaultSkillTarget,Phaser,DataRegistry:D,BattleEngine:B,CombatMechanicsEngine:M,CombatTempoEngine:T,StatusEngine:S,SpecialEffectEngine:F,ProgressionService:P,TypeEffectivenessService:Types,pulseCombatEvent:noOp,playCombatVfx:asyncNoOp,playCombatVfxGroup:asyncNoOp,skillVfx:()=>({}),formatProgressionGain:()=>''};
 const code=fs.readFileSync('src/scenes/DoubleBattleScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class DoubleBattleScene','class DoubleBattleScene');
 const Scene=new Function(...Object.keys(dependencies),stripTypeScriptTypes(code,{mode:'strip'})+'\nreturn DoubleBattleScene;')(...Object.values(dependencies));
 const create=()=>{const sc=new Scene();Object.assign(sc,{forms:{},resources:{},statuses:{},tempo:T.createStore(),mechanics:M.createStore(),playerReserves:[],enemyReserves:[],session:{kind:'sandbox',persistPlayerState:false},wait:asyncNoOp,awaitContinue:asyncNoOp,setMessage:noOp,beginTurn:async()=>true,refreshAllUi(){for(const u of [...this.playerActive,...this.enemyActive]){u.stats=S.effectiveStats(B.statsFor(u.champion,F.formId(u.champion,this.forms)),this.statusesFor(u));u.maxHp=u.stats.hp;u.hp=Math.min(u.hp,u.maxHp);}},refreshCombatantUi:noOp});return sc;};
 const unit=(id,side,slot)=>{const c=make(id);return {champion:c,side,slot,hp:c.currentHp,maxHp:c.currentHp,stats:B.statsFor(c)};};
 // Temporary companions select exactly one autonomous action and never consume owned reserves.
 for (const id of ['irelia','riven']) {
  const scene=create(), owned=unit('teemo','player',0), companion=unit(id,'player',1);
  scene.session.aiAlly=companion.champion;scene.playerActive=[owned,companion];scene.enemyActive=[unit('swain','enemy',0),unit('noxus-commander','enemy',1)];
  scene.initializeCombatant(owned);scene.initializeCombatant(companion);
  let selectedActor;scene.renderActionUi=(actor,total)=>{selectedActor=actor;assert.equal(total,1);};scene.selectionIndex=0;scene.selectNextPlayerAction();assert.equal(selectedActor,owned);
  assert(scene.participantIds.has(owned.champion.instanceId));assert(!scene.participantIds.has(companion.champion.instanceId));
  T.initialize(companion.champion,scene.tempo).turnsCompleted=2;
  let choices=scene.companionChoices();assert.equal(choices.length,1);assert.equal(choices[0].actorInstanceId,companion.champion.instanceId);
  assert.equal(choices[0].action.skillId,id==='irelia'?'irelia-vanguards-edge':'riven-blade-of-the-exile');
  companion.hp=1;choices=scene.companionChoices();assert.equal(choices[0].action.skillId,id==='irelia'?'irelia-defiant-dance':'riven-valor');
  const reserve=make('mel');scene.playerReserves=[reserve];companion.hp=0;scene.renderCombatants=()=>{};
  await scene.handleKnockouts();assert.equal(scene.playerReserves.length,1);assert.equal(scene.companionChoices().length,0);
  owned.hp=0;await scene.handleKnockouts();assert.equal(scene.playerActive[0].champion.instanceId,reserve.instanceId);assert.equal(scene.playerActive[1].hp,0);
  scene.playerActive[0].hp=0;companion.hp=10;let defeat=false;scene.finishDefeat=async()=>{defeat=true;};await scene.handleKnockouts();assert(defeat,'A companion cannot continue without any owned Echo');
 }
 let sc=create(),attacker=unit('swain','player',0),victim=unit('mel','enemy',0),other=unit('teemo','enemy',1);
 sc.playerActive=[attacker];sc.enemyActive=[victim,other];
 S.applySkillEffects(mirror,1,sc.statusesFor(victim),[]);const initialMel=victim.hp,initialOther=other.hp,initialAttacker=attacker.hp;
 await sc.resolveTurnEntry(attacker,{action:{type:'skill',skillId:'swain-vision-of-empire'},targetMode:'all-enemies',targetInstanceIds:[victim.champion.instanceId,other.champion.instanceId]});
 assert.equal(victim.hp,initialMel,'Only Mel is protected by the mirror');assert(other.hp<initialOther,'The other AoE target must still take damage');assert(attacker.hp<initialAttacker,'The caster receives the reflection');assert(sc.statusesFor(attacker).some(s=>s.stat==='speed'));
 // Casting W in the actual double resolver leaves the mirror armed after Mel's own cast turn.
 sc=create();attacker=unit('mel','player',0);other=unit('teemo','enemy',0);sc.playerActive=[attacker];sc.enemyActive=[other];
 await sc.resolveTurnEntry(attacker,{action:{type:'skill',skillId:mirror.id},targetMode:'self',targetInstanceIds:[attacker.champion.instanceId]});assert(sc.statusesFor(attacker).some(s=>s.id==='mel-mirror'));
 // Actual Swain R grants the full delta, drains every enemy exactly three times, then clamps to base HP.
 sc=create();attacker=unit('swain','player',0);victim=unit('teemo','enemy',0);other=unit('poppy','enemy',1);sc.playerActive=[attacker];sc.enemyActive=[victim,other];
 T.initialize(attacker.champion,sc.tempo,true);const base=attacker.maxHp;attacker.hp=40;const before=[victim.hp,other.hp];
 await sc.resolveTurnEntry(attacker,{action:{type:'skill',skillId:'swain-demonic-ascension'},targetMode:'self',targetInstanceIds:[attacker.champion.instanceId]});
 assert.equal(attacker.maxHp,Math.round(base*1.4));assert(attacker.hp>=40+attacker.maxHp-base);assert(victim.hp<before[0]&&other.hp<before[1]);assert.equal(sc.forms[attacker.champion.instanceId].remainingTurns,2);
 await sc.finishDoubleTurn(attacker);await sc.finishDoubleTurn(attacker);assert(!sc.forms[attacker.champion.instanceId]);assert.equal(attacker.maxHp,base);assert(attacker.hp<=base);
 const after=[victim.hp,other.hp];await sc.finishDoubleTurn(attacker);assert.deepEqual([victim.hp,other.hp],after,'No fourth drain pulse');
 // Real Riven turn resolution grants a charge per cast and consumes it on a subsequent basic hit.
 sc=create();attacker=unit('riven','player',0);victim=unit('swain','enemy',0);sc.playerActive=[attacker];sc.enemyActive=[victim];
 await sc.resolveTurnEntry(attacker,{action:{type:'skill',skillId:q.id},targetMode:'enemy',targetInstanceIds:[victim.champion.instanceId]});assert.equal(M.initialize(attacker.champion,sc.mechanics).counters['runic-blade'],1);
 await sc.resolveTurnEntry(attacker,{action:{type:'basic'},targetMode:'enemy',targetInstanceIds:[victim.champion.instanceId]});assert.equal(M.initialize(attacker.champion,sc.mechanics).counters['runic-blade'],0);
 // The real double selector exposes basics and lets the player choose either target.
 sc=create();attacker=unit('riven','player',0);victim=unit('swain','enemy',0);other=unit('mel','enemy',1);sc.playerActive=[attacker];sc.enemyActive=[victim,other];
 let picker;sc.showTargetPicker=(...args)=>{picker=args;};sc.selectBasicAttack(attacker);assert.equal(picker[1].type,'basic');assert.equal(picker[3].length,2);
 M.initialize(attacker.champion,sc.mechanics).counters['runic-blade']=2;assert.equal(sc.chooseEnemyAction(attacker).type,'basic');
 // Actual single-battle reflection branch: damage and stun return without applying either to Mel.
 const single=fs.readFileSync('src/scenes/BattleScene.ts','utf8'),a=single.indexOf('    const reflected = defender.championId'),z=single.indexOf('    const directBlock = resolution.damage',a);
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const reflectSingle=new AsyncFunction('BattleEngine','CombatMechanicsEngine','StatusEngine','CombatTempoEngine','attacker','defender','skill','attackerStats','attackerStatuses','defenderStatuses','mechanics','forms','tempo','attackerMaxHpBefore',`const resources={},SpecialEffectEngine=this.SpecialEffectEngine,actor='player',action={type:'skill',skillId:skill.id},rank=1,attackerName='Swain',defenderName='Mel';\n`+single.slice(a,z));
 const state={SpecialEffectEngine:F,playerHp:150,wildHp:150,refreshUi:noOp,finishVictory:asyncNoOp,handlePlayerKnockout:asyncNoOp,finishActorTurn:asyncNoOp,awaitContinue:asyncNoOp};
 const ms=[];S.applySkillEffects(mirror,1,ms,[]);const ss=[];
 await reflectSingle.call(state,B,M,S,T,swain,mel,D.skill('swain-nevermove'),B.statsFor(swain),ss,ms,M.createStore(),{},T.createStore(),B.statsFor(swain).hp);
 assert.equal(state.wildHp,150);assert(state.playerHp<150);assert(ss.some(s=>s.kind==='stun'));assert(!ms.some(s=>s.kind==='stun'));

 // Run the actual single-battle form/HP and turn-finish methods as well.
 const singleCode=single.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class BattleScene','class BattleScene');
 const SingleScene=new Function(...Object.keys(dependencies),stripTypeScriptTypes(singleCode,{mode:'strip'})+'\nreturn BattleScene;')(...Object.values(dependencies));
 const one=new SingleScene(),singleForms={},registry=new Map();
 const hero=make('swain'),foe=make('poppy');const normalMax=B.statsFor(hero).hp;
 registry.set('battle.forms',singleForms);registry.set('battle.statuses',{});registry.set('battle.resources',{});registry.set('battle.tempo',T.createStore());registry.set('battle.mechanics',M.createStore());
 Object.assign(one,{registry,playerChampion:hero,wildChampion:foe,playerHp:40,wildHp:500,playerHpUi:{},wildHpUi:{},playerSprite:{setTexture:noOp},wildSprite:{setTexture:noOp},textures:{exists:()=>true},wait:asyncNoOp,awaitContinue:asyncNoOp,refreshUi:noOp,syncCombatantVisual:noOp,rebuildActions:noOp,finishVictory:asyncNoOp,handlePlayerKnockout:asyncNoOp});
 F.applyTransformation(hero,D.skill('swain-demonic-ascension'),{},singleForms);one.syncFormVisualAndHp('player',normalMax);
 assert.equal(one.playerHp,40+Math.round(normalMax*1.4)-normalMax);
 await one.finishActorTurn('player',[],true);assert.equal(singleForms[hero.instanceId].remainingTurns,2);
 await one.finishActorTurn('player');await one.finishActorTurn('player');assert(!singleForms[hero.instanceId]);assert(one.playerHp<=normalMax);
 const enemyHp=one.wildHp;await one.finishActorTurn('player');assert.equal(one.wildHp,enemyHp);
 // Actual individual action-menu wiring makes Riven's passive usable, rather than engine-only.
 one.playerChampion=riven;one.wildChampion=mel;let basicOption,chosen;
 Object.assign(one,{createSkillActionButton:noOp,createSideActionButton:noOp,createWaitActionButton(x,y,activate,disabled,label){if(label==='BÁSICO')basicOption={x,y,activate,disabled};},availableReplacements:()=>[],inventoryItems:()=>[],isNpcDuel:()=>true,handleCombatAction(action){chosen=action;}});
 one.createActions();assert(basicOption&&!basicOption.disabled);basicOption.activate();assert.equal(chosen.type,'basic');assert.equal(basicOption.x,718);
 one.wildChampion=riven;M.initialize(riven,one.ensureMechanicsStore()).counters['runic-blade']=2;assert.equal(one.chooseEnemyAction().type,'basic');
 assert.equal(D.combatants().length,7);for(const c of D.combatants())assert.equal(c.skillIds.length,c.id==='noxus-commander'?3:2);
 console.log('Swain/Mel/Riven: role-based stats, item-aware temporary HP, exactly three AoE drain pulses, one-reflection protection/CC/AoE isolation, marks/finisher, weighted triple Q, charges and shared R cooldown; actual single/double production paths: OK.');
} finally { Math.random=previousRandom;await server.close(); }
