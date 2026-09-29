import Phaser from 'phaser';

export interface EchoReleaseSource {
  x: number;
  y: number;
  facingFrame: number;
  scale: number;
}

export class EchoReleaseEffect {
  static play(
    scene: Phaser.Scene,
    championId: string,
    source: EchoReleaseSource,
    onComplete?: () => void
  ): boolean {
    const textureKey = `${championId}-overworld`;
    if (!scene.textures.exists(textureKey)) return false;

    const spirit = scene.add.sprite(0, 0, textureKey, source.facingFrame)
      .setOrigin(0.5, 1)
      .setScale(source.scale)
      .setTint(0x79e2f2)
      .setAlpha(0.74);
    const glow = scene.add.circle(0, -20, 23, 0x55d8ff, 0.12);
    const echo = scene.add.container(source.x, source.y, [glow, spirit])
      .setDepth(960 + Math.round(source.y))
      .setAlpha(0.04);

    scene.tweens.add({
      targets: glow,
      scale: { from: 0.82, to: 1.26 },
      alpha: { from: 0.07, to: 0.29 },
      duration: 680,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });

    // 1) La resonancia se separa del campeón con tiempo suficiente para leerla.
    scene.tweens.add({
      targets: echo,
      alpha: 0.94,
      y: source.y - 40,
      scale: { from: 0.96, to: 1.06 },
      duration: 720,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // 2) Queda suspendida un instante antes de disiparse.
        scene.tweens.add({
          targets: echo,
          y: echo.y - 5,
          duration: 420,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut'
        });

        scene.time.delayedCall(860, () => {
          if (!echo.active) return;

          // 3) La huella se rompe en motas y vuelve al ambiente; nunca entra en Raze.
          const motes = Array.from({ length: 14 }, (_unused, index) => {
            const angle = Phaser.Math.DegToRad(-175 + index * 25);
            const radius = 2 + (index % 3);
            const mote = scene.add.circle(echo.x, echo.y - 18, radius, index % 4 === 0 ? 0xc7f7ff : 0x79e2f2, 0.86)
              .setDepth(echo.depth + 1);
            const distance = 28 + (index % 5) * 10;
            scene.tweens.add({
              targets: mote,
              x: mote.x + Math.cos(angle) * distance,
              y: mote.y + Math.sin(angle) * distance - 14 - (index % 3) * 5,
              alpha: 0,
              scale: 0.25,
              duration: 900 + index * 28,
              ease: 'Sine.easeOut',
              onComplete: () => mote.destroy()
            });
            return mote;
          });

          scene.tweens.add({
            targets: spirit,
            alpha: 0,
            scaleX: spirit.scaleX * 1.16,
            scaleY: spirit.scaleY * 0.88,
            duration: 980,
            ease: 'Sine.easeIn'
          });
          scene.tweens.add({
            targets: glow,
            alpha: 0,
            scale: 1.65,
            duration: 1080,
            ease: 'Sine.easeOut',
            onComplete: () => {
              echo.destroy(true);
              for (const mote of motes) {
                if (mote.active) mote.setAlpha(Math.min(mote.alpha, 0.55));
              }
              onComplete?.();
            }
          });
        });
      }
    });
    return true;
  }
}
