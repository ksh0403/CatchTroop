import Phaser from 'phaser';
import './style.css';

import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  scene: [TitleScene, GameScene],
};

new Phaser.Game(config);
