import Phaser from 'phaser';

/** Brief wind coils around the actor, then carry the silhouette away in the map. */
export class WindDepartureEffect {
  static play(scene: Phaser.Scene, actor: Phaser.GameObjects.Container, onComplete: () => void): void {
    const x = actor.x, y = actor.y;
    const wind = scene.add.graphics().setDepth(Math.max(5000, actor.depth + 2));
    const motion = { progress: 0 };
    scene.tweens.add({
      targets: motion, progress: 1, duration: 1250, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const p = motion.progress;
        wind.clear();
        const opacity = Math.sin(Math.PI * p);
        // Broken, tapering coils keep both the figure and the direction legible.
        for (let band = 0; band < 5; band++) {
          const radius = 10 + band * 4 + p * 7;
          wind.lineStyle(band % 2 ? 2 : 1, band % 2 ? 0xd9f5ef : 0x9dcfcb, opacity * .9);
          wind.beginPath();
          for (let step = 0; step <= 22; step++) {
            const angle = step / 22 * Math.PI * 1.45 + p * Math.PI * 8 + band;
            const wx = Math.round(x + Math.cos(angle) * radius + Math.max(0, p - .5) * 90);
            const wy = Math.round(y - 5 - band * 10 + Math.sin(angle) * radius * .24);
            if (!step) wind.moveTo(wx, wy); else wind.lineTo(wx, wy);
          }
          wind.strokePath();
        }
        // The departure accelerates only once the wind has gathered.
        const dash = Phaser.Math.Clamp((p - .55) / .45, 0, 1);
        actor.setX(Math.round(x + dash * dash * 54)).setAlpha(1 - dash);
      },
      onComplete: () => { wind.destroy(); onComplete(); }
    });
  }
}
