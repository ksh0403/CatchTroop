// 캐릭터 간 최소 간격 유지
export function separateEntities(entities, minDistance) {
    // 모든 캐릭터 쌍의 거리 확인
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            const entityA = entities[i];
            const entityB = entities[j];

            // 비활성화된 캐릭터 제외
            if (!entityA.active || !entityB.active) continue;

            // 두 캐릭터 사이의 거리 계산
            const dx = entityB.x - entityA.x;
            const dy = entityB.y - entityA.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            // 최소 간격보다 가까우면 서로 밀어내기
            if (distance < minDistance) {
                // 완전히 겹쳤다면 무작위 방향 설정
                const angle = distance === 0
                    ? Math.random() * Math.PI * 2
                    : Math.atan2(dy, dx);

                // 겹친 거리의 절반씩 이동
                const overlap =
                    (minDistance - distance) / 2;

                const pushX = Math.cos(angle) * overlap;
                const pushY = Math.sin(angle) * overlap;

                // 서로 반대 방향으로 이동
                entityA.x -= pushX;
                entityA.y -= pushY;

                entityB.x += pushX;
                entityB.y += pushY;
            }
        }
    }
}