import Phaser from 'phaser';
import type { CombatMechanicsStore } from '../../systems/combat/CombatMechanicsEngine';
import { animationProfile } from './CombatAnimationProfiles';
import { glyph } from './CombatAnimationPlayer';

const layers = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container>();

/** Field resources are drawn between opponents, independently of target status badges. */
export function syncCombatFieldVfx(scene: Phaser.Scene, store: CombatMechanicsStore,
  units: Array<{ id: string; side: string; x: number; y: number }>): void {
  layers.get(scene)?.destroy(true);
  const layer = scene.add.container(0, 0).setDepth(650);
  layers.set(scene, layer);
  for (const owner of units) {
    const marks = store.marks[`field:${owner.id}`] ?? [];
    const opponents = units.filter(u => u.side !== owner.side);
    if (!opponents.length) continue;
    const x = opponents.reduce((sum,u) => sum+u.x,0)/opponents.length;
    const y = opponents.reduce((sum,u) => sum+u.y,0)/opponents.length + 20;
    for (const mark of marks.filter(m => m.stacks > 0 && m.remainingTurns > 0)) {
      const count = Math.min(12,mark.stacks);
      for (let i=0;i<count;i++) {
        const dx = x + (i-(count-1)/2)*18;
        if (mark.markId === 'katarina-dagger' && scene.textures.exists('item-dagger')) {
          layer.add(scene.add.image(dx,y,'item-dagger').setDisplaySize(28,28).setAngle(i%2 ? 20 : -20));
        } else if (mark.markId === 'xayah-feather') {
          const graphic = scene.add.graphics({x:dx,y}).setScale(.5);
          glyph(graphic,{...animationProfile(null,true,'xayah'),weapon:'feather'});
          layer.add(graphic);
        }
      }
      layer.add(scene.add.text(x,y+18,`${mark.markId === 'katarina-dagger' ? 'DAGAS' : 'PLUMAS'} ${mark.stacks}`,{fontSize:'10px',color:'#f1deff',backgroundColor:'#162330'}).setOrigin(.5,0));
    }
  }
  for (const [id,realm] of Object.entries(store.realms ?? {})) {
    const a=units.find(u=>u.id===id),b=units.find(u=>u.id===realm.targetId);
    if (!a || !b) continue;
    const graphic=scene.add.graphics().lineStyle(2,0x96e1cb,.45);
    graphic.lineBetween(a.x,a.y-30,b.x,b.y-30);
    graphic.strokeEllipse(a.x,a.y,85,20).strokeEllipse(b.x,b.y,85,20);
    layer.add(graphic);
    layer.add(scene.add.text((a.x+b.x)/2,(a.y+b.y)/2-38,`REINO · ${Math.min(2,realm.remainingTurns)}T`,{fontSize:'11px',color:'#a9efd9',backgroundColor:'#10252c'}).setOrigin(.5));
  }
}
