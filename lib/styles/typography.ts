/**
 * 🌟 OneQuiz 전역 타이포그래피 모듈 (Unified Typography Design System)
 *
 * 모든 페이지에서 일관된 폰트 크기와 계층 구조를 제공합니다.
 * 향후 텍스트 크기 일괄 수정 시, 이 모듈이나 `app/globals.css`의 CSS 변수를 변경하면
 * 전체 애플리케이션의 모든 페이지에 즉시 일괄 반영됩니다.
 */

export const TYPOGRAPHY = {
  // 1. 최상단 메인 페이지 헤더 (모든 뷰의 H1 - "대시보드", "캘린더", "할일", "프로젝트" 등)
  pageTitle: "ui-page-title",

  // 2. 최상단 페이지 부제목 / 보조 설명 / 오늘 날짜 표시
  pageSubtitle: "ui-page-subtitle",

  // 3. 중간 섹션 제목 / 모달 헤더 (H2)
  sectionTitle: "ui-section-title",

  // 4. 위젯 카드 헤더 / 카드 아이템 제목 (H3)
  cardTitle: "ui-card-title",

  // 5. 기본 본문 텍스트 / 리스트 항목 본문
  body: "ui-body",

  // 6. 보조 설명 / 서브 메타정보 / 타임스탬프 / 작은 안내
  caption: "ui-caption",

  // 7. 카운터 뱃지 / 상태 태그 ("5개", "1단계", "HOT" 등)
  badge: "ui-badge",

  // 8. 액션 버튼 텍스트
  button: "ui-button",

  // 9. 빈 상태 안내 문구 ("데이터가 없어요", "일정이 없습니다" 등)
  emptyState: "ui-empty-state",
} as const;

export type TypographyVariant = keyof typeof TYPOGRAPHY;
