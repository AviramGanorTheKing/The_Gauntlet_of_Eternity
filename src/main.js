import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ProfileScene } from './scenes/ProfileScene.js';
import { CharSelectScene } from './scenes/CharSelectScene.js';
import { SkillTreeScene } from './scenes/SkillTreeScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { BossIntroScene } from './scenes/BossIntroScene.js';
import { DeathScene } from './scenes/DeathScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { initDebugBridge } from './debug/DebugBridge.js';
import { DebugBalancePanel } from './debug/DebugBalancePanel.js';

const config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    parent: 'game-container',
    pixelArt: true,
    roundPixels: false,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, ProfileScene, CharSelectScene, SkillTreeScene, GameScene, UIScene, PauseScene, BossIntroScene, DeathScene, VictoryScene, IntroScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

// Debug balance panel (toggle with backtick key)
initDebugBridge(game);
new DebugBalancePanel();
