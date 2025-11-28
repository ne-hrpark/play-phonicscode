# Phonics Code

Phonics Code 학습을 위한 인터랙티브 웹 게임입니다.

## 🎮 게임 소개

이 프로젝트는 Phonics 학습을 돕기 위한 두 가지 게임 모드를 제공합니다:

- **Phonics Builder**: 단어를 구성하는 Phonics 게임
- **Shadow Puzzle**: 그림자 퍼즐을 맞추는 게임

## 🛠️ 기술 스택

- **Frontend Framework**: React 19.2.0
- **Language**: TypeScript
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 7.9.6
- **Data Processing**: xlsx (Excel 파일 파싱)
- **UI Components**: Swiper.js
- **Effects**: Canvas Confetti

## 📦 설치

```bash
npm install
```

## 🚀 개발 서버 실행

```bash
npm run dev
```

개발 서버가 시작되면 터미널에 표시된 URL(예: `http://localhost:5173`)로 접속할 수 있습니다.

**참고**: 
- Vite의 기본 포트는 `5173`입니다
- 해당 포트가 이미 사용 중이면 자동으로 다른 포트(예: `5174`, `5175`)를 할당합니다
- 포트를 직접 지정하려면 `vite.config.ts`에서 설정하거나 `npm run dev -- --port 3000` 형식으로 실행할 수 있습니다

## 🏗️ 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

## 📤 배포

### GitHub Pages 배포

```bash
npm run deploy
```

이 명령은 자동으로 빌드를 수행하고 `gh-pages` 브랜치에 배포합니다.

**참고**: Windows 환경에서 경로 길이 제한으로 인한 오류가 발생할 수 있습니다. 이 경우 수동 배포를 진행하세요.

### 수동 배포

```bash
# 빌드
npm run build

# gh-pages 브랜치 생성 및 배포
git checkout -b gh-pages
git add dist
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix dist origin gh-pages
```

## 📁 프로젝트 구조

```
phonicscode/
├── public/
│   └── data/
│       ├── quiz_data.xls      # 퀴즈 데이터
│       └── unit_data.xlsx     # 유닛 데이터
├── src/
│   ├── pages/
│   │   ├── Home.tsx           # 홈
│   │   ├── SelectUnit.tsx     # 유닛 선택 페이지
│   │   ├── SelectPlay.tsx     # 게임 모드 선택 페이지
│   │   ├── PhonicsBuilder.tsx # Phonics Builder 게임
│   │   └── ShadowPuzzle.tsx   # Shadow Puzzle 게임
│   ├── utils/
│   │   ├── excelData.ts       # 퀴즈 데이터 로드 및 처리
│   │   └── unitData.ts        # 유닛 데이터 로드 및 조회
│   └── styles/                # 스타일 파일
└── package.json
```

## 📊 데이터 형식

프로젝트는 Excel 파일을 사용하여 퀴즈와 유닛 데이터를 관리합니다:

- **quiz_data.xls**: 퀴즈 문제, 정답, 오디오 경로 등
- **unit_data.xlsx**: 레벨별 유닛 정보

## 🎯 주요 기능

- ✅ 레벨 및 유닛 기반 학습 구조
- ✅ Excel 데이터 기반 동적 콘텐츠 로딩
- ✅ 오디오 재생 기능
- ✅ 인터랙티브 드래그 앤 드롭
- ✅ 정답 시 축하 애니메이션 (Confetti)
- ✅ 반응형 디자인

## 🔧 개발 환경 설정

### 필수 요구사항

- Node.js (권장: 18.x 이상)
- npm 또는 yarn

### PowerShell 실행 정책 설정 (Windows)

**참고**: Windows에서 `npm run dev` 실행 시 PowerShell 보안 오류가 발생하는 경우에만 필요합니다.

오류 메시지 예시:
```
이 시스템에서 스크립트를 실행할 수 없으므로...
PSSecurityException
```

이 경우 다음 명령으로 실행 정책을 설정하세요:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

대부분의 경우 이 설정은 필요하지 않으며, 문제가 발생하는 경우에만 설정하면 됩니다.

## 📝 라이선스

이 프로젝트는 React 기반 웹 애플리케이션의 성능 및 기능 테스트를 위한 프로젝트입니다.

© 2025 NE능률. All rights reserved.