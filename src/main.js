import Phaser from 'phaser';
import './style.css';

// 근접형 몬스터 목록
const MELEE_MONSTERS = [
  'crest_bird',
  'fire_cat',
  'fire_fox',
  'forest_boar',
  'leaf_rabbit',
  'leaf_slime',
  'leaf_turtle',
  'mushroomling',
  'red_panda',
  'spiky_hedgehog',
];

// 원거리형 몬스터 목록
const RANGED_MONSTERS = [
  'bubble_jelly',
  'crystalling',
  'dark_bat',
  'flowerling',
  'knowledge_owl',
  'snowman',
  'star_mage',
  'thunder_cloud',
  'will_o_wisp',
  'wind_bird',
];

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // 몬스터 이미지 불러오기
  preload() {
    // 체력 하트 이미지 불러오기
    this.load.image('heart', 'src/assets/ui/heart.png');

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
    // 배경
    this.cameras.main.setBackgroundColor('#294b3a');

    // 플레이어
    this.player = this.add.circle(400, 300, 20, 0xffd166);

    // 플레이어 체력
    this.playerMaxHp = 5;
    this.playerHp = 5;
    this.lastPlayerHitTime = -1000;
    this.isGameOver = false;

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
    this.spawnEnemy();

    // 5초마다 새로운 적 생성
    this.time.addEvent({
      delay: 5000,
      callback: () => {
        if (!this.isGameOver && !this.isReplacingAlly) {
          this.spawnEnemy();
        }
      },
      loop: true,
    });

    // UI
    this.add.text(400, 60, 'CATCHTROOP', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.allyText = this.add.text(20, 20, 'Allies: 0 / 10', {
      fontSize: '18px',
      color: '#ffffff',
    });

    // 플레이어 체력 UI
    this.hpText = this.add.text(20, 50, 'HP:', {
      fontSize: '22px',
      color: '#ffffff',
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
    }).setOrigin(0.5);
  }

  update(time, delta) {
    // 아군 교체 창이 열려 있으면 게임 진행 중단
    if (this.isReplacingAlly) {
      return;
    }

    if (this.isGameOver) {
      // R 키를 누르면 게임 처음부터 다시 시작
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }

      return;
    }

    const dt = delta / 1000;

    // 개발용 테스트: T 키를 누르면 아군 10마리 채우기
    if (Phaser.Input.Keyboard.JustDown(this.testKey)) {
      while (this.allies.length < 10) {
        const monsterType = Math.random() < 0.5
          ? 'melee'
          : 'ranged';

        this.spawnAlly(
          this.player.x,
          this.player.y,
          monsterType
        );
      }

      console.log('테스트용 아군 10마리 생성 완료!');
    }

    // ─────────────────────
    // 포획 후보 영입
    // ─────────────────────

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

          this.spawnAlly(x, y, monsterType, monsterKey);
        } else if (!this.isReplacingAlly) {
          // 아군이 10마리면 교체 모드 시작
          this.isReplacingAlly = true;
          this.selectedCaptureCandidate = candidate;
          this.time.paused = true; // 게임 타이머 일시정지

          console.log('아군 교체 모드 시작!');
          this.showReplaceUI();
        }
      }
    }

    // ─────────────────────
    // 1. 플레이어 이동
    // ─────────────────────

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

    const direction = new Phaser.Math.Vector2(dx, dy).normalize();

    this.player.x += direction.x * 200 * dt;
    this.player.y += direction.y * 200 * dt;

    this.player.x = Phaser.Math.Clamp(this.player.x, 20, 780);
    this.player.y = Phaser.Math.Clamp(this.player.y, 20, 580);

    // ─────────────────────
    // 2. 적 몬스터 추적
    // ─────────────────────

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      const enemyDirection = new Phaser.Math.Vector2(
        this.player.x - enemy.x,
        this.player.y - enemy.y
      );

      const distance = enemyDirection.length();

      // 몬스터 종류에 따라 목표 거리 설정
      const targetDistance =
        enemy.monsterType === 'ranged' ? 150 : 30;

      if (distance > targetDistance) {
        enemyDirection.normalize();

        const moveDistance = Math.min(
          75 * dt,
          distance - targetDistance
        );

        enemy.x += enemyDirection.x * moveDistance;
        enemy.y += enemyDirection.y * moveDistance;
      }

      // 몬스터 이미지가 적의 위치를 따라가도록 설정
      if (enemy.monsterImage) {
        enemy.monsterImage.setPosition(enemy.x, enemy.y);
      }

      // 원거리형 몬스터만 2초마다 탄환 발사
      if (
        enemy.monsterType === 'ranged' &&
        distance <= 250 &&
        time - enemy.lastAttackTime >= 2000
      ) {
        enemy.lastAttackTime = time;

        const angle = Phaser.Math.Angle.Between(
          enemy.x,
          enemy.y,
          this.player.x,
          this.player.y
        );

        const bullet = this.add.circle(
          enemy.x,
          enemy.y,
          6,
          0xffa94d
        );

        bullet.vx = Math.cos(angle);
        bullet.vy = Math.sin(angle);

        this.enemyBullets.push(bullet);
      }
    }

    // 적끼리 겹치지 않도록 간격 유지
    const minEnemyDistance = 25;

    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const enemyA = this.enemies[i];
        const enemyB = this.enemies[j];

        if (!enemyA.active || !enemyB.active) continue;

        const dx = enemyB.x - enemyA.x;
        const dy = enemyB.y - enemyA.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minEnemyDistance) {
          // 정확히 같은 위치일 때도 분리할 방향 설정
          const angle =
            distance === 0
              ? Math.random() * Math.PI * 2
              : Math.atan2(dy, dx);

          const overlap = (minEnemyDistance - distance) / 2;

          const pushX = Math.cos(angle) * overlap;
          const pushY = Math.sin(angle) * overlap;

          enemyA.x -= pushX;
          enemyA.y -= pushY;

          enemyB.x += pushX;
          enemyB.y += pushY;
        }
      }
    }

    // 적과 플레이어 충돌 확인
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      const distanceToPlayer = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y
      );

      // 적과 닿았고, 마지막 피격 이후 1초가 지났을 때
      if (
        distanceToPlayer <= 35 &&
        this.playerHp > 0 &&
        time - this.lastPlayerHitTime >= 1000
      ) {
        // 마지막 피격 시간 기록
        this.lastPlayerHitTime = time;

        // 체력 1 감소
        this.playerHp -= 1;

        // 하트 UI 갱신
        this.hpHearts.forEach((heart, index) => {
          heart.setVisible(index < this.playerHp);
        });

        // 체력이 0이 되면 게임 종료
        if (this.playerHp <= 0) {
          this.isGameOver = true;
          this.time.paused = true; // 게임 오버 시 모든 타이머 정지

          this.add.text(400, 300, 'GAME OVER', {
            fontSize: '64px',
            color: '#ff6b6b',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(10);
        }

        // 피격 효과
        this.player.setFillStyle(0xff6b6b);

        this.time.delayedCall(200, () => {
          if (this.player.active) {
            this.player.setFillStyle(0xffd166);
          }
        });

        // 한 프레임에 중복 피격되지 않도록 종료
        break;
      }
    }

    // ─────────────────────
    // 적 원거리 탄환 이동
    // ─────────────────────

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];

      // 탄환 이동
      bullet.x += bullet.vx * 180 * dt;
      bullet.y += bullet.vy * 180 * dt;

      // 플레이어와 탄환 충돌 확인
      const distanceToPlayer = Phaser.Math.Distance.Between(
        bullet.x,
        bullet.y,
        this.player.x,
        this.player.y
      );

      // 탄환에 맞았고, 마지막 피격 이후 1초가 지났다면
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

        // 탄환 제거
        bullet.destroy();
        this.enemyBullets.splice(i, 1);

        // 체력이 0이면 게임 오버
        if (this.playerHp <= 0) {
          this.isGameOver = true;
          this.add.text(400, 300, 'GAME OVER', {
            fontSize: '64px',
            color: '#ff6b6b',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(10);
        }

        continue;
      }

      // 화면 밖으로 나가면 제거
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

    // ─────────────────────
    // 3. 플레이어 자동 공격
    // ─────────────────────

    const nearestEnemy = this.getNearestEnemy();

    if (nearestEnemy) {
      const distanceToEnemy = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        nearestEnemy.x,
        nearestEnemy.y
      );

      if (
        distanceToEnemy <= 200 &&
        time - this.lastAttackTime >= 600
      ) {
        this.shootBullet(nearestEnemy);
        this.lastAttackTime = time;
      }
    }

    // ─────────────────────
    // 4. 마법탄 이동 및 충돌
    // ─────────────────────

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


    // ─────────────────────
    // 5. 아군 행동
    // ─────────────────────

    for (let i = 0; i < this.allies.length; i++) {
      const ally = this.allies[i];

      let isFighting = false;

      // 아군에게 가장 가까운 적 찾기
      const targetEnemy = this.getNearestEnemyTo(ally);

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

          // 아군 종류에 따라 적과 유지할 거리 설정
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

          // 이동 후 적과의 거리를 다시 계산
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
              // 원거리형: 적을 향해 마법탄 발사
              const angle = Phaser.Math.Angle.Between(
                ally.x,
                ally.y,
                targetEnemy.x,
                targetEnemy.y
              );

              const bullet = this.add.circle(
                ally.x,
                ally.y,
                5,
                0x93c5fd
              );

              bullet.vx = Math.cos(angle);
              bullet.vy = Math.sin(angle);

              // 아군이 발사한 탄환임을 기록
              bullet.isAllyBullet = true;

              this.bullets.push(bullet);
            } else {
              // 근접형: 기존처럼 직접 피해
              this.damageEnemy(1, targetEnemy);
            }
          }
        }
      }

      // 전투 중이라면 진형 복귀 생략
      if (isFighting) {
        continue;
      }

      // 적이 없거나 멀면 원형 진형 복귀
      const angle = (Math.PI * 2 * i) / this.allies.length;

      const targetX = this.player.x + Math.cos(angle) * 80;
      const targetY = this.player.y + Math.sin(angle) * 80;

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

    // ─────────────────────
    // 아군끼리 겹치지 않도록 간격 유지
    // ─────────────────────

    for (let i = 0; i < this.allies.length; i++) {
      for (let j = i + 1; j < this.allies.length; j++) {
        const allyA = this.allies[i];
        const allyB = this.allies[j];

        // 모든 아군은 중심 사이 거리 최소 30px을 유지함
        const minAllyDistance = 30;

        const dx = allyB.x - allyA.x;
        const dy = allyB.y - allyA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minAllyDistance) {
          // 완전히 같은 위치에 있을 때도 방향을 만들기
          const angle = distance === 0
            ? Math.random() * Math.PI * 2
            : Math.atan2(dy, dx);

          const overlap = (minAllyDistance - distance) / 2;

          const pushX = Math.cos(angle) * overlap;
          const pushY = Math.sin(angle) * overlap;

          allyA.x -= pushX;
          allyA.y -= pushY;

          allyB.x += pushX;
          allyB.y += pushY;
        }
      }
    }

    // 아군 몬스터 이미지가 실제 아군 위치를 따라가도록 설정
    for (const ally of this.allies) {
      if (ally.active && ally.monsterImage) {
        ally.monsterImage.setPosition(ally.x, ally.y);
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
      0x7dd3fc
    );

    bullet.vx = Math.cos(angle);
    bullet.vy = Math.sin(angle);

    this.bullets.push(bullet);
  }

  // ─────────────────────
  // 7. 적 몬스터 생성
  // ─────────────────────

  spawnEnemy() {
    let spawnX = 100;
    let spawnY = 100;
    let validPosition = false;

    // 최대 30번까지 겹치지 않는 위치 탐색
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Phaser.Math.Between(30, 770);
      const y = Phaser.Math.Between(100, 520);

      // 다른 적과 최소 50px 간격 유지
      const tooCloseToEnemy = this.enemies.some(enemy => {
        return Phaser.Math.Distance.Between(
          x, y, enemy.x, enemy.y
        ) < 50;
      });

      // 플레이어와 최소 150px 간격 유지
      const tooCloseToPlayer =
        Phaser.Math.Distance.Between(
          x, y, this.player.x, this.player.y
        ) < 150;

      if (!tooCloseToEnemy && !tooCloseToPlayer) {
        spawnX = x;
        spawnY = y;
        validPosition = true;
        break;
      }
    }

    // 적당한 위치를 찾지 못했다면 이번 생성은 건너뛰기
    if (!validPosition) return;

    const enemy = this.add.circle(
      spawnX,
      spawnY,
      15,
      0xff6b6b
    );

    enemy.hp = 8;
    enemy.lastAttackTime = 0;

    // 몬스터 종류: 근접형 또는 원거리형
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
      enemy.setFillStyle(0xff6b6b); // 근접형: 빨간색
    } else {
      enemy.setFillStyle(0xb388ff); // 원거리형: 보라색
    }

    // 근접형 적 이미지 표시
    if (enemy.monsterType === 'melee') {
      enemy.monsterImage = this.add.image(
        enemy.x,
        enemy.y,
        enemy.monsterKey
      );

      enemy.monsterImage.setDisplaySize(40, 40);
      enemy.monsterImage.setDepth(2);

      // PNG 실루엣을 따라 빨간 외곽 효과
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
      enemy.monsterImage = this.add.image(
        enemy.x,
        enemy.y,
        enemy.monsterKey
      );

      enemy.monsterImage.setDisplaySize(40, 40);
      enemy.monsterImage.setDepth(2);

      // 원거리 적의 빨간색 테두리
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

    this.enemies.push(enemy);

    // 기존 코드와의 호환성 유지
    this.enemy = enemy;
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
        this.spawnAlly(x, y, monsterType, monsterKey);

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

  spawnAlly(x, y, monsterType, monsterKey) {
    if (this.allies.length >= 10) return;

    const ally = this.add.circle(
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
      ally.setFillStyle(0x60a5fa); // 원거리형 아군: 파란색
    } else {
      ally.setFillStyle(0x6ee7b7); // 근접형 아군: 초록색
    }

    // 근접형 아군 이미지 표시
    if (monsterType === 'melee') {
      ally.monsterImage = this.add.image(
        ally.x,
        ally.y,
        ally.monsterKey
      );

      ally.monsterImage.setDisplaySize(40, 40);
      ally.monsterImage.setDepth(2);

      // PNG 모양을 따라 파란색 테두리 표시
      ally.monsterImage.postFX.addGlow(
        0x3b82f6,
        4,
        0,
        false,
        0.1,
        12
      );

      // 기존 초록색 원 숨기기
      ally.setAlpha(0);
    }

    // 원거리형 아군 이미지 표시
    if (monsterType === 'ranged') {
      ally.monsterImage = this.add.image(
        ally.x,
        ally.y,
        ally.monsterKey
      );

      ally.monsterImage.setDisplaySize(40, 40);
      ally.monsterImage.setDepth(2);

      // 아군은 파란색 테두리
      ally.monsterImage.postFX.addGlow(
        0x3b82f6,
        4,
        0,
        false,
        0.1,
        12
      );

      // 기존 파란색 원 숨기기
      ally.setAlpha(0);
    }

    // 아군별 공격 시간 기록
    ally.lastAttackTime = 0;

    this.allies.push(ally);

    this.allyText.setText(
      `Allies: ${this.allies.length} / 10`
    );
  }

  // 포획 후보와 몬스터 이미지를 함께 제거
  destroyCaptureCandidate(candidate) {
    if (!candidate || !candidate.active) return;

    if (candidate.monsterImage) {
      candidate.monsterImage.destroy();
    }

    // 버블 애니메이션 종료
    this.tweens.killTweensOf(candidate);

    candidate.destroy();
  }

  // ─────────────────────
  // 포획 후보 생성
  // ─────────────────────

  spawnCaptureCandidate(x, y, monsterType, monsterKey) {
    // 포획 후보를 감싸는 반투명 노란색 버블
    const candidate = this.add.circle(x, y, 28, 0xffdd00, 0.1);

    // 버블의 노란색 테두리
    candidate.setStrokeStyle(2, 0xffdd00, 0.8);
    candidate.setDepth(1);

    // 포획 후보 버블 확대·축소 및 밝기 애니메이션
    this.tweens.add({
      targets: candidate,
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

      candidate.monsterImage.setDisplaySize(50, 50);
      candidate.monsterImage.setDepth(2);

      // 포획 가능한 몬스터는 노란색으로 빛나게 표시
      candidate.monsterImage.postFX.addGlow(
        0xffdd00,
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

      candidate.monsterImage.setDisplaySize(50, 50);
      candidate.monsterImage.setDepth(2);

      // 포획 후보는 노란색 테두리
      candidate.monsterImage.postFX.addGlow(
        0xffdd00,
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
          this.spawnEnemy();
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

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  scene: GameScene,
};

new Phaser.Game(config);
