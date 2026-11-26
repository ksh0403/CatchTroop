import Phaser from 'phaser';
import { createHealthUI } from '../ui/HealthUI.js';
import { createTroopUI } from '../ui/TroopUI.js';
import { registerReplaceUIEvents } from '../ui/ReplaceUI.js';
import { assetPath } from '../utils/assetPath.js';

import {
    GAME,
    ENEMY,
    ALLY
} from '../config/gameConstants.js';

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
    registerCaptureEvents
} from '../systems/CaptureSystem.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // 게임 이미지 리소스 불러오기
    preload() {
        // 게임 필드 배경 이미지
        this.load.image(
            'field_background',
            assetPath('backgrounds/field_background.png')
        );

        // 체력 하트 이미지 불러오기
        this.load.image(
            'heart',
            assetPath('ui/heart.png')
        );

        // 플레이어 이미지 불러오기
        this.load.image(
            'player',
            assetPath('player/player.png')
        );

        // 근접형 몬스터 10종 불러오기
        for (const monster of MELEE_MONSTERS) {
            this.load.image(
                monster,
                assetPath(`monsters/melee/${monster}.png`)
            );
        }

        // 원거리형 몬스터 10종 불러오기
        for (const monster of RANGED_MONSTERS) {
            this.load.image(
                monster,
                assetPath(`monsters/ranged/${monster}.png`)
            );
        }
    }
    
    create() {
        // 게임 화면이 서서히 밝아지는 효과
        this.cameras.main.fadeIn(600, 0, 0, 0);

        // 게임 필드 배경 표시
        this.fieldBackground = this.add.image(
            GAME.WIDTH / 2,
            GAME.HEIGHT / 2,
            'field_background'
        );

        this.fieldBackground.setDisplaySize(
            GAME.WIDTH,
            GAME.HEIGHT
        );
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

        // 포획 시스템 이벤트 등록
        registerCaptureEvents(this);

        // 아군 교체 UI 이벤트 등록
        registerReplaceUIEvents(this);

        // 적
        this.enemy = null;
        this.enemies = [];
        spawnEnemy(this);

        // 5초마다 새로운 적 생성
        this.time.addEvent({
            delay: ENEMY.SPAWN_INTERVAL,
            callback: () => {
                if (!this.isGameOver && !this.isReplacingAlly) {
                    spawnEnemy(this);
                }
            },
            loop: true,
        });

        // 아군 수 표시 UI 생성
        createTroopUI(this);

        // 플레이어 체력 UI 생성
        createHealthUI(this);

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
            while (this.allies.length < ALLY.MAX_COUNT) {
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

            console.log(
                `테스트용 아군 ${ALLY.MAX_COUNT}마리 생성 완료!`
            );
        }
    }
}