import { GAME } from '../config/gameConstants.js';
import { formatSurvivalTime } from '../systems/SurvivalSystem.js';

// 게임 오버 결과 UI 표시
export function showGameOverUI(scene) {
    const centerX = GAME.WIDTH / 2;
    const centerY = GAME.HEIGHT / 2;

    // 전체 화면 어둡게 처리
    scene.add.rectangle(
        centerX,
        centerY,
        GAME.WIDTH,
        GAME.HEIGHT,
        0x000000,
        0.55
    ).setDepth(30);

    // 결과 패널 크기
    const panelWidth = 440;
    const panelHeight = 360;

    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    // 결과 패널 배경
    const panel = scene.add.graphics();

    panel.fillStyle(0x172a23, 1);
    panel.fillRoundedRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        16
    );

    // 결과 패널 테두리
    panel.lineStyle(3, 0x94b5a2, 1);
    panel.strokeRoundedRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        16
    );

    panel.setDepth(31);

    // GAME OVER 제목
    scene.add.text(
        centerX,
        panelY + 42,
        'GAME OVER',
        {
            fontSize: '42px',
            color: '#ff6b6b',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }
    ).setOrigin(0.5).setDepth(32);

    // 구분선
    const divider = scene.add.graphics();

    divider.lineStyle(1, 0x94b5a2, 0.5);

    divider.lineBetween(
        panelX + 30,
        panelY + 85,
        panelX + panelWidth - 30,
        panelY + 85
    );

    divider.lineBetween(
        panelX + 30,
        panelY + 180,
        panelX + panelWidth - 30,
        panelY + 180
    );

    divider.setDepth(32);

    // 기록 항목 공통 스타일
    const recordStyle = {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
    };

    // 생존 시간 제목
    scene.add.text(
        panelX + 30,
        panelY + 115,
        'Survival Time',
        recordStyle
    ).setOrigin(0, 0.5).setDepth(32);

    // 최종 생존 시간
    scene.add.text(
        panelX + panelWidth - 30,
        panelY + 115,
        formatSurvivalTime(scene.survivalTime),
        recordStyle
    ).setOrigin(1, 0.5).setDepth(32);

    // 몬스터 처치 수 제목
    scene.add.text(
        panelX + 30,
        panelY + 150,
        'Monsters Defeated',
        recordStyle
    ).setOrigin(0, 0.5).setDepth(32);

    // 최종 몬스터 처치 수
    scene.add.text(
        panelX + panelWidth - 30,
        panelY + 150,
        String(scene.killCount),
        recordStyle
    ).setOrigin(1, 0.5).setDepth(32);

    // 최종 점수 제목
    scene.add.text(
        centerX,
        panelY + 205,
        'FINAL SCORE',
        {
            fontSize: '18px',
            color: '#cbd5e1',
            fontStyle: 'bold'
        }
    ).setOrigin(0.5).setDepth(32);

    // 최종 점수
    scene.add.text(
        centerX,
        panelY + 255,
        scene.score.toLocaleString('en-US'),
        {
            fontSize: '56px',
            color: '#facc15',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }
    ).setOrigin(0.5).setDepth(32);

    // 재시작 안내
    scene.add.text(
        centerX,
        panelY + 325,
        'Press R to Restart',
        {
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }
    ).setOrigin(0.5).setDepth(32);
}