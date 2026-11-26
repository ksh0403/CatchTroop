import Phaser from 'phaser';

import {
    getNearestEnemyTo,
    damageEnemy
} from '../systems/CombatSystem.js';

import {
    MELEE_MONSTERS,
    RANGED_MONSTERS
} from '../data/monsterData.js';

// 아군 생성
export function spawnAlly(scene, x, y, monsterType, monsterKey) {
    if (scene.allies.length >= 10) return;

    const ally = scene.add.circle(
        x,
        y,
        13,
        0x6ee7b7
    );

    // 포획한 몬스터의 종류 저장
    ally.monsterType = monsterType;

    // 몬스터 이름 저장 (테스트용 아군은 랜덤 선택)
    ally.monsterKey = monsterKey ?? Phaser.Utils.Array.GetRandom(
        monsterType === 'melee'
            ? MELEE_MONSTERS
            : RANGED_MONSTERS
    );

    // 아군 종류에 따라 색상 구분
    if (ally.monsterType === 'ranged') {
        ally.setFillStyle(0x60a5fa);
    } else {
        ally.setFillStyle(0x6ee7b7);
    }

    // 근접형 아군 이미지 표시
    if (monsterType === 'melee') {
        ally.monsterImage = scene.add.image(
            ally.x,
            ally.y,
            ally.monsterKey
        );

        ally.monsterImage.setDisplaySize(48, 48);
        ally.monsterImage.setDepth(2);

        // 파란색 테두리 표시
        ally.monsterImage.postFX.addGlow(
            0x3b82f6,
            4,
            0,
            false,
            0.1,
            12
        );

        ally.setAlpha(0);
    }

    // 원거리형 아군 이미지 표시
    if (monsterType === 'ranged') {
        ally.monsterImage = scene.add.image(
            ally.x,
            ally.y,
            ally.monsterKey
        );

        ally.monsterImage.setDisplaySize(48, 48);
        ally.monsterImage.setDepth(2);

        // 파란색 테두리 표시
        ally.monsterImage.postFX.addGlow(
            0x3b82f6,
            4,
            0,
            false,
            0.1,
            12
        );

        ally.setAlpha(0);
    }

    // 아군별 공격 시간 기록
    ally.lastAttackTime = 0;

    scene.allies.push(ally);

    scene.allyText.setText(
        `Allies: ${scene.allies.length} / 10`
    );
}

// 아군 이동 및 공격
export function updateAllies(scene, time, dt) {
    for (let i = 0; i < scene.allies.length; i++) {
        const ally = scene.allies[i];

        // 이동 전 아군 위치 저장
        const oldAllyX = ally.x;
        const oldAllyY = ally.y;

        let isFighting = false;

        // 아군에게 가장 가까운 적 찾기
        const targetEnemy = getNearestEnemyTo(scene, ally);

        // 가까운 적이 존재하면 전투 여부 확인
        if (targetEnemy && targetEnemy.active) {
            const enemyDistance = Phaser.Math.Distance.Between(
                ally.x,
                ally.y,
                targetEnemy.x,
                targetEnemy.y
            );

            // 적이 180px 이내면 전투 시작
            if (enemyDistance <= 180) {
                isFighting = true;

                // 아군 종류에 따라 목표 거리 설정
                const targetDistance =
                    ally.monsterType === 'ranged' ? 120 : 28;

                // 목표 거리보다 멀면 적에게 접근
                if (enemyDistance > targetDistance) {
                    const attackDirection = new Phaser.Math.Vector2(
                        targetEnemy.x - ally.x,
                        targetEnemy.y - ally.y
                    ).normalize();

                    const moveDistance = Math.min(
                        170 * dt,
                        enemyDistance - targetDistance
                    );

                    ally.x += attackDirection.x * moveDistance;
                    ally.y += attackDirection.y * moveDistance;
                }

                // 이동 후 적과의 거리 다시 계산
                const newDistance = Phaser.Math.Distance.Between(
                    ally.x,
                    ally.y,
                    targetEnemy.x,
                    targetEnemy.y
                );

                // 아군 종류에 따라 공격 가능 거리 설정
                const attackRange =
                    ally.monsterType === 'ranged' ? 150 : 30;

                // 공격 거리 안이면 0.8초마다 공격
                if (
                    newDistance <= attackRange &&
                    time - ally.lastAttackTime >= 800
                ) {
                    ally.lastAttackTime = time;

                    if (ally.monsterType === 'ranged') {
                        // 원거리형: 마법탄 발사
                        const angle = Phaser.Math.Angle.Between(
                            ally.x,
                            ally.y,
                            targetEnemy.x,
                            targetEnemy.y
                        );

                        const bullet = scene.add.circle(
                            ally.x,
                            ally.y,
                            5,
                            0xbfdbfe
                        );

                        // 파란색 발광 효과
                        bullet.postFX.addGlow(
                            0x3b82f6, 8, 0, false
                        );

                        bullet.vx = Math.cos(angle);
                        bullet.vy = Math.sin(angle);

                        // 아군이 발사한 탄환임을 기록
                        bullet.isAllyBullet = true;

                        scene.bullets.push(bullet);
                    } else {
                        // 근접형: 직접 피해
                        damageEnemy(scene, 1, targetEnemy);
                    }
                }
            }
        }

        // 전투 중이라면 진형 복귀 생략
        if (isFighting) {
            continue;
        }

        // 적이 없거나 멀면 원형 진형 복귀
        const angle =
            (Math.PI * 2 * i) / scene.allies.length;

        const targetX =
            scene.player.x + Math.cos(angle) * 80;

        const targetY =
            scene.player.y + Math.sin(angle) * 80;

        const allyDirection = new Phaser.Math.Vector2(
            targetX - ally.x,
            targetY - ally.y
        );

        const distance = allyDirection.length();

        if (distance > 5) {
            allyDirection.normalize();

            const moveDistance = Math.min(
                230 * dt,
                distance
            );

            ally.x += allyDirection.x * moveDistance;
            ally.y += allyDirection.y * moveDistance;
        }
    }
}

// 아군 간격 유지
export function separateAllies(scene) {
    for (let i = 0; i < scene.allies.length; i++) {
        for (let j = i + 1; j < scene.allies.length; j++) {
            const allyA = scene.allies[i];
            const allyB = scene.allies[j];

            // 아군 최소 간격 30px
            const minAllyDistance = 30;

            const dx = allyB.x - allyA.x;
            const dy = allyB.y - allyA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minAllyDistance) {
                const angle = distance === 0
                    ? Math.random() * Math.PI * 2
                    : Math.atan2(dy, dx);

                const overlap =
                    (minAllyDistance - distance) / 2;

                const pushX = Math.cos(angle) * overlap;
                const pushY = Math.sin(angle) * overlap;

                allyA.x -= pushX;
                allyA.y -= pushY;

                allyB.x += pushX;
                allyB.y += pushY;
            }
        }
    }
}

// 아군 이동 애니메이션
export function updateAllyAnimations(scene, time) {
    for (const ally of scene.allies) {
        if (ally.active && ally.monsterImage) {
            let allyBounce = 0;

            // 아군의 실제 이동 여부 확인
            const isAllyMoving =
                ally.x !== ally.prevX || ally.y !== ally.prevY;

            // 몬스터별 애니메이션 타이밍 설정
            if (ally.bounceOffset === undefined) {
                ally.bounceOffset = Math.random() * Math.PI * 2;
            }

            // 근접형 아군 이동 효과
            if (ally.monsterType === 'melee' && isAllyMoving) {
                allyBounce = Math.abs(
                    Math.sin(time * 0.010 + ally.bounceOffset)
                ) * 2;
            }

            // 원거리형 아군 부유 효과
            if (ally.monsterType === 'ranged') {
                allyBounce = Math.sin(
                    time * 0.005 + ally.bounceOffset
                ) * 2;
            }

            ally.monsterImage.setPosition(
                ally.x,
                ally.y - allyBounce
            );

            // 이동 방향에 따라 이미지 좌우 반전
            if (ally.x < ally.prevX) {
                ally.monsterImage.setFlipX(false);
            } else if (ally.x > ally.prevX) {
                ally.monsterImage.setFlipX(true);
            }

            // 현재 위치 저장
            ally.prevX = ally.x;
            ally.prevY = ally.y;

            // 현재 위치 저장
            ally.prevX = ally.x;
            ally.prevY = ally.y;
        }
    }
}
