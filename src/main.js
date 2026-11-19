
import Phaser from 'phaser';
import './style.css';

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // 배경
    this.cameras.main.setBackgroundColor('#294b3a');

    // 플레이어
    this.player = this.add.circle(400, 300, 20, 0xffd166);

    // 키보드 입력
    this.cursors = this.input.keyboard.createCursorKeys();

    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // 마법탄
    this.bullets = [];
    this.lastAttackTime = 0;

    // 아군
    this.allies = [];

    // 적
    this.enemy = null;
    this.spawnEnemy();

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

    this.add.text(400, 550, 'Move: WASD / Arrow Keys', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  update(time, delta) {
    const dt = delta / 1000;

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

    if (this.enemy && this.enemy.active) {
      const enemyDirection = new Phaser.Math.Vector2(
        this.player.x - this.enemy.x,
        this.player.y - this.enemy.y
      );

      const distance = enemyDirection.length();

      if (distance > 35) {
        enemyDirection.normalize();

        const moveDistance = Math.min(
          75 * dt,
          distance - 35
        );

        this.enemy.x += enemyDirection.x * moveDistance;
        this.enemy.y += enemyDirection.y * moveDistance;
      }
    }

    // ─────────────────────
    // 3. 플레이어 자동 공격
    // ─────────────────────

    if (this.enemy && this.enemy.active) {
      const distanceToEnemy = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.enemy.x,
        this.enemy.y
      );

      if (
        distanceToEnemy <= 200 &&
        time - this.lastAttackTime >= 600
      ) {
        this.shootBullet();
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

      if (this.enemy && this.enemy.active) {
        const hitEnemy = this.enemy;

        const bulletDistance = Phaser.Math.Distance.Between(
          bullet.x,
          bullet.y,
          hitEnemy.x,
          hitEnemy.y
        );

        if (bulletDistance <= 21) {
          bullet.destroy();
          this.bullets.splice(i, 1);

          // 공통 피해 처리 함수 사용
          this.damageEnemy(1);

          continue;
        }
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

      // 적이 존재하면 전투 여부 확인
      if (this.enemy && this.enemy.active) {
        const enemyDistance = Phaser.Math.Distance.Between(
          ally.x,
          ally.y,
          this.enemy.x,
          this.enemy.y
        );

        // 적이 180px 이내면 전투 시작
        if (enemyDistance <= 180) {
          isFighting = true;

          // 적과 거리가 28px보다 멀면 접근
          if (enemyDistance > 28) {
            const attackDirection = new Phaser.Math.Vector2(
              this.enemy.x - ally.x,
              this.enemy.y - ally.y
            ).normalize();

            const moveDistance = Math.min(
              170 * dt,
              enemyDistance - 28
            );

            ally.x += attackDirection.x * moveDistance;
            ally.y += attackDirection.y * moveDistance;
          }

          // 이동 후 적과의 거리를 다시 계산
          const newDistance = Phaser.Math.Distance.Between(
            ally.x,
            ally.y,
            this.enemy.x,
            this.enemy.y
          );

          // 공격 거리 안이면 0.8초마다 반복 공격
          if (
            newDistance <= 30 &&
            time - ally.lastAttackTime >= 800
          ) {
            ally.lastAttackTime = time;

            // 공격 효과
            ally.setFillStyle(0xffff99);

            this.time.delayedCall(250, () => {
              if (ally.active) {
                ally.setFillStyle(0x6ee7b7);
              }
            });

            // 적에게 피해 1
            this.damageEnemy(1);
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

  }

  // ─────────────────────
  // 6. 마법탄 생성
  // ─────────────────────

  shootBullet() {
    if (!this.enemy || !this.enemy.active) return;

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      this.enemy.x,
      this.enemy.y
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
    this.enemy = this.add.circle(
      100,
      100,
      15,
      0xff6b6b
    );

    this.enemy.hp = 8;
  }

  // ─────────────────────
  // 8. 아군 생성
  // ─────────────────────

  spawnAlly(x, y) {
    if (this.allies.length >= 10) return;

    const ally = this.add.circle(
      x,
      y,
      13,
      0x6ee7b7
    );

    // 아군별 공격 시간 기록
    ally.lastAttackTime = 0;

    this.allies.push(ally);

    this.allyText.setText(
      `Allies: ${this.allies.length} / 10`
    );
  }

  // ─────────────────────
  // 9. 적 피해 및 사망 처리
  // ─────────────────────

  damageEnemy(damage) {
    if (!this.enemy || !this.enemy.active) return;

    const hitEnemy = this.enemy;

    hitEnemy.hp -= damage;

    if (hitEnemy.hp <= 0) {
      // 사망 위치 저장
      const deadX = hitEnemy.x;
      const deadY = hitEnemy.y;

      hitEnemy.destroy();
      this.enemy = null;

      // 50% 확률로 아군 전환
      if (Math.random() < 0.5) {
        this.spawnAlly(deadX, deadY);
      }

      // 2초 후 적 재생성
      this.time.delayedCall(2000, () => {
        this.spawnEnemy();
      });
    } else {
      // 피격 효과
      hitEnemy.setFillStyle(0xffffff);

      this.time.delayedCall(100, () => {
        if (hitEnemy.active) {
          hitEnemy.setFillStyle(0xff6b6b);
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
