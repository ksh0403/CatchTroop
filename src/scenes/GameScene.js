import Phaser from 'phaser';

import {
    MELEE_MONSTERS,
    RANGED_MONSTERS
} from '../data/monsterData.js';

import {
    createPlayer,
    updatePlayer,
    updatePlayerAttack
} from '../entities/Player.js';

import {
    spawnEnemy,
    updateEnemies,
    separateEnemies
} from '../entities/Enemy.js';

import {
    spawnAlly,
    updateAllies,
    separateAllies,
    updateAllyAnimations
} from '../entities/Ally.js';

import {
    checkPlayerCollision,
    updateEnemyBullets,
    updateBullets
} from '../systems/CombatSystem.js';

import {
    updateCaptureCandidates,
    destroyCaptureCandidate
} from '../systems/CaptureSystem.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // 몬스터 이미지 불러오기
    preload() {
        // 게임 필드 배경 이미지
        this.load.image(
            'field_background',
            'src/assets/backgrounds/field_background.png'
        );

        // 체력 하트 이미지 불러오기
        this.load.image('heart', 'src/assets/ui/heart.png');

        // 플레이어 이미지 불러오기
        this.load.image('player', 'src/assets/player/player.png');

        // 근접형 몬스터 10종 불러오기
        for (const monster of MELEE_MONSTERS) {
            this.load.image(
                monster,
                `src/assets/monsters/melee/${monster}.png`
            );
        }

        // 원거리형 몬스터 10종 불러오기
        for (const monster of RANGED_MONSTERS) {
            this.load.image(
                monster,
                `src/assets/monsters/ranged/${monster}.png`
            );
        }
    }

    create() {
        // 게임 화면이 서서히 밝아지는 효과
        this.cameras.main.fadeIn(600, 0, 0, 0);

        // 게임 필드 배경 표시
        this.fieldBackground = this.add.image(
            400, 300, 'field_background'
        );

        this.fieldBackground.setDisplaySize(800, 600);
        this.fieldBackground.setDepth(-100);

        // 배경
        this.cameras.main.setBackgroundColor('#294b3a');

        // 플레이어 생성
        createPlayer(this);

        // 키보드 입력
        this.cursors = this.input.keyboard.createCursorKeys();
        this.restartKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.R
        );

        // 개발용 테스트 키: T
        this.testKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.T
        );

        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });

        // 마법탄
        this.bullets = [];
        this.lastAttackTime = 0;

        // 적이 발사하는 투사체
        this.enemyBullets = [];

        // 아군
        this.allies = [];

        // 아군 교체 창이 열려 있는지 확인
        this.isReplacingAlly = false;

        // 포획 후보
        this.captureCandidates = [];

        // 적
        this.enemy = null;
        this.enemies = [];
        spawnEnemy(this);

        // 5초마다 새로운 적 생성
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                if (!this.isGameOver && !this.isReplacingAlly) {
                    spawnEnemy(this);
                }
            },
            loop: true,
        });

        this.allyText = this.add.text(20, 20, 'Allies: 0 / 10', {
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });

        // 플레이어 체력 UI
        this.hpText = this.add.text(20, 50, 'HP:', {
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });

        // 체력 하트 이미지
        this.hpHearts = [];

        for (let i = 0; i < 5; i++) {
            const heart = this.add.image(85 + i * 38, 63, 'heart');
            heart.setDisplaySize(45, 32);
            this.hpHearts.push(heart);
        }

        this.add.text(400, 550, 'Move: WASD / Arrow Keys', {
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);
    }

    update(time, delta) {
        // 아군 교체 창이 열려 있으면 게임 진행 중단
        if (this.isReplacingAlly) {
            return;
        }

        // 게임 오버 및 재시작
        if (this.isGameOver) {
            // R 키를 누르면 게임 처음부터 다시 시작
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
                this.time.paused = false;
                this.scene.restart();
            }

            return;
        }

        const dt = delta / 1000;

        // 개발용 테스트
        this.handleDebugInput();

        // 포획 후보 영입
        updateCaptureCandidates(this);

        // 플레이어 이동
        updatePlayer(this, time, dt);

        // 적 몬스터 추적 및 공격
        updateEnemies(this, time, dt);

        // 적 몬스터 간격 유지
        separateEnemies(this);

        // 플레이어 충돌 확인
        checkPlayerCollision(this, time);

        // 적 마법탄 처리
        updateEnemyBullets(this, time, dt);

        // 플레이어 자동 공격
        updatePlayerAttack(this, time);

        // 플레이어 및 아군 마법탄 처리
        updateBullets(this, dt);

        // 아군 이동 및 공격
        updateAllies(this, time, dt);

        // 아군 간격 유지
        separateAllies(this);

        // 아군 이동 애니메이션
        updateAllyAnimations(this, time);
    }

    // 개발용 테스트: T 키를 누르면 아군 10마리 채우기
    handleDebugInput() {
        if (Phaser.Input.Keyboard.JustDown(this.testKey)) {
            while (this.allies.length < 10) {
                const monsterType = Math.random() < 0.5
                    ? 'melee'
                    : 'ranged';

                spawnAlly(
                    this,
                    this.player.x,
                    this.player.y,
                    monsterType
                );
            }

            console.log('테스트용 아군 10마리 생성 완료!');
        }
    }

    // ─────────────────────
    // 8. 아군 생성
    // ─────────────────────

    showReplaceUI() {
        // 교체 창 배경
        this.replacePanel = this.add.rectangle(
            400, 300, 680, 320, 0x172a23
        ).setStrokeStyle(3, 0xffffff).setDepth(20);

        // 안내 문구
        this.replaceText = this.add.text(
            400, 180,
            'Troop Full! Choose an ally to replace.',
            {
                fontSize: '22px',
                color: '#ffffff',
                fontStyle: 'bold',
            }
        ).setOrigin(0.5).setDepth(21);

        // 아군 선택 버튼을 저장할 배열
        this.replaceButtons = [];

        // 새로 포획한 몬스터 정보
        const candidate = this.selectedCaptureCandidate;

        const candidateType =
            candidate.monsterType === 'ranged'
                ? '원거리형'
                : '근접형';

        this.captureInfoText = this.add.text(
            145,
            240,
            `NEW CAPTURE\n${candidateType}`,
            {
                fontSize: '15px',
                color: '#facc15',
                align: 'center',
                lineSpacing: 8
            }
        ).setOrigin(0.5).setDepth(22);

        // 새로 포획한 몬스터의 미리보기
        const captureColor =
            candidate.monsterType === 'ranged'
                ? 0x60a5fa
                : 0x6ee7b7;

        this.capturePreview = this.add.circle(
            145,  // X: NEW CAPTURE와 같은 위치
            300,  // Y: 미리보기 위치
            32,   // 원의 반지름
            captureColor
        ).setDepth(22);

        // 새 포획 몬스터의 실제 이미지 표시
        const captureImageKey = candidate.monsterKey;

        this.capturePreviewImage = this.add.image(
            this.capturePreview.x,
            this.capturePreview.y,
            captureImageKey
        );

        this.capturePreviewImage.setDisplaySize(100, 100);
        this.capturePreviewImage.setDepth(101);

        // 몬스터 이미지 밝기 효과
        this.captureFlashFX =
            this.capturePreviewImage.postFX.addColorMatrix();

        // 새로 포획한 몬스터의 밝기 깜빡임 효과
        this.captureFlashTween = this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 100,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,

            onUpdate: (tween) => {
                const value = tween.getValue();

                this.capturePreviewImage.clearTint();
                this.capturePreviewImage.setAlpha(1);

                this.captureFlashFX.brightness(
                    1 + value * 0.8
                );

                // NEW CAPTURE 글씨도 함께 반짝이게 표시
                const textColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.HexStringToColor('#facc15'),
                    Phaser.Display.Color.HexStringToColor('#fff5b3'),
                    100,
                    value * 100
                );

                this.captureInfoText.setColor(
                    Phaser.Display.Color.RGBToString(
                        textColor.r,
                        textColor.g,
                        textColor.b
                    )
                );
            }
        });

        // 기존 미리보기 원 숨기기
        this.capturePreview.setAlpha(0);

        // 아군 10마리를 5개씩 2줄로 배치
        for (let i = 0; i < this.allies.length; i++) {
            const col = i % 5;
            const row = Math.floor(i / 5);

            const x = 260 + col * 100;
            const y = 250 + row * 75;

            // 아군 선택 칸의 둥근 배경
            const slotBg = this.add.graphics();

            // 선택 칸 배경을 그리는 함수
            const drawSlot = (color) => {
                slotBg.clear();
                slotBg.fillStyle(color, 1);
                slotBg.fillRoundedRect(
                    x - 45,
                    y - 32.5,
                    90,
                    65,
                    12
                );
            };

            // 기본 차콜 색상
            drawSlot(0x30383B);

            slotBg.setDepth(20);

            // 취소하거나 교체할 때 배경도 제거하도록 등록
            this.replaceButtons.push(slotBg);

            const monsterLabel =
                this.allies[i].monsterType === 'ranged'
                    ? '원거리형'
                    : '근접형';

            const button = this.add.text(
                x,
                y,
                monsterLabel,
                {
                    fontSize: '13px',
                    color: '#ffffff',
                    fixedWidth: 90,
                    fixedHeight: 65,
                    align: 'center',
                    padding: { top: 43 },
                }
            )
                .setOrigin(0.5)
                .setDepth(21)
                .setInteractive({ useHandCursor: true });

            this.replaceButtons.push(button);

            // 마우스를 올리면 살짝 밝아짐
            button.on('pointerover', () => {
                drawSlot(0x465256);
            });

            // 마우스를 벗어나면 원래 색으로 돌아옴
            button.on('pointerout', () => {
                drawSlot(0x30383B);
            });

            button.on('pointerdown', () => {
                // 1. 교체할 아군 제거
                const oldAlly = this.allies[i];

                // 교체되는 아군의 몬스터 이미지도 제거
                if (oldAlly.monsterImage) {
                    oldAlly.monsterImage.destroy();
                }

                oldAlly.destroy();
                this.allies.splice(i, 1);

                // 2. 새로 포획한 몬스터 정보 저장
                const candidate = this.selectedCaptureCandidate;

                const x = candidate.x;
                const y = candidate.y;
                const monsterType = candidate.monsterType;
                const monsterKey = candidate.monsterKey;

                // 3. 포획 후보 제거
                destroyCaptureCandidate(this, candidate);

                this.captureCandidates = this.captureCandidates.filter(
                    item => item !== candidate
                );

                // 4. 새 아군 합류
                spawnAlly(this, x, y, monsterType, monsterKey);

                // 새 아군을 원래 선택한 칸으로 이동
                const newAlly = this.allies.pop();
                this.allies.splice(i, 0, newAlly);

                // 5. 교체 창 닫기 및 교체 모드 종료
                this.closeReplaceUI();

                console.log('아군 교체 완료!');
            });

            // 선택 칸에 현재 아군의 모습 표시
            const ally = this.allies[i];
            const previewImageKey = ally.monsterKey;

            const preview = this.add.image(
                x,
                y - 8,
                previewImageKey
            );

            preview.setDisplaySize(40, 40);
            preview.setDepth(22);

            // 나중에 창을 닫을 때 함께 제거하기
            this.replaceButtons.push(preview);
        }

        // 교체 취소 버튼
        this.cancelButton = this.add.text(
            400, 405,
            'Don\'t Replace',
            {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#475569',
                padding: { x: 20, y: 10 },
            }
        )
            .setOrigin(0.5)
            .setDepth(21)
            .setInteractive({ useHandCursor: true });

        // 마우스를 올리면 버튼 밝게 표시
        this.cancelButton.on('pointerover', () => {
            this.cancelButton.setStyle({
                backgroundColor: '#64748b',
                color: '#ffffff'
            });
        });

        // 마우스를 떼면 기존 색상으로 복구
        this.cancelButton.on('pointerout', () => {
            this.cancelButton.setStyle({
                backgroundColor: '#475569',
                color: '#ffffff'
            });
        });

        // Don't Replace 버튼을 클릭하면 교체 창 닫기
        this.cancelButton.on('pointerdown', () => {
            // 포획 후보 제거
            const candidate = this.selectedCaptureCandidate;

            destroyCaptureCandidate(this, candidate);

            this.captureCandidates = this.captureCandidates.filter(
                item => item !== candidate
            );

            // 교체 창 닫기 + 타이머 재개
            this.closeReplaceUI();

            console.log('아군 교체 취소!');
        });
    }

    closeReplaceUI() {
        this.replacePanel.destroy();
        this.replaceText.destroy();
        this.captureInfoText.destroy();
        this.capturePreview.destroy();

        // NEW CAPTURE 깜빡임 효과 종료
        if (this.captureFlashTween) {
            this.captureFlashTween.remove();
            this.captureFlashTween = null;
        }

        this.capturePreviewImage.destroy();
        this.capturePreviewImage.destroy();
        this.cancelButton.destroy();

        this.replaceButtons.forEach(item => item.destroy());
        this.replaceButtons = [];

        this.selectedCaptureCandidate = null;
        this.isReplacingAlly = false;
        this.time.paused = false; // 게임 타이머 다시 시작
    }
}
