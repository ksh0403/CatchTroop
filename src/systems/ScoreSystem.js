import Phaser from 'phaser';
import { GAME_EVENTS } from '../config/gameEvents.js';
import { SCORE } from '../config/gameConstants.js';

// 점수 및 몬스터 처치 수 초기화
export function initScore(scene) {
    scene.killCount = 0;
    scene.score = 0;
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

// 현재 점수 계산
export function updateScore(scene) {
    if (scene.isGameOver || scene.isReplacingAlly) {
        return;
    }

    // 생존 점수
    const survivalScore =
        Math.floor(scene.survivalTime)
        * SCORE.SURVIVAL_PER_SECOND;

    // 몬스터 처치 점수
    const killScore =
        scene.killCount * SCORE.PER_KILL;

    // 최종 합산 점수
    scene.score = survivalScore + killScore;
}