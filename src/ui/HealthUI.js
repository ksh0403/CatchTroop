import { PLAYER } from '../config/gameConstants.js';

// 플레이어 체력 UI 생성
export function createHealthUI(scene) {
    scene.hpText = scene.add.text(20, 50, 'HP:', {
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
    });

    // 체력 하트 이미지
    scene.hpHearts = [];

    for (let i = 0; i < PLAYER.MAX_HP; i++) {
        const heart = scene.add.image(
            85 + i * 38,
            63,
            'heart'
        );

        heart.setDisplaySize(45, 32);
        scene.hpHearts.push(heart);
    }
}

// 플레이어 체력 UI 갱신
export function updateHealthUI(scene) {
    scene.hpHearts.forEach((heart, index) => {
        heart.setVisible(index < scene.playerHp);
    });
}
