import Phaser from 'phaser';
import TitleScene from '../scenes/TitleScene.js';
import GameScene from '../scenes/GameScene.js';
import { GAME } from './gameConstants.js';

const config = {
  type: Phaser.AUTO,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  parent: 'app',
  scene: [TitleScene, GameScene],
};

export default config;