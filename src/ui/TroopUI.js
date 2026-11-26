// 아군 수 표시 UI 생성
export function createTroopUI(scene) {
    scene.allyText = scene.add.text(
        20, 20, 'Allies: 0 / 10', {
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }
    );
}

// 현재 아군 수 갱신
export function updateTroopUI(scene) {
    scene.allyText.setText(
        `Allies: ${scene.allies.length} / 10`
    );
}
