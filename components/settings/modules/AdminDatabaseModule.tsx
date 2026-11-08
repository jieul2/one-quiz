"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Database,
  Search,
  Plus,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  Table as TableIcon,
  Code,
  Copy,
  Check,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Folder,
  Layers,
  HelpCircle,
  Award,
  Tag,
  Flame,
  AlertTriangle,
  Calendar,
  CheckSquare,
  FileText,
  BookOpen,
  HardDrive,
  Bookmark,
  Layout,
  StickyNote,
  Network,
  Lightbulb,
  Kanban,
  Milestone,
  MessageSquare,
  BookMarked,
  Users,
  MessagesSquare,
  Activity,
  MessageCircle,
  ShieldCheck,
  Terminal,
  SlidersHorizontal,
  Loader2,
  PenTool,
} from "lucide-react";
import { toast } from "@/lib/toast";

// 1. 컬렉션 메타데이터 정의 (한국어 라벨, 설명, 카테고리, 아이콘)
interface CollectionMetadata {
  name: string;
  label: string;
  description: string;
  category: "study" | "workspace" | "community" | "system" | "other";
  icon: React.ComponentType<{ className?: string; size?: number }>;
  defaultTemplate?: Record<string, unknown>;
}

const KNOWN_COLLECTIONS: Record<string, Omit<CollectionMetadata, "name">> = {
  // 1. 학습 & 기출
  questions: {
    label: "기출문제",
    description: "시험 과목별 문항 지문, 보기, 정답, 해설 스키마",
    category: "study",
    icon: HelpCircle,
    defaultTemplate: {
      subject: "소프트웨어공학",
      examType: "2024년 1회차",
      questionNumber: 1,
      questionType: "multiple-choice",
      title: "새로운 문제 내용 지문",
      options: ["1번 보기", "2번 보기", "3번 보기", "4번 보기"],
      correctAnswer: ["1번 보기"],
      explanation: "문제에 대한 상세한 해설을 입력하세요.",
      isActive: true,
    },
  },
  questionattempts: {
    label: "문제 풀이 기록",
    description: "사용자별 개별 문항 풀이 이력 및 정오답 기록",
    category: "study",
    icon: Award,
    defaultTemplate: {
      userEmail: "user@example.com",
      questionId: "671fb0000000000000000000",
      subject: "소프트웨어공학",
      isCorrect: true,
      selectedAnswer: ["1번 보기"],
      attemptedAt: new Date().toISOString(),
    },
  },
  categories: {
    label: "카테고리 분류",
    description: "게시판, 블로그, 캘린더, 지식노트 카테고리",
    category: "study",
    icon: Tag,
    defaultTemplate: {
      name: "새 카테고리",
      slug: "new-category",
      type: "board",
      description: "카테고리 설명",
      color: "primary",
      order: 1,
      isActive: true,
    },
  },
  learninglogs: {
    label: "학습 잔디/로그",
    description: "일별 학습 시간, 뽀모도로 세션 및 정답률 기록",
    category: "study",
    icon: Flame,
    defaultTemplate: {
      userEmail: "user@example.com",
      dateKey: new Date().toISOString().split("T")[0],
      durationMinutes: 45,
      solvedCount: 15,
      correctCount: 12,
    },
  },
  reports: {
    label: "문제 오류 신고",
    description: "회원이 접수한 문제 오류 정정 및 해설 신고",
    category: "study",
    icon: AlertTriangle,
    defaultTemplate: {
      subject: "데이터베이스",
      examType: "2024년 1회차",
      questionNumber: 5,
      questionText: "문제 지문 요약",
      userEmail: "reporter@example.com",
      reportReason: "오답 표기 정정 요청",
      status: "PENDING",
    },
  },

  // 2. 워크스페이스 & 생산성
  calendarevents: {
    label: "캘린더 일정",
    description: "개인 및 그룹 캘린더 일정, 시간 및 종일 이벤트",
    category: "workspace",
    icon: Calendar,
    defaultTemplate: {
      title: "새 회의 일정",
      description: "일정 세부 사항",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      allDay: true,
      category: "work",
      color: "#3b82f6",
      authorEmail: "admin@example.com",
    },
  },
  tasks: {
    label: "할일 목록",
    description: "투두 태스크, 우선순위, 마감일 및 완료 상태",
    category: "workspace",
    icon: CheckSquare,
    defaultTemplate: {
      title: "새 할일 항목",
      completed: false,
      priority: "medium",
      authorEmail: "admin@example.com",
      order: 1,
    },
  },
  taskcategories: {
    label: "할일 카테고리",
    description: "할일 보드 및 그룹별 카테고리 분류",
    category: "workspace",
    icon: Folder,
    defaultTemplate: {
      name: "업무",
      color: "#3b82f6",
      authorEmail: "admin@example.com",
    },
  },
  notes: {
    label: "지식노트",
    description: "마크다운 기반 개인 학습 지식노트 및 스크랩",
    category: "workspace",
    icon: FileText,
    defaultTemplate: {
      title: "새 지식노트",
      content: "## 노트 내용\n\n지식 정리...",
      category: "개발",
      tags: ["TypeScript", "Next.js"],
      authorEmail: "admin@example.com",
    },
  },
  diaries: {
    label: "일기 회고",
    description: "KST 1일 1회 작성 일기 및 감정/날씨 기록",
    category: "workspace",
    icon: BookOpen,
    defaultTemplate: {
      userEmail: "admin@example.com",
      weather: "sunny",
      items: [{ title: "오늘의 하루", content: "일기 내용", images: [] }],
    },
  },
  drivedocs: {
    label: "드라이브 문서",
    description: "개인 파일 스토리지 및 문서 보관함",
    category: "workspace",
    icon: HardDrive,
    defaultTemplate: {
      name: "프로젝트 제안서.pdf",
      size: 102400,
      mimeType: "application/pdf",
      authorEmail: "admin@example.com",
    },
  },
  bookmarks: {
    label: "북마크 링크",
    description: "웹 링크 스크랩, 메타데이터 및 태그 보관",
    category: "workspace",
    icon: Bookmark,
    defaultTemplate: {
      title: "Next.js 공식 문서",
      url: "https://nextjs.org",
      description: "The React Framework for the Web",
      authorEmail: "admin@example.com",
    },
  },
  canvasrooms: {
    label: "캔버스 회의실",
    description: "아이디어 캔버스 다중 회의실 및 룸 설정",
    category: "workspace",
    icon: Layout,
    defaultTemplate: {
      name: "기능 브레인스토밍",
      description: "신규 아이디어 도출 회의실",
      authorEmail: "admin@example.com",
    },
  },
  canvasitems: {
    label: "캔버스 포스트잇",
    description: "캔버스 내부 포스트잇 메모, 안건 카드, 스티커",
    category: "workspace",
    icon: StickyNote,
    defaultTemplate: {
      roomId: "default",
      type: "note",
      content: "새로운 아이디어 메모",
      x: 100,
      y: 100,
      color: "yellow",
    },
  },
  mindmaps: {
    label: "2D 마인드맵",
    description: "인터랙티브 노드 트리 및 실시간 브레인스토밍",
    category: "workspace",
    icon: Network,
    defaultTemplate: {
      title: "신규 아키텍처 맵",
      nodes: [
        { id: "root", text: "중심 주제", x: 400, y: 300, isRoot: true },
      ],
      connections: [],
      authorEmail: "admin@example.com",
    },
  },
  drawings: {
    label: "스케치 그림판",
    description: "자유형 벡터 드로잉 및 스케치 캔버스 데이터",
    category: "workspace",
    icon: PenTool,
    defaultTemplate: {
      userEmail: "admin@example.com",
      title: "새 스케치",
      elements: [],
      backgroundPattern: "blank",
      backgroundColor: "#ffffff",
    },
  },
  ideas: {
    label: "기능 백로그/아이디어",
    description: "3단 칸반 아이디어, 커밋 히스토리 및 변경 로그",
    category: "workspace",
    icon: Lightbulb,
    defaultTemplate: {
      title: "새 기능 아이디어",
      description: "기능 상세 스펙",
      status: "idea",
      priority: "medium",
      authorEmail: "admin@example.com",
    },
  },
  backlogitems: {
    label: "프로젝트 백로그",
    description: "프로젝트별 백로그 스프린트 작업 카드",
    category: "workspace",
    icon: Kanban,
    defaultTemplate: {
      title: "백로그 작업",
      status: "todo",
      priority: "medium",
      authorEmail: "admin@example.com",
    },
  },
  projectroadmaps: {
    label: "프로젝트 로드맵",
    description: "간트 타임라인 일정, 막대 기간 및 코멘트",
    category: "workspace",
    icon: Milestone,
    defaultTemplate: {
      title: "2026 Q1 로드맵",
      items: [],
      authorEmail: "admin@example.com",
    },
  },

  // 3. 커뮤니티 & 라이프
  communityposts: {
    label: "커뮤니티 게시글",
    description: "자유게시판, 질문답변 아티클 및 댓글 연동",
    category: "community",
    icon: MessageSquare,
    defaultTemplate: {
      title: "커뮤니티에 질문드립니다",
      content: "질문 내용...",
      category: "자유",
      authorEmail: "admin@example.com",
      authorName: "관리자",
      likeCount: 0,
    },
  },
  blogposts: {
    label: "인사이트 블로그",
    description: "기술 아티클, 읽기 시간, 태그 및 마크다운 글",
    category: "community",
    icon: BookMarked,
    defaultTemplate: {
      title: "Next.js 16 아키텍처 분석",
      slug: "nextjs-16-architecture",
      content: "## 도입\n\n본문...",
      tags: ["Next.js", "React"],
      readingTime: "5 min",
      authorEmail: "admin@example.com",
      isPublished: true,
    },
  },
  groups: {
    label: "스터디 그룹",
    description: "초대 코드 기반 스터디 모임 및 공유 룸",
    category: "community",
    icon: Users,
    defaultTemplate: {
      name: "알고리즘 스터디",
      description: "코딩 테스트 대비 스터디",
      inviteCode: "STUDY123",
      ownerEmail: "admin@example.com",
      members: [],
    },
  },
  chatmessages: {
    label: "채팅 메시지",
    description: "글로벌 라운지 및 스터디 그룹 실시간 채팅",
    category: "community",
    icon: MessagesSquare,
    defaultTemplate: {
      channelId: "global-lounge",
      userEmail: "admin@example.com",
      userName: "관리자",
      message: "안녕하세요!",
      timestamp: new Date().toISOString(),
    },
  },
  runninglogs: {
    label: "달리기 기록",
    description: "거리, 시간, 페이스, 인증 사진 및 AI 코칭 피드백",
    category: "community",
    icon: Activity,
    defaultTemplate: {
      userEmail: "admin@example.com",
      distanceKm: 5.0,
      durationMinutes: 28,
      pace: "5'36\"",
      calories: 320,
      runDate: new Date().toISOString().split("T")[0],
    },
  },
  feedbacks: {
    label: "사용자 피드백",
    description: "플랫폼 건의사항, 개선 의견 및 버그 제보",
    category: "community",
    icon: MessageCircle,
    defaultTemplate: {
      userEmail: "user@example.com",
      title: "UI 개선 건의",
      content: "개선 의견 내용...",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    },
  },

  // 4. 시스템 & 운영
  users: {
    label: "회원 계정",
    description: "Google/Kakao OAuth 계정 정보 및 관리자 권한",
    category: "system",
    icon: ShieldCheck,
    defaultTemplate: {
      email: "newuser@example.com",
      name: "신규회원",
      role: "user",
      provider: "google",
      lastLoginAt: new Date().toISOString(),
    },
  },
  auditlogs: {
    label: "보안 감사 로그",
    description: "관리자 및 API 접근 보안 감사 로그 트랙",
    category: "system",
    icon: Terminal,
    defaultTemplate: {
      email: "system@example.com",
      method: "GET",
      endpoint: "/api/admin/database",
      statusCode: 200,
      level: "INFO",
      message: "감사 로그 테스트",
      timestamp: new Date().toISOString(),
    },
  },
  sitesettings: {
    label: "사이트 운영 설정",
    description: "전역 긴급 점검 모드 및 기능별 활성화 스위치",
    category: "system",
    icon: SlidersHorizontal,
    defaultTemplate: {
      siteTitle: "oneQuiz",
      landingSubtitle: "올인원 통합 웹 워크스페이스",
      isMaintenanceMode: false,
      maintenanceMessage: "정기 점검 중입니다.",
      disabledFeatures: {
        exam: false,
        diary: false,
        ideas: false,
        admin: false,
      },
    },
  },
};

const CATEGORY_NAMES = {
  all: "전체 컬렉션",
  study: "학습 & 기출",
  workspace: "워크스페이스",
  community: "커뮤니티 & 라이프",
  system: "시스템 & 운영",
  other: "기타 컬렉션",
};

interface CollectionSummary {
  name: string;
  count: number;
  type: string;
}

export function AdminDatabaseModule() {
  // 1. 상태 관리
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("questions");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [collectionSearch, setCollectionSearch] = useState("");

  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // 로딩 상태
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 상태
  const [inspectDoc, setInspectDoc] = useState<Record<string, unknown> | null>(null);
  const [editDocModal, setEditDocModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    docId?: string;
    jsonString: string;
    jsonError: string | null;
  }>({
    isOpen: false,
    mode: "create",
    jsonString: "{}",
    jsonError: null,
  });

  const [deleteTargetDoc, setDeleteTargetDoc] = useState<{
    isOpen: boolean;
    docId: string;
    summary: string;
  }>({
    isOpen: false,
    docId: "",
    summary: "",
  });

  // 2. 컬렉션 목록 로드
  const loadCollections = useCallback(async () => {
    setIsLoadingCollections(true);
    try {
      const res = await fetch("/api/admin/database?action=collections");
      if (!res.ok) {
        throw new Error("컬렉션 목록을 불러오지 못했습니다.");
      }
      const data = await res.json();
      const loaded: CollectionSummary[] = data.collections || [];
      setCollections(loaded);

      // 선택된 컬렉션이 없거나 목록에 없으면 첫 번째 유효 컬렉션으로 지정
      if (loaded.length > 0 && !loaded.some((c) => c.name === selectedCollection)) {
        const defaultCol = loaded.find((c) => c.name === "questions") || loaded[0];
        setSelectedCollection(defaultCol.name);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "컬렉션 로드 실패");
    } finally {
      setIsLoadingCollections(false);
    }
  }, [selectedCollection]);

  // 3. 문서 목록 로드
  const loadDocuments = useCallback(async () => {
    if (!selectedCollection) return;
    setIsLoadingDocs(true);
    try {
      const params = new URLSearchParams({
        collection: selectedCollection,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      if (docSearchQuery.trim()) {
        params.set("search", docSearchQuery.trim());
      }

      const res = await fetch(`/api/admin/database?${params.toString()}`);
      if (!res.ok) {
        throw new Error("문서 목록을 불러오지 못했습니다.");
      }
      const data = await res.json();
      setDocuments(data.documents || []);
      setFields(data.fields || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "문서 로드 실패");
    } finally {
      setIsLoadingDocs(false);
    }
  }, [selectedCollection, currentPage, pageSize, docSearchQuery]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 컬렉션 변경 시 페이지 1로 리셋
  const handleSelectCollection = (colName: string) => {
    setSelectedCollection(colName);
    setCurrentPage(1);
    setDocSearchQuery("");
  };

  // 필터링된 컬렉션 목록 계산
  const filteredCollections = useMemo(() => {
    return collections.filter((col) => {
      const meta = KNOWN_COLLECTIONS[col.name];
      const category = meta ? meta.category : "other";

      // 카테고리 필터
      if (categoryFilter !== "all" && category !== categoryFilter) {
        return false;
      }

      // 검색어 필터
      if (collectionSearch.trim()) {
        const query = collectionSearch.toLowerCase().trim();
        const label = meta ? meta.label.toLowerCase() : "";
        const desc = meta ? meta.description.toLowerCase() : "";
        const name = col.name.toLowerCase();
        return name.includes(query) || label.includes(query) || desc.includes(query);
      }

      return true;
    });
  }, [collections, categoryFilter, collectionSearch]);

  // 현재 선택된 컬렉션 메타 정보
  const currentMeta = useMemo(() => {
    const meta = KNOWN_COLLECTIONS[selectedCollection];
    if (meta) {
      return {
        ...meta,
        name: selectedCollection,
      };
    }
    return {
      name: selectedCollection,
      label: selectedCollection,
      description: "사용자 정의 또는 확장 컬렉션 스키마",
      category: "other" as const,
      icon: Database,
      defaultTemplate: {
        title: "새 항목",
        createdAt: new Date().toISOString(),
      },
    };
  }, [selectedCollection]);

  // 총 문서 수 계산
  const totalAllDocuments = useMemo(() => {
    return collections.reduce((acc, curr) => acc + curr.count, 0);
  }, [collections]);

  // 테이블 표시용 주요 컬럼 필터 (최대 5개)
  const displayColumns = useMemo(() => {
    const priorityKeys = [
      "title",
      "name",
      "email",
      "userEmail",
      "authorEmail",
      "subject",
      "examType",
      "questionNumber",
      "category",
      "status",
      "role",
      "completed",
      "createdAt",
      "updatedAt",
    ];

    const selected: string[] = [];
    priorityKeys.forEach((key) => {
      if (fields.includes(key) && !selected.includes(key)) {
        selected.push(key);
      }
    });

    // 만약 우선순위 키가 적다면 나머지 필드에서 추가
    fields.forEach((key) => {
      if (key !== "_id" && !selected.includes(key) && selected.length < 5) {
        selected.push(key);
      }
    });

    return selected.slice(0, 5);
  }, [fields]);

  // 새 문서 모달 열기
  const handleOpenCreateModal = () => {
    const template = currentMeta.defaultTemplate || {
      title: "새 문서",
      createdAt: new Date().toISOString(),
    };
    setEditDocModal({
      isOpen: true,
      mode: "create",
      jsonString: JSON.stringify(template, null, 2),
      jsonError: null,
    });
  };

  // 문서 편집 모달 열기
  const handleOpenEditModal = (doc: Record<string, unknown>) => {
    const docCopy = { ...doc };
    const docId = String(docCopy._id || "");
    delete docCopy._id; // 편집기에서 _id는 수정하지 못하게 제거

    setEditDocModal({
      isOpen: true,
      mode: "edit",
      docId,
      jsonString: JSON.stringify(docCopy, null, 2),
      jsonError: null,
    });
  };

  // JSON 입력값 실시간 검증
  const handleJsonChange = (val: string) => {
    try {
      JSON.parse(val);
      setEditDocModal((prev) => ({
        ...prev,
        jsonString: val,
        jsonError: null,
      }));
    } catch (e) {
      setEditDocModal((prev) => ({
        ...prev,
        jsonString: val,
        jsonError: e instanceof Error ? e.message : "JSON 형식이 올바르지 않습니다.",
      }));
    }
  };

  // JSON 자동 포맷팅
  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(editDocModal.jsonString);
      setEditDocModal((prev) => ({
        ...prev,
        jsonString: JSON.stringify(parsed, null, 2),
        jsonError: null,
      }));
      toast.success("JSON 포맷이 깔끔하게 정렬되었습니다.");
    } catch {
      toast.error("올바른 JSON 형식이 아니어서 정렬할 수 없습니다.");
    }
  };

  // 문서 생성/수정 제출
  const handleSubmitDocument = async () => {
    if (editDocModal.jsonError) {
      toast.error("JSON 문법 오류를 먼저 해결해 주세요.");
      return;
    }

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(editDocModal.jsonString);
    } catch {
      toast.error("유효하지 않은 JSON 데이터입니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editDocModal.mode === "create") {
        const res = await fetch("/api/admin/database", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collection: selectedCollection,
            document: parsedPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "문서 생성에 실패했습니다.");
        toast.success("새 문서가 성공적으로 생성되었습니다.");
      } else {
        const res = await fetch("/api/admin/database", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collection: selectedCollection,
            id: editDocModal.docId,
            document: parsedPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "문서 수정에 실패했습니다.");
        toast.success("문서가 성공적으로 수정되었습니다.");
      }

      setEditDocModal((prev) => ({ ...prev, isOpen: false }));
      loadDocuments();
      loadCollections(); // 문서 수 갱신
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 처리 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 문서 삭제 확인 모달 열기
  const handleOpenDeleteModal = (doc: Record<string, unknown>) => {
    const docId = String(doc._id || "");
    const titleVal = doc.title || doc.name || doc.subject || doc.email || docId;
    setDeleteTargetDoc({
      isOpen: true,
      docId,
      summary: String(titleVal),
    });
  };

  // 문서 삭제 확정
  const handleConfirmDelete = async () => {
    if (!deleteTargetDoc.docId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/database?collection=${encodeURIComponent(
          selectedCollection
        )}&id=${encodeURIComponent(deleteTargetDoc.docId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제에 실패했습니다.");

      toast.success("문서가 안전하게 삭제되었습니다.");
      setDeleteTargetDoc({ isOpen: false, docId: "", summary: "" });
      loadDocuments();
      loadCollections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 처리 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 텍스트 클립보드 복사 헬퍼
  const handleCopyText = (text: string, label = "내용") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}이(가) 클립보드에 복사되었습니다.`);
  };

  // 총 페이지 계산
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const CurrentIcon = currentMeta.icon;

  return (
    <div className="w-full space-y-6 pb-20">
      {/* 1. 상단 플랫 헤더 & 통계 요약 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Database size={22} />
              </div>
              <div>
                <h1 className="ui-page-title text-on-surface flex items-center gap-2">
                  데이터베이스 (MongoDB) 스키마 관리
                  <span className="ui-badge bg-primary/15 text-primary border border-primary/30 font-mono px-2 py-0.5 rounded-full">
                    Admin CRUD
                  </span>
                </h1>
                <p className="ui-page-subtitle text-on-surface-variant">
                  원퀴즈 플랫폼 전체 26+개 컬렉션의 스키마 문서 조회, 실시간 검색, 생성, 수정, 영구 삭제 통합 콘솔
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                loadCollections();
                loadDocuments();
                toast.success("데이터베이스 상태를 새로고침했습니다.");
              }}
              disabled={isLoadingCollections || isLoadingDocs}
              className="ui-button px-3.5 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high transition-colors text-on-surface flex items-center gap-2"
              title="새로고침"
            >
              <RefreshCw
                size={16}
                className={isLoadingCollections || isLoadingDocs ? "animate-spin text-primary" : ""}
              />
              <span className="hidden sm:inline">새로고침</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="ui-button px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 font-medium"
            >
              <Plus size={16} />
              <span>새 문서 등록</span>
            </button>
          </div>
        </div>

        {/* 대시보드 통계 배지 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-outline-variant">
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3">
            <div className="ui-caption text-on-surface-variant">총 컬렉션 수</div>
            <div className="text-xl font-bold text-on-surface mt-0.5 tabular-nums">
              {isLoadingCollections ? "..." : `${collections.length}개`}
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3">
            <div className="ui-caption text-on-surface-variant">DB 전체 적재 문서</div>
            <div className="text-xl font-bold text-primary mt-0.5 tabular-nums">
              {isLoadingCollections ? "..." : `${totalAllDocuments.toLocaleString()}건`}
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3">
            <div className="ui-caption text-on-surface-variant">선택된 컬렉션 문서</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              {isLoadingDocs ? "..." : `${totalCount.toLocaleString()}건`}
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3">
            <div className="ui-caption text-on-surface-variant">감사 로그 연동</div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>withAudit 활성</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 메인 2열 그리드: 좌측(컬렉션 선택) & 우측(문서 탐색 및 CRUD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측: 컬렉션 내비게이터 (4열) */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              <h2 className="ui-section-title text-on-surface">스키마 컬렉션 목록</h2>
            </div>
            <span className="ui-badge bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-md">
              {filteredCollections.length}개
            </span>
          </div>

          {/* 컬렉션 검색창 */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              placeholder="컬렉션명, 한국어 라벨 검색..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/60"
            />
            {collectionSearch && (
              <button
                onClick={() => setCollectionSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 카테고리 필터 탭 */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "all", label: "전체" },
                { id: "study", label: "학습" },
                { id: "workspace", label: "워크스페이스" },
                { id: "community", label: "커뮤니티" },
                { id: "system", label: "시스템" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`ui-badge px-2.5 py-1 rounded-lg transition-all ${
                  categoryFilter === cat.id
                    ? "bg-primary text-on-primary font-semibold"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 컬렉션 리스트 */}
          <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
            {isLoadingCollections ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="ui-caption">컬렉션 인덱스 탐색 중...</span>
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="py-10 text-center text-on-surface-variant ui-caption">
                일치하는 컬렉션이 없습니다.
              </div>
            ) : (
              filteredCollections.map((col) => {
                const meta = KNOWN_COLLECTIONS[col.name];
                const IconComponent = meta?.icon || Database;
                const isSelected = selectedCollection === col.name;

                return (
                  <button
                    key={col.name}
                    onClick={() => handleSelectCollection(col.name)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-primary/10 border-primary text-on-surface ring-1 ring-primary shadow-xs"
                        : "bg-surface-container-low/70 border-outline-variant/60 hover:bg-surface-container hover:border-outline-variant text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        <IconComponent size={16} />
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">
                            {meta?.label || col.name}
                          </span>
                        </div>
                        <div className="text-xs text-on-surface-variant font-mono truncate">
                          {col.name}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`ui-badge px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                        isSelected
                          ? "bg-primary text-on-primary font-bold"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {col.count.toLocaleString()}건
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 우측: 선택된 컬렉션 문서 탐색기 (8열) */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4">
          {/* 헤더 & 컬렉션 상세 배너 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <CurrentIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="ui-section-title text-on-surface font-bold">
                    {currentMeta.label}
                  </h2>
                  <span className="ui-badge bg-surface-container-high font-mono text-on-surface-variant px-2 py-0.5 rounded">
                    {selectedCollection}
                  </span>
                  <span className="ui-badge bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded">
                    {CATEGORY_NAMES[currentMeta.category]}
                  </span>
                </div>
                <p className="ui-caption text-on-surface-variant mt-0.5">
                  {currentMeta.description}
                </p>
              </div>
            </div>

            {/* 뷰 모드 전환 (테이블 vs 카드) & 페이지 크기 */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "table"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  title="테이블 뷰"
                >
                  <TableIcon size={16} />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "card"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  title="카드/JSON 뷰"
                >
                  <Code size={16} />
                </button>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs bg-surface-container-low border border-outline-variant text-on-surface rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>10건씩</option>
                <option value={20}>20건씩</option>
                <option value={50}>50건씩</option>
              </select>
            </div>
          </div>

          {/* 검색 바 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => {
                  setDocSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ID, 제목, 작성자, 이메일, 본문 키워드로 문서 검색..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/60"
              />
              {docSearchQuery && (
                <button
                  onClick={() => {
                    setDocSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => loadDocuments()}
              className="ui-button px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant hover:bg-surface-container-high transition-colors text-on-surface flex items-center gap-1.5 shrink-0"
              title="검색 새로고침"
            >
              <RefreshCw size={14} className={isLoadingDocs ? "animate-spin text-primary" : ""} />
              <span className="hidden sm:inline">조회</span>
            </button>
          </div>

          {/* 문서 콘텐츠 목록 */}
          {isLoadingDocs ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 size={28} className="animate-spin text-primary" />
              <span className="ui-caption">선택된 컬렉션 문서를 조회 중입니다...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-outline-variant rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-container-high mx-auto flex items-center justify-center text-on-surface-variant">
                <Database size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="ui-card-title text-on-surface">등록된 문서가 없습니다</h3>
                <p className="ui-caption text-on-surface-variant">
                  {docSearchQuery
                    ? "검색 조건과 일치하는 문서가 없습니다."
                    : "새 문서 등록 버튼을 눌러 이 컬렉션에 첫 데이터를 추가해 보세요."}
                </p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="ui-button px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-all text-xs font-semibold"
              >
                + 새 문서 등록하기
              </button>
            </div>
          ) : viewMode === "table" ? (
            /* 테이블 뷰 */
            <div className="border border-outline-variant rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-surface-container-high/60 border-b border-outline-variant text-on-surface-variant font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-36">Document ID</th>
                      {displayColumns.map((col) => (
                        <th key={col} className="py-2.5 px-3 capitalize">
                          {col}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right w-28">관리 (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {documents.map((doc, idx) => {
                      const docId = String(doc._id || idx);
                      return (
                        <tr
                          key={docId}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono text-on-surface-variant">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[90px]">{docId}</span>
                              <button
                                onClick={() => handleCopyText(docId, "Document ID")}
                                className="p-1 hover:text-primary transition-colors"
                                title="ID 복사"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>

                          {displayColumns.map((col) => {
                            const val = doc[col];
                            let formatted = "";
                            if (val === null || val === undefined) {
                              formatted = "-";
                            } else if (typeof val === "boolean") {
                              formatted = val ? "True" : "False";
                            } else if (typeof val === "object") {
                              formatted = JSON.stringify(val);
                            } else {
                              formatted = String(val);
                            }

                            return (
                              <td
                                key={col}
                                className="py-2.5 px-3 text-on-surface max-w-[180px] truncate"
                                title={formatted}
                              >
                                {col === "status" || col === "role" || col === "isActive" ? (
                                  <span className="ui-badge bg-surface-container-high px-1.5 py-0.5 rounded text-[11px] font-mono">
                                    {formatted}
                                  </span>
                                ) : (
                                  formatted
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setInspectDoc(doc)}
                                className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                                title="상세 및 JSON 조회"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(doc)}
                                className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-emerald-600 transition-colors"
                                title="문서 수정"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(doc)}
                                className="p-1.5 rounded-lg hover:bg-error/15 text-on-surface-variant hover:text-error transition-colors"
                                title="문서 삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 카드 / JSON 뷰 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {documents.map((doc, idx) => {
                const docId = String(doc._id || idx);
                const titleVal =
                  doc.title || doc.name || doc.subject || doc.email || `문서 #${idx + 1}`;

                return (
                  <div
                    key={docId}
                    className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-3 hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-primary font-medium truncate">
                          {docId}
                        </span>
                        <button
                          onClick={() => handleCopyText(JSON.stringify(doc, null, 2), "문서 JSON")}
                          className="text-on-surface-variant hover:text-primary p-1"
                          title="JSON 전체 복사"
                        >
                          <Copy size={13} />
                        </button>
                      </div>

                      <h4 className="ui-card-title text-on-surface font-semibold line-clamp-1">
                        {String(titleVal)}
                      </h4>

                      {/* 코드 스니펫 미리보기 */}
                      <pre className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-2.5 text-[11px] font-mono text-on-surface-variant overflow-x-auto max-h-32">
                        {JSON.stringify(doc, null, 2)}
                      </pre>
                    </div>

                    <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between gap-2">
                      <span className="ui-caption text-on-surface-variant font-mono">
                        {doc.createdAt
                          ? new Date(String(doc.createdAt)).toLocaleDateString()
                          : "No Date"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setInspectDoc(doc)}
                          className="ui-button px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-on-surface flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>상세</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(doc)}
                          className="ui-button px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                        >
                          <Edit2 size={13} />
                          <span>수정</span>
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(doc)}
                          className="ui-button px-2.5 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-xs text-error flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          <span>삭제</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 하단 페이지네이션 바 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-outline-variant">
            <div className="ui-caption text-on-surface-variant">
              총 <span className="font-semibold text-on-surface">{totalCount.toLocaleString()}</span>
              건 중{" "}
              <span className="font-mono">
                {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, totalCount)}
              </span>
              건 표시
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoadingDocs}
                className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none text-on-surface"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="ui-caption font-mono text-on-surface px-2">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoadingDocs}
                className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none text-on-surface"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 모달: 문서 상세 & JSON 뷰어 모달 */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Eye size={16} />
                </div>
                <div>
                  <h3 className="ui-card-title text-on-surface font-bold">문서 상세 (JSON)</h3>
                  <p className="ui-caption text-on-surface-variant font-mono">
                    {selectedCollection} · {String(inspectDoc._id || "")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <pre className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-mono text-on-surface overflow-x-auto leading-relaxed">
                {JSON.stringify(inspectDoc, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-container-low/50 flex items-center justify-between">
              <button
                onClick={() => handleCopyText(JSON.stringify(inspectDoc, null, 2), "문서 JSON")}
                className="ui-button px-3.5 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high text-xs text-on-surface flex items-center gap-1.5"
              >
                <Copy size={14} />
                <span>JSON 복사</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = inspectDoc;
                    setInspectDoc(null);
                    handleOpenEditModal(target);
                  }}
                  className="ui-button px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit2 size={14} />
                  <span>이 문서 수정하기</span>
                </button>
                <button
                  onClick={() => setInspectDoc(null)}
                  className="ui-button px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container text-xs text-on-surface"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. 모달: 문서 생성 및 수정 모달 (실시간 JSON 파서 탑재) */}
      {editDocModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    editDocModal.mode === "create"
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {editDocModal.mode === "create" ? <Plus size={18} /> : <Edit2 size={16} />}
                </div>
                <div>
                  <h3 className="ui-card-title text-on-surface font-bold">
                    {editDocModal.mode === "create" ? "새 문서 등록" : "문서 데이터 수정"}
                  </h3>
                  <p className="ui-caption text-on-surface-variant font-mono">
                    컬렉션: {selectedCollection}
                    {editDocModal.docId && ` · ID: ${editDocModal.docId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditDocModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
              {/* 도구 툴바 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="ui-caption font-semibold text-on-surface">문서 스키마 데이터 (JSON)</span>
                  {editDocModal.jsonError ? (
                    <span className="ui-badge bg-error/15 text-error border border-error/30 flex items-center gap-1 px-2 py-0.5 rounded">
                      <AlertCircle size={12} />
                      <span>파싱 오류</span>
                    </span>
                  ) : (
                    <span className="ui-badge bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 px-2 py-0.5 rounded">
                      <Check size={12} />
                      <span>유효한 JSON</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editDocModal.mode === "create" && (
                    <button
                      type="button"
                      onClick={() => {
                        const template = currentMeta.defaultTemplate || {
                          title: "새 문서",
                          createdAt: new Date().toISOString(),
                        };
                        handleJsonChange(JSON.stringify(template, null, 2));
                        toast.success("기본 스키마 템플릿을 불러왔습니다.");
                      }}
                      className="ui-caption px-2.5 py-1 rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors"
                    >
                      기본 템플릿 로드
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePrettifyJson}
                    className="ui-caption px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors"
                  >
                    포맷 정리 (Beautify)
                  </button>
                </div>
              </div>

              {/* JSON 텍스트에리어 */}
              <div className="relative">
                <textarea
                  value={editDocModal.jsonString}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  rows={16}
                  className={`w-full p-3.5 rounded-xl font-mono text-xs leading-relaxed bg-surface-container-low border focus:outline-none transition-colors ${
                    editDocModal.jsonError
                      ? "border-error focus:ring-2 focus:ring-error text-error"
                      : "border-outline-variant focus:ring-2 focus:ring-primary text-on-surface"
                  }`}
                  placeholder="{\n  &quot;title&quot;: &quot;문서 제목&quot;\n}"
                />
              </div>

              {/* 에러 상세 메시지 표시 */}
              {editDocModal.jsonError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-semibold">JSON 구문 오류 발생</div>
                    <div className="font-mono text-[11px] break-all">{editDocModal.jsonError}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-container-low/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditDocModal((prev) => ({ ...prev, isOpen: false }))}
                className="ui-button px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmitDocument}
                disabled={Boolean(editDocModal.jsonError) || isSubmitting}
                className="ui-button px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all text-xs font-semibold flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>저장 처리 중...</span>
                  </>
                ) : (
                  <span>
                    {editDocModal.mode === "create" ? "문서 생성 완료" : "변경사항 저장"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 모달: 문서 삭제 확인 다이얼로그 */}
      {deleteTargetDoc.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/15 text-error flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="ui-card-title text-on-surface font-bold">문서 삭제 확인</h3>
                <p className="ui-caption text-on-surface-variant font-mono">
                  컬렉션: {selectedCollection}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs space-y-1.5">
              <div className="text-on-surface-variant">삭제 대상 ID:</div>
              <div className="font-mono text-primary font-semibold break-all">
                {deleteTargetDoc.docId}
              </div>
              {deleteTargetDoc.summary && (
                <div className="text-on-surface line-clamp-2 mt-1">
                  요약: {deleteTargetDoc.summary}
                </div>
              )}
            </div>

            <p className="ui-caption text-error font-medium">
              ⚠️ 이 작업은 되돌릴 수 없습니다. MongoDB 컬렉션에서 해당 문서가 영구적으로 삭제됩니다.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetDoc({ isOpen: false, docId: "", summary: "" })}
                className="ui-button px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high text-xs text-on-surface"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="ui-button px-4 py-2 rounded-xl bg-error text-white hover:bg-error/90 disabled:opacity-40 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <span>영구 삭제</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
