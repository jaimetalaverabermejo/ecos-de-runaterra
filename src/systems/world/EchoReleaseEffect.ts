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
    target: { x: number; y: number },
    onComplete?: () => void
  ): boolean {
    const textureKey = `${championId}-overworld`;
    if (!scene.textures.exists(textureKey)) return false;

    const spirit = scene.add.sprite(0, 0, textureKey, source.facingFrame)
      .setOrigin(0.5, 1)
      .setScale(source.scale)
      .setTint(0x79e2f2)
      .setAlpha(0.76);
    const glow = scene.add.circle(0, -20, 22, 0x55d8ff, 0.12);
    const echo = scene.add.container(source.x, source.y, [glow, spirit])
      .setDepth(960 + Math.round(source.y))
      .setAlpha(0.15);

    scene.tweens.add({
      targets: glow,
      scale: { from: 0.85, to: 1.18 },
      alpha: { from: 0.08, to: 0.24 },
      duration: 360,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
      targets: echo,
      alpha: 0.9,
      y: source.y - 30,
      scale: 1.05,
      duration: 430,
      ease: 'Sine.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: echo,
          x: target.x,
          y: target.y - 8,
          scale: 0.42,
          alpha: 0,
          duration: 520,
          ease: 'Quad.easeIn',
          onComplete: () => {
            echo.destroy(true);
            scene.cameras.main.flash(120, 95, 205, 255);
            onComplete?.();
          }
        });
      }
    });
    return true;
  }
}
