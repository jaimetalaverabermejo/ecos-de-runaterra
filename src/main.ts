import Phaser from 'phaser';
import './style.css';
import { TouchAssetPreloadScene } from './scenes/TouchAssetPreloadScene';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { ProfileSelectScene } from './scenes/ProfileSelectScene';
import { IntroScene } from './scenes/IntroScene';
import { SaveSelectScene } from './scenes/SaveSelectScene';
import { WorldScene } from './scenes/WorldScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayerScene } from './scenes/PlayerScene';
import { TeamScene } from './scenes/TeamScene';
import { ChampionDetailScene } from './scenes/ChampionDetailScene';
import { MasteryScene } from './scenes/MasteryScene';
import { BuildScene } from './scenes/BuildScene';
import { ProgressionScene } from './scenes/ProgressionScene';
import { DefeatScene } from './scenes/DefeatScene';
import { JournalScene } from './scenes/JournalScene';
import { BagScene } from './scenes/BagScene';
import { ShopScene } from './scenes/ShopScene';
import { CraftingScene } from './scenes/CraftingScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { RegionMapScene } from './scenes/RegionMapScene';
import { BattleScene } from './scenes/BattleScene';
import { DoubleBattleScene } from './scenes/DoubleBattleScene';
import { applyCombatUxV1211 } from './scenes/CombatUxV1211';
import { applyPlayerWorldV13 } from './scenes/PlayerWorldV13';
import { applyUi960WorldCombatPass } from './scenes/Ui960WorldCombatPass';
import { applyTouchControlsUiPass } from './scenes/TouchControlsUiPass';
import { GAME_HEIGHT, GAME_WIDTH } from './config/GameDimensions';

applyCombatUxV1211();
applyPlayerWorldV13();
applyUi960WorldCombatPass();
applyTouchControlsUiPass();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111111',
  pixelArt: true,
  input: { activePointers: 3 },
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    TouchAssetPreloadScene,
    BootScene,
    TitleScene,
    ProfileSelectScene,
    SaveSelectScene,
    IntroScene,
    WorldScene,
    MenuScene,
    PlayerScene,
    TeamScene,
    ChampionDetailScene,
    MasteryScene,
    BuildScene,
    ProgressionScene,
    DefeatScene,
    JournalScene,
    BagScene,
    ShopScene,
    CraftingScene,
    WorldMapScene,
    RegionMapScene,
    BattleScene,
    DoubleBattleScene
  ]
};

new Phaser.Game(config);
