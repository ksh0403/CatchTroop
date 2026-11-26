import Phaser from 'phaser';
import { assetPath } from '../utils/assetPath.js';

// 게임 시작 화면
export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    preload() {
        // 타이틀 화면 이미지 불러오기
        this.load.image(
            'title_screen',
            assetPath('ui/title_screen.png')
        );
    
        // 시작 버튼 이미지 불러오기
        this.load.image(
            'start_button',
            assetPath('ui/start_button.png')
        );
    }

    create() {
        // 시작 화면 배경
        this.add.image(400, 300, 'title_screen')
            .setDisplaySize(800, 600);

        // 게임 시작 버튼
        this.startButton = this.add.image(
            400, 440, 'start_button'
        );

        this.startButton.setDisplaySize(400, 130);

        // 버튼 클릭 가능하도록 설정
        this.startButton.setInteractive({
            useHandCursor: true
        });

        // 시작 버튼 기본 크기 저장
        const buttonScaleX = this.startButton.scaleX;
        const buttonScaleY = this.startButton.scaleY;

        // 마우스를 올렸을 때
        this.startButton.on('pointerover', () => {
            this.tweens.killTweensOf(this.startButton);

            this.tweens.add({
                targets: this.startButton,
                scaleX: buttonScaleX * 1.05,
                scaleY: buttonScaleY * 1.05,
                duration: 180,
                ease: 'Sine.easeOut'
            });

            // 시작 버튼 보라색 발광 효과
            this.startButton.postFX.addGlow(
                0xc084fc,
                2,
                0,
                false,
                0.1,
                5
            );
        });

        // 마우스가 벗어났을 때
        this.startButton.on('pointerout', () => {
            this.tweens.killTweensOf(this.startButton);

            this.tweens.add({
                targets: this.startButton,
                scaleX: buttonScaleX,
                scaleY: buttonScaleY,
                duration: 180,
                ease: 'Sine.easeOut'
            });

            // 시작 버튼 발광 효과 제거
            this.startButton.postFX.clear();
        });

        // 게임 시작 버튼 클릭 이벤트
        this.startButton.on('pointerdown', () => {
            // 중복 클릭 방지
            this.startButton.removeAllListeners();
            this.startButton.disableInteractive();

            // 기존 버튼 애니메이션 중단
            this.tweens.killTweensOf(this.startButton);

            // 버튼을 누르는 효과
            this.tweens.add({
                targets: this.startButton,
                scaleX: buttonScaleX * 0.95,
                scaleY: buttonScaleY * 0.95,
                duration: 120,
                ease: 'Sine.easeOut',

                onComplete: () => {
                    // 화면이 서서히 어두워지는 효과
                    this.cameras.main.fadeOut(600, 0, 0, 0);

                    // 화면 전환 완료 후 게임 시작
                    this.cameras.main.once(
                        'camerafadeoutcomplete',
                        () => {
                            this.scene.start('GameScene');
                        }
                    );
                }
            });
        });
    }
}