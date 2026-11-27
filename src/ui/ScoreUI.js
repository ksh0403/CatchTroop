import { GAME } from '../config/gameConstants.js';

// 몬스터 처치 수 UI 생성
export function createScoreUI(scene) {
    scene.killCountText = scene.add.text(
        GAME.WIDTH - 20,
        20,
        'Kills: 0',
        {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }
    ).setOrigin(1, 0).setDepth(10);
}

// 몬스터 처치 수 UI 갱신
export function updateScoreUI(scene) {
    const killText = `Kills: ${scene.killCount}`;

    if (scene.killCountText.text !== killText) {
        scene.killCountText.setText(killText);
    }
}