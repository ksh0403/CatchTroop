import Phaser from 'phaser';
import { ENEMY } from '../config/gameConstants.js';

import {
    MELEE_MONSTERS,
    RANGED_MONSTERS
} from '../data/monsterData.js';

// 적 몬스터 생성
export function spawnEnemy(scene) {
    let spawnX = 100;
    let spawnY = 100;
    let validPosition = false;

    // 최대 30번까지 겹치지 않는 위치 탐색
    for (let attempt = 0; attempt < 30; attempt++) {
        const x = Phaser.Math.Between(30, 770);
        const y = Phaser.Math.Between(100, 520);

        // 다른 적과 최소 50px 간격 유지
        const tooCloseToEnemy = scene.enemies.some(enemy => {
            return Phaser.Math.Distance.Between(
                x, y, enemy.x, enemy.y
            ) < 50;
        });

        // 플레이어와 최소 150px 간격 유지
        const tooCloseToPlayer =
            Phaser.Math.Distance.Between(
                x, y, scene.player.x, scene.player.y
            ) < 150;

        if (!tooCloseToEnemy && !tooCloseToPlayer) {
            spawnX = x;
            spawnY = y;
            validPosition = true;
            break;
        }
    }

    // 적당한 위치를 찾지 못했다면 생성 건너뛰기
    if (!validPosition) return;

    const enemy = scene.add.circle(
        spawnX,
        spawnY,
        15,
        0xff6b6b
    );

    enemy.hp = ENEMY.MAX_HP;
    enemy.lastAttackTime = 0;

    // 몬스터 종류 결정
    enemy.monsterType = Math.random() < 0.5
        ? 'melee'
        : 'ranged';

    // 몬스터 종류에 맞는 목록 선택
    const monsterList =
        enemy.monsterType === 'melee'
            ? MELEE_MONSTERS
            : RANGED_MONSTERS;

    // 목록에서 몬스터 한 마리 랜덤 선택
    enemy.monsterKey = Phaser.Utils.Array.GetRandom(
        monsterList
    );

    // 몬스터 종류에 따라 색상 구분
    if (enemy.monsterType === 'melee') {
        enemy.setFillStyle(0xff6b6b);
    } else {
        enemy.setFillStyle(0xb388ff);
    }

    // 근접형 적 이미지 표시
    if (enemy.monsterType === 'melee') {
        enemy.monsterImage = scene.add.image(
            enemy.x,
            enemy.y,
            enemy.monsterKey
        );

        enemy.monsterImage.setDisplaySize(48, 48);
        enemy.monsterImage.setDepth(2);

        enemy.monsterImage.postFX.addGlow(
            0xff3333,
            4,
            0,
            false,
            0.1,
            12
        );
    }

    // 원거리형 적 이미지 표시
    if (enemy.monsterType === 'ranged') {
        enemy.monsterImage = scene.add.image(
            enemy.x,
            enemy.y,
            enemy.monsterKey
        );

        enemy.monsterImage.setDisplaySize(48, 48);
        enemy.monsterImage.setDepth(2);

        enemy.monsterImage.postFX.addGlow(
            0xff3333,
            4,
            0,
            false,
            0.1,
            12
        );
    }

    // 이미지가 있는 적은 기존 원을 숨김
    if (enemy.monsterImage) {
        enemy.setAlpha(0);
    }

    scene.enemies.push(enemy);

    // 기존 코드와의 호환성 유지
    scene.enemy = enemy;
}

// 적 몬스터 추적 및 공격
export function updateEnemies(scene, time, dt) {
    for (const enemy of scene.enemies) {
        if (!enemy.active) continue;

        const enemyDirection = new Phaser.Math.Vector2(
            scene.player.x - enemy.x,
            scene.player.y - enemy.y
        );

        const distance = enemyDirection.length();

        // 몬스터 종류에 따라 목표 거리 설정
        const targetDistance =
            enemy.monsterType === 'ranged' ? ENEMY.RANGED_DISTANCE : ENEMY.MELEE_DISTANCE;

        if (distance > targetDistance) {
            enemyDirection.normalize();

            const moveDistance = Math.min(
                ENEMY.MOVE_SPEED * dt,
                distance - targetDistance
            );

            enemy.x += enemyDirection.x * moveDistance;
            enemy.y += enemyDirection.y * moveDistance;
        }

        // 몬스터 이미지 이동 애니메이션
        if (enemy.monsterImage) {
            let enemyBounce = 0;

            // 근접형 몬스터 이동 효과
            if (
                enemy.monsterType === 'melee' &&
                distance > targetDistance
            ) {
                enemyBounce = Math.abs(
                    Math.sin(time * 0.015 + enemy.lastAttackTime)
                ) * 2;
            }

            // 원거리형 몬스터 부유 효과
            if (enemy.monsterType === 'ranged') {
                enemyBounce = Math.sin(time * 0.005) * 2;
            }

            enemy.monsterImage.setPosition(
                enemy.x,
                enemy.y - enemyBounce
            );

            // 이동 방향에 따른 이미지 좌우 반전
            if (enemy.x < enemy.prevX) {
                enemy.monsterImage.setFlipX(false);
            } else if (enemy.x > enemy.prevX) {
                enemy.monsterImage.setFlipX(true);
            }

            enemy.prevX = enemy.x;
            enemy.prevY = enemy.y;
        }

        // 원거리형 몬스터 공격
        if (
            enemy.monsterType === 'ranged' &&
            distance <= ENEMY.RANGED_ATTACK_RANGE &&
            time - enemy.lastAttackTime >= ENEMY.ATTACK_COOLDOWN
        ) {
            enemy.lastAttackTime = time;

            const angle = Phaser.Math.Angle.Between(
                enemy.x,
                enemy.y,
                scene.player.x,
                scene.player.y
            );

            const bullet = scene.add.circle(
                enemy.x,
                enemy.y,
                6,
                0xfecaca
            );

            // 적군 마법탄 빨간색 발광 효과
            bullet.postFX.addGlow(0xff3333, 8, 0, false);

            bullet.vx = Math.cos(angle);
            bullet.vy = Math.sin(angle);

            scene.enemyBullets.push(bullet);
        }
    }
}

// 적 몬스터 간격 유지
export function separateEnemies(scene) {
    const minEnemyDistance = ENEMY.MIN_DISTANCE;

    for (let i = 0; i < scene.enemies.length; i++) {
        for (let j = i + 1; j < scene.enemies.length; j++) {
            const enemyA = scene.enemies[i];
            const enemyB = scene.enemies[j];

            if (!enemyA.active || !enemyB.active) continue;

            const dx = enemyB.x - enemyA.x;
            const dy = enemyB.y - enemyA.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minEnemyDistance) {
                const angle =
                    distance === 0
                        ? Math.random() * Math.PI * 2
                        : Math.atan2(dy, dx);

                const overlap =
                    (minEnemyDistance - distance) / 2;

                const pushX = Math.cos(angle) * overlap;
                const pushY = Math.sin(angle) * overlap;

                enemyA.x -= pushX;
                enemyA.y -= pushY;

                enemyB.x += pushX;
                enemyB.y += pushY;
            }
        }
    }
}
