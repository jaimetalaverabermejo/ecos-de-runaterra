import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const spec=read('docs/diseno/jonia/patrones-exteriores.json');
const MASK=0x1fffffff;
let transitions=0,vertical=0,lateral=0;
for(const entry of spec.maps){
 const m=read(entry.path),layers=new Map(m.layers.map(l=>[l.name,l]));
 const obstacles=layers.get('Obstacles').data,paths=layers.get('Paths').data;
 const dark=entry.zone===18;
 const cliff=g=>dark ? [1691,1692,1693,1706,1708,1721,1722,1723,1725,1746,1761].includes(g&MASK) : (g&MASK)>=2281&&(g&MASK)<=2310;
 for(const raw of obstacles){const g=raw&MASK;assert(!(g>=2299&&g<=2304)||g===2300,`JO${entry.zone}: inconsistent middle cliff tile`);assert(!(g>=2305&&g<=2310)||g===2306,`JO${entry.zone}: inconsistent cliff foot`);}
 assert.equal(entry.roadNetwork.width,2);assert.deepEqual(entry.roadNetwork.unconnectedOptionalAnchors,[]);
 const dirt=new Set([33,34,35,68,69,70,103,104,105]);
 const stone=new Set([18,19,20,53,54,55,88,89,90]);
 const surface=(x,y)=>x>=0&&y>=0&&x<m.width&&y<m.height&&(paths[y*m.width+x]||stone.has(layers.get('GroundDetails').data[y*m.width+x]));
 for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if(dirt.has(paths[y*m.width+x]))assert([x-1,x].some(xx=>[y-1,y].some(yy=>[0,1].every(dy=>[0,1].every(dx=>surface(xx+dx,yy+dy))))),`JO${entry.zone}: one-tile fragment at ${x},${y}`);
 const unvisited=new Set(paths.flatMap((g,i)=>surface(i%m.width,Math.floor(i/m.width))?[i]:[])),components=[];
 while(unvisited.size){const q=[unvisited.values().next().value];unvisited.delete(q[0]);for(const i of q)for(const j of [i-m.width,i+m.width,i-1,i+1])if(unvisited.has(j)&&Math.abs(j%m.width-i%m.width)+Math.abs(Math.floor(j/m.width)-Math.floor(i/m.width))===1){unvisited.delete(j);q.push(j);}components.push(q.length);}
 assert.equal(components.filter(n=>n>=50).length,1,`JO${entry.zone}: disconnected road/plaza`);
 for(let y=0;y<m.height-2;y++)for(let x=0;x<m.width-2;x++)assert(![0,1,2].every(dy=>[0,1,2].every(dx=>dirt.has(paths[(y+dy)*m.width+x+dx]))),`JO${entry.zone}: road widens to three tiles at ${x},${y}`);
 assert(layers.get('Obstacles')&&m.layers.indexOf(layers.get('Obstacles'))<m.layers.indexOf(layers.get('Paths')),'Rock must render underneath the traversal layer');
 assert(!paths.some(raw=>[2375,2376].includes(raw&MASK)),`JO${entry.zone}: repeated untrimmed staircase`);
 for(const s of entry.stairs){
  if(s.orientation==='vertical'){
   const source=read('public/assets/world/regions/Jonia/Zones/JO08_Paso_Cumbres/JO08_Paso_Cumbres.tmj'),p=source.layers.find(l=>l.name==='Paths').data;
   const expected=Array.from({length:5},(_,r)=>[p[(15+r)*source.width+12],p[(15+r)*source.width+13]]);
   assert.deepEqual(s.rows,expected,'Vertical staircase must use Jaime’s authored JO08 assembly');
   for(let r=0;r<5;r++)for(let c=0;c<2;c++){assert.equal(paths[(s.y+r)*m.width+s.x+c],expected[r][c]);if(r===0||r===4)assert.equal(obstacles[(s.y+r)*m.width+s.x+c],0,'Stair entry/exit caps must rest on ground');else assert(cliff(obstacles[(s.y+r)*m.width+s.x+c]),'Central steps must overlay rock');}
   for(let r=1;r<=3;r++)for(const x of [s.x-1,s.x+2])assert(cliff(obstacles[(s.y+r)*m.width+x]),'Rock bank must meet the side of the central steps');
   for(const y of [s.y-1,s.y+5])if(y>=0&&y<m.height){for(const x of [s.x,s.x+1])assert(surface(x,y),`JO${entry.zone}: unaligned stair approach ${x},${y}`);}vertical++;
  }else{
   for(const[x,y,g]of s.cells){assert.equal(paths[y*m.width+x],g);assert(cliff(obstacles[y*m.width+x]),'Lateral stair must overlay real rock');assert(g&0x20000000,'Lateral stair must rotate its tile, not only its placement');}for(const y of [s.y-1,s.y+2])assert(cliff(obstacles[y*m.width+s.x]),'Lateral crossing requires a continuous bank');lateral++;
  }
 }
 for(const b of entry.bridges){
  if(b.rotation==='clockwise'){
   assert.equal(b.width,2);assert.equal(b.height,4);
   for(let r=0;r<4;r++)for(let c=0;c<2;c++){const g=paths[(b.y+r)*m.width+b.x+c];assert(g&0x20000000);assert(g&0x80000000);assert((g&MASK)>=2351&&(g&MASK)<=2361);}
  }
 }
 const details=layers.get('GroundDetails').data.filter(g=>(dark?[1694,1697,1724,1727]:[2284,2286,2296,2298]).includes(g));assert(details.length>20,`JO${entry.zone}: missing authored rock transitions`);transitions+=details.length;
 if(dark){assert(obstacles.some(g=>g===1746)&&obstacles.some(g=>g===1761),'Shadow ravine must retain its dark rock');assert(!obstacles.some(g=>g>=2281&&g<=2310),'Light cliff material leaked into the dark ravine');}
}
assert.equal(vertical,16);assert.equal(lateral,10);
console.log(`Ionia exterior style: ${vertical} reference stair assemblies, ${lateral} rotated lateral crossings, ${transitions} rock transitions, two-wide roads, grounded stair mouths, central rock backing and continuous side banks, retained dark ravine and oriented piers: OK.`);
