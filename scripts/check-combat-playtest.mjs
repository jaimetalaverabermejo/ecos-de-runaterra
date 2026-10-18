import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try {
 const load=async(p,n)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[n];
 const D=await load('data/DataRegistry','DataRegistry'),M=await load('systems/combat/CombatMechanicsEngine','CombatMechanicsEngine');
 const T=await load('systems/combat/CombatTempoEngine','CombatTempoEngine'),S=await load('systems/combat/StatusEngine','StatusEngine');
 const B=await load('systems/combat/BattleEngine','BattleEngine'),P=await load('systems/progression/ProgressionService','ProgressionService');
 const {equipmentSlots}=await server.ssrLoadModule('/src/systems/build/EquipmentSlots.ts');
 const champion=(id,level=16,items=[])=>({instanceId:id,championId:id,mastery:level,masteryExperience:0,skillRanks:P.defaultSkillRanks(level),unspentSkillPoints:0,currentHp:500,runeTraits:[],equippedItems:items});
 assert.deepEqual(D.validate(),[]);
 const world=fs.readFileSync('src/scenes/WorldScene.ts','utf8');
 const factoryStart=world.indexOf('  private createDuelChampion('),factoryEnd=world.indexOf('  private openNpcShop(',factoryStart);
 assert(factoryStart>0&&factoryEnd>factoryStart);
 const Factory=new Function('ProgressionService','BattleEngine',stripTypeScriptTypes('class Factory {\n'+world.slice(factoryStart,factoryEnd)+'\n}',{mode:'strip'})+'\nreturn Factory;')(P,B);
 const factory=new Factory();
 // Actual equipment calculations, not just the presence of IDs in authored JSON.
 const gearStats={};
 for(const id of ['gnar-cave-boss','ionia-lee-trial','ionia-jhin-unmasking','ionia-forest-ivern','ionia-forest-refuge','ionia-irelia-unlock']) {
  for(const e of D.duel(id).team){
   assert(e.equippedItems.length>0);assert(e.equippedItems.length<=equipmentSlots({mastery:e.mastery}));
   const opponent=factory.createDuelChampion(e);
   assert.deepEqual(opponent.equippedItems,e.equippedItems);
   const naked=B.statsFor(champion(e.championId,e.mastery),e.formId),equipped=B.statsFor(opponent,e.formId);
   assert.equal(opponent.currentHp,equipped.hp,'Boss starts with its equipped maximum HP');
   assert(Object.keys(naked).some(k=>equipped[k]>naked[k]),id);gearStats[e.championId]={naked,equipped};
  }
 }
 assert.equal(gearStats.xayah.equipped.attack-gearStats.xayah.naked.attack,12);
 assert.equal(gearStats.xayah.equipped.speed-gearStats.xayah.naked.speed,19);
 assert.equal(gearStats.rakan.equipped.power-gearStats.rakan.naked.power,34);
 assert.equal(gearStats.rakan.equipped.hp-gearStats.rakan.naked.hp,50);
 // Run the same status/cooldown ticking orders as singles and doubles, for two cycles.
 for(const protectCastTurn of [true,false]){
  const lulu=champion('lulu',14),tempo=T.createStore(),statuses=[],r=D.skill('lulu-wild-growth');T.initialize(lulu,tempo,true);
  assert.equal(T.cooldownTurns(r),6);
  for(let cycle=0;cycle<2;cycle++){
   assert(T.canUseSkill(lulu,r,tempo).allowed);const applied=S.applySkillEffects(r,1,statuses,[]);T.startSkillCooldown(lulu,r,tempo);
   S.advanceTurn(statuses,protectCastTurn?applied.selfAppliedIds:[]);T.finishTurn(lulu,tempo);
   let gap=0;
   for(let turn=0;turn<6;turn++){
    const grown=statuses.some(s=>s.id==='wild-growth-hp');
    assert(!T.canUseSkill(lulu,r,tempo).allowed,'Cannot renew growth before a real cooldown interval');
    if(!grown)gap++;
    S.advanceTurn(statuses);T.finishTurn(lulu,tempo);
   }
   assert(gap>=3,'At least three turns outside growth between casts');assert(!statuses.some(s=>s.id==='wild-growth-hp'));
  }
 }
 const wukong=champion('wukong'),cloneSkill=D.skill('wukong-w'),aoe=D.skill('rumble-equalizer');
 const summon=(owner=wukong,skill=cloneSkill)=>{const store=M.createStore();M.onActionResolved(owner,{type:'skill',skillId:skill.id},skill,true,'enemy',400,store,{});return store;};
 let store=summon();let hit=M.interceptDamage(wukong,40,store,{skill:aoe});assert.equal(hit.ownerDamage,40);assert.equal(hit.intercepted,0);assert.equal(hit.areaSummonDamage,40);assert.equal(M.summon(wukong,store).hp,60);
 hit=M.interceptDamage(wukong,100,store,{skill:aoe});assert.equal(hit.ownerDamage,100);assert(hit.summonBroken);assert(!M.summon(wukong,store));
 store=summon();hit=M.interceptDamage(wukong,40,store);assert(hit.ownerDamage<40);assert(hit.intercepted>0);assert(!hit.areaSummonDamage);
 store=summon();hit=M.interceptDamage(wukong,40,store,{skill:D.skill('wukong-q')});assert(hit.intercepted>0,'An individual hit still goes into the clone');
 const ivern=champion('ivern'),daisyStore=summon(ivern,D.skill('ivern-daisy'));assert(M.interceptDamage(ivern,40,daisyStore,{skill:aoe}).intercepted>0,'Do not silently change Daisy protection');
 // Execute the production 1v1 and 2v2 damage-packet blocks, with real engines.
 const single=fs.readFileSync('src/scenes/BattleScene.ts','utf8');
 const start=single.indexOf('    const directBlock = resolution.damage > 0 ?');const end=single.indexOf("    if (actor === 'player') this.wildHp",start);assert(start>=0&&end>start);
 const runSingle=new Function('CombatMechanicsEngine','StatusEngine','SpecialEffectEngine','defender','resolution','defenderStatuses','mechanics','skill',stripTypeScriptTypes(single.slice(start,end),{mode:'strip'})+'\nreturn {actualDamage,areaSummonDamage,interceptedDamage};');
 const context={ensureResourceStore:()=>({}),ensureFormStore:()=>({})};
 for(const skill of [aoe,null]){store=summon();const result=runSingle.call(context,M,S,{onDamageTaken(){}},wukong,{damage:30,damageInstances:[10,10,10]},[],store,skill);assert.equal(result.actualDamage,skill?30:0);assert.equal(M.summon(wukong,store).hp,70);assert.equal(result.areaSummonDamage,skill?30:0);}
 const double=fs.readFileSync('src/scenes/DoubleBattleScene.ts','utf8');const a=double.indexOf('          for (const instance of instances) {'),z=double.indexOf('\n      let shieldExplosionDamage',a);assert(a>0&&z>a);
 const body=double.slice(a,z).replace(/\s*}\s*}\s*$/,'');
 const runDouble=new Function('CombatMechanicsEngine','StatusEngine','SpecialEffectEngine','target','instances','skill', 'let directBlock=null,interceptedDamage=0,areaSummonDamage=0,summonName,summonBroken=false,dealtDamage=0,absorbedDamage=0;const brokenShields=[],damagedTargets=new Set(),defeatedBySequence=new Set();'+body+'\nreturn {dealtDamage,areaSummonDamage};');
 for(const skill of [aoe,null]){store=summon();const target={champion:{...wukong},hp:400};const result=runDouble.call({mechanics:store,statusesFor:()=>[],resources:{},forms:{}},M,S,{onDamageTaken(){}},target,[10,10,10],skill);assert.equal(result.dealtDamage,skill?30:0);assert.equal(target.hp,skill?370:400);assert.equal(result.areaSummonDamage,skill?30:0);}
 console.log('Boss loadouts affect real stats; Lulu has a real growth-free interval; Wukong AoE damages both, individual hits still intercepted; actual single/double packet paths: OK.');
 console.log(JSON.stringify({xayah:gearStats.xayah,rakan:gearStats.rakan}));
} finally {await server.close();}
