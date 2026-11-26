import Phaser from 'phaser';
import { spawnAlly } from '../entities/Ally.js';
import {
    destroyCaptureCandidate
} from '../systems/CaptureSystem.js';

export function showReplaceUI(scene) {
    // 교체 창 배경
    scene.replacePanel = scene.add.rectangle(
        400, 300, 680, 320, 0x172a23
    ).setStrokeStyle(3, 0xffffff).setDepth(20);

    // 안내 문구
    scene.replaceText = scene.add.text(
        400, 180,
        'Troop Full! Choose an ally to replace.',
        {
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold',
        }
    ).setOrigin(0.5).setDepth(21);

    // 아군 선택 버튼을 저장할 배열
    scene.replaceButtons = [];

    // 새로 포획한 몬스터 정보
    const candidate = scene.selectedCaptureCandidate;

    const candidateType =
        candidate.monsterType === 'ranged'
            ? '원거리형'
            : '근접형';

    scene.captureInfoText = scene.add.text(
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

    scene.capturePreview = scene.add.circle(
        145,  // X: NEW CAPTURE와 같은 위치
        300,  // Y: 미리보기 위치
        32,   // 원의 반지름
        captureColor
    ).setDepth(22);

    // 새 포획 몬스터의 실제 이미지 표시
    const captureImageKey = candidate.monsterKey;

    scene.capturePreviewImage = scene.add.image(
        scene.capturePreview.x,
        scene.capturePreview.y,
        captureImageKey
    );

    scene.capturePreviewImage.setDisplaySize(100, 100);
    scene.capturePreviewImage.setDepth(101);

    // 몬스터 이미지 밝기 효과
    scene.captureFlashFX =
        scene.capturePreviewImage.postFX.addColorMatrix();

    // 새로 포획한 몬스터의 밝기 깜빡임 효과
    scene.captureFlashTween = scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 100,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,

        onUpdate: (tween) => {
            const value = tween.getValue();

            scene.capturePreviewImage.clearTint();
            scene.capturePreviewImage.setAlpha(1);

            scene.captureFlashFX.brightness(
                1 + value * 0.8
            );

            // NEW CAPTURE 글씨도 함께 반짝이게 표시
            const textColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.HexStringToColor('#facc15'),
                Phaser.Display.Color.HexStringToColor('#fff5b3'),
                100,
                value * 100
            );

            scene.captureInfoText.setColor(
                Phaser.Display.Color.RGBToString(
                    textColor.r,
                    textColor.g,
                    textColor.b
                )
            );
        }
    });

    // 기존 미리보기 원 숨기기
    scene.capturePreview.setAlpha(0);

    // 아군 10마리를 5개씩 2줄로 배치
    for (let i = 0; i < scene.allies.length; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);

        const x = 260 + col * 100;
        const y = 250 + row * 75;

        // 아군 선택 칸의 둥근 배경
        const slotBg = scene.add.graphics();

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
        scene.replaceButtons.push(slotBg);

        const monsterLabel =
            scene.allies[i].monsterType === 'ranged'
                ? '원거리형'
                : '근접형';

        const button = scene.add.text(
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

        scene.replaceButtons.push(button);

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
            const oldAlly = scene.allies[i];

            // 교체되는 아군의 몬스터 이미지도 제거
            if (oldAlly.monsterImage) {
                oldAlly.monsterImage.destroy();
            }

            oldAlly.destroy();
            scene.allies.splice(i, 1);

            // 2. 새로 포획한 몬스터 정보 저장
            const candidate = scene.selectedCaptureCandidate;

            const x = candidate.x;
            const y = candidate.y;
            const monsterType = candidate.monsterType;
            const monsterKey = candidate.monsterKey;

            // 3. 포획 후보 제거
            destroyCaptureCandidate(scene, candidate);

            scene.captureCandidates = scene.captureCandidates.filter(
                item => item !== candidate
            );

            // 4. 새 아군 합류
            spawnAlly(scene, x, y, monsterType, monsterKey);

            // 새 아군을 원래 선택한 칸으로 이동
            const newAlly = scene.allies.pop();
            scene.allies.splice(i, 0, newAlly);

            // 5. 교체 창 닫기 및 교체 모드 종료
            closeReplaceUI(scene);

            console.log('아군 교체 완료!');
        });

        // 선택 칸에 현재 아군의 모습 표시
        const ally = scene.allies[i];
        const previewImageKey = ally.monsterKey;

        const preview = scene.add.image(
            x,
            y - 8,
            previewImageKey
        );

        preview.setDisplaySize(40, 40);
        preview.setDepth(22);

        // 나중에 창을 닫을 때 함께 제거하기
        scene.replaceButtons.push(preview);
    }

    // 교체 취소 버튼
    scene.cancelButton = scene.add.text(
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
    scene.cancelButton.on('pointerover', () => {
        scene.cancelButton.setStyle({
            backgroundColor: '#64748b',
            color: '#ffffff'
        });
    });

    // 마우스를 떼면 기존 색상으로 복구
    scene.cancelButton.on('pointerout', () => {
        scene.cancelButton.setStyle({
            backgroundColor: '#475569',
            color: '#ffffff'
        });
    });

    // Don't Replace 버튼을 클릭하면 교체 창 닫기
    scene.cancelButton.on('pointerdown', () => {
        // 포획 후보 제거
        const candidate = scene.selectedCaptureCandidate;

        destroyCaptureCandidate(scene, candidate);

        scene.captureCandidates = scene.captureCandidates.filter(
            item => item !== candidate
        );

        // 교체 창 닫기 + 타이머 재개
        closeReplaceUI(scene);

        console.log('아군 교체 취소!');
    });
}

export function closeReplaceUI(scene) {
    scene.replacePanel.destroy();
    scene.replaceText.destroy();
    scene.captureInfoText.destroy();
    scene.capturePreview.destroy();

    // NEW CAPTURE 깜빡임 효과 종료
    if (scene.captureFlashTween) {
        scene.captureFlashTween.remove();
        scene.captureFlashTween = null;
    }

    scene.capturePreviewImage.destroy();
    scene.cancelButton.destroy();

    scene.replaceButtons.forEach(item => item.destroy());
    scene.replaceButtons = [];

    scene.selectedCaptureCandidate = null;
    scene.isReplacingAlly = false;
    scene.time.paused = false; // 게임 타이머 다시 시작
}
