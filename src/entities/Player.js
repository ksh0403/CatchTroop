import Phaser from 'phaser';

import {
    getNearestEnemy,
    shootBullet
} from '../systems/CombatSystem.js';

// 플레이어 생성 및 초기 설정
export function createPlayer(scene) {
    scene.player = scene.add.circle(
        400, 300, 20, 0xffd166
    );

    // 플레이어 이미지 표시
    scene.playerImage = scene.add.image(
        scene.player.x,
        scene.player.y,
        'player'
    );

    scene.playerImage.setDisplaySize(86, 72);
    scene.playerImage.setDepth(3);

    // 기존 노란색 원 숨기기
    scene.player.setAlpha(0);

    // 플레이어 체력
    scene.playerMaxHp = 5;
    scene.playerHp = 5;
    scene.lastPlayerHitTime = -1000;
    scene.isGameOver = false;
}

// 플레이어 이동 및 애니메이션
export function updatePlayer(scene, time, dt) {
    let dx = 0;
    let dy = 0;

    if (scene.cursors.left.isDown || scene.wasd.left.isDown) dx -= 1;
    if (scene.cursors.right.isDown || scene.wasd.right.isDown) dx += 1;
    if (scene.cursors.up.isDown || scene.wasd.up.isDown) dy -= 1;
    if (scene.cursors.down.isDown || scene.wasd.down.isDown) dy += 1;

    const direction = new Phaser.Math.Vector2(dx, dy).normalize();

    scene.player.x += direction.x * 200 * dt;
    scene.player.y += direction.y * 200 * dt;

    scene.player.x = Phaser.Math.Clamp(scene.player.x, 20, 780);
    scene.player.y = Phaser.Math.Clamp(scene.player.y, 20, 580);

    // 플레이어 이동 애니메이션
    let bounce = 0;

    if (dx !== 0 || dy !== 0) {
        bounce = Math.abs(Math.sin(time * 0.012)) * 3;
    }

    scene.playerImage.setPosition(
        scene.player.x,
        scene.player.y - bounce
    );

    // 이동 방향에 따른 이미지 좌우 반전
    if (dx < 0) {
        scene.playerImage.setFlipX(true);
    } else if (dx > 0) {
        scene.playerImage.setFlipX(false);
    }
}

// 플레이어 자동 공격
export function updatePlayerAttack(scene, time) {
    const nearestEnemy = getNearestEnemy(scene);

    if (nearestEnemy) {
        const distanceToEnemy = Phaser.Math.Distance.Between(
            scene.player.x,
            scene.player.y,
            nearestEnemy.x,
            nearestEnemy.y
        );

        if (
            distanceToEnemy <= 200 &&
            time - scene.lastAttackTime >= 600
        ) {
            shootBullet(scene, nearestEnemy);
            scene.lastAttackTime = time;
        }
    }
}
