import type { RegionMapPointDefinition } from './types';

/** Views form a tree: world → region → local sheet. Coordinates belong to the
 * illustration, never to Tiled or the player's world position. */
export interface AtlasView {
  id: string;
  name: string;
  parent?: string;
  regionId?: string;
  texture?: string;
  asset?: string;
  points: AtlasPoint[];
  harbors?: AtlasPoint[];
}
export interface AtlasPoint { id: string; x: number; y: number; child?: string; zones?: string[]; name?: string }
const point = (id: string, x: number, y: number): AtlasPoint => ({id, x, y});
export const ATLAS_VIEWS: AtlasView[] = [
  {id:'runeterra',name:'Runaterra',points:[]},
  {id:'ionia',name:'Jonia',parent:'runeterra',regionId:'ionia',texture:'atlas-ionia',asset:'ionia',harbors:[
    point('jo07_wehle',.21,.72),point('jo09_forest_landing',.14,.37),point('jo16_orders_village',.72,.35),point('jo14_faelor_coast',.74,.84),point('jo21_reunion',.12,.90)
  ],points:[
    {id:'main',name:'Isla principal',x:.57,y:.62,child:'ionia-main'},
    {id:'forest',name:'Bosque Eterno',x:.18,y:.24,child:'ionia-forest',zones:['jo09_forest_landing','jo10_oblivion_garden','jo11_omikayalan','jo12_roots','jo13_vastaya_refuge']},
    {id:'orders',name:'Las Órdenes',x:.82,y:.23,child:'ionia-orders',zones:['jo16_orders_village','jo17_kinkou','jo18_shadow_ravine','jo19_wanderers','jo20_trial_shrine']},
    {id:'faelor',name:'Fae’lor',x:.84,y:.79,child:'ionia-orders',zones:['jo14_faelor_coast','jo15_faelor_enclosure']},
    {id:'reunion',name:'Reencuentro',x:.12,y:.83,child:'ionia-forest',zones:['jo21_reunion']}
  ]},
  {id:'ionia-main',name:'Isla principal',parent:'ionia',regionId:'ionia',texture:'atlas-ionia-main',asset:'ionia-main',harbors:[point('jo07_wehle',.24,.75)],points:[
    point('jo01_koeshin',.70,.87),point('jo02_white_cliffs',.61,.77),point('jo03_lhradi',.70,.67),point('jo04_rice_fields',.67,.47),point('jo05_placidium',.68,.28),point('jo06_estuary',.38,.22),point('jo08_peaks',.38,.51),point('jo07_wehle',.30,.75)
  ]},
  {id:'ionia-forest',name:'Bosque y Reencuentro',parent:'ionia',regionId:'ionia',texture:'atlas-ionia-forest',asset:'ionia-forest',harbors:[point('jo09_forest_landing',.53,.90),point('jo21_reunion',.21,.81)],points:[
    point('jo09_forest_landing',.55,.85),point('jo10_oblivion_garden',.64,.64),point('jo11_omikayalan',.70,.50),point('jo12_roots',.77,.24),point('jo13_vastaya_refuge',.48,.24),point('jo21_reunion',.22,.65)
  ]},
  {id:'ionia-orders',name:'Las Órdenes y Fae’lor',parent:'ionia',regionId:'ionia',texture:'atlas-ionia-orders',asset:'ionia-orders',harbors:[point('jo16_orders_village',.25,.92),point('jo14_faelor_coast',.65,.90)],points:[
    point('jo16_orders_village',.38,.79),point('jo17_kinkou',.41,.59),point('jo19_wanderers',.49,.43),point('jo18_shadow_ravine',.26,.28),point('jo20_trial_shrine',.57,.14),point('jo14_faelor_coast',.75,.83),point('jo15_faelor_enclosure',.82,.58)
  ]},
  {id:'bandle-city',name:'Bandle',parent:'runeterra',regionId:'bandle-city',texture:'atlas-bandle',asset:'bandle',points:[
    point('portal-clearing',.51,.78),point('bandle-village',.52,.54),point('dark-forest',.22,.45),
    point('corki-hangar',.23,.25),point('portal-mountains',.60,.10),point('gnar-valley',.85,.48)
  ]},
  {id:'noxus',name:'Noxus',parent:'runeterra',regionId:'noxus',texture:'atlas-noxus',asset:'noxus',points:[
    point('NO01_Puerto',.84,.51),point('NO02_Cruce_Caravanas',.67,.45),point('NO03_Basilich',.80,.30),
    point('NO04_Suministros',.59,.65),{...point('NO05_Capital_Exterior',.46,.47),name:'Bastión Inmortal'},point('NO07_Memorial_Sion',.82,.77),
    point('NO08_Frontera_Occidental',.25,.49),point('NO09_Delverhold',.15,.35),point('NO10_Ironspike',.19,.18)
  ]}
];
export function atlasRegion(regionId: string): string { return ['ionia','noxus','bandle-city'].includes(regionId) ? regionId : 'bandle-city'; }
export function atlasDefinitionId(regionId: string): string { return `${atlasRegion(regionId)}-region-map`; }
export function atlasView(id: string): AtlasView { return ATLAS_VIEWS.find(v=>v.id===id) ?? ATLAS_VIEWS[1]; }
export function atlasAncestors(id: string): AtlasView[] {
  const result: AtlasView[] = [];
  let view: AtlasView | undefined = atlasView(id);
  while (view) { result.unshift(view); view = ATLAS_VIEWS.find(v=>v.id===view!.parent); }
  return result;
}
export function currentAtlasZone(mapId: string, zoneId: string, points: RegionMapPointDefinition[]): string | undefined {
  const aliases: Record<string,string> = {'gnar-cave':'gnar-valley','bandle-route':'portal-clearing'};
  // Prefer exact map IDs, then their containing exterior, then zone metadata.
  return points.find(p=>p.targetMapId===mapId || p.id===mapId)?.id
    ?? [...points].sort((a,b)=>b.id.length-a.id.length).find(p=>mapId.startsWith(p.id+'_') || Boolean(p.targetMapId && mapId.startsWith(p.targetMapId+'_')))?.id
    ?? points.find(p=>p.id===(aliases[zoneId] ?? zoneId))?.id;
}
export function atlasContains(point: AtlasPoint, zone: string | undefined): boolean {
  if (!zone) return false;
  return point.id===zone || (point.zones ?? (point.child ? atlasView(point.child).points.map(p=>p.id) : [])).includes(zone);
}
