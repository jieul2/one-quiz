"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus,
  Search,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  FolderGit2,
  Archive,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  RotateCcw,
  Share2,
  Users,
  Mail,
} from "lucide-react";
import { BacklogItem, ProjectRoadmap, RoadmapItem } from "@/lib/roadmapTypes";
import { toast } from "@/lib/toast";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { CollaborationShareModal } from "@/components/collaboration/CollaborationShareModal";

const COLUMNS: {
  id: BacklogItem["status"];
  label: string;
  subLabel: string;
}[] = [
  { id: "idea", label: "아이디어", subLabel: "새로운 제안 및 아이디어" },
  { id: "review", label: "검토 중", subLabel: "타당성 및 기술 스펙 검토" },
  { id: "approved", label: "진행 확정", subLabel: "프로젝트 로드맵 등록 대기" },
  { id: "promoted", label: "프로젝트 전환 완료", subLabel: "로드맵 기간 등록 완료" },
];

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function BacklogView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramWorkspace = searchParams.get("workspace");
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";
  const userName = session?.user?.name || (userEmail ? userEmail.split("@")[0] : "회원");

  // 1. 백로그 상태 (DB + 계정별 localStorage 연동)
  const [backlogs, setBacklogs] = useState<BacklogItem[]>([]);
  const [workspaces, setWorkspaces] = useState<
    Array<{
      ownerEmail: string;
      ownerName: string;
      targetTitle: string;
      role: "owner" | "editor" | "viewer";
      isOwn: boolean;
      memberCount: number;
    }>
  >([]);
  const [selectedWorkspaceOwner, setSelectedWorkspaceOwner] = useState<string>("");
  const [myCollabRole, setMyCollabRole] = useState<"owner" | "editor" | "viewer">("owner");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // 카드 단위 즉시 이메일 공유 모달 상태
  const [sharingCardId, setSharingCardId] = useState<string | null>(null);
  const [cardShareEmailInput, setCardShareEmailInput] = useState("");
  const [isCardShareBusy, setIsCardShareBusy] = useState(false);

  const activeWorkspaceOwner = selectedWorkspaceOwner || paramWorkspace || userEmail;
  const activeWorkspaceInfo = workspaces.find((w) => w.ownerEmail === activeWorkspaceOwner);

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

  // 3. 필터 및 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 4. 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);

  // 5. "프로젝트로 전환" 모달 상태
  const [promotingItem, setPromotingItem] = useState<BacklogItem | null>(null);
  const [promoteStartDate, setPromoteStartDate] = useState("2026-10-19");
  const [promoteEndDate, setPromoteEndDate] = useState("2026-10-23");
  const [promoteColor, setPromoteColor] = useState("#0284c7");

  // 6. 폼 입력 상태
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<BacklogItem["status"]>("idea");
  const [formPriority, setFormPriority] = useState<BacklogItem["priority"]>("medium");
  const [formTagsStr, setFormTagsStr] = useState("");
  const [formAssignee, setFormAssignee] = useState("");

  // 7. 카드 접기/펼치기 및 완료 보관함 상태 (긴 카드 스크롤 방지 및 완료 프로젝트 분리)
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const toggleCardExpand = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // 프로젝트 완료 처리 (끝난 보관함으로 이동 -> 칸반 및 프로젝트 목록에서 즉시 제외)
  const handleCompleteBacklog = (item: BacklogItem) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const updated = backlogs.map((b) =>
      b.id === item.id ? { ...b, status: "completed" as const, completedAt: todayStr } : b
    );
    persistBacklogs(updated);
    toast.success(`🎉 '${item.title}' 프로젝트가 완료 처리되어 '끝난 보관함'으로 이동되었습니다.`);
  };

  // 프로젝트 복원 (끝난 보관함에서 다시 진행 중으로 복원)
  const handleRestoreBacklog = (item: BacklogItem) => {
    const updated = backlogs.map((b) =>
      b.id === item.id ? { ...b, status: "promoted" as const, completedAt: undefined } : b
    );
    persistBacklogs(updated);
    toast.success(`'${item.title}' 프로젝트가 다시 진행 중으로 복원되었습니다.`);
  };

  // 8. 드래그 앤 드롭 및 실시간 고스트 위치
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<BacklogItem["status"] | null>(null);
  const [dragOverTargetIndex, setDragOverTargetIndex] = useState<number | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 영구 저장 헬퍼 (UI와 localStorage는 즉시 반응, DB 저장은 300ms 디바운스로 배치 전송)
  const persistBacklogs = useCallback(
    (items: BacklogItem[], immediate = false) => {
      if (myCollabRole === "viewer") {
        toast.error("읽기 전용 권한에서는 백로그를 수정할 수 없습니다.");
        return;
      }
      setSaveStatus("saving");
      setBacklogs(items);
      const storageKey = `onequiz_backlog_items_${activeWorkspaceOwner || userEmail || "guest"}`;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(items));
        } catch {}
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const sendToDb = async () => {
        try {
          const query = activeWorkspaceOwner
            ? `?workspaceOwner=${encodeURIComponent(activeWorkspaceOwner)}`
            : "";
          const res = await fetch(`/api/ideas${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(items),
          });
          if (!res.ok) throw new Error("DB 저장 실패");
          markSaved();
        } catch {
          setSaveStatus("error");
        }
      };

      if (immediate) {
        sendToDb();
      } else {
        saveTimeoutRef.current = setTimeout(sendToDb, 300);
      }
    },
    [markSaved, myCollabRole, activeWorkspaceOwner, userEmail]
  );

  // DB 로드 (실제 Idea DB 연동 + 협업 워크스페이스 목록 동기화)
  const loadData = useCallback(async () => {
    if (!userEmail) return;
    const targetOwner = selectedWorkspaceOwner || paramWorkspace || userEmail;
    const storageKey = `onequiz_backlog_items_${targetOwner}`;
    try {
      const res = await fetch(
        `/api/ideas?meta=true&workspaceOwner=${encodeURIComponent(targetOwner)}`
      );
      if (res.ok) {
        const payload = await res.json();
        const data = Array.isArray(payload) ? payload : payload.items || [];
        if (Array.isArray(payload.workspaces)) {
          setWorkspaces(payload.workspaces);
        }
        if (payload.myRole) {
          setMyCollabRole(payload.myRole);
        }

        const normalized: BacklogItem[] = data.map((item: Record<string, unknown>) => {
          let st: BacklogItem["status"] = "idea";
          if (item.status === "completed") st = "completed";
          else if (item.status === "progress" || item.status === "approved") st = "approved";
          else if (item.status === "promoted") st = "promoted";
          else if (item.status === "review") st = "review";

          let pr: BacklogItem["priority"] = "medium";
          if (item.priority === "urgent" || item.priority === "high" || item.priority === "low") {
            pr = item.priority as BacklogItem["priority"];
          }

          const idVal = String(item.id || item._id || `backlog-${Date.now()}`);
          return {
            id: idVal,
            _id: item._id ? String(item._id) : undefined,
            title: String(item.title || "무제"),
            description: String(item.description || ""),
            status: st,
            priority: pr,
            isPublic: item.isPublic !== undefined ? Boolean(item.isPublic) : false,
            authorEmail: item.authorEmail ? String(item.authorEmail) : undefined,
            sharedWithEmails: Array.isArray(item.sharedWithEmails)
              ? (item.sharedWithEmails as string[])
              : [],
            isCardShared: Boolean(item.isCardShared),
            tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
            assignee: item.assignee ? String(item.assignee) : "",
            promotedToProjectId: item.promotedToProjectId
              ? String(item.promotedToProjectId)
              : st === "promoted"
              ? idVal
              : undefined,
            startDate: item.startDate ? String(item.startDate) : undefined,
            endDate: item.endDate ? String(item.endDate) : undefined,
            color: item.color ? String(item.color) : undefined,
            completedAt: item.completedAt ? String(item.completedAt) : undefined,
            createdAt: item.createdAt ? String(item.createdAt).slice(0, 10) : "2026-11-04",
          };
        });

        setBacklogs(normalized);
        markSaved();
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, JSON.stringify(normalized));
        }
        return;
      }
    } catch (e) {
      console.warn("Ideas DB fetch failed, falling back to localStorage", e);
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setBacklogs(parsed);
            markSaved();
            return;
          }
        } catch {}
      }
    }

    setBacklogs([]);
    markSaved();
  }, [userEmail, selectedWorkspaceOwner, paramWorkspace, markSaved]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    const handleCollabUpdate = () => {
      loadData();
    };
    window.addEventListener("onequiz:collab-updated", handleCollabUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("onequiz:collab-updated", handleCollabUpdate);
    };
  }, [loadData]);

  // 모든 태그 수집
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    backlogs.forEach((b) => b.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [backlogs]);

  // 검색 및 태그 필터링
  const filteredBacklogs = useMemo(() => {
    return backlogs.filter((b) => {
      const matchSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchTag = selectedTag ? b.tags.includes(selectedTag) : true;
      return matchSearch && matchTag;
    });
  }, [backlogs, searchQuery, selectedTag]);

  // 🌟 활성 칸반 보드용 (완료된 프로젝트는 제외하여 깨끗하게 관리)
  const kanbanBacklogs = useMemo(() => {
    return filteredBacklogs.filter((b) => b.status !== "completed");
  }, [filteredBacklogs]);

  // 🌟 끝난 보관함 프로젝트 목록 (status === "completed")
  const completedBacklogs = useMemo(() => {
    return filteredBacklogs.filter((b) => b.status === "completed");
  }, [filteredBacklogs]);

  // 백로그 추가 모달 오픈
  const handleOpenCreateModal = (targetStatus: BacklogItem["status"] = "idea") => {
    setEditingItem(null);
    setFormTitle("");
    setFormDescription("");
    setFormStatus(targetStatus);
    setFormPriority("medium");
    setFormTagsStr("");
    setFormAssignee(session?.user?.name || "");
    setIsCreateModalOpen(true);
  };

  // 백로그 편집 모달 오픈
  const handleOpenEditModal = (item: BacklogItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormStatus(item.status);
    setFormPriority(item.priority);
    setFormTagsStr(item.tags.join(", "));
    setFormAssignee(item.assignee || "");
    setIsCreateModalOpen(true);
  };

  // 백로그 저장 (추가/수정)
  const handleSaveBacklogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedTags = formTagsStr
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    if (editingItem) {
      const updated = backlogs.map((b) =>
        b.id === editingItem.id
          ? {
              ...b,
              title: formTitle.trim(),
              description: formDescription.trim(),
              status: formStatus,
              priority: formPriority,
              tags: parsedTags,
              assignee: formAssignee.trim() || undefined,
            }
          : b
      );
      persistBacklogs(updated, true);
    } else {
      const newItem: BacklogItem = {
        id: generateId("backlog"),
        title: formTitle.trim(),
        description: formDescription.trim(),
        status: formStatus,
        priority: formPriority,
        isPublic: false,
        authorEmail: activeWorkspaceOwner || userEmail,
        sharedWithEmails: [],
        tags: parsedTags,
        createdAt: new Date().toISOString().slice(0, 10),
        assignee: formAssignee.trim() || undefined,
      };
      persistBacklogs([newItem, ...backlogs], true);
    }
    setIsCreateModalOpen(false);
  };

  // 백로그 삭제
  const handleDeleteBacklog = async (id: string) => {
    if (confirm("정말 이 백로그 항목을 삭제하시겠습니까?")) {
      const updated = backlogs.filter((b) => b.id !== id);
      persistBacklogs(updated, true);
      try {
        await fetch(`/api/ideas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {}
    }
  };

  // 백로그 카드 단위 이메일 즉시 공유 추가/삭제 (수락/거절 불필요)
  const handleCardShareAction = async (
    card: BacklogItem,
    action: "addEmail" | "removeEmail",
    email: string
  ) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setIsCardShareBusy(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: card._id || card.id,
          fallbackId: card.id,
          action,
          email: trimmed,
          cardData: {
            title: card.title,
            description: card.description,
            status: card.status,
            priority: card.priority,
            tags: card.tags,
            assignee: card.assignee,
            startDate: card.startDate,
            endDate: card.endDate,
            color: card.color,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "공유 처리에 실패했습니다.");
        return;
      }

      const nextEmails: string[] = Array.isArray(data.sharedWithEmails)
        ? data.sharedWithEmails
        : [];
      setBacklogs((prev) =>
        prev.map((b) =>
          b.id === card.id || (card._id && b._id === card._id)
            ? { ...b, sharedWithEmails: nextEmails }
            : b
        )
      );
      if (action === "addEmail") {
        setCardShareEmailInput("");
        toast.success(`${trimmed} 님에게 이 카드가 즉시 공유되었습니다.`);
      } else {
        toast.info(`${trimmed} 님의 카드 공유가 해제되었습니다.`);
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setIsCardShareBusy(false);
    }
  };

  // "프로젝트로 전환" 모달 오픈
  const handleOpenPromoteModal = (item: BacklogItem) => {
    setPromotingItem(item);
    setPromoteStartDate(new Date().toISOString().slice(0, 10));
    // 기본 종료일: 7일 뒤
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    setPromoteEndDate(endDate.toISOString().slice(0, 10));
    setPromoteColor("#0284c7");
  };

  // "프로젝트로 전환" 실행 (로드맵 타임라인에 등록 + 상태 promoted 변경)
  const handleConfirmPromote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingItem) return;

    // 1. 기존 프로젝트 로드맵 로드
    let roadmapData: ProjectRoadmap | null = null;
    if (typeof window !== "undefined") {
      const savedRoadmap = localStorage.getItem("onequiz_roadmap_data");
      if (savedRoadmap) {
        try {
          roadmapData = JSON.parse(savedRoadmap);
        } catch {}
      }
    }

    // 기본 로드맵 없을 시 백로그 제목을 반영한 프로젝트 생성
    if (!roadmapData) {
      roadmapData = {
        id: promotingItem.id,
        name: promotingItem.title,
        description: promotingItem.description || "프로젝트 로드맵 타임라인",
        startDate: promoteStartDate,
        endDate: promoteEndDate,
        createdAt: new Date().toISOString().slice(0, 10),
        isPublic: true,
        members: [
          {
            email: session?.user?.email || "leader@onequiz.com",
            name: session?.user?.name || "프로젝트 리더",
            role: "admin",
          },
        ],
        items: [],
      };
    } else {
      roadmapData.id = promotingItem.id;
      roadmapData.name = promotingItem.title;
      if (promotingItem.description) {
        roadmapData.description = promotingItem.description;
      }
    }

    // 2. 새 RoadmapItem 생성 및 추가
    const newRoadmapItem: RoadmapItem = {
      id: generateId("item"),
      title: promotingItem.title,
      startDate: promoteStartDate,
      endDate: promoteEndDate,
      color: promoteColor,
      sourceBacklogId: promotingItem.id,
      assignee: promotingItem.assignee,
      comments: [
        {
          id: generateId("c"),
          authorName: session?.user?.name || "시스템",
          authorEmail: session?.user?.email || "system@onequiz.com",
          content: `백로그 '${promotingItem.title}'에서 프로젝트 로드맵으로 승격 등록되었습니다.`,
          createdAt: new Date().toLocaleString("ko-KR", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
    };

    // 로드맵 items에 추가
    roadmapData.items.push(newRoadmapItem);

    // 날짜 범위 자동 확장 (새 항목이 전체 프로젝트 범위 바깥이면 확장)
    if (promoteStartDate < roadmapData.startDate) {
      roadmapData.startDate = promoteStartDate;
    }
    if (promoteEndDate > roadmapData.endDate) {
      roadmapData.endDate = promoteEndDate;
    }

    // 로드맵 프로젝트별 격리 저장 (프로젝트마다 다른 간트바 보장)
    if (typeof window !== "undefined") {
      localStorage.setItem(`onequiz_roadmap_data_${promotingItem.id}`, JSON.stringify(roadmapData));
      localStorage.setItem("onequiz_roadmap_data", JSON.stringify(roadmapData));
      localStorage.setItem("onequiz_selected_project_id", promotingItem.id);
    }

    if (session?.user?.email) {
      try {
        fetch("/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...roadmapData, projectId: promotingItem.id }),
        });
      } catch {}
    }

    // 3. 백로그 항목 상태를 'promoted'로 변경
    const updatedBacklogs = backlogs.map((b) =>
      b.id === promotingItem.id
        ? {
            ...b,
            status: "promoted" as const,
            promotedToProjectId: promotingItem.id,
            startDate: promoteStartDate,
            endDate: promoteEndDate,
            color: promoteColor,
          }
        : b
    );
    persistBacklogs(updatedBacklogs);

    setPromotingItem(null);

    // 사용자에게 성공 안내 및 로드맵 이동 여부 확인
    if (
      confirm(
        `🎉 '${promotingItem.title}' 항목이 프로젝트로 성공적으로 전환되었습니다!\n\n지금 바로 프로젝트 로드맵 타임라인을 확인하시겠습니까?`
      )
    ) {
      router.push(`/projects?id=${promotingItem.id}`);
    }
  };

  // 드래그 중인 아이템 메모
  const draggingItem = useMemo(
    () => backlogs.find((b) => b.id === draggingItemId) || null,
    [backlogs, draggingItemId]
  );

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    // 🌟 백로그 카드를 잡고 이동할 때 기존 텍스트 선택 영역 즉시 해제 (잔상 방지)
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    e.dataTransfer.setData("text/plain", id);
    setDraggingItemId(id);
  };

  const handleColDragOver = (
    e: React.DragEvent,
    colId: BacklogItem["status"],
    fallbackIndex: number
  ) => {
    e.preventDefault();
    if (dragOverCol !== colId) setDragOverCol(colId);
    if (dragOverTargetIndex === null) setDragOverTargetIndex(fallbackIndex);
  };

  const handleCardDragOver = (
    e: React.DragEvent,
    colId: BacklogItem["status"],
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverCol !== colId) setDragOverCol(colId);
    if (dragOverTargetIndex !== index) setDragOverTargetIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDragOverCol(null);
    setDragOverTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: BacklogItem["status"]) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingItemId;
    const insertIndex = dragOverTargetIndex;

    setDragOverCol(null);
    setDragOverTargetIndex(null);
    setDraggingItemId(null);

    if (!id) return;

    // 만약 'promoted' 컬럼으로 드래그했다면 "프로젝트로 전환" 모달 띄우기
    if (targetCol === "promoted") {
      const targetItem = backlogs.find((b) => b.id === id);
      if (targetItem && targetItem.status !== "promoted") {
        handleOpenPromoteModal(targetItem);
        return;
      }
    }

    const targetItem = backlogs.find((b) => b.id === id);
    if (!targetItem) return;

    const remaining = backlogs.filter((b) => b.id !== id);
    const updatedItem: BacklogItem = { ...targetItem, status: targetCol };

    const colItems = remaining.filter((b) => b.status === targetCol);
    const otherItems = remaining.filter((b) => b.status !== targetCol);

    if (insertIndex !== null && insertIndex >= 0 && insertIndex <= colItems.length) {
      colItems.splice(insertIndex, 0, updatedItem);
      persistBacklogs([...otherItems, ...colItems]);
    } else {
      persistBacklogs([updatedItem, ...remaining]);
    }
  };

  // 우선순위 뱃지 헬퍼 (4단계: 긴급, 높음, 보통, 없음)
  const getPriorityBadge = (p: BacklogItem["priority"]) => {
    switch (p) {
      case "urgent":
        return { text: "긴급", className: "bg-red-500/15 text-red-500 border-red-500/30" };
      case "high":
        return { text: "높음", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
      case "medium":
        return { text: "보통", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" };
      case "low":
      default:
        return {
          text: "없음",
          className: "bg-surface-container-high text-on-surface-variant border-outline-variant",
        };
    }
  };

  return (
    <div className="w-full space-y-6 text-on-surface">
      {/* 1. 상단 타이틀 및 툴바 (라운딩 박스 없이 플랫 헤더) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="min-w-0 flex-1 w-full">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <h1 className="ui-page-title break-keep">
              아이디어 (백로그)
            </h1>
            <span className="ui-badge px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono shrink-0">
              {backlogs.length}개
            </span>
          </div>
          <p className="ui-page-subtitle mt-0.5 break-keep text-xs sm:text-sm text-on-surface-variant line-clamp-2 lg:line-clamp-none">
            등록된 아이디어를 칸반 보드에서 검토하고, 진행 확정된 항목을 <strong>프로젝트</strong>로 전환하여 로드맵을 관리할 수 있습니다.
          </p>
        </div>

        {/* 우측 퀵 컨트롤 버튼들 */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap py-1 max-w-full w-full lg:w-auto lg:shrink-0 text-sm">
          {/* 저장 상태 인디케이터 */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          {myCollabRole === "viewer" && (
            <span className="ui-badge px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              읽기 전용
            </span>
          )}

          {/* 협업 공유 버튼 (회원 이름 검색 -> 요청 -> 알림 수락/거절 연동) */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer text-xs shrink-0"
            title="회원 이메일을 입력하여 기능 백로그 협업 공유"
          >
            <Share2 size={13} />
            <span>공유 · 협업</span>
          </button>

          {/* 프로젝트 로드맵 바로가기 버튼 */}
          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant font-medium text-on-surface transition-colors"
            title="프로젝트 로드맵 타임라인으로 이동"
          >
            <FolderGit2 size={14} className="text-primary" />
            <span>로드맵 보기</span>
            <ArrowRight size={13} className="text-on-surface-variant" />
          </Link>

          {/* 새 백로그 추가 버튼 */}
          <button
            onClick={() => handleOpenCreateModal("idea")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:opacity-90 text-on-primary font-semibold rounded-md transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>새 백로그</span>
          </button>
        </div>
      </div>

      {/* 1-1. 협업 중인 백로그 워크스페이스 전환 바 */}
      {workspaces.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1">
          <span className="ui-caption font-semibold flex items-center gap-1 shrink-0">
            <Users size={13} className="text-primary" />
            워크스페이스:
          </span>
          {workspaces.map((ws) => {
            const active = ws.ownerEmail === activeWorkspaceOwner;
            return (
              <button
                key={ws.ownerEmail}
                type="button"
                onClick={() => setSelectedWorkspaceOwner(ws.ownerEmail)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  active
                    ? "bg-primary text-on-primary border-primary shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:text-on-surface"
                }`}
              >
                <span>{ws.isOwn ? "내 백로그" : ws.targetTitle}</span>
                {!ws.isOwn && (
                  <span className="text-[10px] opacity-80">
                    ({ws.role === "viewer" ? "읽기" : "편집"})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. 검색창 및 태그 필터 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 태그 필터 칩 */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              selectedTag === null
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant font-light"
            }`}
          >
            전체 태그
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                selectedTag === tag
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant font-light"
              }`}
            >
              <span>#{tag}</span>
            </button>
          ))}
        </div>

        {/* 검색 입력창 및 끝난 보관함 열기 */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setIsArchiveModalOpen(true)}
            className="px-2.5 py-1.5 rounded-md font-medium text-sm transition-colors cursor-pointer flex items-center gap-1.5 border shrink-0 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border-outline-variant"
            title="완료(종료)된 프로젝트 보관함 열기"
          >
            <Archive size={14} className="text-primary" />
            <span>끝난 보관함</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-primary text-xs font-mono font-bold">
              {completedBacklogs.length}
            </span>
          </button>

          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="백로그 제목·설명 검색..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-all font-light"
            />
          </div>
        </div>
      </div>

      {/* 전체 백로그가 비어 있을 때의 Empty State 안내 배너 */}
      {backlogs.length === 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg bg-surface-container-lowest border border-dashed border-outline-variant gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FolderGit2 size={18} />
            </div>
            <div>
              <p className="text-base font-semibold text-on-surface">등록된 백로그 아이템이 없습니다</p>
              <p className="text-sm text-on-surface-variant font-light">
                새 아이디어를 추가하고 검토 후 프로젝트 로드맵으로 연동해보세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenCreateModal("idea")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
          >
            <Plus size={14} />
            <span>아이디어 추가</span>
          </button>
        </div>
      )}

      {/* 3. 칸반 보드 (4 컬럼) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colItems = kanbanBacklogs.filter((b) => b.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleColDragOver(e, col.id, colItems.length)}
              onDragLeave={handleDragEnd}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col bg-surface-container-lowest border rounded-lg p-3 transition-all min-h-[560px] ${
                isOver ? "border-primary bg-primary/[0.02]" : "border-outline-variant"
              }`}
            >
              {/* 컬럼 헤더 */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <div>
                    <h3 className="font-semibold text-sm text-on-surface leading-tight">
                      {col.label}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-light leading-tight">
                      {col.subLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-xs font-mono font-medium">
                    {colItems.length}
                  </span>
                  <button
                    onClick={() => handleOpenCreateModal(col.id)}
                    className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
                    title="이 컬럼에 백로그 추가"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* 카드 목록 컨테이너 (스크롤 모듈 적용) */}
              <ScrollArea orientation="vertical" maxHeight="calc(100vh - 280px)" className="flex-1 space-y-2.5 pr-1">
                {colItems.length === 0 && (!isOver || dragOverTargetIndex !== 0) ? (
                  <div className="py-14 text-center text-on-surface-variant text-sm border border-dashed border-outline-variant rounded-md font-light">
                    비어 있음
                    <br />
                    <span className="text-xs opacity-75">
                      + 로 추가 또는 여기로 드래그
                    </span>
                  </div>
                ) : (
                  colItems.map((item, idx) => {
                    const badge = getPriorityBadge(item.priority);
                    const isGhostHere =
                      isOver && dragOverTargetIndex === idx && draggingItemId !== item.id;
                    const isExpanded = expandedCardIds.has(item.id);

                    return (
                      <React.Fragment key={item.id}>
                        {/* 🌟 드롭 예정 위치에 반투명 점선 고스트 카드 실시간 렌더링 */}
                        {isGhostHere && draggingItem && (
                          <GhostBacklogCard item={draggingItem} />
                        )}

                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragOver={(e) => handleCardDragOver(e, col.id, idx)}
                          className={`bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-md p-3 space-y-2 transition-all group cursor-grab active:cursor-grabbing ${
                            draggingItemId === item.id ? "opacity-30 border-dashed" : "opacity-100"
                          }`}
                        >
                          {/* 카드 상단 배지 & 더보기 */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}
                              >
                                {badge.text}
                              </span>
                              {item.status === "promoted" && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-container text-secondary border border-outline-variant flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  <span>로드맵 반영됨</span>
                                </span>
                              )}
                              {item.isCardShared ? (
                                <span
                                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  title={`공유자: ${item.authorEmail || ""}`}
                                >
                                  공유받음
                                </span>
                              ) : (item.sharedWithEmails?.length || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25">
                                  공유 {item.sharedWithEmails?.length}명
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                              {!item.isCardShared && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSharingCardId(item.id);
                                    setCardShareEmailInput("");
                                  }}
                                  className="p-1 text-on-surface-variant hover:text-primary rounded cursor-pointer"
                                  title="이 카드만 이메일로 즉시 공유"
                                >
                                  <Share2 size={12} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 text-on-surface-variant hover:text-on-surface rounded cursor-pointer"
                                title="수정"
                              >
                                <Edit2 size={12} />
                              </button>
                              {!item.isCardShared && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBacklog(item.id)}
                                  className="p-1 text-on-surface-variant hover:text-destructive rounded cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 카드 제목 */}
                          <h4 className="font-bold text-sm sm:text-base text-on-surface leading-snug">
                            {item.title}
                          </h4>

                          {/* 카드 설명 (더보기/접기 지원으로 긴 카드 스크롤 문제 완화) */}
                          {item.description && (
                            <div className="space-y-1">
                              <p
                                className={`text-xs sm:text-sm text-on-surface-variant font-light leading-relaxed transition-all ${
                                  isExpanded ? "" : "line-clamp-2"
                                }`}
                              >
                                {item.description}
                              </p>
                              {item.description.length > 55 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCardExpand(item.id);
                                  }}
                                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>접기</span>
                                      <ChevronUp size={11} />
                                    </>
                                  ) : (
                                    <>
                                      <span>더보기</span>
                                      <ChevronDown size={11} />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}

                          {/* 태그 목록 */}
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-light"
                                >
                                  #{t}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">
                                  +{item.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 카드 하단 메타 & 프로젝트 전환 버튼 */}
                          <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant font-mono text-xs font-light">
                              {item.createdAt}
                            </span>

                            {/* 프로젝트 전환 또는 완료/로드맵 액션 버튼 */}
                            {item.status !== "promoted" ? (
                              <button
                                onClick={() => handleOpenPromoteModal(item)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary font-medium text-xs transition-colors cursor-pointer"
                                title="프로젝트 로드맵으로 등록합니다"
                              >
                                <Calendar size={12} />
                                <span>프로젝트로 전환</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteBacklog(item);
                                  }}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors cursor-pointer"
                                  title="프로젝트를 완료 처리하고 '끝난 보관함'으로 이동합니다"
                                >
                                  <CheckCheck size={12} />
                                  <span>종료</span>
                                </button>
                                <Link
                                  href={`/projects?id=${item.id}`}
                                  onClick={() => {
                                    if (typeof window !== "undefined") {
                                      localStorage.setItem("onequiz_selected_project_id", item.id);
                                    }
                                  }}
                                  className="flex items-center gap-0.5 text-on-surface-variant hover:text-primary font-medium text-xs transition-colors"
                                  title="프로젝트 로드맵 화면으로 이동"
                                >
                                  <span>로드맵</span>
                                  <ArrowRight size={11} />
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}

                {/* 컬럼 맨 아래에 드롭될 예정일 때의 고스트 카드 */}
                {isOver &&
                  (dragOverTargetIndex === colItems.length ||
                    (colItems.length === 0 && dragOverTargetIndex === 0)) &&
                  draggingItem &&
                  draggingItemId !== draggingItem.id && (
                    <GhostBacklogCard item={draggingItem} />
                  )}
              </ScrollArea>

              {/* 하단 추가 버튼 */}
              <button
                onClick={() => handleOpenCreateModal(col.id)}
                className="mt-2.5 w-full py-2 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-sm font-medium rounded-md border border-dashed border-outline-variant transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>항목 추가</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 4. 백로그 생성 / 수정 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 w-full max-w-md space-y-4 text-on-surface">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="font-semibold text-base text-on-surface">
                {editingItem ? "백로그 항목 수정" : "새 백로그 등록"}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBacklogSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block font-medium text-on-surface mb-1 text-sm">
                  제목 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 기출문제 오답노트 PDF 내보내기"
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface focus:outline-none focus:border-primary font-light text-sm"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-on-surface mb-1 text-sm">상세 설명</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="아이디어에 대한 세부 요구사항이나 배경을 작성합니다."
                  rows={3}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface focus:outline-none focus:border-primary font-light text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-on-surface mb-1 text-sm">상태</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as BacklogItem["status"])}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md font-medium text-sm text-on-surface"
                  >
                    <option value="idea">아이디어</option>
                    <option value="review">검토 중</option>
                    <option value="approved">진행 확정</option>
                    <option value="promoted">프로젝트 전환 완료</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-on-surface mb-1 text-sm">우선순위</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as BacklogItem["priority"])}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md font-medium text-sm text-on-surface"
                  >
                    <option value="urgent">긴급 (Urgent)</option>
                    <option value="high">높음 (High)</option>
                    <option value="medium">보통 (Medium)</option>
                    <option value="low">없음 (None)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-on-surface mb-1 text-sm">태그 (쉼표 구분)</label>
                <input
                  type="text"
                  value={formTagsStr}
                  onChange={(e) => setFormTagsStr(e.target.value)}
                  placeholder="UIUX, 기출, 모듈화"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md font-light text-sm text-on-surface"
                />
              </div>

              <div>
                <label className="block font-medium text-on-surface mb-1 text-sm">담당자</label>
                <input
                  type="text"
                  value={formAssignee}
                  onChange={(e) => setFormAssignee(e.target.value)}
                  placeholder="예: 홍길동, 개발자 A"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md font-light text-sm text-on-surface"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 bg-surface-container-low hover:bg-surface-container rounded-md font-medium text-sm cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-on-primary font-semibold rounded-md text-sm cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {editingItem ? "수정 완료" : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. "프로젝트 로드맵으로 전환" 모달 */}
      {promotingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 w-full max-w-md space-y-4 text-on-surface">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <FolderGit2 size={16} className="text-primary" />
                <h3 className="font-semibold text-base text-on-surface">
                  프로젝트 로드맵 등록
                </h3>
              </div>
              <button
                onClick={() => setPromotingItem(null)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-on-surface-variant font-light">
              선택한 백로그를 프로젝트 타임라인으로 등록하고 기간을 배정합니다.
            </p>

            <form onSubmit={handleConfirmPromote} className="space-y-3.5 text-sm">
              <div>
                <label className="block font-medium text-on-surface mb-1 text-sm">로드맵 항목명</label>
                <input
                  type="text"
                  defaultValue={promotingItem.title}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md font-medium text-sm"
                  required
                />
              </div>

              {/* 기간 설정: 시작일 ~ 종료일 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-on-surface mb-1 text-sm">시작일</label>
                  <input
                    type="date"
                    value={promoteStartDate}
                    onChange={(e) => setPromoteStartDate(e.target.value)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-on-surface mb-1 text-sm">종료일</label>
                  <input
                    type="date"
                    value={promoteEndDate}
                    onChange={(e) => setPromoteEndDate(e.target.value)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-sm font-mono"
                    required
                  />
                </div>
              </div>

              {/* 간트 바 색상 선택 */}
              <div>
                <label className="block font-medium text-on-surface mb-1 text-sm">간트 바 색상</label>
                <div className="flex gap-2">
                  {["#0284c7", "#0369a1", "#075985", "#059669", "#475569"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPromoteColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-md cursor-pointer transition-transform ${
                        promoteColor === c ? "scale-110 ring-2 ring-primary" : "opacity-70"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 bg-surface-container-low border border-outline-variant rounded-md text-sm space-y-1">
                <p className="font-semibold text-on-surface text-xs">안내 사항</p>
                <p className="text-on-surface-variant font-light text-xs leading-relaxed">
                  등록 후 프로젝트 페이지에서 주차별 타임라인 바 확인 및 초대된 팀원들과 댓글 피드백을 작성할 수 있습니다.
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setPromotingItem(null)}
                  className="flex-1 py-2 bg-surface-container-low hover:bg-surface-container rounded-md font-medium text-sm cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-on-primary font-semibold rounded-md text-sm cursor-pointer hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  <Calendar size={14} />
                  <span>로드맵 등록 완료</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. "끝난 프로젝트 보관함" 모달 */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6 w-full max-w-2xl space-y-4 text-on-surface shadow-xl flex flex-col max-h-[85vh]">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center border-b border-outline-variant pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Archive size={17} />
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-on-surface leading-tight">
                    끝난 프로젝트 보관함
                  </h3>
                  <p className="text-sm text-on-surface-variant font-light mt-0.5">
                    완료 처리되어 칸반 보드와 프로젝트 목록에서 보관된 항목들입니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-xs font-semibold">
                  {completedBacklogs.length}개 보관됨
                </span>
                <button
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
                  title="닫기"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* 모달 본문 (스크롤) */}
            <ScrollArea orientation="vertical" maxHeight="calc(85vh - 160px)" className="flex-1 pr-1">
              {completedBacklogs.length === 0 ? (
                <div className="py-16 text-center space-y-2 border border-dashed border-outline-variant rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto">
                    <CheckCheck size={20} />
                  </div>
                  <p className="text-sm font-medium text-on-surface">보관된 완료 프로젝트가 없습니다</p>
                  <p className="text-xs text-on-surface-variant font-light">
                    &apos;프로젝트 전환 완료&apos; 칸에서 [종료]를 누르면 여기에 정리 보관됩니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedBacklogs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-surface-container-low border border-outline-variant rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-container text-primary border border-outline-variant flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>완료됨</span>
                          </span>
                          {item.completedAt && (
                            <span className="text-xs font-mono text-on-surface-variant font-light">
                              완료일: {item.completedAt}
                            </span>
                          )}
                          {item.tags.map((t) => (
                            <span
                              key={t}
                              className="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-light"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                        <h4 className="font-bold text-base text-on-surface truncate">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-sm text-on-surface-variant font-light line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleRestoreBacklog(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-sm transition-colors cursor-pointer border border-outline-variant"
                          title="다시 프로젝트 진행 중으로 복원합니다"
                        >
                          <RotateCcw size={13} className="text-primary" />
                          <span>다시 진행하기</span>
                        </button>
                        <Link
                          href={`/projects?id=${item.id}`}
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              localStorage.setItem("onequiz_selected_project_id", item.id);
                            }
                            setIsArchiveModalOpen(false);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-opacity"
                          title="타임라인 로드맵 및 히스토리 보기"
                        >
                          <span>기록 보기</span>
                          <ArrowRight size={13} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteBacklog(item.id)}
                          className="p-1.5 text-on-surface-variant hover:text-destructive rounded-md cursor-pointer transition-colors"
                          title="영구 삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* 모달 푸터 */}
            <div className="pt-3 border-t border-outline-variant flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-md font-medium text-sm cursor-pointer transition-colors text-on-surface"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 협업 공유 모달 (기능 백로그 워크스페이스 전체) */}
      <CollaborationShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        moduleType="backlog"
        targetId={activeWorkspaceOwner || userEmail}
        targetTitle={
          activeWorkspaceInfo?.targetTitle || `${userName}님의 기능 백로그`
        }
        onChanged={loadData}
      />

      {/* 개별 백로그 카드 이메일 즉시 공유 모달 (수락/거절 절차 없이 즉시 열람) */}
      {sharingCardId && (() => {
        const targetCard = backlogs.find(
          (b) => b.id === sharingCardId || b._id === sharingCardId
        );
        if (!targetCard) return null;
        const sharedEmails = targetCard.sharedWithEmails || [];

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 w-full max-w-md space-y-4 text-on-surface shadow-2xl">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-outline-variant">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Share2 size={15} className="text-primary shrink-0" />
                    <h3 className="ui-card-title text-on-surface truncate">
                      백로그 카드 즉시 공유
                    </h3>
                  </div>
                  <p className="ui-caption truncate mt-0.5">
                    카드: {targetCard.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSharingCardId(null)}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCardShareAction(
                    targetCard,
                    "addEmail",
                    cardShareEmailInput
                  );
                }}
                className="space-y-2.5"
              >
                <p className="ui-caption">
                  수락/거절 절차 없이 이메일을 추가하면 상대방의 백로그 보드에 이 카드가 즉시 표시됩니다.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                    />
                    <input
                      type="email"
                      required
                      value={cardShareEmailInput}
                      onChange={(e) => setCardShareEmailInput(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCardShareBusy || !cardShareEmailInput.trim()}
                    className="px-3.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isCardShareBusy ? "처리 중" : "추가"}
                  </button>
                </div>
              </form>

              <div className="space-y-2 pt-2 border-t border-outline-variant">
                <span className="text-xs font-bold text-on-surface">
                  공유된 이메일 ({sharedEmails.length})
                </span>
                {sharedEmails.length === 0 ? (
                  <p className="ui-caption py-1">
                    아직 이 카드를 공유한 이메일이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {sharedEmails.map((em) => (
                      <div
                        key={em}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-mono text-on-surface truncate">
                          {em}
                        </span>
                        <button
                          type="button"
                          disabled={isCardShareBusy}
                          onClick={() =>
                            handleCardShareAction(
                              targetCard,
                              "removeEmail",
                              em
                            )
                          }
                          className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer shrink-0"
                        >
                          해제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// 🌟 드롭 예정 위치를 시각적으로 나타내는 고스트 백로그 카드
function GhostBacklogCard({ item }: { item: BacklogItem }) {
  const badge =
    item.priority === "urgent"
      ? { text: "긴급", className: "bg-red-500/15 text-red-500 border-red-500/30" }
      : item.priority === "high"
      ? { text: "높음", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" }
      : item.priority === "medium"
      ? { text: "보통", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" }
      : {
          text: "없음",
          className: "bg-surface-container-high text-on-surface-variant border-outline-variant",
        };

  return (
    <div className="border-2 border-dashed border-primary bg-primary/[0.04] rounded-md p-3 space-y-1.5 opacity-70 pointer-events-none transition-all">
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}>
          {badge.text}
        </span>
        <span className="text-xs font-mono text-primary font-medium">이동 예정 위치</span>
      </div>
      <h4 className="font-semibold text-sm text-on-surface line-clamp-1">{item.title}</h4>
      {item.description && (
        <p className="text-xs text-on-surface-variant font-light line-clamp-1">
          {item.description}
        </p>
      )}
    </div>
  );
}
