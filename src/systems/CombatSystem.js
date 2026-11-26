import Phaser from 'phaser';
import { spawnEnemy } from '../entities/Enemy.js';
import { updateHealthUI } from '../ui/HealthUI.js';
import { showGameOverUI } from '../ui/GameOverUI.js';

import {
    GAME,
    PLAYER,
    ENEMY,
    ALLY,
    CAPTURE,
    COMBAT
} from '../config/gameConstants.js';

import {
    spawnCaptureCandidate
} from './CaptureSystem.js';

// 적과 플레이어 충돌 확인
export function checkPlayerCollision(scene, time) {
    for (const enemy of scene.enemies) {
        if (!enemy.active) continue;

        const distanceToPlayer = Phaser.Math.Distance.Between(
            scene.player.x,
            scene.player.y,
            enemy.x,
            enemy.y
        );

        if (
            distanceToPlayer <= COMBAT.CONTACT_HIT_RANGE &&
            scene.playerHp > 0 &&
            time - scene.lastPlayerHitTime >= PLAYER.HIT_COOLDOWN
        ) {
            scene.lastPlayerHitTime = time;

            // 플레이어 체력 감소
            scene.playerHp -= ENEMY.ATTACK_DAMAGE;

            // 하트 UI 갱신
            updateHealthUI(scene);

            // 체력이 0이면 게임 종료
            if (scene.playerHp <= 0) {
                scene.isGameOver = true;
                scene.time.paused = true;

                showGameOverUI(scene);
            }

            // 플레이어 피격 효과
            scene.playerImage.setTint(0xff6b6b);

            scene.time.delayedCall(200, () => {
                if (scene.playerImage.active) {
                    scene.playerImage.clearTint();
                }
            });

            // 한 프레임에 중복 피격 방지
            break;
        }
    }
}

// 적 마법탄 이동 및 충돌 처리
export function updateEnemyBullets(scene, time, dt) {
    for (let i = scene.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = scene.enemyBullets[i];

        // 탄환 이동
        bullet.x += bullet.vx * COMBAT.ENEMY_BULLET_SPEED * dt;
        bullet.y += bullet.vy * COMBAT.ENEMY_BULLET_SPEED * dt;

        // 플레이어와 탄환 사이 거리 계산
        const distanceToPlayer = Phaser.Math.Distance.Between(
            bullet.x,
            bullet.y,
            scene.player.x,
            scene.player.y
        );

        // 플레이어 피격 확인
        if (
            distanceToPlayer <= COMBAT.ENEMY_BULLET_HIT_RANGE &&
            time - scene.lastPlayerHitTime >= PLAYER.HIT_COOLDOWN
        ) {
            scene.lastPlayerHitTime = time;

            // 플레이어 체력 감소
            scene.playerHp -= ENEMY.ATTACK_DAMAGE;

            // 하트 UI 갱신
            updateHealthUI(scene);

            // 플레이어 피격 효과
            scene.playerImage.setTint(0xff6b6b);

            scene.time.delayedCall(200, () => {
                if (scene.playerImage.active) {
                    scene.playerImage.clearTint();
                }
            });

            // 탄환 제거
            bullet.destroy();
            scene.enemyBullets.splice(i, 1);

            // 체력이 0이면 게임 종료
            if (scene.playerHp <= 0) {
                scene.isGameOver = true;

                showGameOverUI(scene);
            }

            continue;
        }

        // 화면 밖으로 나간 탄환 제거
        if (
            bullet.x < 0 ||
            bullet.x > GAME.WIDTH ||
            bullet.y < 0 ||
            bullet.y > GAME.HEIGHT
        ) {
            bullet.destroy();
            scene.enemyBullets.splice(i, 1);
        }
    }
}

// 플레이어 및 아군 마법탄 이동과 충돌 처리
export function updateBullets(scene, dt) {
    for (let i = scene.bullets.length - 1; i >= 0; i--) {
        const bullet = scene.bullets[i];

        bullet.x += bullet.vx * COMBAT.FRIENDLY_BULLET_SPEED * dt;
        bullet.y += bullet.vy * COMBAT.FRIENDLY_BULLET_SPEED * dt;

        let bulletHit = false;

        for (const enemy of scene.enemies) {
            if (!enemy.active) continue;

            const bulletDistance = Phaser.Math.Distance.Between(
                bullet.x,
                bullet.y,
                enemy.x,
                enemy.y
            );

            if (bulletDistance <= COMBAT.FRIENDLY_BULLET_HIT_RANGE) {
                bullet.destroy();
                scene.bullets.splice(i, 1);

                // 충돌한 적에게 피해 적용
                const damage = bullet.isAllyBullet
                    ? ALLY.ATTACK_DAMAGE
                    : PLAYER.ATTACK_DAMAGE;

                damageEnemy(scene, damage, enemy);

                bulletHit = true;
                break;
            }
        }

        // 충돌한 마법탄은 이후 처리하지 않음
        if (bulletHit) {
            continue;
        }

        // 화면 밖으로 나간 탄환 제거
        if (
            bullet.x < 0 ||
            bullet.x > 800 ||
            bullet.y < 0 ||
            bullet.y > 600
        ) {
            bullet.destroy();
            scene.bullets.splice(i, 1);
        }
    }
}

// 플레이어에게 가장 가까운 적 찾기
export function getNearestEnemy(scene) {
    let nearestEnemy = null;
    let nearestDistance = Infinity;

    for (const enemy of scene.enemies) {
        if (!enemy.active) continue;

        const distance = Phaser.Math.Distance.Between(
            scene.player.x,
            scene.player.y,
            enemy.x,
            enemy.y
        );

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
        }
    }

    return nearestEnemy;
}

// 특정 캐릭터에게 가장 가까운 적 찾기
export function getNearestEnemyTo(scene, character) {
    let nearestEnemy = null;
    let nearestDistance = Infinity;

    for (const enemy of scene.enemies) {
        if (!enemy.active) continue;

        const distance = Phaser.Math.Distance.Between(
            character.x,
            character.y,
            enemy.x,
            enemy.y
        );

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
        }
    }

    return nearestEnemy;
}

// 플레이어 마법탄 생성
export function shootBullet(scene, targetEnemy) {
    if (!targetEnemy || !targetEnemy.active) return;

    const angle = Phaser.Math.Angle.Between(
        scene.player.x,
        scene.player.y,
        targetEnemy.x,
        targetEnemy.y
    );

    const bullet = scene.add.circle(
        scene.player.x,
        scene.player.y,
        6,
        0xe9d5ff
    );

    // 플레이어 마법탄 보라색 발광 효과
    bullet.postFX.addGlow(0xa855f7, 8, 0, false);

    bullet.vx = Math.cos(angle);
    bullet.vy = Math.sin(angle);

    scene.bullets.push(bullet);
}

// 적 피해 및 사망 처리
export function damageEnemy(
    scene,
    damage,
    targetEnemy = scene.enemy
) {
    if (!targetEnemy || !targetEnemy.active) return;

    const hitEnemy = targetEnemy;

    hitEnemy.hp -= damage;

    if (hitEnemy.hp <= 0) {
        // 사망 위치 저장
        const deadX = hitEnemy.x;
        const deadY = hitEnemy.y;

        // 처치한 몬스터의 종류 저장
        const deadMonsterType = hitEnemy.monsterType;
        const deadMonsterKey = hitEnemy.monsterKey;

        // 적이 죽으면 몬스터 이미지도 함께 제거
        if (hitEnemy.monsterImage) {
            hitEnemy.monsterImage.destroy();
        }

        hitEnemy.destroy();

        // 처치된 적을 배열에서 제거
        scene.enemies = scene.enemies.filter(
            enemy => enemy !== hitEnemy
        );

        scene.enemy = null;

        // 50% 확률로 포획 후보 등장
        if (Math.random() < CAPTURE.CHANCE) {
            spawnCaptureCandidate(
                scene,
                deadX,
                deadY,
                deadMonsterType,
                deadMonsterKey
            );
        }

        // ENEMY.RESPAWN_DELAY초 후 적 재생성
        scene.time.delayedCall(ENEMY.RESPAWN_DELAY, () => {
            if (!scene.isGameOver && !scene.isReplacingAlly) {
                spawnEnemy(scene);
            }
        });
    } else {
        // 피격 효과
        hitEnemy.setFillStyle(0xffffff);

        // PNG 몬스터도 피격 시 하얗게 반짝이기
        if (hitEnemy.monsterImage) {
            hitEnemy.monsterImage.setTintFill(0xffffff);
        }

        scene.time.delayedCall(100, () => {
            if (hitEnemy.active) {
                hitEnemy.setFillStyle(
                    hitEnemy.monsterType === 'ranged'
                        ? 0xb388ff
                        : 0xff6b6b
                );

                // PNG 이미지의 원래 색상 복구
                if (
                    hitEnemy.monsterImage &&
                    hitEnemy.monsterImage.active
                ) {
                    hitEnemy.monsterImage.clearTint();
                }
            }
        });
    }
}
