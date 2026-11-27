import { GAME } from '../config/gameConstants.js';
import { formatSurvivalTime } from '../systems/SurvivalSystem.js';

// 생존 시간 UI 생성
export function createSurvivalUI(scene) {
    // 생존 시간 제목
    scene.add.text(
        GAME.WIDTH / 2,
        20,
        'SURVIVAL TIME',
        {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }
    ).setOrigin(0.5, 0).setDepth(10);

    // 생존 시간 표시
    scene.survivalTimeText = scene.add.text(
        GAME.WIDTH / 2,
        38,
        '00:00',
        {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }
    ).setOrigin(0.5, 0).setDepth(10);
}

// 생존 시간 UI 갱신
export function updateSurvivalUI(scene) {
    const formattedTime = formatSurvivalTime(
        scene.survivalTime
    );

    if (scene.survivalTimeText.text !== formattedTime) {
        scene.survivalTimeText.setText(formattedTime);
    }
}