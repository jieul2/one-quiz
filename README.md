<div align="center">

# 📝 One-Quiz (원퀴즈)
**정보처리기사 및 CS 자격증 수험생을 위한 맞춤형 지능형 모의고사 & 학습 관리 플랫폼**

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/NextAuth.js-OAuth_2.0-purple?style=for-the-badge" alt="NextAuth" />
</p>

</div>

---

## 📌 목차
- [프로젝트 개요](#-프로젝트-개요)
- [핵심 기능](#-핵심-기능)
- [기술 스택 및 아키텍처](#-기술-스택-및-아키텍처)
- [디렉터리 구조](#-디렉터리-구조)
- [시작하기 (Getting Started)](#-시작하기-getting-started)
- [환경 변수 설정 (.env.local)](#-환경-변수-설정-envlocal)
- [주요 API 명세](#-주요-api-명세)
- [품질 관리 및 코딩 컨벤션](#-품질-관리-및-코딩-컨벤션)

---

## 📖 프로젝트 개요

**One-Quiz**는 정보처리기사 실기/필기 및 다양한 IT/CS 자격시험을 준비하는 수험생들이 효율적으로 문제를 풀고 오답을 복습할 수 있도록 설계된 웹 기반 CBT(Computer Based Test) 및 수험 일정 관리 솔루션입니다.

- **맞춤형 모의고사 출제**: 과목 및 기출 회차를 자유롭게 조합하여 원하는 문항 수만큼 즉시 시험을 생성합니다.
- **취약점 집중 공략**: 과거 풀이 이력(정답/오답)을 분석하여 미풀이 및 오답 빈도가 높은 문제를 우선적으로 배치합니다.
- **원스톱 수험 관리**: 캘린더 D-Day 계산, 이미지 첨부 학습 다이어리, 건의/오류 신고 커뮤니티를 하나의 플랫폼에서 제공합니다.
- **강력한 관리자 콘솔**: 문제 카드/리스트 뷰 관리, 일괄 등록, 권한 통제, API 감사 로그(Audit Log)를 통해 시스템을 안정적으로 운영합니다.

---

## ✨ 핵심 기능

### 1. 🎯 지능형 CBT 모의고사 시스템
- **단계별 시험 생성**:
  - **1단계 (과목 선택)**: 활성화된 문제가 존재하는 과목만 동적으로 필터링하여 복수 선택 지원.
  - **2단계 (기출 회차 선택)**: 선택한 과목들에 해당하는 기출 회차만 지능적으로 추출하여 복수 선택 지원.
- **유연한 시험 환경 설정**:
  - 출제 문항 수 조절 (10문제 / 20문제 / 30문제 / 전체)
  - 풀이 모드 선택 (미풀이 문제 우선 정렬 / 회차 순차 정렬 / 무작위 셔플)
  - 보기(객관식 선지) 자동 무작위 셔플 및 정답 인덱스 동적 동기화
- **실시간 채점 및 피드백**:
  - 즉각적인 정답/오답 판정 및 누적 풀이 이력 DB 자동 기록
  - GitHub 스타일 Markdown 및 Prism 기반 소스코드 구문 강조(Syntax Highlighting) 해설 제공
  - 문제별 실시간 오류/오탈자 신고 팝업 연동

### 2. 📅 스터디 캘린더 & 📔 학습 다이어리
- **D-Day 캘린더**: 시험 일정 및 학습 마일스톤 등록, 색상 태그 분류, D-Day 자동 카운트다운.
- **학습 다이어리**: 하루 공부 내용 회고, Cloudinary CDN 연동 이미지 업로드 지원, 타임라인 기록 관리.

### 3. 💡 커뮤니티 & 건의함 (Ideas)
- 문제 오류 수정 제안, 기능 개선 아이디어 투표(추천) 및 실시간 댓글 토론.
- 상태별(대기, 검토중, 완료 등) 필터링 및 관리자 피드백 반영.

### 4. 🛡️ 엔터프라이즈급 관리자 콘솔 (Admin Console)
- **문제 관리 (Questions Management)**:
  - **카드형(`Grid`) / 리스트형(`List`)** 반응형 뷰 모드 지원 (사용자 선택값 LocalStorage 저장).
  - 문제 활성화/비활성화(ON/OFF) 즉시 토글 (비활성 문제는 사용자 응시 목록에서 자동 제외).
  - 개별 풀이 통계 초기화, 단일 삭제 및 전체 초기화 지원.
  - 신규 문제 개별 등록 및 JSON/대량 데이터 업로드.
- **계정 및 권한 관리 (Account Control)**:
  - 사용자 목록 조회, 권한 승격(`admin` ↔ `user`), 계정 활성화 상태 관리.
- **감사 로그 추적 (Audit Logs)**:
  - `withAudit` 데코레이터를 통한 API 요청 전수 로깅.
  - HTTP 메서드, 호출 URL, 상태 코드(Status Code), 클라이언트 IP, 응답 시간, 타임스탬프 실시간 필터 및 검색.
- **시스템 설정 (Settings)**:
  - 메인 공지사항 배너 등록/수정, 서비스 타이틀 및 안내 문구 실시간 관리.

---

## 🛠 기술 스택 및 아키텍처

### Frontend
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes) (Light / Dark 테마 전환)
- **Markdown / Code**: [react-markdown](https://github.com/remarkjs/react-markdown), [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

### Backend & Database
- **API Engine**: Next.js Route Handlers (Edge & Node.js Runtime)
- **Authentication**: [NextAuth.js v4](https://next-auth.js.org/) (Google, Kakao OAuth 2.0 & Email 인증 코드)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) (글로벌 커넥션 풀 캐싱)
- **Email Service**: [Resend](https://resend.com/) (이메일 인증 번호 발송)
- **Media Storage**: [Cloudinary](https://cloudinary.com/) (학습 다이어리 이미지 클라우드 스토리지)

---

## 📂 디렉터리 구조

```text
one-quiz/
├── app/
│   ├── admin/                 # 관리자 콘솔 (문제관리, 계정관리, 감사로그, 설정)
│   │   ├── accounts/
│   │   ├── logs/
│   │   ├── questions/         # 카드형/리스트형 뷰, 문제 활성화 제어
│   │   └── settings/
│   ├── api/                   # RESTful Route Handlers
│   │   ├── admin/             # 관리자 전용 API (권한 검증 & Audit 적용)
│   │   ├── auth/              # NextAuth & 이메일 인증 엔드포인트
│   │   ├── calendar/          # 시험 일정 CRUD
│   │   ├── diary/             # 학습 다이어리 CRUD
│   │   ├── ideas/             # 아이디어/건의 CRUD & 투표
│   │   ├── logs/              # 감사 로그 조회 API
│   │   ├── questions/         # 문제 목록, 채점 및 통계 PATCH
│   │   ├── settings/          # 메인 공지 및 시스템 설정
│   │   └── users/             # 사용자 권한 관리
│   ├── auth/                  # 로그인 및 이메일 인증 페이지
│   ├── calendar/              # 스터디 캘린더 페이지 (Suspense 스트리밍)
│   ├── diary/                 # 학습 다이어리 페이지
│   ├── exam/                  # 모의고사 시스템
│   │   ├── subject/           # 1단계: 과목 복수 선택
│   │   ├── type/              # 2단계: 회차 복수 선택
│   │   └── page.tsx           # 실전 CBT 문제 풀이 룸
│   ├── ideas/                 # 건의 및 커뮤니티 페이지
│   ├── layout.tsx             # 전역 루트 레이아웃 (NextAuth + Theme Provider)
│   └── page.tsx               # 메인 홈 대시보드
├── lib/
│   ├── hooks/
│   │   └── useMounted.ts      # useSyncExternalStore 기반 SSR 하이드레이션 안전 훅
│   ├── logger.ts              # 감사 로그 모델 및 생성 유틸리티
│   ├── mongodb.ts             # 전역 MongoDB Mongoose 커넥션 캐싱
│   └── withAudit.ts           # Route Handler 전용 감사 로깅 HOC 데코레이터
├── models/                    # Mongoose 스키마 정의
│   ├── AuditLog.ts
│   ├── Calendar.ts
│   ├── Diary.ts
│   ├── Idea.ts
│   ├── Question.ts
│   ├── Report.ts
│   ├── Setting.ts
│   ├── User.ts
│   └── VerificationToken.ts
└── public/                    # 정적 에셋
```

---

## 🚀 시작하기 (Getting Started)

### 요구 사양
- **Node.js**: `v18.18.0` 이상 권장 (Node.js 20+ 최적)
- **Package Manager**: `npm` 또는 `pnpm`
- **Database**: MongoDB Atlas 또는 로컬 MongoDB 인스턴스

### 1. 저장소 복제 (Clone)
```bash
git clone https://github.com/your-username/one-quiz.git
cd one-quiz
```

### 2. 패키지 설치 (Install Dependencies)
```bash
npm install
```

### 3. 환경 변수 파일 생성
루트 디렉터리에 `.env.local` 파일을 생성하고 필요한 설정값을 입력합니다. (상세 내용은 하단 참조)

### 4. 개발 서버 실행 (Run Development Server)
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속하여 결과를 확인합니다.

### 5. 프로덕션 빌드 및 실행 (Build & Start)
```bash
npm run build
npm run start
```

---

## 🔐 환경 변수 설정 (.env.local)

`.env.local` 파일에 다음 환경 변수를 정의합니다:

```env
# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/onequiz?retryWrites=true&w=majority

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_generated_secret_key

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# Email Verification (Resend)
RESEND_API_KEY=re_your_resend_api_key

# Cloudinary (Image Uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

## 📡 주요 API 명세

| 엔드포인트 | 메서드 | 설명 | 인증/권한 |
| :--- | :---: | :--- | :---: |
| `/api/questions` | `GET` | 전체 문제 목록 조회 (과목/회차/상태) | Public |
| `/api/questions` | `POST` | 신규 문제 단일 또는 벌크 등록 | Admin |
| `/api/questions` | `PATCH` | 문제 풀이 결과(정답 여부) 기록 또는 활성화 토글 | Session / Admin |
| `/api/questions` | `DELETE`| 문제 삭제 또는 통계 전체 초기화 | Admin |
| `/api/calendar` | `GET / POST / PUT / DELETE` | 시험 및 학습 일정 CRUD | Session |
| `/api/diary` | `GET / POST / PUT / DELETE` | 학습 일지 및 이미지 첨부 CRUD | Session |
| `/api/ideas` | `GET / POST / PUT / DELETE` | 커뮤니티 건의/아이디어 등록 및 추천/댓글 | Session |
| `/api/logs` | `GET` | 관리자 감사 로그 목록 검색 및 필터링 | Admin |
| `/api/admin/reports` | `GET / PATCH` | 사용자 문제 오류 신고 내역 확인 및 처리 | Admin |
| `/api/settings` | `GET / POST` | 메인 공지 및 시스템 배너 설정 | Public / Admin |

---

## 🛡 품질 관리 및 코딩 컨벤션

- **Type Safety**: TypeScript Strict 모드를 유지하며, 빌드 단계에서 `npx tsc --noEmit`을 통해 정적 타입을 보장합니다.
- **Linting & Code Quality**: Next.js 권장 규칙 및 React 19 호환 린트 규칙(`npm run lint`)을 엄격히 준수합니다.
- **Hydration Mismatch 방지**: SSR과 클라이언트 렌더링 간 시차로 인한 불일치를 방지하기 위해 `useSyncExternalStore` 기반의 커스텀 마운트 훅(`useMounted`)을 채택했습니다.
- **Audit Logging Decorator**: 모든 주요 관리자 API 핸들러에 `withAudit` 고차 함수를 래핑하여 인가되지 않은 접근 시도 및 시스템 변경 이력을 안전하게 추적합니다.

---

<div align="center">
  <sub>Built with ❤️ by One-Quiz Team. All rights reserved.</sub>
</div>
