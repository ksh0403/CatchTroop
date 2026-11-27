import { GAME } from '../config/gameConstants.js';

// 점수 및 몬스터 처치 수 UI 생성
export function createScoreUI(scene) {
    // 몬스터 처치 수 표시
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

    // 점수 표시
    scene.scoreText = scene.add.text(
        GAME.WIDTH - 20,
        48,
        'Score: 0',
        {
            fontSize: '24px',
            color: '#facc15',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }
    ).setOrigin(1, 0).setDepth(10);
}

// 점수 및 몬스터 처치 수 UI 갱신
export function updateScoreUI(scene) {
    const killText = `Kills: ${scene.killCount}`;
    const scoreText = `Score: ${scene.score}`;

    // 몬스터 처치 수 갱신
    if (scene.killCountText.text !== killText) {
        scene.killCountText.setText(killText);
    }

    // 점수 갱신
    if (scene.scoreText.text !== scoreText) {
        scene.scoreText.setText(scoreText);
    }
}