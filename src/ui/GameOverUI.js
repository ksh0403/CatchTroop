// 게임 오버 화면 표시
export function showGameOverUI(scene) {
    scene.add.text(400, 300, 'GAME OVER', {
        fontSize: '64px',
        color: '#ff6b6b',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    // 재시작 안내 문구
    scene.add.text(400, 355, 'Press R to Restart', {
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);
}
