import Phaser from 'phaser';
import { GAME_EVENTS } from '../config/gameEvents.js';

// 몬스터 처치 수 초기화
export function initScore(scene) {
    scene.killCount = 0;
}

// 점수 시스템 이벤트 등록
export function registerScoreEvents(scene) {
    // 몬스터 처치 이벤트 처리
    const onEnemyDefeated = () => {
        if (scene.isGameOver || scene.isReplacingAlly) {
            return;
        }

        scene.killCount += 1;
    };

    // 몬스터 처치 이벤트 구독
    scene.events.on(
        GAME_EVENTS.ENEMY_DEFEATED,
        onEnemyDefeated
    );

    // 게임 종료 및 재시작 시 이벤트 제거
    scene.events.once(
        Phaser.Scenes.Events.SHUTDOWN,
        () => {
            scene.events.off(
                GAME_EVENTS.ENEMY_DEFEATED,
                onEnemyDefeated
            );
        }
    );
}