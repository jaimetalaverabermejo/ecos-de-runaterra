import Phaser from 'phaser';

export class WorldMapScene extends Phaser.Scene {
  constructor() { super('WorldMapScene'); }

  create(): void {
    this.scene.start('RegionMapScene', { viewId: 'runeterra' });
  }
}
