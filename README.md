<div align="center">

# 🌌 One-Quiz (원퀴즈)
### **학습·업무·창작·라이프스타일을 하나로 융합한 올인원 통합 웹 워크스페이스 플랫폼**

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4.3_(App_Router)-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.3.0-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0_(Strict)-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9.11-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/NextAuth.js-OAuth_2.0_(Google_·_Kakao)-purple?style=for-the-badge" alt="NextAuth" />
  <img src="https://img.shields.io/badge/Font-Pretendard_Variable-blueviolet?style=for-the-badge" alt="Pretendard Font" />
  <img src="https://img.shields.io/badge/Themes-24_Color_Presets-orange?style=for-the-badge" alt="24 Themes" />
</p>

<p align="center">
  원퀴즈(One-Quiz)는 <strong>지능형 자격증 CBT 시험 및 스터디 그룹</strong>을 시작으로, 
  <strong>캘린더·할일·일기</strong>의 개인 생산성 도구, <strong>아이디어 캔버스·2D 마인드맵·스케치 그림판·간트 로드맵</strong>의 협업 워크스페이스,
  그리고 <strong>러닝(달리기) 코칭·커뮤니티 블로그·실시간 채팅</strong>까지 웹 브라우저 하나에서 끊김 없이 경험할 수 있도록 통합 설계된 차세대 생산성 웹 플랫폼입니다.
</p>

</div>

---

## 📌 목차
- [1. 프로젝트 비전 및 개요](#-1-프로젝트-비전-및-개요)
- [2. 핵심 기능 모듈 (Core Modules)](#-2-핵심-기능-모듈-core-modules)
  - [2.1 자격증 기출 풀이 & 스터디 그룹 (Exam & Groups)](#21-자격증-기출-풀이--스터디-그룹-exam--groups)
  - [2.2 대시보드 및 라이프스타일 생산성 (Dashboard & Personal)](#22-대시보드-및-라이프스타일-생산성-dashboard--personal)
  - [2.3 창작 & 비주얼 워크스페이스 (Creative & Projects)](#23-창작--비주얼-워크스페이스-creative--projects)
  - [2.4 커뮤니티, 블로그 & 실시간 소통 (Community & Lounge)](#24-커뮤니티-블로그--실시간-소통-community--lounge)
  - [2.5 엔터프라이즈급 관리자 콘솔 & DB 스키마 CRUD (Admin Console)](#25-엔터프라이즈급-관리자-콘솔--db-스키마-crud-admin-console)
- [3. 디자인 시스템 및 UI/UX 표준](#-3-디자인-시스템-및-uiux-표준)
- [4. 기술 스택 (Tech Stack)](#-4-기술-스택-tech-stack)
- [5. 디렉터리 아키텍처](#-5-디렉터리-아키텍처)
- [6. 시작하기 (Getting Started)](#-6-시작하기-getting-started)
- [7. 환경 변수 설정 (.env.local)](#-7-환경-변수-설정-envlocal)
- [8. 주요 API 엔드포인트 명세](#-8-주요-api-엔드포인트-명세)
- [9. 엔지니어링 원칙 및 품질 관리](#-9-엔지니어링-원칙-및-품질-관리)

---

## 📖 1. 프로젝트 비전 및 개요

현대의 수험생과 개발자들은 문제 풀이, 일정 계획, 아이디어 정리, 피트니스 기록, 스터디 소통을 위해 수많은 파편화된 앱을 번갈아 사용하며 컨텍스트 스위칭 비용을 겪고 있습니다.

**One-Quiz**는 이러한 분절된 경험을 단일 웹 환경으로 통합하여 다음과 같은 가치를 제공합니다:
- **Zero-Friction Context Switching**: 문제 풀이 중 발견한 아이디어를 캔버스나 마인드맵에 즉시 시각화하고, 시험 마일스톤을 캘린더에 바로 연동.
- **Data-Driven Growth**: 문제 정답률, 180일 잔디 히트맵, 일기 감정 추이, 러닝 페이스 및 AI 코칭 리포트를 한 화면에서 통합 추적.
- **Enterprise-Grade Consistency**: 24개 테마 프리셋, 전역 모던 다이얼로그(`alertModal`), 고속 bulkWrite 동기화, 철저한 API 보안 감사 로그(Audit Log).

---

## ✨ 2. 핵심 기능 모듈 (Core Modules)

### 2.1 자격증 기출 풀이 & 스터디 그룹 (Exam & Groups)
- **단일 통합 응시 설정 (`/exam/subject`)**:
  - 좌측 과목 선택(5열)과 우측 기출 회차 선택(7열)이 실시간 동적으로 연동되는 전폭 와이드 반응형 인터페이스.
  - 문제 수(10/20/30/전체), 셔플 모드, 오답 우선 배치 선택 후 단 1클릭으로 즉시 응시 시작.
- **실전 CBT 문제 풀이 룸 (`/exam`)**:
  - 객관식 선지 무작위 셔플 및 정답 인덱스 동적 동기화.
  - GitHub 스타일 Markdown 및 Prism 기반 소스코드 구문 강조(Syntax Highlighting) 해설 제공.
  - 사용자별 독립 풀이 이력 격리(`QuestionAttempt` 컬렉션), 문제별 실시간 오류 신고 모달 연동.
- **학습 성장 리포트 (`/learning`)**:
  - 180일 잔디 히트맵, 뽀모도로 학습 타이머, 과목별 정답률 및 취약 영역 분석 레이더.
- **스터디 그룹 (`/groups`, `/groups/[id]`)**:
  - 6자리 초대 코드로 간편 가입, 그룹원 간 기출/노트/일정/캔버스 공유 및 전용 채널 채팅.

### 2.2 대시보드 및 라이프스타일 생산성 (Dashboard & Personal)
- **12개 위젯 모듈러 대시보드 (`/`)**:
  - Flat 그리드 규격, D-Day, 세련된 고대비 미니 캘린더(날짜 클릭 시 팝오버 상세 일정 및 시간 표기), 할일, 일기, 드라이브, 북마크, 실시간 라운지 위젯.
  - 전 위젯에 브라우저 기본 스크롤바를 100% 대체하는 테마 연동 커스텀 스크롤(`CustomScrollArea`) 탑재.
- **정밀 캘린더 (`/calendar`)**:
  - '종일' vs '시간 지정' 일정 정밀 분리 (종일 체크박스 토글 UX 및 14:00 시간 뱃지 표기).
  - 다중일 연속 막대 드래그(DND) 이동 및 기간 리사이즈, 60FPS 행 재배치 알고리즘.
- **할일 보드 (`/tasks`)**:
  - 카테고리, 마감일, 우선순위, 사이드바 실시간 미완료 카운트 동기화.
- **KST 1일 1회 일기장 (`/diary`)**:
  - KST 자정 기준 하루 1회 작성 제한, Cloudinary CDN 이미지 업로드, 지식노트 1클릭 복사 연동.
- **러닝(달리기) 코칭 (`/running`)**:
  - 거리, 시간, 페이스, 심박수, 칼로리, 인증 사진 업로드 및 Claude/Gemini 스타일 AI 러닝 코치 피드백 자동 생성.
- **클라우드 드라이브 (`/drive`) & 웹 북마크 (`/bookmarks`)**:
  - 파일 보관함, 폴더 트리 구조, 링크 메타데이터 파싱 스크랩.

### 2.3 창작 & 비주얼 워크스페이스 (Creative & Projects)
- **스케치 그림판 (`/drawing`)**:
  - HTML5 Canvas 기반 무손실 벡터 렌더링 엔진 (2차 베지어 곡선 스무딩으로 부드러운 펜 스트로크 구현).
  - 8가지 도구: 펜, 형광펜, 지우개, 직선, 화살표, 사각형(채우기 지원), 원, 텍스트 스탬프.
  - 5가지 배경 텍스처: 클린 화이트, 모눈종이 격자, 점선 도트, 줄노트, 블랙보드 칠판 다크모드.
  - 무제한 실행 취소/다시 실행(`Ctrl+Z`, `Ctrl+Y`), PNG/JPEG 다운로드, 클립보드 원클릭 복사, 다중 스케치 보관함(Gallery).
- **아이디어 캔버스 & 회의실 (`/canvas`)**:
  - 피그잼 스타일 포스트잇 메모지, 회의 타이머, 안건 카드, 스티커 도장, 다중 회의실 개설.
- **2D 인터랙티브 마인드맵 (`/mindmap`)**:
  - 캔버스 점선 격자, S자 베지어 곡선 커넥터, 노드 실시간 추가/수정/삭제 및 테마 색상 변경.
- **프로젝트 로드맵 (`/projects`)**:
  - 간트 타임라인 일정, 마우스 드래그 바 전체 이동(DND) 및 실시간 펄싱 와이어프레임 스켈레톤 프리뷰.
- **기능 백로그 (`/ideas`)**:
  - 3단 칸반(아이디어/진행중/완료), `Idea.bulkWrite` 배치 고속 동기화.

### 2.4 커뮤니티, 블로그 & 실시간 소통 (Community & Lounge)
- **커뮤니티 광장 (`/board`)**:
  - 카테고리별 필터, 마크다운 게시글, 캘린더 일정 연계 등록, 댓글 및 좋아요.
- **인사이트 블로그 (`/blog`)**:
  - 기술 아티클, 읽기 예상 시간(Reading Time), 태그 필터, 마크다운 렌더러.
- **글로벌 라운지 채팅 (`/chat`)**:
  - 실시간 웹 소통 라운지 및 스터디 그룹 채널 채팅.
- **전역 피드백 접수 (`FeedbackModal`)**:
  - 전역 플로팅 버튼, Nodemailer 관리자 비동기 이메일 발송, 사이드바 벨 뱃지 실시간 연동.

### 2.5 엔터프라이즈급 관리자 콘솔 & DB 스키마 CRUD (Admin Console)
- **데이터베이스 (MongoDB) 스키마 관리 (`/settings/database`)**:
  - `db.listCollections()` 동적 인트로스펙션 기반으로 26개 이상의 전체 컬렉션 실시간 색인.
  - 테이블 뷰(주요 필드 자동 추출, ID 복사) ↔ 카드/JSON 코드 뷰 전환.
  - **실시간 JSON 문법 검증기**: 파싱 오류 검출, 기본 스키마 템플릿 로드, 포맷 정리(Beautify) 지원.
  - 모든 작업에 `withAudit` 감사 로그 기록.
- **사용자 계정 & 권한 관리 (`/settings/accounts`)**:
  - Google 및 Kakao OAuth 4단계 정밀 자동 식별 알고리즘 (CDN 도메인, 계정 ID, 이메일 도메인 분석).
  - 인증 제공자별(Google/Kakao) 뱃지 표기 및 필터 탭 제공, 권한 승격(`admin` ↔ `user`).
- **문항 관리 (`/admin/questions`)**:
  - 시험지 스캔/PDF 복사 텍스트를 자동 파싱하여 1·2·3번 문항으로 검증하는 **AI 문제 등록** 인터페이스.
  - 과목 및 회차별 출제 활성화/비활성화 일괄 토글 및 삭제.
- **카테고리 관리 (`/settings/categories`)**:
  - 커뮤니티, 블로그, 캘린더, 지식노트 전역 카테고리 색상 및 슬러그 CRUD.
- **보안 감사 로그 (`/settings/logs`) & 사이트 운영 (`/settings/system`)**:
  - 엔드포인트, IP, 응답 시간, 상태 코드 실시간 모니터링, 긴급 점검 모드 및 기능별 ON/OFF.

---

## 🎨 3. 디자인 시스템 및 UI/UX 표준

| 요소 | 표준 규격 및 구현 |
| :--- | :--- |
| **Typography** | 로컬 WOFF2 정적 서빙 기반 **Pretendard Variable** (45~920) + `lib/styles/typography.ts` 시맨틱 유틸리티 클래스 (`.ui-page-title`, `.ui-section-title`, `.ui-card-title`, `.ui-body`, `.ui-caption`, `.ui-badge`, `.ui-button`) |
| **Themes** | `next-themes` 기반 라이트/다크 모드 및 **24개 시맨틱 테마 프리셋** (단일 raw hex 하드코딩 엄격 금지, `bg-surface-container-lowest`, `text-on-surface`, `border-outline-variant`, `text-primary` 등 시맨틱 토큰화) |
| **Alert & Confirm** | 브라우저 기본 팝업을 100% 퇴출한 **사이트 전역 커스텀 다이얼로그 시스템 (`alertModal`)** (`lib/alert.ts`, `AlertDialogContainer.tsx`). `window.alert` 안전 폴리필 및 키보드 Enter/ESC 완벽 제어 |
| **Toast System** | 전역 비차단형 플로팅 토스트 (`toast.success`, `toast.error`, `toast.warning`, `toast.info`) |
| **Layout Shell** | 3단계 모드 지원 반응형 사이드바 (`hidden` ↔ `icon(72px)` ↔ `full(240px)`), 모바일 서랍 오버레이 및 전 페이지 와이드 풀위드(Full-Width) 레이아웃 |
| **Auto-Save Indicator** | 너비 118px 고정(`SaveStatusIndicator`)으로 상태 변경 시 인접 툴바 버튼 흔들림(Layout Jitter) 영구 차단 |

---

## 🛠 4. 기술 스택 (Tech Stack)

### Frontend
- **Framework**: [Next.js 16.4.3 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19.3.0](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4.3.3](https://tailwindcss.com/) (`@tailwindcss/postcss`, `@tailwindcss/turbopack`)
- **Theme Engine**: [next-themes v0.4.6](https://github.com/pacocoursey/next-themes)
- **Typography**: Pretendard Variable (Local WOFF2, zero external network dependency)
- **Icons**: [Lucide React v1.55.0](https://lucide.dev/)
- **Markdown / Code**: `react-markdown`, `remark-gfm`, `react-syntax-highlighter`

### Backend & Database
- **API Runtime**: Next.js Route Handlers (Edge & Node.js Runtime)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose v9.11.1](https://mongoosejs.com/) (커넥션 풀 글로벌 캐싱 & `bulkWrite` 고속 배치 처리)
- **Authentication**: [NextAuth.js v4.24.15](https://next-auth.js.org/) (Google, Kakao OAuth 2.0 & 6자리 이메일 인증)
- **Email Service**: [Nodemailer v7.0.13](https://nodemailer.com/) (SMTP 기반 비동기 알림 및 인증 메일 발송)
- **Media Storage**: [Cloudinary](https://cloudinary.com/) (일기/러닝 인증 사진 클라우드 스토리지)

---

## 📂 5. 디렉터리 아키텍처

```text
one-quiz/
├── app/
│   ├── layout.tsx                # 루트 레이아웃 (Pretendard 프리로드, Providers, ThemeProvider, Toast, Alert)
│   ├── globals.css               # Tailwind v4, 24개 테마 CSS 변수, Pretendard @font-face
│   ├── page.tsx                  # 12개 위젯 모듈러 대시보드
│   ├── exam/                     # CBT 기출문제 학습 (단일 2열 통합 선택 & 실전 풀이 룸)
│   ├── calendar/                 # 종일/시간 분리 연속 바 스터디 캘린더
│   ├── tasks/                    # 카테고리/우선순위 할일 관리
│   ├── diary/                    # KST 1일 1회 회고 일기장
│   ├── drawing/                  # HTML5 Canvas 벡터 스케치 그림판
│   ├── canvas/                   # 아이디어 캔버스 & 회의실
│   ├── mindmap/                  # 2D 인터랙티브 마인드맵
│   ├── projects/                 # 간트 타임라인 프로젝트 로드맵
│   ├── ideas/                    # 3단 칸반 기능 백로그
│   ├── running/                  # 달리기 기록 및 AI 러닝 코칭
│   ├── board/                    # 커뮤니티 게시판
│   ├── blog/                     # 테크 인사이트 블로그
│   ├── chat/                     # 글로벌 라운지 & 스터디 실시간 채팅
│   ├── drive/                    # 클라우드 파일/문서 드라이브
│   ├── bookmarks/                # 웹 링크 북마크 스크랩
│   ├── learning/                 # 180일 잔디 히트맵 & 학습 성장 리포트
│   ├── groups/                   # 초대코드 기반 스터디 그룹
│   ├── settings/[module]/        # 15개 독립 모듈 통합 설정 (DB관리, 계정관리 등)
│   ├── admin/                    # 관리자 콘솔 하위 라우트 (리다이렉트 & 문항 관리)
│   └── api/                      # 20+개 도메인별 RESTful Route Handlers (withAudit 적용)
│
├── components/
│   ├── layout/                   # AppShell, Sidebar (3단계 모드), Header
│   ├── common/                   # SaveStatusIndicator, CustomScrollArea, PageHeader
│   ├── ui/                       # ToastContainer, AlertDialogContainer, ScrollArea
│   ├── dashboard/                # 대시보드 12개 플랫 위젯 컴포넌트
│   ├── calendar/                 # CalendarView, EventFormModal, CalendarDayModal
│   ├── drawing/                  # DrawingView (벡터 렌더러, 툴바, 갤러리)
│   ├── canvas/                   # CanvasView (포스트잇, 타이머, 스티커)
│   ├── mindmap/                  # MindmapView (노드 그래프 캔버스)
│   ├── projects/                 # RoadmapView, BacklogView
│   ├── running/                  # RunningView (피드, 통계, AI 코칭)
│   ├── settings/                 # SettingsLayout, SettingsModuleView, 15개 도메인 모듈
│   └── admin/                    # AIQuestionImportModal 등 관리자 뷰
│
├── models/                       # 26+개 Mongoose 스키마 정의
│   ├── Question.ts, QuestionAttempt.ts, CalendarEvent.ts, Task.ts, Diary.ts,
│   ├── Drawing.ts, CanvasRoom.ts, CanvasItem.ts, Mindmap.ts, ProjectRoadmap.ts,
│   ├── Idea.ts, BacklogItem.ts, RunningLog.ts, LearningLog.ts, Group.ts,
│   ├── ChatMessage.ts, CommunityPost.ts, BlogPost.ts, DriveDoc.ts, Bookmark.ts,
│   └── Feedback.ts, Category.ts, AuditLog.ts, SiteSetting.ts, User.ts ...
│
├── lib/
│   ├── mongodb.ts                # Mongoose 글로벌 커넥션 풀 캐싱
│   ├── auth.ts                   # NextAuth 설정 및 OAuth 프로바이더
│   ├── alert.ts                  # 사이트 전역 커스텀 alertModal 유틸리티
│   ├── toast.ts                  # 비차단형 플로팅 토스트 유틸리티
│   ├── withAudit.ts              # Route Handler API 감사 로그 HOC 데코레이터
│   ├── email.ts                  # Nodemailer 이메일 발송 모듈
│   └── hooks/useMounted.ts       # useSyncExternalStore 기반 SSR 하이드레이션 안전 훅
│
└── public/fonts/                 # PretendardVariable.woff2 로컬 가변 폰트
```

---

## 🚀 6. 시작하기 (Getting Started)

### 요구 사양
- **Node.js**: `v18.18.0` 이상 권장 (Node.js 20+ 최적 호환)
- **Package Manager**: `npm` 또는 `pnpm`
- **Database**: MongoDB Atlas 또는 로컬 MongoDB 인스턴스 (v6.0+)

### 1. 저장소 클론 (Clone Repository)
```bash
git clone https://github.com/your-username/one-quiz.git
cd one-quiz
```

### 2. 의존성 패키지 설치
```bash
npm install
```

### 3. 환경 변수 파일 생성
프로젝트 루트 디렉터리에 `.env.local` 파일을 생성하고 필수 키를 입력합니다 (상세 설정값은 하단 7번 항목 참조).

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속하여 결과를 확인합니다.

### 5. 정적 타입 검사 및 린트 검증
```bash
npx tsc --noEmit
npm run lint
```

### 6. 프로덕션 빌드 및 실행
```bash
npm run build
npm run start
```

---

## 🔐 7. 환경 변수 설정 (.env.local)

`.env.local` 파일에 다음 환경 변수들을 정의합니다:

```env
# ==========================================
# 1. Database (MongoDB)
# ==========================================
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/onequiz?retryWrites=true&w=majority

# ==========================================
# 2. NextAuth Configuration
# ==========================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_random_secret_32_characters

# ==========================================
# 3. OAuth Providers (Google & Kakao)
# ==========================================
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# ==========================================
# 4. Email Service (Nodemailer SMTP)
# ==========================================
EMAIL_SERVER_USER=your_gmail_or_smtp_account@gmail.com
EMAIL_SERVER_PASSWORD=your_smtp_app_password
EMAIL_FROM=OneQuiz <noreply@onequiz.com>

# ==========================================
# 5. Media Storage (Cloudinary)
# ==========================================
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

## 📡 8. 주요 API 엔드포인트 명세

| 엔드포인트 | 메서드 | 설명 | 인증/권한 | 감사로그 (`withAudit`) |
| :--- | :---: | :--- | :---: | :---: |
| `/api/questions` | `GET` | 기출문제 목록 조회 (과목/회차/상태 필터링) | Public | 수집 |
| `/api/questions` | `POST / PUT / DELETE` | 문제 단일/대량 등록, 활성화 토글, 삭제 | Admin | 수집 |
| `/api/admin/database` | `GET` | 전체 MongoDB 컬렉션 자동 탐색 및 문서 조회 | Admin | 수집 |
| `/api/admin/database` | `POST / PUT / DELETE` | 임의 스키마 문서 신규 생성, 수정, 영구 삭제 | Admin | 수집 |
| `/api/drawing` | `GET / POST / DELETE` | 벡터 스케치 그림판 목록 조회, 자동저장, 삭제 | Session | 수집 |
| `/api/calendar` | `GET / POST / PUT / DELETE` | 종일/시간 캘린더 일정 CRUD 및 기간 동기화 | Session | 수집 |
| `/api/tasks` | `GET / POST / PUT / DELETE` | 할일 목록 CRUD (`returnDocument: 'after'`) | Session | 수집 |
| `/api/diary` | `GET / POST / PUT / DELETE` | KST 1일 1회 회고 일기 CRUD | Session | 수집 |
| `/api/canvas` | `GET / POST / PUT / DELETE` | 아이디어 캔버스 룸 및 포스트잇 아이템 CRUD | Session | 수집 |
| `/api/mindmap` | `GET / POST / PUT / DELETE` | 2D 마인드맵 노드 및 브랜치 CRUD | Session | 수집 |
| `/api/running` | `GET / POST / DELETE` | 달리기 기록 적재 및 AI 러닝 코칭 생성 | Session | 수집 |
| `/api/users` | `GET / PUT` | 회원 목록 조회 (소셜 인증 분석) 및 권한 승격 | Admin | 수집 |
| `/api/categories` | `GET / POST / PUT / DELETE` | 커뮤니티·블로그 전역 카테고리 CRUD | Public / Admin | 수집 |
| `/api/feedback` | `GET / POST / PATCH` | 사용자 건의 접수 및 Nodemailer 이메일 발송 | Public / Admin | 수집 |
| `/api/logs` | `GET` | 보안 및 시스템 감사 로그 검색·필터링 | Admin | 수집 |

---

## 🛡 9. 엔지니어링 원칙 및 품질 관리

1. **Strict Modularity (도메인 격리 원칙)**:
   - 거대한 모놀리식 단일 파일 생성을 엄격히 금지하며, 도메인별 전용 모듈(`components/drawing/`, `components/settings/modules/`, `components/canvas/` 등)로 완전 격리합니다.
2. **Hydration Mismatch Zero Tolerance**:
   - `useSyncExternalStore` 기반의 커스텀 훅(`useMounted`) 및 `<Suspense>` 경계를 철저히 준수하여 SSR과 클라이언트 간 시간·스토리지 시차로 인한 렌더링 충돌을 원천 방지합니다.
3. **Site-wide Semantic Design Tokens**:
   - 임의의 raw hex(`text-[#333]`) 사용을 전면 배제하고, 24개 테마 프리셋과 완벽히 호환되는 시맨틱 토큰(`bg-surface-container-lowest`, `text-on-surface`, `border-outline-variant`, `text-primary`) 및 Pretendard 가변 폰트 모듈 클래스만을 사용합니다.
4. **Audit Logging by Default**:
   - 모든 주요 API 핸들러에 `withAudit` HOC 데코레이터를 적용하여 HTTP 메서드, 클라이언트 IP, 응답 시간, 상태 코드 및 작업 메시지를 `AuditLog` 컬렉션에 실시간 영구 적재합니다.

---

<div align="center">
  <sub>Designed & Developed with ❤️ by One-Quiz Team. All rights reserved.</sub>
</div>
