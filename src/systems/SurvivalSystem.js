// 생존 시간 초기화
export function initSurvivalTime(scene) {
    scene.survivalTime = 0;
}

// 생존 시간 갱신
export function updateSurvivalTime(scene, dt) {
    if (scene.isGameOver || scene.isReplacingAlly) {
        return;
    }

    scene.survivalTime += dt;
}

// 생존 시간을 분:초 형식으로 변환
export function formatSurvivalTime(seconds) {
    const totalSeconds = Math.floor(seconds);

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}