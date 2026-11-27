
// ─────────────────────
// 게임 화면 설정
// ─────────────────────
export const GAME = {
    WIDTH: 800,                  // 게임 화면 너비 (px)
    HEIGHT: 600,                 // 게임 화면 높이 (px)
};

// ─────────────────────
// 플레이어 설정
// ─────────────────────
export const PLAYER = {
    MAX_HP: 5,                   // 최대 체력
    MOVE_SPEED: 200,             // 이동 속도 (px/s)
    ATTACK_RANGE: 200,           // 자동 공격 범위 (px)
    ATTACK_COOLDOWN: 600,        // 공격 주기 (0.6초)
    ATTACK_DAMAGE: 1,            // 공격당 피해량
    HIT_COOLDOWN: 1000,          // 피격 후 무적 시간 (1초)
};

// ─────────────────────
// 적 몬스터 설정
// ─────────────────────
export const ENEMY = {
    MAX_HP: 8,                   // 최대 체력
    MOVE_SPEED: 75,              // 이동 속도 (px/s)

    SPAWN_INTERVAL: 5000,        // 새로운 적 생성 주기 (5초)
    RESPAWN_DELAY: 3000,         // 적 처치 후 재생성 대기 시간 (3초)

    MELEE_DISTANCE: 30,          // 근접형 적의 목표 접근 거리 (px)
    RANGED_DISTANCE: 150,        // 원거리형 적의 목표 접근 거리 (px)

    RANGED_ATTACK_RANGE: 250,    // 원거리형 적의 공격 범위 (px)
    ATTACK_COOLDOWN: 2000,       // 원거리형 적의 공격 주기 (2초)
    ATTACK_DAMAGE: 1,            // 공격당 피해량

    MIN_DISTANCE: 25,            // 적 몬스터 사이의 최소 유지 간격 (px)
};

// ─────────────────────
// 아군 몬스터 설정
// ─────────────────────
export const ALLY = {
    MAX_COUNT: 10,               // 최대 아군 보유 수

    COMBAT_SPEED: 170,           // 전투 중 이동 속도 (px/s)
    FOLLOW_SPEED: 230,           // 플레이어 추적 속도 (px/s)

    DETECT_RANGE: 180,           // 주변 적 감지 범위 (px)
    FORMATION_RADIUS: 80,        // 플레이어 중심 원형 대형의 반지름 (px)

    MELEE_DISTANCE: 28,          // 근접형 아군의 목표 접근 거리 (px)
    RANGED_DISTANCE: 120,        // 원거리형 아군의 목표 접근 거리 (px)

    MELEE_ATTACK_RANGE: 30,      // 근접형 아군의 공격 범위 (px)
    RANGED_ATTACK_RANGE: 150,    // 원거리형 아군의 공격 범위 (px)

    ATTACK_COOLDOWN: 800,        // 공격 주기 (0.8초)
    ATTACK_DAMAGE: 1,            // 공격당 피해량

    MIN_DISTANCE: 30,            // 아군 몬스터 사이의 최소 유지 간격 (px)
};

// ─────────────────────
// 포획 시스템 설정
// ─────────────────────
export const CAPTURE = {
    CHANCE: 0.5,                 // 적 처치 시 포획 후보 등장 확률 (50%)
    RANGE: 35,                   // 플레이어의 포획 가능 거리 (px)
    DURATION: 10000,             // 포획 후보 유지 시간 (10초)
};

// ─────────────────────
// 전투 시스템 설정
// ─────────────────────
export const COMBAT = {
    FRIENDLY_BULLET_SPEED: 350,  // 플레이어 및 아군 마법탄 속도 (px/s)
    ENEMY_BULLET_SPEED: 180,     // 적 마법탄 속도 (px/s)

    CONTACT_HIT_RANGE: 35,       // 플레이어와 적의 접촉 피해 판정 거리 (px)
    ENEMY_BULLET_HIT_RANGE: 26,  // 적 마법탄의 플레이어 피격 판정 거리 (px)
    FRIENDLY_BULLET_HIT_RANGE: 21, // 플레이어 및 아군 마법탄의 적 명중 판정 거리 (px)
};

// ─────────────────────
// 점수 관련 설정
// ─────────────────────
export const SCORE = {
    SURVIVAL_PER_SECOND: 1, // 생존 1초당 점수
    PER_KILL: 10           // 몬스터 처치당 점수
};