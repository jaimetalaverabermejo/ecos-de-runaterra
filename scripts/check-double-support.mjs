import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
const originalRandom=Math.random;
try {
 const load=async(p,n)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[n];
 const D=await load('data/DataRegistry','DataRegistry'),B=await load('systems/combat/BattleEngine','BattleEngine'),S=await load('systems/combat/StatusEngine','StatusEngine'),T=await load('systems/combat/CombatTempoEngine','CombatTempoEngine'),M=await load('systems/combat/CombatMechanicsEngine','CombatMechanicsEngine'),F=await load('systems/combat/SpecialEffectEngine','SpecialEffectEngine'),P=await load('systems/progression/ProgressionService','ProgressionService'),Types=await load('systems/combat/TypeEffectivenessService','TypeEffectivenessService'),Art=await load('contenido/CatalogoContenido','CatalogoContenido');
 const {defaultSkillTarget}=await server.ssrLoadModule('/src/systems/combat/BattleFormat.ts');
 const noop=()=>{},asyncNoop=async()=>{};Math.random=()=>.5;
 const buttons=[];const uiNode=()=>({destroy(){},setOrigin(){return this;},setDepth(){return this;},setStrokeStyle(){return this;},setInteractive(){return this;},disableInteractive(){return this;},on(){return this;}});
 const dependencies={UI:{font:{family:'sans-serif'},text:{gold:'#fff'}},UiKit:{button:(_scene,_x,_y,_w,_h,label,activate)=>{buttons.push({label,activate});return {button:uiNode(),label:uiNode()};}},defaultSkillTarget,Phaser:{Scene:class{},Input:{Events:{POINTER_UP:'pointerup'}},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}},DataRegistry:D,BattleEngine:B,StatusEngine:S,CombatTempoEngine:T,CombatMechanicsEngine:M,SpecialEffectEngine:F,ProgressionService:P,TypeEffectivenessService:Types,CatalogoContenido:Art,pulseCombatEvent:noop,playCombatVfx:asyncNoop,playCombatVfxGroup:asyncNoop,skillVfx:()=>({}),formatProgressionGain:()=>''};
 const code=fs.readFileSync('src/scenes/DoubleBattleScene.ts','utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class DoubleBattleScene','class DoubleBattleScene');
 const Scene=new Function(...Object.keys(dependencies),stripTypeScriptTypes(code,{mode:'strip'})+'\nreturn DoubleBattleScene;')(...Object.values(dependencies));
 let serial=0;const unit=(id,side,slot)=>{const champion={instanceId:id+'-'+serial++,championId:id,mastery:20,masteryExperience:0,skillRanks:{q:3,w:3,e:3,r:2},unspentSkillPoints:0,currentHp:1,runeTraits:[],equippedItems:[]};const stats=B.statsFor(champion);champion.currentHp=stats.hp;return {champion,side,slot,hp:stats.hp,maxHp:stats.hp,stats};};
 const make=kind=>{const sc=new Scene();Object.assign(sc,{forms:{},resources:{},statuses:{},tempo:T.createStore(),mechanics:M.createStore(),playerReserves:[],enemyReserves:[],session:{kind,persistPlayerState:false},wait:asyncNoop,awaitContinue:asyncNoop,setMessage:noop,beginTurn:async()=>true,refreshAllUi(){for(const u of [...this.playerActive,...this.enemyActive]){u.stats=S.effectiveStats(B.statsFor(u.champion,F.formId(u.champion,this.forms)),this.statusesFor(u));u.maxHp=u.stats.hp;u.hp=Math.min(u.hp,u.maxHp);}},refreshCombatantUi:noop});return sc;};
 const r=D.skill('lulu-wild-growth');assert.equal(r.selectionTarget,'any-ally');
 for(const kind of ['duel','showdown','sandbox'])for(const onSelf of [true,false])for(const side of ['player','enemy']){
  const sc=make(kind),lulu=unit('lulu',side,0),buddy=unit('zed',side,1),foes=[unit('garen',side==='player'?'enemy':'player',0),unit('teemo',side==='player'?'enemy':'player',1)];
  sc.playerActive=side==='player'?[lulu,buddy]:foes;sc.enemyActive=side==='enemy'?[lulu,buddy]:foes;
  for(const u of [...sc.playerActive,...sc.enemyActive])sc.initializeCombatant(u,true);
  const target=onSelf?lulu:buddy,other=onSelf?buddy:lulu;target.hp-=50;const before=target.hp,otherHp=other.hp,baseMax=target.maxHp;
  assert.deepEqual(sc.targetCandidates(lulu,sc.skillTargetMode(r)).map(u=>u.champion.instanceId),[lulu.champion.instanceId,buddy.champion.instanceId]);
  await sc.resolveTurnEntry(lulu,{action:{type:'skill',skillId:r.id},targetMode:'any-ally',targetInstanceIds:[target.champion.instanceId]});
  assert(target.hp>before,kind+': chosen ally healed');assert.equal(other.hp,otherHp);assert.equal(target.maxHp,Math.round(baseMax*1.3));
  assert.equal(S.visualScale(sc.statusesFor(target)),1.45);assert.equal(S.visualScale(sc.statusesFor(other)),1);
  assert(sc.statusesFor(foes[target.slot]).some(s=>s.kind==='stun'));assert(!sc.statusesFor(target).some(s=>s.kind==='stun'));
  const fakeImage={width:320,height:320,setOrigin(){return this;},setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;},setDepth(){return this;}};
  let drawnY;sc.add={image:(_x,y)=>{drawnY=y;return fakeImage;}};sc.playerBattleTexture=()=> 'back';sc.enemyBattleTexture=()=> 'front';
  sc.createCombatVisual(target,0,0,1);const normal=side==='player'?186:173;assert(Math.abs(fakeImage.displayWidth-normal*1.45)<.01);assert(Math.abs(drawnY-(side==='player'?0:normal*.45))<.001);
  for(let i=0;i<3;i++)S.advanceTurn(sc.statusesFor(target));assert.equal(S.visualScale(sc.statusesFor(target)),1);sc.createCombatVisual(target,0,0,1);assert.equal(fakeImage.displayWidth,normal);
 }
 // 1v1 fallback still grows/heals Lulu and never grows the opposing champion.
 const own=[],opponent=[];S.applySkillEffects(r,1,own,opponent,true);assert.equal(S.visualScale(own),1.45);assert.equal(S.visualScale(opponent),1);assert(opponent.some(s=>s.kind==='stun'));
 const sc=make('sandbox'),lulu=unit('lulu','player',0),foe=unit('garen','enemy',0);sc.playerActive=[lulu];sc.enemyActive=[foe];
 // Preview is always calculated for that candidate, including transformed types.
 for(const target of [unit('garen','enemy',0),unit('teemo','enemy',1)]){
  const action={type:'skill',skillId:'lulu-glitterlance'},preview=sc.targetEffectiveness(lulu,action,target),result=Types.forSkill(D.skill(action.skillId),target.champion);
  assert(preview.text.includes(result.multiplier.toFixed(2).replace('.',',')));const glyph=Types.actionGlyph(result);if(glyph)assert(preview.text.includes(glyph));
 }
 // Group confirmation previews both foes and still commits BOTH, never just a clicked card.
 const texts=[];sc.add={rectangle:uiNode,text:(_x,_y,text)=>{texts.push(text);return uiNode();},container:uiNode};let committed;
 sc.commitPlayerChoice=(_actor,_action,_mode,ids)=>{committed=ids;};sc.targetLayer=undefined;
 const enemies=[unit('garen','enemy',0),unit('teemo','enemy',1)];
 sc.showTargetPicker(lulu,{type:'skill',skillId:'lulu-glitterlance'},'all-enemies',enemies);
 assert.equal(texts.filter(t=>t.includes(' · ×')).length,2);assert(buttons.some(b=>b.label==='CONFIRMAR TODOS'));
 buttons.find(b=>b.label==='CONFIRMAR TODOS').activate();assert.deepEqual(committed,enemies.map(e=>e.champion.instanceId));
 const zedNpcs=D.npcs().filter(n=>n.championId==='zed');assert(zedNpcs.length>0);for(const n of zedNpcs)assert.equal(n.overworldScale,.8512);
 assert.equal(Art.visualOverworld('zed').overworldScale,.8512);
 console.log('Lulu chooses self/partner on either side in adventure/Showdown/sandbox; selected healing, 45% visual growth and expiry, one-opponent stun, 1v1 fallback, per-target affinity preview and +12% overworld Zed: OK.');
}finally{Math.random=originalRandom;await server.close();}
