// 개발 및 배포 환경에 맞는 이미지 경로 반환
export function assetPath(path) {
    return `${import.meta.env.BASE_URL}assets/${path}`;
}