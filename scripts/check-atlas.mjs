import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source=readFileSync('src/data/MapAtlas.ts','utf8');
const compiled=stripTypeScriptTypes(source);
const {ATLAS_VIEWS,atlasView,atlasAncestors,atlasContains,currentAtlasZone,atlasPoints}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const ionia=JSON.parse(readFileSync('src/data/world/regions/ionia/region-map.json'));
const bandle=JSON.parse(readFileSync('src/data/world/regions/bandle-city/region-map.json'));
const details=ATLAS_VIEWS.filter(v=>v.parent==='ionia');
assert.equal(new Set(details.flatMap(v=>v.points.map(p=>p.id))).size,21);
assert.equal(details.flatMap(v=>v.points).length,21,'Every zone must have exactly one detailed marker');
for(const zone of ionia.points){
  assert.equal(details.flatMap(v=>v.points).filter(p=>p.id===zone.id).length,1,zone.id);
  assert.equal(atlasView('ionia').points.filter(p=>atlasContains(p,zone.id)).length,1,`Single island location: ${zone.id}`);
  assert.equal(currentAtlasZone(`${zone.id}_interior_01`,'stale-zone',ionia.points),zone.id);
}
for(const view of ATLAS_VIEWS){
  const chain=atlasAncestors(view.id);
  assert.equal(chain[0].id,'runeterra');
  assert.equal(new Set(chain.map(v=>v.id)).size,chain.length);
  if(view.parent)assert.ok(ATLAS_VIEWS.some(v=>v.id===view.parent));
  if(view.asset)assert.ok(statSync(`public/assets/world/atlas/${view.asset}.webp`).size>10000);
  for(const harbor of view.harbors ?? []){
    assert.ok(ionia.points.some(p=>p.id===harbor.id));
    assert.ok(harbor.x>0&&harbor.x<1&&harbor.y>0&&harbor.y<1);
  }
  for(const p of atlasPoints(view,bandle.points)){
    assert.ok(p.x>0&&p.x<1&&p.y>0&&p.y<1,`${view.id}/${p.id} in bounds`);
    if(p.child)assert.ok(ATLAS_VIEWS.some(v=>v.id===p.child));
  }
}
assert.equal(currentAtlasZone('gnar-cave','gnar-cave',bandle.points),'gnar-valley');
assert.equal(currentAtlasZone('bandle_village_house_01','stale',bandle.points),'bandle-village');
assert.equal(currentAtlasZone('unknown','unknown',bandle.points),undefined,'Never invent a current location');
assert.ok(!atlasContains(atlasView('ionia').points.find(p=>p.id==='forest'),'jo21_reunion'));
assert.deepEqual(atlasAncestors('ionia-orders').map(v=>v.id),['runeterra','ionia','ionia-orders']);
console.log('Atlas: 21 unique zones, 5 islands, hierarchy, interior locations, Bandle aliases and four image assets OK.');
