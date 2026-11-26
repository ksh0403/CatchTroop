import Phaser from 'phaser';
import { spawnAlly } from '../entities/Ally.js';
import { createMonsterImage } from '../utils/monsterVisuals.js';
import { GAME_EVENTS } from '../config/gameEvents.js';

import {
    CAPTURE,
    ALLY
} from '../config/gameConstants.js';

// 포획 시스템 이벤트 등록
export function registerCaptureEvents(scene) {
    // 적 처치 이벤트 처리
    const onEnemyDefeated = (enemyData) => {
        // 설정된 확률에 따라 포획 후보 생성
        if (Math.random() < CAPTURE.CHANCE) {
            spawnCaptureCandidate(
                scene,
                enemyData.x,
                enemyData.y,
                enemyData.monsterType,
                enemyData.monsterKey
            );
        }
    };

    // 적 처치 이벤트 수신 등록
    scene.events.on(
        GAME_EVENTS.ENEMY_DEFEATED,
        onEnemyDefeated
    );

    // Scene 종료 및 재시작 시 이벤트 등록 해제
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

// 포획 후보 영입
export function updateCaptureCandidates(scene) {
    for (let i = scene.captureCandidates.length - 1; i >= 0; i--) {
        const candidate = scene.captureCandidates[i];

        if (!candidate.active) continue;

        const distance = Phaser.Math.Distance.Between(
            scene.player.x,
            scene.player.y,
            candidate.x,
            candidate.y
        );

        if (distance <= CAPTURE.RANGE) {
            if (scene.allies.length < ALLY.MAX_COUNT) {
                // 아군 자리가 남아 있으면 바로 영입
                const x = candidate.x;
                const y = candidate.y;
                const monsterType = candidate.monsterType;
                const monsterKey = candidate.monsterKey;

                destroyCaptureCandidate(scene, candidate);
                scene.captureCandidates.splice(i, 1);

                spawnAlly(
                    scene,
                    x,
                    y,
                    monsterType,
                    monsterKey
                );
            } else if (!scene.isReplacingAlly) {
                // 아군이 최대 보유 수에 도달하면 교체 모드 시작
                scene.isReplacingAlly = true;
                scene.selectedCaptureCandidate = candidate;
                scene.time.paused = true;

                console.log('아군 교체 모드 시작!');

                // 아군 교체 요청 이벤트 발생
                scene.events.emit(GAME_EVENTS.ALLY_REPLACE_REQUESTED);
            }
        }
    }
}

// 포획 후보 제거
export function destroyCaptureCandidate(scene, candidate) {
    if (!candidate || !candidate.active) return;

    if (candidate.monsterImage) {
        candidate.monsterImage.destroy();
    }

    // 버블 애니메이션 종료
    scene.tweens.killTweensOf(candidate);

    // 버블의 빛 반사 효과 제거
    if (candidate.reflection) {
        scene.tweens.killTweensOf(candidate.reflection);
        candidate.reflection.destroy();
    }

    candidate.destroy();
}

// 포획 후보 생성
export function spawnCaptureCandidate(
    scene,
    x,
    y,
    monsterType,
    monsterKey
) {
    // 포획 후보를 감싸는 투명한 흰색 버블
    const candidate = scene.add.circle(
        x, y, 34, 0xffffff, 0.05
    );

    // 버블의 흰색 테두리
    candidate.setStrokeStyle(2, 0xffffff, 0.85);
    candidate.setDepth(1);

    // 버블 표면의 빛 반사 효과
    candidate.reflection = scene.add.graphics();

    candidate.reflection.lineStyle(3, 0xffffff, 0.9);
    candidate.reflection.beginPath();
    candidate.reflection.arc(
        0, 0, 29,
        Phaser.Math.DegToRad(195),
        Phaser.Math.DegToRad(255)
    );
    candidate.reflection.strokePath();

    // 오른쪽 아래의 작은 빛 반사
    candidate.reflection.lineStyle(2, 0xffffff, 0.5);
    candidate.reflection.beginPath();
    candidate.reflection.arc(
        0, 0, 23,
        Phaser.Math.DegToRad(25),
        Phaser.Math.DegToRad(65)
    );
    candidate.reflection.strokePath();

    candidate.reflection.setPosition(x, y);
    candidate.reflection.setDepth(4);

    // 버블 확대·축소 및 밝기 애니메이션
    scene.tweens.add({
        targets: [candidate, candidate.reflection],
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: { from: 0.6, to: 1 },
        duration: 700,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });

    candidate.monsterType = monsterType;
    candidate.monsterKey = monsterKey;

    // 포획 후보 이미지 생성 및 흰색 발광 효과
    candidate.monsterImage = createMonsterImage(
        scene,
        candidate,
        {
            size: 60,
            glowColor: 0xffffff,
            glowStrength: 5
        }
    );

    scene.captureCandidates.push(candidate);

    // 설정된 유지 시간이 지나면 포획 후보 소멸
    scene.time.delayedCall(CAPTURE.DURATION, () => {
        // 게임 오버 상태라면 삭제하지 않음
        if (scene.isGameOver) return;

        if (!candidate.active) return;

        // 교체 중인 포획 후보 보호
        if (
            scene.isReplacingAlly &&
            candidate === scene.selectedCaptureCandidate
        ) {
            return;
        }

        destroyCaptureCandidate(scene, candidate);

        scene.captureCandidates =
            scene.captureCandidates.filter(
                item => item !== candidate
            );
    });
}
