import Phaser from 'phaser';
/** Rowboats moored at the mapped ferry landings. */
export class HarborWorld {
  static portal(mapId:string):string|undefined {return mapId==='jo07_wehle'?'sail_to_forest':mapId==='jo09_forest_landing'?'sail_to_wehle':undefined;}
  static draw(scene:Phaser.Scene,mapId:string):void {
    // Orders village arrives on a land stairway; it has no mapped water/dock.
    const positions: Record<string, {x:number;y:number}[]> = {
      jo07_wehle: [{x:368,y:1264}], jo09_forest_landing: [{x:112,y:1792}],
      jo21_reunion: [{x:1152,y:1792}]
    };
    for (const position of positions[mapId] ?? []) this.drawBoat(scene, position);
  }
  private static drawBoat(scene:Phaser.Scene,position:{x:number;y:number}):void {
    // The uploaded sheet has wide transparent margins. Frame only the hull,
    // preserving the source aspect ratio without rewriting the original artwork.
    const texture = scene.textures.get('world-rowboat');
    if (!texture.has('hull')) texture.add('hull', 0, 64, 295, 1320, 530);
    const shadow = scene.add.ellipse(0, 9, 138, 27, 0x142c38, 0.25);
    const hull = scene.add.image(0, 0, 'world-rowboat', 'hull').setDisplaySize(144, 144 * 530 / 1320);
    const boat=scene.add.container(position.x,position.y,[shadow,hull]).setDepth(100+position.y);
    scene.tweens.add({targets:boat,y:position.y+2,duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }
}
