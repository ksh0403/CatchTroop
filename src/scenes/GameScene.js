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
        this.updateCaptureCandidates();

        // 플레이어 이동
        updatePlayer(this, time, dt);

        // 적 몬스터 추적 및 공격
        updateEnemies(this, time, dt);

        // 적 몬스터 간격 유지
        separateEnemies(this);

        // 플레이어 충돌 확인
        this.checkPlayerCollision(time);

        // 적 마법탄 처리
        this.updateEnemyBullets(time, dt);

        // 플레이어 자동 공격
        updatePlayerAttack(this, time);

        // 플레이어 및 아군 마법탄 처리
        this.updateBullets(dt);

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

    // 포획 후보 영입
    updateCaptureCandidates() {
        for (let i = this.captureCandidates.length - 1; i >= 0; i--) {
            const candidate = this.captureCandidates[i];

            if (!candidate.active) continue;

            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                candidate.x,
                candidate.y
            );

            if (distance <= 35) {
                if (this.allies.length < 10) {
                    // 아군 자리가 남아 있으면 바로 영입
                    const x = candidate.x;
                    const y = candidate.y;
                    const monsterType = candidate.monsterType;
                    const monsterKey = candidate.monsterKey;

                    this.destroyCaptureCandidate(candidate);
                    this.captureCandidates.splice(i, 1);

                    spawnAlly(this, x, y, monsterType, monsterKey);
                } else if (!this.isReplacingAlly) {
                    // 아군이 10마리면 교체 모드 시작
                    this.isReplacingAlly = true;
                    this.selectedCaptureCandidate = candidate;
                    this.time.paused = true;

                    console.log('아군 교체 모드 시작!');
                    this.showReplaceUI();
                }
            }
        }
    }

    // 적과 플레이어 충돌 확인
    checkPlayerCollision(time) {
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;

            const distanceToPlayer = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                enemy.x,
                enemy.y
            );

            if (
                distanceToPlayer <= 35 &&
                this.playerHp > 0 &&
                time - this.lastPlayerHitTime >= 1000
            ) {
                this.lastPlayerHitTime = time;

                // 플레이어 체력 감소
                this.playerHp -= 1;

                // 하트 UI 갱신
                this.hpHearts.forEach((heart, index) => {
                    heart.setVisible(index < this.playerHp);
                });

                // 체력이 0이면 게임 종료
                if (this.playerHp <= 0) {
                    this.isGameOver = true;
                    this.time.paused = true;

                    this.add.text(400, 300, 'GAME OVER', {
                        fontSize: '64px',
                        color: '#ff6b6b',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 5,
                    }).setOrigin(0.5).setDepth(10);

                    this.add.text(400, 355, 'Press R to Restart', {
                        fontSize: '18px',
                        color: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 3,
                    }).setOrigin(0.5).setDepth(10);
                }

                // 플레이어 피격 효과
                this.playerImage.setTint(0xff6b6b);

                this.time.delayedCall(200, () => {
                    if (this.playerImage.active) {
                        this.playerImage.clearTint();
                    }
                });

                // 한 프레임에 중복 피격 방지
                break;
            }
        }
    }

    // 적 마법탄 이동 및 충돌 처리
    updateEnemyBullets(time, dt) {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];

            // 탄환 이동
            bullet.x += bullet.vx * 180 * dt;
            bullet.y += bullet.vy * 180 * dt;

            // 플레이어와 탄환 사이 거리 계산
            const distanceToPlayer = Phaser.Math.Distance.Between(
                bullet.x,
                bullet.y,
                this.player.x,
                this.player.y
            );

            // 플레이어 피격 확인
            if (
                distanceToPlayer <= 26 &&
                time - this.lastPlayerHitTime >= 1000
            ) {
                this.lastPlayerHitTime = time;

                // 플레이어 체력 감소
                this.playerHp -= 1;

                // 하트 UI 갱신
                this.hpHearts.forEach((heart, index) => {
                    heart.setVisible(index < this.playerHp);
                });

                // 플레이어 피격 효과
                this.playerImage.setTint(0xff6b6b);

                this.time.delayedCall(200, () => {
                    if (this.playerImage.active) {
                        this.playerImage.clearTint();
                    }
                });

                // 탄환 제거
                bullet.destroy();
                this.enemyBullets.splice(i, 1);

                // 체력이 0이면 게임 종료
                if (this.playerHp <= 0) {
                    this.isGameOver = true;

                    this.add.text(400, 300, 'GAME OVER', {
                        fontSize: '64px',
                        color: '#ff6b6b',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 5,
                    }).setOrigin(0.5).setDepth(10);

                    this.add.text(400, 355, 'Press R to Restart', {
                        fontSize: '18px',
                        color: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 3,
                    }).setOrigin(0.5).setDepth(10);
                }

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
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    // 플레이어 및 아군 마법탄 이동과 충돌 처리
    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            bullet.x += bullet.vx * 350 * dt;
            bullet.y += bullet.vy * 350 * dt;

            let bulletHit = false;

            for (const enemy of this.enemies) {
                if (!enemy.active) continue;

                const bulletDistance = Phaser.Math.Distance.Between(
                    bullet.x,
                    bullet.y,
                    enemy.x,
                    enemy.y
                );

                if (bulletDistance <= 21) {
                    bullet.destroy();
                    this.bullets.splice(i, 1);

                    // 충돌한 적에게 피해 적용
                    this.damageEnemy(1, enemy);

                    bulletHit = true;
                    break;
                }
            }

            // 충돌한 마법탄은 이후 처리하지 않음
            if (bulletHit) {
                continue;
            }


            if (
                bullet.x < 0 ||
                bullet.x > 800 ||
                bullet.y < 0 ||
                bullet.y > 600
            ) {
                bullet.destroy();
                this.bullets.splice(i, 1);
            }
        }
    }

    // ─────────────────────
    // 6. 마법탄 생성
    // ─────────────────────

    // 플레이어에게 가장 가까운 적 찾기
    getNearestEnemy() {
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        for (const enemy of this.enemies) {
            if (!enemy.active) continue;

            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
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
    getNearestEnemyTo(character) {
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        for (const enemy of this.enemies) {
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

    shootBullet(targetEnemy) {
        if (!targetEnemy || !targetEnemy.active) return;

        const angle = Phaser.Math.Angle.Between(
            this.player.x,
            this.player.y,
            targetEnemy.x,
            targetEnemy.y
        );

        const bullet = this.add.circle(
            this.player.x,
            this.player.y,
            6,
            0xe9d5ff
        );

        // 플레이어 마법탄 보라색 발광 효과
        bullet.postFX.addGlow(0xa855f7, 8, 0, false);

        bullet.vx = Math.cos(angle);
        bullet.vy = Math.sin(angle);

        this.bullets.push(bullet);
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
                this.destroyCaptureCandidate(candidate);

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

            this.destroyCaptureCandidate(candidate);

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

    // 포획 후보와 몬스터 이미지를 함께 제거
    destroyCaptureCandidate(candidate) {
        if (!candidate || !candidate.active) return;

        if (candidate.monsterImage) {
            candidate.monsterImage.destroy();
        }

        // 버블 애니메이션 종료
        this.tweens.killTweensOf(candidate);

        // 버블의 빛 반사 효과 제거
        if (candidate.reflection) {
            this.tweens.killTweensOf(candidate.reflection);
            candidate.reflection.destroy();
        }

        candidate.destroy();
    }

    // ─────────────────────
    // 포획 후보 생성
    // ─────────────────────

    spawnCaptureCandidate(x, y, monsterType, monsterKey) {
        /// 포획 후보를 감싸는 투명한 흰색 버블
        const candidate = this.add.circle(x, y, 34, 0xffffff, 0.05);

        // 버블의 흰색 테두리
        candidate.setStrokeStyle(2, 0xffffff, 0.85);
        candidate.setDepth(1);

        // 버블 표면의 빛 반사 효과
        candidate.reflection = this.add.graphics();

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

        // 포획 후보 버블 확대·축소 및 밝기 애니메이션
        this.tweens.add({
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

        // 근접형 포획 후보 이미지 표시
        if (monsterType === 'melee') {
            candidate.monsterImage = this.add.image(
                x,
                y,
                candidate.monsterKey
            );

            candidate.monsterImage.setDisplaySize(60, 60);
            candidate.monsterImage.setDepth(2);

            // 포획 가능한 몬스터는 노란색으로 빛나게 표시
            candidate.monsterImage.postFX.addGlow(
                0xffffff,
                5,
                0,
                false,
                0.1,
                12
            );
        }

        // 원거리형 포획 후보 이미지 표시
        if (monsterType === 'ranged') {
            candidate.monsterImage = this.add.image(
                x,
                y,
                candidate.monsterKey
            );

            candidate.monsterImage.setDisplaySize(60, 60);
            candidate.monsterImage.setDepth(2);

            // 포획 후보는 노란색 테두리
            candidate.monsterImage.postFX.addGlow(
                0xffffff,
                5,
                0,
                false,
                0.1,
                12
            );
        }

        this.captureCandidates.push(candidate);

        // 10초 후 포획 후보 소멸
        this.time.delayedCall(10000, () => {
            // 게임 오버 상태라면 포획 후보를 삭제하지 않음
            if (this.isGameOver) return;

            if (!candidate.active) return;

            // 교체 중인 포획 후보는 사라지지 않도록 보호
            if (
                this.isReplacingAlly &&
                candidate === this.selectedCaptureCandidate
            ) {
                return;
            }

            this.destroyCaptureCandidate(candidate);

            this.captureCandidates =
                this.captureCandidates.filter(
                    item => item !== candidate
                );
        });
    }

    // ─────────────────────
    // 9. 적 피해 및 사망 처리
    // ─────────────────────

    damageEnemy(damage, targetEnemy = this.enemy) {
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
            this.enemies = this.enemies.filter(
                enemy => enemy !== hitEnemy
            );

            this.enemy = null;

            // 50% 확률로 포획 후보 등장
            if (Math.random() < 0.5) {
                this.spawnCaptureCandidate(
                    deadX,
                    deadY,
                    deadMonsterType,
                    deadMonsterKey
                );
            }

            // 3초 후 적 재생성
            this.time.delayedCall(3000, () => {
                if (!this.isGameOver && !this.isReplacingAlly) {
                    spawnEnemy(this);
                }
            });
        } else {
            // 피격 효과
            hitEnemy.setFillStyle(0xffffff);

            // PNG 몬스터도 피격 시 하얗게 반짝이기
            if (hitEnemy.monsterImage) {
                hitEnemy.monsterImage.setTintFill(0xffffff);
            }

            this.time.delayedCall(100, () => {
                if (hitEnemy.active) {
                    hitEnemy.setFillStyle(
                        hitEnemy.monsterType === 'ranged'
                            ? 0xb388ff
                            : 0xff6b6b
                    );

                    // PNG 이미지의 원래 색상 복구
                    if (hitEnemy.monsterImage && hitEnemy.monsterImage.active) {
                        hitEnemy.monsterImage.clearTint();
                    }
                }
            });
        }
    }
}
