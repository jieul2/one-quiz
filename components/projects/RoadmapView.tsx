"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar as CalendarIcon,
  UserPlus,
  Globe,
  Lock,
  Plus,
  MoreVertical,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Trash2,
  ZoomIn,
  ZoomOut,
  Check,
  ListTodo,
  FolderGit2,
  ArrowRight,
  Archive,
  RotateCcw,
  CheckCheck,
  CheckCircle2,
} from "lucide-react";
import { ProjectRoadmap, RoadmapItem, RoadmapComment, BacklogItem } from "@/lib/roadmapTypes";
import { toast } from "@/lib/toast";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { useTheme } from "next-themes";
import { THEME_LIST } from "@/lib/themes/themeList";
import { ScrollArea } from "@/components/ui/ScrollArea";

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// 초기 프로젝트 로드맵 기본값 (더미 데이터 없이 순수 DB 연동 스켈레톤)
const INITIAL_ROADMAP: ProjectRoadmap = {
  id: "proj-1",
  name: "프로젝트 로드맵",
  description: "프로젝트 진행 일정 및 타임라인 로드맵",
  startDate: "2026-10-15",
  endDate: "2026-11-04",
  createdAt: "2026-11-04",
  isPublic: true,
  members: [],
  items: [],
};

export function RoadmapView() {
  const { data: session } = useSession();

  // 1. 로드맵 상태 (로컬스토리지 보존)
  const [roadmap, setRoadmap] = useState<ProjectRoadmap>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("onequiz_roadmap_data");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_ROADMAP;
  });

  // 저장 상태 인디케이터 관리
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  const markSaved = useCallback(() => {
    const now = new Date();
    setSavedTimeStr(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
    setSaveStatus("saved");
  }, []);

  // 2. 모달 및 드로어 상태
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeCommentItemId, setActiveCommentItemId] = useState<string | null>(null);

  // 3. 복사 상태
  const [isCopied, setIsCopied] = useState(false);

  // 4. 입력 폼 상태들
  const [editStartDate, setEditStartDate] = useState(roadmap.startDate);
  const [editEndDate, setEditEndDate] = useState(roadmap.endDate);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");

  const [itemTitle, setItemTitle] = useState("");
  const [itemStartDate, setItemStartDate] = useState("2026-10-19");
  const [itemEndDate, setItemEndDate] = useState("2026-10-23");
  const [itemColor, setItemColor] = useState("#0284c7");

  const [newCommentText, setNewCommentText] = useState("");

  // 4-1. 백로그에서 가져오기 탭 지원 및 확정된 프로젝트 목록 로드
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const [itemInputTab, setItemInputTab] = useState<"direct" | "backlog">("direct");
  const [backlogList, setBacklogList] = useState<BacklogItem[]>([]);

  const refreshBacklogs = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const normalized: BacklogItem[] = data.map((item: Record<string, unknown>) => {
            let st: BacklogItem["status"] = "idea";
            if (item.status === "completed") st = "completed";
            else if (item.status === "progress" || item.status === "approved") st = "approved";
            else if (item.status === "promoted") st = "promoted";
            else if (item.status === "review") st = "review";

            const idVal = String(item.id || item._id || "");
            return {
              id: idVal,
              _id: item._id ? String(item._id) : undefined,
              title: String(item.title || "무제"),
              description: String(item.description || ""),
              status: st,
              priority: (item.priority as BacklogItem["priority"]) || "medium",
              isPublic: item.isPublic !== undefined ? Boolean(item.isPublic) : true,
              tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
              assignee: item.assignee ? String(item.assignee) : "",
              promotedToProjectId: item.promotedToProjectId ? String(item.promotedToProjectId) : (st === "promoted" ? idVal : undefined),
              startDate: item.startDate ? String(item.startDate) : undefined,
              endDate: item.endDate ? String(item.endDate) : undefined,
              color: item.color ? String(item.color) : undefined,
              completedAt: item.completedAt ? String(item.completedAt) : undefined,
              createdAt: item.createdAt ? String(item.createdAt).slice(0, 10) : "2026-11-04",
            };
          });
          setBacklogList(normalized);
          if (typeof window !== "undefined") {
            localStorage.setItem("onequiz_backlog_items", JSON.stringify(normalized));
          }
          return;
        }
      }
    } catch {}

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("onequiz_backlog_items");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTimeout(() => setBacklogList(parsed), 0);
        } catch {}
      }
    }
  }, []);

  // 🌟 백로그 페이지에서 프로젝트로 확정된 아이템 중 진행 중인 항목만 필터링 (완료된 프로젝트는 제외)
  const confirmedProjects = useMemo(() => {
    return backlogList.filter(
      (b) =>
        (b.status === "approved" || b.status === "promoted" || !!b.promotedToProjectId) &&
        b.status !== "completed"
    );
  }, [backlogList]);

  // 🌟 완료 처리되어 '끝난 보관함'에 보관된 프로젝트 목록
  const completedProjects = useMemo(() => {
    return backlogList.filter((b) => b.status === "completed");
  }, [backlogList]);

  // 세로 목록 탭 상태 ("active": 진행 중 프로젝트, "completed": 끝난 보관함)
  const [projectListTab, setProjectListTab] = useState<"active" | "completed">("active");

  const { theme } = useTheme();
  const isDark = useMemo(() => {
    const current = THEME_LIST.find((t) => t.id === theme);
    return current ? current.type === "dark" : false;
  }, [theme]);

  // 🌟 프로젝트 진입 시 세로 목록을 보여주고, 카드 클릭 시 로드맵 마일스톤 화면을 엽니다 (사용자 요구사항)
  const [isMilestonesViewOpen, setIsMilestonesViewOpen] = useState<boolean>(() => {
    return !!queryId;
  });

  useEffect(() => {
    if (queryId) {
      const timer = setTimeout(() => {
        setIsMilestonesViewOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [queryId]);

  // 현재 선택된 프로젝트 ID 상태
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryId) {
        setSelectedProjectId(queryId);
      } else if (typeof window !== "undefined") {
        const savedId = localStorage.getItem("onequiz_selected_project_id");
        if (savedId) setSelectedProjectId(savedId);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [queryId]);

  // 현재 활성 프로젝트 (선택된 백로그 항목 - 진행 중 및 보관함 전체 대상)
  const activeProject = useMemo(() => {
    if (backlogList.length === 0) return null;
    if (selectedProjectId) {
      const found = backlogList.find((p) => p.id === selectedProjectId);
      if (found) return found;
    }
    return confirmedProjects[0] || completedProjects[0] || null;
  }, [backlogList, confirmedProjects, completedProjects, selectedProjectId]);

  // 백로그 리스트 영구 저장 헬퍼 (DB + localStorage 동시 보존)
  const persistBacklogList = useCallback(
    async (items: BacklogItem[]) => {
      setBacklogList(items);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("onequiz_backlog_items", JSON.stringify(items));
        } catch {}
      }

      if (session?.user?.email) {
        try {
          await fetch("/api/ideas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(items),
          });
        } catch {}
      }
    },
    [session]
  );

  // 프로젝트 완료 처리 (끝난 보관함으로 이동 -> 프로젝트 활성 목록 및 백로그 칸반에서 즉시 제외)
  const handleCompleteProject = useCallback(
    (proj: BacklogItem) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const updated = backlogList.map((b) =>
        b.id === proj.id ? { ...b, status: "completed" as const, completedAt: todayStr } : b
      );
      persistBacklogList(updated);
      toast.success(`🎉 '${proj.title}' 프로젝트가 완료 처리되어 '끝난 보관함'으로 이동되었습니다.`);
    },
    [backlogList, persistBacklogList]
  );

  // 프로젝트 복원 처리 (끝난 보관함에서 다시 진행 중으로 복구)
  const handleRestoreProject = useCallback(
    (proj: BacklogItem) => {
      const updated = backlogList.map((b) =>
        b.id === proj.id ? { ...b, status: "promoted" as const, completedAt: undefined } : b
      );
      persistBacklogList(updated);
      toast.success(`'${proj.title}' 프로젝트가 다시 진행 중으로 복원되었습니다.`);
    },
    [backlogList, persistBacklogList]
  );

  // 선택된 백로그의 제목과 정보로 로드맵 헤더/이름 자동 동기화 (제목이 1이 아니라 해당 백로그 제목이 됨)
  useEffect(() => {
    if (activeProject) {
      const timer = setTimeout(() => {
        setRoadmap((prev) => {
          if (prev.id === activeProject.id && prev.name === activeProject.title) return prev;
          return {
            ...prev,
            id: activeProject.id,
            name: activeProject.title,
            description: activeProject.description || prev.description,
            startDate: activeProject.startDate || prev.startDate,
            endDate: activeProject.endDate || prev.endDate,
          };
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeProject]);

  // 5. 타임라인 컨테이너 참조 및 줌 레벨 (사진1 기준 쾌적한 58px 컬럼)
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [dayWidth, setDayWidth] = useState(58);

  // 6. 마우스 리사이즈(간트 바 시작일/종료일 늘리기 및 줄이기 양방향 지원)
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [, setResizingEdge] = useState<"start" | "end" | null>(null);
  const [resizePreviewStartDate, setResizePreviewStartDate] = useState<string | null>(null);
  const [resizePreviewEndDate, setResizePreviewEndDate] = useState<string | null>(null);

  const isResizingRef = useRef(false);
  const resizingItemRef = useRef<RoadmapItem | null>(null);
  const resizingEdgeRef = useRef<"start" | "end" | null>(null);

  // 영구 저장 헬퍼 (DB + localStorage 동시 보존)
  const persistRoadmap = useCallback(
    async (updated: ProjectRoadmap) => {
      setSaveStatus("saving");
      setRoadmap(updated);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("onequiz_roadmap_data", JSON.stringify(updated));
        } catch {}
      }

      if (session?.user?.email) {
        try {
          const res = await fetch("/api/roadmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
          if (!res.ok) throw new Error("DB 저장 실패");
          markSaved();
        } catch {
          setSaveStatus("error");
        }
      } else {
        markSaved();
      }
    },
    [session, markSaved]
  );

  // DB 로드
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (session?.user?.email) {
        try {
          const res = await fetch("/api/roadmap");
          if (res.ok) {
            const data = await res.json();
            if (data && isMounted) {
              setRoadmap({
                id: data._id || data.id || "proj-1",
                name: data.name,
                description: data.description || "",
                startDate: data.startDate,
                endDate: data.endDate,
                createdAt: data.createdAt ? String(data.createdAt).slice(0, 10) : "2026-11-04",
                isPublic: data.isPublic !== undefined ? data.isPublic : true,
                members: data.members || [],
                items: data.items || [],
              });
              setEditStartDate(data.startDate);
              setEditEndDate(data.endDate);
              markSaved();
              return;
            }
          }
        } catch (e) {
          console.warn("Roadmap DB fetch failed", e);
        }
      }
      if (isMounted) markSaved();
      await refreshBacklogs();
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session, markSaved, refreshBacklogs]);

  // 타임라인 일자 목록 생성 (2026-10-15 ~ 2026-11-04 등)
  const timelineDays = useMemo(() => {
    const start = new Date(roadmap.startDate);
    const end = new Date(roadmap.endDate);

    // 약간의 전후 여유를 두어 시작일 이전 일요일 ~ 종료일 이후 일요일까지 표시
    const firstDay = new Date(start);
    firstDay.setDate(firstDay.getDate() - 4); // 시작 전 4일
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() + 3); // 종료 후 3일

    const days: { dateStr: string; dayNum: number; dayOfWeek: string; isToday: boolean }[] = [];
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    const cur = new Date(firstDay);
    while (cur <= lastDay) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      // 오늘 날짜 (2026-11-04)
      const isToday = cur.getMonth() === 10 && cur.getDate() === 4;

      days.push({
        dateStr,
        dayNum: cur.getDate(),
        dayOfWeek: dayNames[cur.getDay()],
        isToday,
      });

      cur.setDate(cur.getDate() + 1);
    }

    return days;
  }, [roadmap.startDate, roadmap.endDate]);

  // 리사이즈 전역 마우스 이벤트 (시작일/종료일 늘리기 및 줄이기 완벽 지원)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !resizingItemRef.current) return;

      const dayElem = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement)?.closest(
        "[data-roadmap-date]"
      );
      let targetDateStr: string | null = null;

      if (dayElem) {
        targetDateStr = dayElem.getAttribute("data-roadmap-date");
      } else if (timelineScrollRef.current) {
        // 수학적 fallback 계산 (마우스가 바 위에 있어도 정확히 감지)
        const rect = timelineScrollRef.current.getBoundingClientRect();
        const scrollLeft = timelineScrollRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft - 224; // 좌측 항목 컬럼(224px) 보정
        const dayIdx = Math.floor(x / dayWidth);
        const dayCell = timelineDays[dayIdx];
        if (dayCell) {
          targetDateStr = dayCell.dateStr;
        }
      }

      if (!targetDateStr) return;

      if (resizingEdgeRef.current === "end") {
        // 종료일 리사이즈: 시작일 이상이면 늘리기/줄이기 모두 반영
        if (targetDateStr >= resizingItemRef.current.startDate) {
          setResizePreviewEndDate(targetDateStr);
        }
      } else if (resizingEdgeRef.current === "start") {
        // 시작일 리사이즈: 종료일 이하이면 늘리기/줄이기 모두 반영
        if (targetDateStr <= resizingItemRef.current.endDate) {
          setResizePreviewStartDate(targetDateStr);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isResizingRef.current && resizingItemRef.current) {
        const targetId = resizingItemRef.current.id;
        const newStart = resizePreviewStartDate || resizingItemRef.current.startDate;
        const newEnd = resizePreviewEndDate || resizingItemRef.current.endDate;

        if (
          newStart !== resizingItemRef.current.startDate ||
          newEnd !== resizingItemRef.current.endDate
        ) {
          const updatedItems = roadmap.items.map((it) =>
            it.id === targetId ? { ...it, startDate: newStart, endDate: newEnd } : it
          );
          persistRoadmap({ ...roadmap, items: updatedItems });
        }
      }
      isResizingRef.current = false;
      resizingItemRef.current = null;
      resizingEdgeRef.current = null;
      setResizingItemId(null);
      setResizingEdge(null);
      setResizePreviewStartDate(null);
      setResizePreviewEndDate(null);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [roadmap, resizePreviewStartDate, resizePreviewEndDate, persistRoadmap, dayWidth, timelineDays]);

  const handleResizeStart = (
    e: React.MouseEvent,
    item: RoadmapItem,
    edge: "start" | "end"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    resizingItemRef.current = item;
    resizingEdgeRef.current = edge;
    setResizingItemId(item.id);
    setResizingEdge(edge);
    setResizePreviewStartDate(item.startDate);
    setResizePreviewEndDate(item.endDate);
  };

  // 전체 공개 토글 핸들러
  const handleTogglePublic = () => {
    const updated = { ...roadmap, isPublic: !roadmap.isPublic };
    persistRoadmap(updated);
    if (!roadmap.isPublic) {
      // 공개로 전환 시 링크 복사
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // 프로젝트 기간 수정 저장
  const handleSaveProjectPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...roadmap,
      startDate: editStartDate,
      endDate: editEndDate,
    };
    persistRoadmap(updated);
    setIsDateModalOpen(false);
  };

  // 팀원 초대
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newMember = {
      email: inviteEmail.trim(),
      name: inviteEmail.split("@")[0],
      role: inviteRole,
    };
    const updated = {
      ...roadmap,
      members: [...roadmap.members, newMember],
    };
    persistRoadmap(updated);
    setInviteEmail("");
    toast.success(`${inviteEmail} 님에게 초대장이 발송되었습니다.`);
  };

  // 항목 생성 / 수정
  const handleOpenCreateItem = () => {
    refreshBacklogs();
    setEditingItemId(null);
    setItemTitle("");
    setItemStartDate("2026-10-19");
    setItemEndDate("2026-10-23");
    setItemColor("#0284c7");
    setItemInputTab("direct");
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: RoadmapItem) => {
    setEditingItemId(item.id);
    setItemTitle(item.title);
    setItemStartDate(item.startDate);
    setItemEndDate(item.endDate);
    setItemColor(item.color || "#0284c7");
    setIsItemModalOpen(true);
  };

  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;

    if (editingItemId) {
      const updatedItems = roadmap.items.map((it) =>
        it.id === editingItemId
          ? {
              ...it,
              title: itemTitle.trim(),
              startDate: itemStartDate,
              endDate: itemEndDate,
              color: itemColor,
            }
          : it,
      );
      persistRoadmap({ ...roadmap, items: updatedItems });
    } else {
      const newItem: RoadmapItem = {
        id: generateId("item"),
        title: itemTitle.trim(),
        startDate: itemStartDate,
        endDate: itemEndDate,
        color: itemColor,
        comments: [],
      };
      persistRoadmap({ ...roadmap, items: [...roadmap.items, newItem] });
    }
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("해당 로드맵 항목을 삭제하시겠습니까?")) {
      const updatedItems = roadmap.items.filter((it) => it.id !== itemId);
      persistRoadmap({ ...roadmap, items: updatedItems });
    }
  };

  // 댓글 추가
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeCommentItemId) return;

    const newComment: RoadmapComment = {
      id: generateId("c"),
      authorName: session?.user?.name || "익명 참여자",
      authorEmail: session?.user?.email || "guest@onequiz.com",
      content: newCommentText.trim(),
      createdAt: new Date().toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedItems = roadmap.items.map((it) => {
      if (it.id === activeCommentItemId) {
        return {
          ...it,
          comments: [...it.comments, newComment],
        };
      }
      return it;
    });

    persistRoadmap({ ...roadmap, items: updatedItems });
    setNewCommentText("");
  };

  // 주차별 그룹핑 계산
  const weeksGroup = useMemo(() => {
    if (timelineDays.length === 0) return [];
    const groups: { label: string; count: number }[] = [];
    let currentWeekNum = 42;
    let currentCount = 0;

    timelineDays.forEach((day, idx) => {
      currentCount++;
      // 일요일이거나 마지막 날이면 한 주 마감
      if (day.dayOfWeek === "토" || idx === timelineDays.length - 1) {
        groups.push({
          label: `${currentWeekNum}주차`,
          count: currentCount,
        });
        currentWeekNum++;
        currentCount = 0;
      }
    });

    return groups;
  }, [timelineDays]);

  // 간트 바 위치 및 너비 계산 함수 (1일 당일짜리도 여백 최적화)
  const getBarPosition = (startDate: string, endDate: string) => {
    const startIndex = timelineDays.findIndex((d) => d.dateStr === startDate);
    const endIndex = timelineDays.findIndex((d) => d.dateStr === endDate);

    if (startIndex === -1 && endIndex === -1) return null;

    const actualStart = Math.max(0, startIndex === -1 ? 0 : startIndex);
    const actualEnd = Math.min(
      timelineDays.length - 1,
      endIndex === -1 ? timelineDays.length - 1 : endIndex,
    );

    const left = actualStart * dayWidth + 2;
    const spanDays = Math.max(1, actualEnd - actualStart + 1);
    const width = Math.max(dayWidth - 4, spanDays * dayWidth - 4);

    return { left, width, spanDays };
  };

  // 현재 활성화된 댓글 아이템
  const activeCommentItem = roadmap.items.find((it) => it.id === activeCommentItemId);

  // 🌟 1. 프로젝트 첫 진입 시 세로 목록 화면 (사용자 요구사항: 세로로 프로젝트 제목이 나와있고 카드 클릭 시 로드맵 마일스톤 노출)
  if (!isMilestonesViewOpen) {
    return (
      <div className="w-full space-y-6 text-on-surface">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                프로젝트
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold font-mono">
                {projectListTab === "active" ? confirmedProjects.length : completedProjects.length}개
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-light mt-0.5">
              백로그(아이디어)에서 진행 확정된 프로젝트 목록입니다. 카드를 클릭하면 상세 로드맵 마일스톤과 간트 타임라인을 확인할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/ideas"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant text-xs font-medium transition-colors"
            >
              <span>+ 아이디어에서 추가 확정</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* 🌟 진행 중인 프로젝트 vs 끝난 보관함 탭 스위처 */}
        <div className="flex items-center gap-2 border-b border-outline-variant pb-1">
          <button
            type="button"
            onClick={() => setProjectListTab("active")}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              projectListTab === "active"
                ? "border-primary text-primary bg-primary/[0.04]"
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
            }`}
          >
            <FolderGit2 size={14} />
            <span>진행 중인 프로젝트</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant font-mono text-[10px]">
              {confirmedProjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProjectListTab("completed")}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              projectListTab === "completed"
                ? "border-primary text-primary bg-primary/[0.04]"
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
            }`}
          >
            <Archive size={14} />
            <span>끝난 보관함</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant font-mono text-[10px]">
              {completedProjects.length}
            </span>
          </button>
        </div>

        {/* [진행 중인 프로젝트] 탭 내용 */}
        {projectListTab === "active" && (
          confirmedProjects.length === 0 ? (
            <div className="py-20 px-6 rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant text-center space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FolderGit2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">진행 중인 프로젝트가 없습니다</h3>
                <p className="text-xs text-on-surface-variant font-light mt-1 leading-relaxed">
                  아이디어(백로그) 페이지에서 아이디어를 검토하고 &apos;프로젝트로 전환&apos;을 완료하면 이곳에 프로젝트 카드가 생성됩니다.
                </p>
              </div>
              <Link
                href="/ideas"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 transition-opacity"
              >
                <span>아이디어(백로그) 페이지로 이동</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {confirmedProjects.map((proj) => {
                const isSelected = activeProject?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      setIsMilestonesViewOpen(true);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("onequiz_selected_project_id", proj.id);
                      }
                    }}
                    className={`bg-surface-container-lowest hover:bg-surface-container-low border rounded-xl p-4 sm:p-5 cursor-pointer transition-all shadow-xs group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected ? "border-primary ring-1 ring-primary/20" : "border-outline-variant hover:border-primary/50"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-on-surface group-hover:text-primary transition-colors">
                          {proj.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {proj.status === "promoted" ? "프로젝트 전환 완료" : "진행 확정"}
                        </span>
                      </div>

                      {proj.description && (
                        <p className="text-xs text-on-surface-variant font-light line-clamp-2 leading-relaxed">
                          {proj.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-mono pt-1">
                        <span className="flex items-center gap-1">
                          <CalendarIcon size={12} className="text-primary" />
                          <span>{proj.startDate || "2026-10-15"} ~ {proj.endDate || "2026-11-04"}</span>
                        </span>
                        <span>생성: {proj.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteProject(proj);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs transition-colors cursor-pointer border border-outline-variant"
                        title="이 프로젝트를 완료 처리하고 끝난 보관함으로 보냅니다"
                      >
                        <CheckCheck size={12} className="text-primary" />
                        <span>완료 처리</span>
                      </button>
                      <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
                        <span>마일스톤 열기</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 🌟 [끝난 보관함] 탭 내용 */}
        {projectListTab === "completed" && (
          completedProjects.length === 0 ? (
            <div className="py-20 px-6 rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant text-center space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto">
                <Archive size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">보관된 완료 프로젝트가 없습니다</h3>
                <p className="text-xs text-on-surface-variant font-light mt-1 leading-relaxed">
                  진행이 끝난 프로젝트를 &apos;완료 처리&apos;하면 이곳에 안전하게 보관되며 언제든지 다시 진행 중으로 복구할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {completedProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setIsMilestonesViewOpen(true);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("onequiz_selected_project_id", proj.id);
                    }
                  }}
                  className="bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant hover:border-primary/40 rounded-xl p-4 sm:p-5 cursor-pointer transition-all shadow-xs group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-on-surface group-hover:text-primary transition-colors">
                        {proj.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/15 text-secondary border border-secondary/30 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        <span>완료됨</span>
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-on-surface-variant font-light line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={12} className="text-primary" />
                        <span>기간: {proj.startDate || "2026-10-15"} ~ {proj.endDate || "2026-11-04"}</span>
                      </span>
                      {proj.completedAt && (
                        <span className="text-primary font-medium">완료일: {proj.completedAt}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreProject(proj);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs transition-colors cursor-pointer border border-outline-variant"
                      title="다시 진행 중인 프로젝트로 복구합니다"
                    >
                      <RotateCcw size={12} className="text-primary" />
                      <span>다시 진행하기</span>
                    </button>
                    <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
                      <span>기록 보기</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 text-on-surface">
      {/* 1. 최상단 네비게이션 헤더 (라운딩 박스 없이 플랫 헤더) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        {/* 좌측: 세로 목록으로 뒤로가기 & 프로젝트 제목 & 기간 */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsMilestonesViewOpen(false)}
            className="p-1.5 hover:bg-surface-container rounded-md text-on-surface-variant hover:text-on-surface transition-colors shrink-0 cursor-pointer"
            title="프로젝트 목록으로 돌아가기"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMilestonesViewOpen(false)}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer mr-1"
              >
                <span>프로젝트 목록</span>
                <ChevronRight size={12} />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight truncate max-w-xl">
                {activeProject ? activeProject.title : (roadmap.name === "1" ? "프로젝트 로드맵" : roadmap.name)}
              </h1>
              {activeProject ? (
                activeProject.status === "completed" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>완료 보관됨</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                    {activeProject.status === "promoted" ? "프로젝트 전환 완료" : "진행 확정"}
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold font-mono">
                  프로젝트
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant font-light mt-0.5 truncate">
              {activeProject?.description
                ? `${activeProject.description} · `
                : ""}
              기간: {roadmap.startDate} ~ {roadmap.endDate}
            </p>
          </div>
        </div>

        {/* 우측 도구 버튼들 (기간 수정, 초대, 전체공개, 완료처리, 항목 추가) */}
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          {/* 저장 상태 인디케이터 */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          {/* 🌟 프로젝트 완료 또는 복원 버튼 */}
          {activeProject && (
            activeProject.status === "completed" ? (
              <button
                type="button"
                onClick={() => handleRestoreProject(activeProject)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-md font-medium transition-colors cursor-pointer"
                title="다시 진행 중인 프로젝트로 복원합니다"
              >
                <RotateCcw size={12} className="text-primary" />
                <span>다시 진행하기</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleCompleteProject(activeProject)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md font-semibold transition-colors cursor-pointer"
                title="이 프로젝트를 완료 처리하고 끝난 보관함으로 이동합니다"
              >
                <CheckCheck size={13} />
                <span>프로젝트 완료</span>
              </button>
            )
          )}

          {/* 기간 수정 버튼 */}
          <button
            onClick={() => setIsDateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md font-medium transition-colors cursor-pointer"
          >
            <CalendarIcon size={13} className="text-primary" />
            <span>기간 수정</span>
          </button>

          {/* 초대 버튼 */}
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md font-medium transition-colors cursor-pointer"
          >
            <UserPlus size={13} className="text-primary" />
            <span>초대 ({roadmap.members.length})</span>
          </button>

          {/* 전체 공개 토글 버튼 */}
          <button
            onClick={handleTogglePublic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer border ${
              roadmap.isPublic
                ? "bg-surface-container text-primary border-primary/30"
                : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:text-on-surface"
            }`}
            title={
              roadmap.isPublic
                ? "누구나 열람 가능한 공개 상태입니다 (클릭 시 링크 복사)"
                : "비공개 상태 (팀원만 열람 가능)"
            }
          >
            {roadmap.isPublic ? <Globe size={13} /> : <Lock size={13} />}
            <span>{roadmap.isPublic ? "전체 공개 중" : "비공개"}</span>
            {isCopied && <Check size={12} className="text-primary ml-1" />}
          </button>

          {/* + 항목 추가 버튼 */}
          <button
            onClick={handleOpenCreateItem}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:opacity-90 text-on-primary font-semibold rounded-md transition-all cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>항목 추가</span>
          </button>
        </div>
      </div>

      {/* 🌟 2. 백로그에서 확정된 프로젝트 탭 바 (사용자 요구사항: 여기서 선택해서 그 백로그의 프로젝트를 나타나게 함) */}
      {(confirmedProjects.length > 0 || (activeProject && activeProject.status === "completed")) ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-xs font-semibold text-on-surface-variant shrink-0 mr-1 flex items-center gap-1.5">
            <FolderGit2 size={14} className="text-primary" />
            <span>확정된 프로젝트 ({confirmedProjects.length}):</span>
          </span>
          {activeProject && activeProject.status === "completed" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 border bg-secondary/15 text-secondary border-secondary/30">
              <Archive size={12} />
              <span className="truncate max-w-[180px]">{activeProject.title} (완료됨)</span>
            </div>
          )}
          {confirmedProjects.map((proj) => {
            const isSelected = activeProject?.id === proj.id;
            return (
              <button
                key={proj.id}
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("onequiz_selected_project_id", proj.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? "bg-primary text-on-primary border-primary shadow-xs font-semibold"
                    : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border-outline-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                <span className="truncate max-w-[180px]">{proj.title}</span>
              </button>
            );
          })}
          <Link
            href="/ideas"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0 ml-auto font-medium"
          >
            <span>+ 아이디어에서 추가 확정</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      ) : (
        /* 확정된 프로젝트가 없을 때의 Empty State */
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3 rounded-lg bg-surface-container-lowest border border-dashed border-outline-variant">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FolderGit2 size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface">프로젝트로 확정된 아이디어가 없습니다</h3>
            <p className="text-xs text-on-surface-variant font-light max-w-md">
              아이디어(백로그) 페이지에서 아이디어를 검토하고 &apos;진행 확정&apos; 또는 &apos;프로젝트로 전환&apos;하면 이곳에 프로젝트로 나타나 기간과 로드맵을 관리할 수 있습니다.
            </p>
          </div>
          <Link
            href="/ideas"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs mt-1"
          >
            <span>아이디어 (백로그) 페이지로 이동</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* 3. 메인 타임라인 간트 차트 (확정된 프로젝트가 있을 때만 렌더링) */}
      {confirmedProjects.length > 0 && (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* 상단 월 표시 및 퀵 액션 */}
        <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-on-surface font-mono">
              2026년 10월
            </h2>
            <span className="text-xs text-on-surface-variant font-mono">
              ({roadmap.items.length}개 로드맵 마일스톤)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 줌 컨트롤 (+ / -) */}
            <div className="flex items-center bg-surface-container-lowest p-1 rounded-xl border border-outline-variant">
              <button
                onClick={() => setDayWidth((w) => Math.max(32, w - 6))}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                title="축소"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-mono font-bold px-1.5 text-on-surface-variant">
                {dayWidth}px
              </span>
              <button
                onClick={() => setDayWidth((w) => Math.min(72, w + 6))}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                title="확대"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 간트 차트 스크롤 컨테이너 (스크롤 모듈 적용) */}
        <ScrollArea
          ref={timelineScrollRef}
          orientation="both"
          maxHeight="620px"
        >
          <div className="min-w-max flex flex-col">
            {/* 2-1. 헤더: 좌측 '항목' + 우측 주차/날짜 타임라인 헤더 */}
            <div className="flex border-b border-outline-variant bg-surface-container-low text-xs sticky top-0 z-20">
              {/* 좌측 고정 항목 열 헤더 */}
              <div className="w-56 sm:w-64 px-4 py-3 font-bold text-on-surface border-r border-outline-variant bg-surface-container-low shrink-0 flex items-center justify-between">
                <span>항목</span>
                <span className="text-[10px] text-on-surface-variant font-mono">댓글 수</span>
              </div>

              {/* 우측 날짜 타임라인 헤더 (상단: 주차 / 하단: 일자) */}
              <div className="flex flex-col flex-1">
                {/* 상단 행: 주차별 구간 헤더 */}
                <div className="flex border-b border-outline-variant/60 font-mono text-[11px] font-bold text-on-surface-variant">
                  {weeksGroup.map((w, wIdx) => (
                    <div
                      key={wIdx}
                      style={{ width: w.count * dayWidth }}
                      className="px-2 py-1.5 border-r border-outline-variant/40 truncate text-center"
                    >
                      {w.label}
                    </div>
                  ))}
                </div>

                {/* 하단 행: 일자별 날짜 (목 15, 금 16 ...) */}
                <div className="flex font-mono text-[11px]">
                  {timelineDays.map((day) => (
                    <div
                      key={day.dateStr}
                      style={{ width: dayWidth }}
                      className={`py-2 text-center border-r border-outline-variant/30 flex flex-col items-center justify-center shrink-0 ${
                        day.isToday
                          ? "bg-primary/15 text-primary font-black"
                          : day.dayOfWeek === "일"
                            ? "text-destructive/80 font-semibold"
                            : "text-on-surface-variant font-medium"
                      }`}
                    >
                      <span className="text-[10px] opacity-75">{day.dayOfWeek}</span>
                      <span className="text-xs">{day.dayNum}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2-2. 바디: 항목 목록 및 타임라인 간트 바들 */}
            <div className="divide-y divide-outline-variant/50 relative">
              {/* 오늘 날짜 세로 레드 라인 인디케이터 (현재 시점 표시) */}
              {timelineDays.some((d) => d.isToday) && (
                <div
                  style={{
                    left: `calc(${
                      timelineDays.findIndex((d) => d.isToday) * dayWidth +
                      dayWidth / 2 +
                      224 // 좌측 고정 항목 열 너비(224px) 더함
                    }px)`,
                  }}
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 -top-1 absolute" />
                </div>
              )}

              {/* 항목이 없을 때의 빈 상태 안내 */}
              {roadmap.items.length === 0 && (
                <div className="py-14 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant bg-surface-container-lowest/50">
                  <CalendarIcon className="w-8 h-8 text-on-surface-variant/40" />
                  <p className="text-sm font-semibold text-on-surface">등록된 프로젝트 일정이 없습니다</p>
                  <p className="text-xs font-light">
                    좌측 하단이나 우측 상단의 &apos;+ 항목 추가&apos; 버튼을 눌러 일정을 등록해보세요.
                  </p>
                </div>
              )}

              {roadmap.items.map((item) => {
                const effectiveStartDate =
                  resizingItemId === item.id && resizePreviewStartDate
                    ? resizePreviewStartDate
                    : item.startDate;
                const effectiveEndDate =
                  resizingItemId === item.id && resizePreviewEndDate
                    ? resizePreviewEndDate
                    : item.endDate;
                const barPos = getBarPosition(effectiveStartDate, effectiveEndDate);
                const baseColor = item.color || "#0ea5e9";
                const isSingleDay = effectiveStartDate === effectiveEndDate;

                return (
                  <div
                    key={item.id}
                    className="flex items-center hover:bg-surface-container-low/50 transition-colors group relative h-11"
                  >
                    {/* 좌측 항목명 및 댓글 개수 뱃지 */}
                    <div className="w-56 sm:w-64 px-4 h-full flex items-center justify-between border-r border-outline-variant bg-surface-container-lowest shrink-0 z-10">
                      <button
                        onClick={() => setActiveCommentItemId(item.id)}
                        className="font-bold text-xs sm:text-sm text-on-surface hover:text-primary transition-colors truncate text-left cursor-pointer flex-1"
                        title="클릭 시 댓글 및 상세 확인"
                      >
                        {item.title}
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 댓글 뱃지 (아이콘 + 숫자) */}
                        <button
                          onClick={() => setActiveCommentItemId(item.id)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors text-[11px] font-bold cursor-pointer"
                          title="댓글 확인"
                        >
                          <MessageSquare size={12} />
                          <span>{item.comments.length}</span>
                        </button>

                        {/* 메뉴 (수정 / 삭제) */}
                        <div className="relative">
                          <button
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1 text-on-surface-variant hover:text-on-surface rounded cursor-pointer"
                            title="항목 편집"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 우측 타임라인 바 영역 */}
                    <div className="flex-1 relative h-full flex items-center">
                      {/* 배경 일자 격자선 */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {timelineDays.map((day) => (
                          <div
                            key={day.dateStr}
                            data-roadmap-date={day.dateStr}
                            style={{ width: dayWidth }}
                            className={`h-full border-r border-outline-variant/20 shrink-0 pointer-events-auto ${
                              day.dayOfWeek === "일" || day.dayOfWeek === "토"
                                ? "bg-black/[0.02] dark:bg-white/[0.01]"
                                : ""
                            }`}
                          />
                        ))}
                      </div>

                      {/* 사진1 스타일의 얇고 세련된 반투명 간트 바 (라이트/다크 테마 텍스트 대비 최적화) */}
                      {barPos && (
                        <div
                          style={{
                            left: `${barPos.left}px`,
                            width: `${barPos.width}px`,
                            backgroundColor: isDark ? `${baseColor}44` : `${baseColor}25`,
                            borderColor: isDark ? `${baseColor}99` : `${baseColor}cc`,
                            borderWidth: "1.5px",
                            borderStyle: "solid",
                            backdropFilter: "blur(2px)",
                          }}
                          onClick={() => setActiveCommentItemId(item.id)}
                          className={`group/bar absolute h-[23px] rounded-xs shadow-xs px-1.5 flex items-center justify-between text-xs truncate cursor-pointer hover:brightness-110 transition-all z-0 select-none ${
                            isDark ? "text-white font-medium" : "text-slate-900 font-bold"
                          }`}
                          title={`${item.title} (${effectiveStartDate} ~ ${effectiveEndDate}) - 양쪽 핸들을 드래그하여 기간을 늘리거나 줄일 수 있습니다`}
                        >
                          {/* 좌측 마우스 리사이즈 핸들 (시작일 늘리기/줄이기) */}
                          <div
                            onMouseDown={(e) => handleResizeStart(e, item, "start")}
                            className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-xs opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 ${
                              isDark ? "hover:bg-white/40" : "hover:bg-black/20"
                            }`}
                            title="드래그하여 시작일 조절 (늘리기/줄이기)"
                          />

                          {/* 바 타이틀 텍스트 (라이트 모드에서 검정 슬레이트 글씨, 다크 모드에서 흰색 글씨로 시인성 100% 보장) */}
                          <span
                            className={`truncate text-[11px] leading-none drop-shadow-xs ${
                              isDark ? "text-white font-medium" : "text-slate-900 font-bold"
                            } ${isSingleDay ? "w-full text-center" : ""}`}
                          >
                            {item.title}
                          </span>

                          {/* 2일 이상 넓은 바에서만 내부 댓글 말풍선 표시 */}
                          {!isSingleDay && barPos.width > 90 && item.comments.length > 0 && (
                            <span
                              className={`text-[10px] shrink-0 ml-1 font-mono ${
                                isDark ? "text-white/80" : "text-slate-800 font-bold"
                              }`}
                            >
                              💬 {item.comments.length}
                            </span>
                          )}

                          {/* 우측 마우스 리사이즈 핸들 (종료일 늘리기/줄이기) */}
                          <div
                            onMouseDown={(e) => handleResizeStart(e, item, "end")}
                            className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-xs opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 ${
                              isDark ? "hover:bg-white/40" : "hover:bg-black/20"
                            }`}
                            title="드래그하여 종료일 조절 (늘리기/줄이기)"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 하단 '+ 항목 추가' 행 */}
              <div className="flex items-center h-11 bg-surface-container-low/20">
                <div className="w-56 sm:w-64 px-4 h-full flex items-center border-r border-outline-variant bg-surface-container-lowest shrink-0">
                  <button
                    onClick={handleOpenCreateItem}
                    className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>항목 추가</span>
                  </button>
                </div>
                <div className="flex-1" />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
      )}

      {/* 4. 댓글(Comments) 드로어 / 모달 ("각각의 항목에는 초대된 사람들이 댓글을 달수있게") */}
      {activeCommentItemId && activeCommentItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest border-l border-outline-variant h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 text-on-surface animate-slide-left">
            {/* 드로어 상단 헤더 */}
            <div>
              <div className="flex justify-between items-start border-b border-outline-variant pb-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: activeCommentItem.color || "#0284c7" }}
                    />
                    <h3 className="text-base font-bold text-on-surface">
                      {activeCommentItem.title}
                    </h3>
                  </div>
                  <p className="text-xs text-on-surface-variant font-mono">
                    기간: {activeCommentItem.startDate} ~ {activeCommentItem.endDate}
                  </p>
                </div>

                <button
                  onClick={() => setActiveCommentItemId(null)}
                  className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 댓글 목록 */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant mb-2">
                  <span>참여자 댓글 및 피드백</span>
                  <span className="font-mono">총 {activeCommentItem.comments.length}개</span>
                </div>

                {activeCommentItem.comments.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant text-xs">
                    아직 등록된 댓글이 없습니다.
                    <br />
                    첫 번째 의견을 남겨보세요!
                  </div>
                ) : (
                  activeCommentItem.comments.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-3 bg-surface-container-low border border-outline-variant rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface">{comm.authorName}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {comm.createdAt}
                        </span>
                      </div>
                      <p className="text-on-surface leading-relaxed">{comm.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 댓글 작성 폼 */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-outline-variant flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="댓글과 피드백을 입력하세요..."
                className="flex-1 px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
                required
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-primary hover:opacity-90 text-on-primary font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1"
              >
                <Send size={13} />
                <span>등록</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. 프로젝트 기간 수정 모달 */}
      {isDateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-on-surface">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface">프로젝트 전체 기간 수정</h3>
              <button
                onClick={() => setIsDateModalOpen(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProjectPeriod} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">시작일</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">종료일</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDateModalOpen(false)}
                  className="flex-1 py-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl shadow-xs"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. 팀원 초대 모달 */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-on-surface">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-secondary" />
                <h3 className="font-bold text-base text-on-surface">프로젝트 팀원 초대</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="초대할 팀원 이메일"
                  className="flex-1 p-2.5 bg-surface-container-low border border-outline-variant rounded-xl"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "editor" | "viewer")}
                  className="p-2.5 bg-surface-container-low border border-outline-variant rounded-xl font-medium"
                >
                  <option value="editor">편집자</option>
                  <option value="viewer">뷰어 (댓글)</option>
                  <option value="admin">관리자</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-xl shadow-xs"
              >
                초대장 발송
              </button>
            </form>

            <div className="pt-2 border-t border-outline-variant space-y-2">
              <span className="text-xs font-bold text-on-surface-variant">초대된 팀원 목록</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {roadmap.members.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs"
                  >
                    <div>
                      <p className="font-bold text-on-surface">{m.name}</p>
                      <p className="text-[10px] text-on-surface-variant">{m.email}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-high font-mono font-bold text-on-surface-variant">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. 항목 생성/수정 모달 */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-on-surface">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface">
                {editingItemId ? "로드맵 항목 수정" : "새 로드맵 항목 추가"}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            {/* 신규 등록일 때 탭 전환: 직접 입력 vs 백로그에서 불러오기 */}
            {!editingItemId && (
              <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant text-xs">
                <button
                  type="button"
                  onClick={() => setItemInputTab("direct")}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    itemInputTab === "direct"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  직접 입력
                </button>
                <button
                  type="button"
                  onClick={() => setItemInputTab("backlog")}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    itemInputTab === "backlog"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <ListTodo size={13} />
                  <span>백로그에서 불러오기</span>
                </button>
              </div>
            )}

            {/* 백로그에서 불러오기 리스트 */}
            {!editingItemId && itemInputTab === "backlog" && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <p className="text-[11px] text-on-surface-variant">
                  로드맵으로 전환할 백로그를 선택하세요:
                </p>
                {backlogList.length === 0 ? (
                  <p className="text-xs text-center py-4 text-on-surface-variant">
                    등록된 백로그 항목이 없습니다.
                  </p>
                ) : (
                  backlogList.map((bg) => (
                    <div
                      key={bg.id}
                      onClick={() => {
                        setItemTitle(bg.title);
                        setItemInputTab("direct");
                      }}
                      className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant cursor-pointer text-xs space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface">{bg.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-mono">
                          {bg.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1">
                        {bg.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            <form onSubmit={handleSaveItemSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">항목명</label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="예: 제품 회의, 기능 테스트"
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-on-surface mb-1">시작일</label>
                  <input
                    type="date"
                    value={itemStartDate}
                    onChange={(e) => setItemStartDate(e.target.value)}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">종료일</label>
                  <input
                    type="date"
                    value={itemEndDate}
                    onChange={(e) => setItemEndDate(e.target.value)}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">간트 바 색상</label>
                <div className="flex gap-2">
                  {["#0284c7", "#0369a1", "#075985", "#059669", "#7c3aed", "#e11d48"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setItemColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg cursor-pointer transition-transform ${
                        itemColor === c ? "scale-110 ring-2 ring-white shadow-md" : "opacity-80"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-outline-variant">
                {editingItemId && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteItem(editingItemId);
                      setIsItemModalOpen(false);
                    }}
                    className="py-2.5 px-3 bg-destructive/10 text-destructive rounded-xl font-bold flex items-center gap-1"
                  >
                    <Trash2 size={13} /> 삭제
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl shadow-xs"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
