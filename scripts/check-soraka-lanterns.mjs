import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true}});
try{
 const load=async(p,n)=>(await server.ssrLoadModule('/src/'+p+'.ts'))[n];
 const D=await load('data/DataRegistry','DataRegistry'),SanctuaryService=await load('systems/sanctuary/SanctuaryService','SanctuaryService');
 const {createNewGame}=await server.ssrLoadModule('/src/state/GameState.ts');
 const BattleEngine=await load('systems/combat/BattleEngine','BattleEngine'),SaveService=await load('systems/save/SaveService','SaveService');
 const source=fs.readFileSync('src/scenes/WorldScene.ts','utf8');
 const start=source.indexOf('  private useTiledSanctuary('),end=source.indexOf('  private createStoryMarker(',start);
 const Factory=new Function('SanctuaryService','SaveService','DataRegistry',stripTypeScriptTypes('class F {\n'+source.slice(start,end)+'\n}',{mode:'strip'})+'\nreturn F;')(SanctuaryService,{save:s=>assert(SaveService.deserializeSave(JSON.stringify(s)))},D);
 let count=0;
 for(const map of D.maps().filter(m=>/^jo(09|10|11|12|13)_/.test(m.id))){
  const j=JSON.parse(fs.readFileSync('public/'+map.tiled.url.replace('./',''),'utf8'));
  const lanterns=j.layers.filter(l=>l.name==='HealingLanterns');
  const interactions=j.layers.find(l=>l.name==='Interactions').objects.filter(o=>o.properties.some(p=>p.name==='action'&&p.value==='heal_ecos'));
  assert.equal(lanterns.length,interactions.length);assert.equal(lanterns.length,map.id==='jo09_forest_landing'?2:1);
  const tileset=j.tilesets.find(t=>t.name==='Soraka_Curacion_32x32');assert(tileset);assert.equal(tileset.tilecount,24);
  for(const l of lanterns)assert.deepEqual(l.data.filter(Boolean).map(g=>g-tileset.firstgid),[2,3,8,9]);
  for(const z of j.layers.find(l=>l.name==='Zones').objects){const p=Object.fromEntries(z.properties.map(p=>[p.name,p.value]));if(p.action==='sanctuary'){assert.equal(p.healEchos,false);assert.equal(p.setCheckpoint,false);}}
  for(const o of interactions){
   const p=Object.fromEntries(o.properties.map(p=>[p.name,p.value]));assert.equal(p.requiresInteract,true);
   const f=new Factory(),s=createNewGame();s.currentMapId=map.id;s.gold=777;s.worldProgress.flags.push('lantern-save-test');
   s.party.push({instanceId:'party-test',championId:'lulu',mastery:10,masteryExperience:0,skillRanks:{Q:1,W:1,E:1,R:1},unspentSkillPoints:0,currentHp:1,runeTraits:[],equippedItems:[]});
   s.storage.push({...s.party[0],instanceId:'stored-test'});for(const c of [...s.party,...s.storage])c.currentHp=1;
   f.save=s;f.player={x:o.x+16,y:o.y+12,body:{setVelocity(){}}};f.playerVisual={anims:{stop(){}}};
   f.beginWorldDialogue=d=>assert.equal(d.id,'soraka-healing-lantern');
   f.useTiledSanctuary({id:o.name,name:p.displayName,dialogueId:p.dialogueId,sanctuaryId:p.sanctuaryId});
   assert.equal(s.checkpoint.sanctuaryId,p.sanctuaryId);assert.equal(s.checkpoint.mapId,map.id);assert.equal(s.gold,777);assert(s.worldProgress.flags.includes('lantern-save-test'));
   for(const c of [...s.party,...s.storage])assert.equal(c.currentHp,BattleEngine.statsFor(c).hp);
   count++;
  }
 }
 assert.equal(count,6);console.log('Six Soraka lanterns: atlas, authored maps, interaction-only healing, party/storage recovery, checkpoints and save preservation: OK.');
}finally{await server.close();}
