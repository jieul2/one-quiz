import { CategoryType } from "@/models/Category";

export interface DefaultCategoryItem {
  name: string;
  slug: string;
  description: string;
  color: string;
  order: number;
}

export const DEFAULT_CATEGORIES: Record<CategoryType, DefaultCategoryItem[]> = {
  board: [
    { name: "자유", slug: "free", description: "일상적인 대화와 자유로운 잡담을 나누는 공간", color: "primary", order: 1 },
    { name: "질문답변", slug: "qna", description: "궁금한 점이나 기술적인 의문을 묻고 답하는 공간", color: "sky", order: 2 },
    { name: "정보공유", slug: "info", description: "유용한 개발 팁, 지식, 노하우 및 링크 공유", color: "emerald", order: 3 },
    { name: "일상·라이프", slug: "life", description: "오늘의 일상, 취미, 운동, 건강 이야기", color: "amber", order: 4 },
    { name: "프로젝트", slug: "projects", description: "개인 프로젝트 자랑, 사이드 프로젝트 팀원 모집", color: "violet", order: 5 },
    { name: "스터디모집", slug: "study", description: "온/오프라인 스터디 그룹 및 스터디원 모집", color: "rose", order: 6 },
    { name: "시험후기", slug: "exam-review", description: "자격증, 코딩테스트, 면접 응시 후기 및 꿀팁", color: "slate", order: 7 },
  ],
  blog: [
    { name: "기술/개발", slug: "tech", description: "웹 개발, 아키텍처, 프레임워크 및 프로그래밍 기술", color: "primary", order: 1 },
    { name: "생산성/라이프", slug: "productivity", description: "업무 효율화, 루틴, 시간 관리 및 생산성 노하우", color: "emerald", order: 2 },
    { name: "트렌드/이슈", slug: "trend", description: "IT 최신 트렌드, 오픈소스 생태계 및 업계 소식", color: "sky", order: 3 },
    { name: "기획/디자인", slug: "design", description: "UX/UI 설계, 서비스 기획 및 인터페이스 인사이트", color: "violet", order: 4 },
    { name: "알고리즘", slug: "algorithm", description: "자료구조, 알고리즘 풀이 및 코딩테스트 핵심 해설", color: "amber", order: 5 },
    { name: "자격증", slug: "certificate", description: "국가공인 및 국제 IT 자격증 시험 대비 요약", color: "rose", order: 6 },
    { name: "회고", slug: "retrospective", description: "프로젝트 회고, 분기별 성장 기록 및 교훈", color: "slate", order: 7 },
  ],
  canvas: [
    { name: "브레인스토밍", slug: "brainstorming", description: "자유로운 아이디어 발산 및 포스트잇 정리", color: "primary", order: 1 },
    { name: "기획 회의", slug: "planning", description: "신규 서비스 기획 및 기능 사양 논의", color: "violet", order: 2 },
    { name: "디자인 리뷰", slug: "design-review", description: "UI 디자인 및 사용자 경험 시각 피드백", color: "rose", order: 3 },
    { name: "코드 아키텍처", slug: "architecture", description: "시스템 구조 및 데이터 모델 다이어그램 논의", color: "sky", order: 4 },
    { name: "자유 토론", slug: "free-discussion", description: "팀원 간 자유 아젠다 및 안건 토의", color: "amber", order: 5 },
    { name: "시험대비", slug: "exam-prep", description: "시험 대비 핵심 공식 및 요약 카드 정리", color: "emerald", order: 6 },
  ],
  calendar: [
    { name: "개인일정", slug: "personal", description: "개인적인 약속, 기념일 및 일상 일정", color: "primary", order: 1 },
    { name: "업무/프로젝트", slug: "work", description: "업무 마감일, 릴리즈 및 프로젝트 마일스톤", color: "violet", order: 2 },
    { name: "스터디/시험", slug: "study", description: "스터디 모임, 시험 일정 및 수험 계획", color: "emerald", order: 3 },
    { name: "미팅/회의", slug: "meeting", description: "비즈니스 미팅, 팀 스프린트 회의", color: "amber", order: 4 },
    { name: "리마인더", slug: "reminder", description: "잊지 말아야 할 중요 체크 일정", color: "rose", order: 5 },
  ],
  note: [
    { name: "학습 일기", slug: "study-diary", description: "매일의 배움과 일기에서 복사된 지식 기록", color: "primary", order: 1 },
    { name: "개발 노트", slug: "dev-note", description: "코드 스니펫, 에러 해결 및 구현 노하우", color: "sky", order: 2 },
    { name: "개인 회고", slug: "retrospective", description: "개인적인 성찰과 성장 마인드셋 기록", color: "emerald", order: 3 },
    { name: "아이디어", slug: "ideas", description: "새로운 서비스 기획 및 번뜩이는 영감 메모", color: "amber", order: 4 },
  ],
};
