import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import { SaveService } from '../systems/SaveService';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('garen-world', './assets/sprites/garen-world.png');
    this.load.image('garen-battle-back', './assets/sprites/garen-battle-back.png');
    this.load.image('teemo-battle-front', './assets/sprites/teemo-battle-front.png');
  }

  create(): void {
    DataRegistry.champion('garen');
    DataRegistry.champion('teemo');
    DataRegistry.map('bandle-debug');
    DataRegistry.encounter('bandle-meadow');

    const save = SaveService.load();
    this.registry.set('save', save);
    this.scene.start('WorldScene');
  }
}
