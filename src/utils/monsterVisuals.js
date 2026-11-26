// 몬스터 이미지 생성 및 시각 효과 적용
export function createMonsterImage(
    scene,
    monster,
    {
        size = 48,
        depth = 2,
        glowColor = 0xffffff,
        glowStrength = 4
    } = {}
) {
    // 몬스터의 위치와 이미지 키를 사용하여 이미지 생성
    const image = scene.add.image(
        monster.x,
        monster.y,
        monster.monsterKey
    );

    // 이미지 크기 설정
    image.setDisplaySize(size, size);

    // 이미지 표시 순서 설정
    image.setDepth(depth);

    // 몬스터 발광 효과 적용
    image.postFX.addGlow(
        glowColor,
        glowStrength,
        0,
        false,
        0.1,
        12
    );

    // 생성된 몬스터 이미지 반환
    return image;
}