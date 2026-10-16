import Phaser from 'phaser';
/** Temporary boats explicitly requested for playtesting; replace with pixel art later. */
export class HarborWorld {
  static portal(mapId:string):string|undefined {return mapId==='jo07_wehle'?'sail_to_forest':mapId==='jo09_forest_landing'?'sail_to_wehle':undefined;}
  static draw(scene:Phaser.Scene,mapId:string):void {
    const position=mapId==='jo07_wehle'?{x:368,y:1264}:mapId==='jo09_forest_landing'?{x:160,y:1824}:undefined;
    if(!position)return;
    const g=scene.add.graphics();
    g.fillStyle(0x142c38,.35).fillEllipse(0,9,108,29);
    const hull = [{x:-52,y:0},{x:-36,y:-20},{x:36,y:-20},{x:52,y:0},{x:34,y:20},{x:-34,y:20}].map(p=>new Phaser.Math.Vector2(p.x,p.y));
    g.fillStyle(0x67432a).fillPoints(hull,true);
    g.lineStyle(3,0xb38a50).strokePoints([...hull,hull[0]],false);
    g.fillStyle(0xb18049).fillRect(-29,-14,58,28);
    g.lineStyle(1,0x70502d);for(let x=-24;x<=24;x+=8)g.lineBetween(x,-14,x,14);
    g.fillStyle(0x4a3022).fillRect(-25,-17,8,34).fillRect(17,-17,8,34);
    g.lineStyle(4,0xc1a36b).lineBetween(-8,0,-25,35).lineBetween(8,0,25,-35);
    const boat=scene.add.container(position.x,position.y,[g]).setDepth(100+position.y);
    scene.tweens.add({targets:boat,y:position.y+2,duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }
}
