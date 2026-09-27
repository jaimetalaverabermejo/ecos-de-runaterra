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
import { ConsoleInput } from './input/ConsoleInput';

applyCombatUxV1211();
applyPlayerWorldV13();
applyUi960WorldCombatPass();
applyTouchControlsUiPass();
ConsoleInput.initialize();

function showFatalStartupError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[Ecos de Runaterra] Error de arranque:', error);
  const existing = document.getElementById('startup-error');
  if (existing) {
    existing.textContent = `Error al iniciar Ecos de Runaterra:\n${message}`;
    return;
  }

  const panel = document.createElement('pre');
  panel.id = 'startup-error';
  panel.textContent = `Error al iniciar Ecos de Runaterra:\n${message}`;
  Object.assign(panel.style, {
    position: 'fixed',
    inset: '18px',
    zIndex: '2147483646',
    margin: '0',
    padding: '20px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    background: '#071520',
    color: '#ffd0d0',
    border: '2px solid #b85c5c',
    borderRadius: '10px',
    font: '14px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace'
  });
  document.body.appendChild(panel);
}

window.addEventListener('error', (event) => showFatalStartupError(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => showFatalStartupError(event.reason));

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

let game: Phaser.Game | undefined;

function isTouchDevice(): boolean {
  return window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function isPortraitViewport(): boolean {
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return height > width;
}

function refreshGameScale(): void {
  if (!game) return;

  // Mobile Safari updates visualViewport progressively during rotation.
  [0, 90, 220, 420].forEach((delay) => {
    window.setTimeout(() => game?.scale.refresh(), delay);
  });
}

function syncMobileConsoleLayout(): void {
  const touch = isTouchDevice();
  document.body.dataset.mobileConsole = touch ? 'true' : 'false';
  document.body.dataset.consoleOrientation = isPortraitViewport() ? 'portrait' : 'landscape';
  refreshGameScale();
}

syncMobileConsoleLayout();
game = new Phaser.Game(config);
refreshGameScale();

window.addEventListener('resize', syncMobileConsoleLayout, { passive: true });
window.addEventListener('orientationchange', () => {
  window.setTimeout(syncMobileConsoleLayout, 70);
}, { passive: true });
window.visualViewport?.addEventListener('resize', syncMobileConsoleLayout, { passive: true });
