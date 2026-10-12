import assert from 'node:assert/strict';
import {createServer} from 'vite';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const server=await createServer({server:{middlewareMode:true}});
try{
 const {GamepadController:G}=await server.ssrLoadModule('/src/input/GamepadController.ts');
 const pad={id:'Standard test',mapping:'standard',connected:true,index:1,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
 assert.equal(G.sample(pad).direction,'none');pad.axes[0]=.2;assert.equal(G.sample(pad).direction,'none');pad.axes[0]=.8;assert.equal(G.sample(pad).direction,'right');pad.axes[0]=0;
 pad.buttons[0]={pressed:true,value:1};assert.deepEqual(G.poll(pad,0).actions,['a']);assert.deepEqual(G.poll(pad,40).actions,[]);pad.buttons[0]={pressed:false,value:0};G.poll(pad,50);pad.buttons[0]={pressed:true,value:1};assert.deepEqual(G.poll(pad,60).actions,['a']);
 pad.buttons[0]={pressed:false,value:0};pad.buttons[12]={pressed:true,value:1};assert.equal(G.poll(pad,100).direction,'up');assert.equal(G.poll(pad,200).direction,undefined);assert.equal(G.poll(pad,500).direction,'up');pad.buttons[12]={pressed:false,value:0};pad.connected=false;assert.equal(G.poll(pad,600).sample.direction,'none');
 const clone={...pad,id:'Generic Switch clone',mapping:'',connected:true,axes:[-.9,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};assert.equal(G.sample(clone).direction,'none');
 const profile={up:{type:'axis',index:1,value:-.6,mode:'analog'},down:{type:'axis',index:1,value:.6,mode:'analog'},left:{type:'axis',index:0,value:-.6,mode:'analog'},right:{type:'axis',index:0,value:.6,mode:'analog'},a:{type:'button',index:1},b:{type:'button',index:0},menu:{type:'button',index:9}};
 assert(G.save(clone,profile));clone.axes[0]=.8;assert.equal(G.sample(clone).direction,'right');clone.axes[0]=0;clone.buttons[1]={pressed:true,value:1};assert(G.sample(clone).a);assert(!G.sample(clone).b);clone.buttons[1]={pressed:false,value:0};
 const hat={...clone,id:'Generic hat',axes:[0,0,3.285714]};const h={...profile,up:{type:'axis',index:2,value:-1,mode:'hat'},down:{type:'axis',index:2,value:.142857,mode:'hat'},left:{type:'axis',index:2,value:.714286,mode:'hat'},right:{type:'axis',index:2,value:-.428571,mode:'hat'}};G.save(hat,h);assert.equal(G.sample(hat).direction,'none');for(const [value,direction]of[[-1,'up'],[.142857,'down'],[.714286,'left'],[-.428571,'right']]){hat.axes[2]=value;assert.equal(G.sample(hat).direction,direction);}hat.axes[2]=1;assert.notEqual(G.sample(hat).direction,'none');
 G.suspended=true;assert.deepEqual(G.poll(clone,1000).actions,[]);assert.equal(G.poll(clone,1100).sample.direction,'none');G.suspended=false;G.reset(clone);assert.equal(G.profile(clone),undefined);
 const infoPad={...pad,id:'Info test',connected:true,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};G.poll(infoPad,1200);infoPad.buttons[3]={pressed:true,value:1};assert.deepEqual(G.poll(infoPad,1210).actions,['info']);assert.deepEqual(G.poll(infoPad,1250).actions,[]);
 const legacy={...clone,id:'Legacy info conflict',axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};G.save(legacy,{...profile,a:{type:'button',index:3}});legacy.buttons[3]={pressed:true,value:1};assert(G.sample(legacy).a);assert(!G.sample(legacy).info);
 legacy.buttons[3]={pressed:false,value:0};G.save(legacy,{...profile,info:{type:'button',index:7}});legacy.buttons[7]={pressed:true,value:1};assert(G.sample(legacy).info);assert.equal(G.profile(legacy).info.index,7);
 console.log('Validated standard pads, generic calibration, analog drift/deadzone, hat directions/diagonals, edge presses, repeat, disconnect, persistence/reset, info button and legacy mapping conflicts.');
}finally{await server.close();}
