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
      .setAlpha(0.72);
    const glow = scene.add.circle(0, -20, 22, 0x55d8ff, 0.13);
    const echo = scene.add.container(source.x, source.y, [glow, spirit])
      .setDepth(960 + Math.round(source.y))
      .setAlpha(0.08);

    scene.tweens.add({
      targets: glow,
      scale: { from: 0.82, to: 1.24 },
      alpha: { from: 0.08, to: 0.27 },
      duration: 520,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    scene.tweens.add({
      targets: echo,
      alpha: 0.92,
      y: source.y - 34,
      scale: 1.04,
      duration: 520,
      ease: 'Sine.easeOut',
      onComplete: () => {
        const motes = Array.from({ length: 8 }, (_unused, index) => {
          const angle = Phaser.Math.DegToRad(-155 + index * 22);
          const mote = scene.add.circle(echo.x, echo.y - 18, index % 3 === 0 ? 3 : 2, 0x79e2f2, 0.82)
            .setDepth(echo.depth + 1);
          const distance = 22 + (index % 4) * 8;
          scene.tweens.add({
            targets: mote,
            x: mote.x + Math.cos(angle) * distance,
            y: mote.y + Math.sin(angle) * distance - 10,
            alpha: 0,
            scale: 0.35,
            duration: 520 + index * 30,
            ease: 'Sine.easeOut',
            onComplete: () => mote.destroy()
          });
          return mote;
        });

        scene.tweens.add({
          targets: [spirit, glow],
          alpha: 0,
          scaleX: '*=1.12',
          scaleY: '*=0.92',
          duration: 430,
          ease: 'Sine.easeIn',
          onComplete: () => {
            echo.destroy(true);
            for (const mote of motes) {
              if (mote.active) mote.setAlpha(Math.min(mote.alpha, 0.6));
            }
            onComplete?.();
          }
        });
      }
    });
    return true;
  }
}
