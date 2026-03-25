# staff-scheduler

기존 `WooriHomeScheduler` WPF 프로그램을 바탕으로 만든 GitHub Pages용 정적 웹앱 저장소입니다.

## 구성

- `index.html`, `styles.css`, `script.js`: 정적 웹앱 본체
- `.github/workflows/deploy-pages.yml`: `main` 브랜치 푸시 시 GitHub Pages 배포 워크플로

## 웹앱 기능

- 기존 배치 알고리즘 유지
- 자동 휴무일 계산
  - 매주 수요일
  - 매월 2번째, 4번째 목요일
- 커스텀 휴무일 / 무료휴일 / 커스텀 근무일 설정
- 일자별 배치 카드
- 월간 캘린더 뷰
- 인원별 통계 대시보드

## 로컬 확인

정적 파일만 사용하므로 별도 빌드가 필요 없습니다. 저장소 루트의 `index.html`을 브라우저에서 열면 됩니다.

## GitHub Pages 배포

1. 저장소의 기본 브랜치를 `main`으로 둡니다.
2. GitHub 저장소 설정에서 `Pages`가 `GitHub Actions`를 사용하도록 설정합니다.
3. 이 저장소를 푸시하면 `.github/workflows/deploy-pages.yml`이 정적 파일을 배포합니다.

## 참고

기존 WPF 앱의 핵심 로직은 아래 규칙을 기준으로 웹앱에 이식했습니다.

- 기본 배치: 근무일마다 4명 또는 커스텀 인원 수 배치
- 우선순위: 토, 일, 월, 금, 화, 목, 수
- 추가 배치: `(공짜 휴일, 수요일 제외 휴무일 수) x 4`
- 추가 근무자는 누적 근무 수가 적은 사람 우선
