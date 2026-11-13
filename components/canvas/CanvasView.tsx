"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  StickyNote,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  ThumbsUp,
  Smile,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock,
  CheckSquare,
  DoorOpen,
  ChevronDown,
  LayoutGrid,
  X,
  ArrowLeft,
  Search,
  Users,
  Hand,
  Move,
  Palette,
} from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";

interface CanvasItemData {
  _id: string;
  type: "sticky" | "sticker" | "meeting_card" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  content: string;
  authorName: string;
  stickers: string[];
  votes: number;
  meetingStatus?: "todo" | "in_progress" | "done";
}

const COLOR_PRESETS = [
  { id: "yellow", name: "노랑", bg: "bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-100" },
  { id: "pink", name: "핑크", bg: "bg-pink-100 dark:bg-pink-950/80 border-pink-300 dark:border-pink-700/60 text-pink-950 dark:text-pink-100" },
  { id: "green", name: "그린", bg: "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100" },
  { id: "blue", name: "블루", bg: "bg-sky-100 dark:bg-sky-950/80 border-sky-300 dark:border-sky-700/60 text-sky-950 dark:text-sky-100" },
  { id: "purple", name: "퍼플", bg: "bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-700/60 text-purple-950 dark:text-purple-100" },
];

const STICKER_PALETTE = ["💡", "🔥", "✅", "🚀", "❤️", "❓", "⭐", "🎉"];

export function CanvasView() {
  const { data: session } = useSession();
  const userName =
    session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "학습자");

  const [items, setItems] = useState<CanvasItemData[]>([]);
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  // 🌟 회의실 룸 시스템 상태
  const [rooms, setRooms] = useState<Array<{ roomId: string; title: string; category: string; description: string; creatorName?: string }>>([]);
  const [categories, setCategories] = useState<string[]>([
    "전체",
    "브레인스토밍",
    "기획 회의",
    "디자인 리뷰",
    "시험대비",
    "코드 아키텍처",
    "자유 토론",
  ]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(queryId);
  const [activeRoomId, setActiveRoomId] = useState("default-room");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 🌟 URL 쿼리 파라미터(?id=...) 동기화
  useEffect(() => {
    setSelectedRoomId(queryId || null);
  }, [queryId]);

  // 🌟 관리자 카테고리 설정 연동 (동적 로드)
  useEffect(() => {
    let ignore = false;
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?type=canvas");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            const names = data.categories.map((c: { name: string }) => c.name);
            setCategories(["전체", ...names]);
          }
        }
      } catch {}
    }
    fetchCategories();
    return () => {
      ignore = true;
    };
  }, []);

  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomCategory, setNewRoomCategory] = useState("브레인스토밍");
  const [newRoomDesc, setNewRoomDesc] = useState("");

  // 회의 타이머 상태
  const [timerSeconds, setTimerSeconds] = useState(15 * 60); // 기본 15분
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // 캔버스 드래그 및 화면 이동(패닝) 추적
  const canvasRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isHandToolActive, setIsHandToolActive] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
  const pinchDistRef = useRef<number | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItemIdRef = useRef<string | null>(null);
  selectedItemIdRef.current = selectedItemId;
  const isHandToolActiveRef = useRef(isHandToolActive);
  isHandToolActiveRef.current = isHandToolActive;
  const isSpaceHeldRef = useRef(isSpaceHeld);
  isSpaceHeldRef.current = isSpaceHeld;

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const markSaved = useCallback(() => {
    const now = new Date();
    setSavedTimeStr(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
    setSaveStatus("saved");
  }, []);

  // 🌟 회의실 목록 로드
  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/canvas/rooms");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
      }
    } catch (e) {
      console.error("Room fetch error:", e);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchRooms() {
      try {
        const res = await fetch("/api/canvas/rooms");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data.rooms)) {
            setRooms(data.rooms);
          }
        }
      } catch (e) {
        console.error("Room fetch error:", e);
      }
    }
    fetchRooms();
    return () => {
      ignore = true;
    };
  }, []);

  // 1. 활성 회의실(activeRoomId)의 캔버스 아이템 로드
  useEffect(() => {
    if (!selectedRoomId) return;
    let ignore = false;
    async function loadCanvas() {
      try {
        const res = await fetch(`/api/canvas?boardId=${encodeURIComponent(selectedRoomId || "")}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            setItems(data.items);
            markSaved();
          }
        }
      } catch (err) {
        console.error("Canvas load error:", err);
      }
    }
    loadCanvas();
    return () => {
      ignore = true;
    };
  }, [selectedRoomId, markSaved]);

  // 🌟 2. PC 단축키 & 휠 확대/축소 (스페이스바 잡기, V 선택, H 핸드툴, N/S 메모, Del 삭제 등)
  useEffect(() => {
    if (!selectedRoomId) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoomLevel((prev) =>
          Math.min(2.0, Math.max(0.4, Number((prev + delta).toFixed(2))))
        );
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      // 1) 줌 단축키 (Ctrl / Meta + = / - / 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setZoomLevel((prev) => Math.min(2.0, Number((prev + 0.1).toFixed(2))));
          return;
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setZoomLevel((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))));
          return;
        } else if (e.key === "0") {
          e.preventDefault();
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
          return;
        }
      }

      // 텍스트 타이핑 중일 때는 단축키 실행 방지
      if (isInputActive) {
        if (e.key === "Escape") {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      // 2) 스페이스바 홀드: 화면 이동(잡기/Hand) 모드 즉시 활성화
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpaceHeld(true);
        return;
      }

      // 3) V키: 선택 모드 전환
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setIsHandToolActive(false);
        toast.info("선택 도구로 전환되었습니다 (V)");
        return;
      }

      // 4) H키: 잡기 도구 토글
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setIsHandToolActive((prev) => {
          const next = !prev;
          toast.info(next ? "잡기 도구로 전환되었습니다 (H)" : "선택 도구로 전환되었습니다 (V)");
          return next;
        });
        return;
      }

      // 5) N 또는 S: 새 포스트잇 생성
      if (e.key === "n" || e.key === "N" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleAddSticky();
        return;
      }

      // 6) M: 새 회의 안건 카드 생성
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        handleAddMeetingCard();
        return;
      }

      // 7) Delete / Backspace: 선택된 아이템 삭제
      if (e.key === "Delete" || e.key === "Backspace") {
        const curSelected = selectedItemIdRef.current;
        if (curSelected) {
          e.preventDefault();
          handleDeleteItem(curSelected);
          setSelectedItemId(null);
        }
        return;
      }

      // 8) Escape: 선택 해제
      if (e.key === "Escape") {
        setSelectedItemId(null);
        setIsHandToolActive(false);
        setIsSpaceHeld(false);
        setActiveSticker(null);
        return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceHeld(false);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
    };
  }, [selectedRoomId]);

  // 2. 회의 타이머 1초 인터벌
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          toast.info("⏱️ 회의 집중 시간이 종료되었습니다!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // 새 회의실 개설
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) {
      toast.error("회의실 이름을 입력해주세요.");
      return;
    }
    try {
      const res = await fetch("/api/canvas/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRoomTitle.trim(),
          category: newRoomCategory,
          description: newRoomDesc.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`새 회의실 '${data.room.title}'이 개설되었습니다!`);
        setIsCreateRoomOpen(false);
        setNewRoomTitle("");
        setNewRoomDesc("");
        loadRooms();
        setActiveRoomId(data.room.roomId);
        setSelectedRoomId(data.room.roomId);
        router.push(`/canvas?id=${data.room.roomId}`);
      }
    } catch {
      toast.error("회의실 개설 실패");
    }
  };

  // 회의실 삭제
  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!confirm("정말 이 회의실을 삭제하시겠습니까? 안의 모든 메모도 함께 삭제됩니다.")) return;
    try {
      const res = await fetch(`/api/canvas/rooms?roomId=${encodeURIComponent(roomId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("회의실이 삭제되었습니다.");
        loadRooms();
        if (selectedRoomId === roomId) {
          setSelectedRoomId(null);
          router.push("/canvas");
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "기본 회의실은 삭제할 수 없습니다.");
      }
    } catch {
      toast.error("통신 오류 발생");
    }
  };

  // 포스트잇 추가
  const handleAddSticky = async () => {
    setSaveStatus("saving");
    const newItemPayload = {
      boardId: activeRoomId,
      type: "sticky",
      x: Math.max(40, Math.round((140 - panOffset.x) / zoomLevel) + Math.floor(Math.random() * 80)),
      y: Math.max(40, Math.round((120 - panOffset.y) / zoomLevel) + Math.floor(Math.random() * 60)),
      width: 220,
      height: 190,
      color: selectedColor,
      content: "",
      authorName: userName,
      stickers: [],
      votes: 0,
    };

    try {
      const res = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItemPayload),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, data.item]);
        markSaved();
        toast.success("새 포스트잇 메모지가 부착되었습니다.");
      }
    } catch {
      toast.error("포스트잇 생성에 실패했습니다.");
      setSaveStatus("error");
    }
  };

  // 회의 안건 카드 추가
  const handleAddMeetingCard = async () => {
    setSaveStatus("saving");
    const newCardPayload = {
      boardId: activeRoomId,
      type: "meeting_card",
      x: Math.max(40, Math.round((160 - panOffset.x) / zoomLevel) + Math.floor(Math.random() * 60)),
      y: Math.max(40, Math.round((140 - panOffset.y) / zoomLevel) + Math.floor(Math.random() * 50)),
      width: 260,
      height: 160,
      color: "blue",
      content: "오늘의 주요 회의 안건 또는 결정사항",
      authorName: userName,
      meetingStatus: "todo",
      stickers: [],
      votes: 0,
    };

    try {
      const res = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCardPayload),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, data.item]);
        markSaved();
        toast.success("회의 안건 카드가 추가되었습니다.");
      }
    } catch {
      toast.error("안건 카드 생성 실패");
      setSaveStatus("error");
    }
  };

  // 아이템 내용 업데이트 (Debounced or onBlur)
  const handleUpdateContent = async (id: string, newContent: string) => {
    setItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, content: newContent } : it))
    );
    setSaveStatus("saving");
    try {
      await fetch("/api/canvas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: newContent }),
      });
      markSaved();
    } catch {
      setSaveStatus("error");
    }
  };

  // 아이템 삭제
  const handleDeleteItem = async (id: string) => {
    setItems((prev) => prev.filter((it) => it._id !== id));
    setSaveStatus("saving");
    try {
      await fetch(`/api/canvas?id=${id}`, { method: "DELETE" });
      markSaved();
      toast.info("아이템이 삭제되었습니다.");
    } catch {
      setSaveStatus("error");
    }
  };

  // 투표(좋아요) 증가
  const handleVote = async (id: string) => {
    const target = items.find((it) => it._id === id);
    if (!target) return;
    const newVotes = (target.votes || 0) + 1;

    setItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, votes: newVotes } : it))
    );
    setSaveStatus("saving");
    try {
      await fetch("/api/canvas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, votes: newVotes }),
      });
      markSaved();
    } catch {
      setSaveStatus("error");
    }
  };

  // 스티커 반응 추가
  const handleAddStickerToItem = async (id: string, sticker: string) => {
    const target = items.find((it) => it._id === id);
    if (!target) return;
    const newStickers = [...(target.stickers || []), sticker];

    setItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, stickers: newStickers } : it))
    );
    setSaveStatus("saving");
    try {
      await fetch("/api/canvas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stickers: newStickers }),
      });
      markSaved();
      toast.success(`${sticker} 스티커를 부착했습니다.`);
    } catch {
      setSaveStatus("error");
    }
  };

  // 회의 카드 상태 토글 (todo -> in_progress -> done)
  const handleToggleMeetingStatus = async (id: string) => {
    const target = items.find((it) => it._id === id);
    if (!target) return;
    const nextStatus =
      target.meetingStatus === "todo"
        ? "in_progress"
        : target.meetingStatus === "in_progress"
        ? "done"
        : "todo";

    setItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, meetingStatus: nextStatus } : it))
    );
    setSaveStatus("saving");
    try {
      await fetch("/api/canvas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, meetingStatus: nextStatus }),
      });
      markSaved();
    } catch {
      setSaveStatus("error");
    }
  };

  // 캔버스 초기화
  const handleClearBoard = async () => {
    if (!confirm("캔버스의 모든 포스트잇과 회의 카드를 비우시겠습니까?")) return;
    setItems([]);
    setSaveStatus("saving");
    try {
      await fetch(`/api/canvas?boardId=${encodeURIComponent(activeRoomId)}&clearAll=true`, { method: "DELETE" });
      markSaved();
      toast.info("캔버스가 초기화되었습니다.");
    } catch {
      setSaveStatus("error");
    }
  };

  // 드래그 시작 (PC 마우스)
  const handleMouseDown = (e: React.MouseEvent, item: CanvasItemData) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "BUTTON") {
      return;
    }

    // 화면 이동(잡기) 모드 또는 스페이스바 홀드 중이면 아이템 드래그 대신 캔버스 이동
    if (isHandToolActive || isSpaceHeld) {
      handleMouseDownCanvas(e);
      return;
    }

    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    setSelectedItemId(item._id);
    setDraggingItemId(item._id);
    dragOffsetRef.current = {
      x: (e.clientX - panOffset.x) / zoomLevel - item.x,
      y: (e.clientY - panOffset.y) / zoomLevel - item.y,
    };
  };

  // 터치 드래그 시작 (모바일 터치)
  const handleTouchStartItem = (e: React.TouchEvent, item: CanvasItemData) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "BUTTON") {
      return;
    }
    if (e.touches.length !== 1) return;

    if (isHandToolActive) {
      handleTouchStartCanvas(e);
      return;
    }

    setSelectedItemId(item._id);
    setDraggingItemId(item._id);
    const touch = e.touches[0];
    dragOffsetRef.current = {
      x: (touch.clientX - panOffset.x) / zoomLevel - item.x,
      y: (touch.clientY - panOffset.y) / zoomLevel - item.y,
    };
  };

  // 캔버스 배경 드래그(화면 이동 / Pan) 시작
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setSelectedItemId(null);
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    };
  };

  const handleTouchStartCanvas = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setSelectedItemId(null);
      setIsPanning(true);
      panStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      };
      pinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  // 드래그 중 (PC 마우스 - 60fps RAF 최적화)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingItemId) {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const currentDragId = draggingItemId;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newX = Math.round((clientX - panOffset.x) / zoomLevel - dragOffsetRef.current.x);
        const newY = Math.round((clientY - panOffset.y) / zoomLevel - dragOffsetRef.current.y);

        setItems((prev) =>
          prev.map((it) => (it._id === currentDragId ? { ...it, x: newX, y: newY } : it))
        );
      });
      return;
    }

    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setPanOffset({
          x: panStartRef.current.initialPanX + dx,
          y: panStartRef.current.initialPanY + dy,
        });
      });
    }
  };

  // 터치 드래그 중 (모바일 터치 - 60fps RAF 최적화)
  const handleTouchMoveCanvas = (e: React.TouchEvent) => {
    if (draggingItemId && e.touches.length === 1) {
      const touch = e.touches[0];
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      const currentDragId = draggingItemId;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newX = Math.round((touchX - panOffset.x) / zoomLevel - dragOffsetRef.current.x);
        const newY = Math.round((touchY - panOffset.y) / zoomLevel - dragOffsetRef.current.y);

        setItems((prev) =>
          prev.map((it) => (it._id === currentDragId ? { ...it, x: newX, y: newY } : it))
        );
      });
      return;
    }

    if (isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - panStartRef.current.x;
      const dy = touch.clientY - panStartRef.current.y;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setPanOffset({
          x: panStartRef.current.initialPanX + dx,
          y: panStartRef.current.initialPanY + dy,
        });
      });
    } else if (e.touches.length === 2 && pinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchDistRef.current;
      if (Math.abs(ratio - 1) > 0.05) {
        setZoomLevel((z) => Math.min(2.0, Math.max(0.4, Number((z * (ratio > 1 ? 1.05 : 0.95)).toFixed(2)))));
        pinchDistRef.current = dist;
      }
    }
  };

  // 드래그 종료 & DB 저장
  const handleMouseUp = async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (isPanning) {
      setIsPanning(false);
    }
    if (!draggingItemId) return;
    const target = items.find((it) => it._id === draggingItemId);
    const finishedId = draggingItemId;
    setDraggingItemId(null);

    if (target) {
      setSaveStatus("saving");
      try {
        await fetch("/api/canvas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: finishedId, x: target.x, y: target.y }),
        });
        markSaved();
      } catch {
        setSaveStatus("error");
      }
    }
  };

  const handleTouchEndCanvas = () => {
    handleMouseUp();
    pinchDistRef.current = null;
  };

  const handleResetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  };

  // 타이머 분:초 포맷
  const timerMinutes = Math.floor(timerSeconds / 60);
  const timerRemainSeconds = timerSeconds % 60;
  const timerStr = `${String(timerMinutes).padStart(2, "0")}:${String(timerRemainSeconds).padStart(2, "0")}`;

  const currentRoom = rooms.find((r) => r.roomId === (selectedRoomId || activeRoomId)) || {
    roomId: activeRoomId,
    title: activeRoomId === "default-room" ? "메인 브레인스토밍 룸" : "회의실",
    category: "회의실",
    description: "",
  };

  // 🌟 회의실 미선택 시: 카드 갤러리 목록 뷰 제공
  if (!selectedRoomId) {
    const filteredRooms = rooms.filter((r) => {
      const matchCat = selectedCategory === "전체" || r.category === selectedCategory;
      const matchSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });

    return (
      <div className="w-full space-y-6 pb-12 animate-fade-in select-none">
        {/* 상단 타이틀 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <StickyNote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="ui-page-title flex items-center gap-2">
                아이디어 캔버스 회의실
                <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                  {rooms.length}개 보드
                </span>
              </h1>
              <p className="ui-page-subtitle">
                포스트잇과 회의 안건 카드로 자유롭게 생각을 펼칠 캔버스를 선택하세요.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateRoomOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>새 회의실 개설</span>
          </button>
        </div>

        {/* 카테고리 필터 & 검색 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-on-primary shadow-xs font-bold"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder="회의실 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary font-medium"
            />
          </div>
        </div>

        {/* 캔버스 룸 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 w-full">
          {/* 새 캔버스 개설 점선 카드 */}
          <div
            onClick={() => setIsCreateRoomOpen(true)}
            className="group min-h-[190px] border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:bg-surface-container-low/50"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <div>
              <div className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                새 회의실 개설하기
              </div>
              <p className="ui-caption text-on-surface-variant mt-0.5">
                신규 브레인스토밍 또는 기획 회의실 생성
              </p>
            </div>
          </div>

          {/* 회의실 카드들 */}
          {filteredRooms.map((room) => {
            const isDefault = room.roomId === "default-room" || room.roomId === "exam-strategy-room";
            return (
              <div
                key={room.roomId}
                onClick={() => {
                  setSelectedRoomId(room.roomId);
                  setActiveRoomId(room.roomId);
                  router.push(`/canvas?id=${room.roomId}`);
                }}
                className="group relative bg-surface-container-lowest border border-outline-variant hover:border-primary/60 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <span className="ui-badge px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[11px]">
                      {room.category}
                    </span>

                    {!isDefault && (
                      <button
                        onClick={(e) => handleDeleteRoom(e, room.roomId)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                        title="회의실 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <h3 className="ui-card-title text-base font-bold text-on-surface group-hover:text-primary transition-colors mt-1">
                    {room.title}
                  </h3>
                  <p className="ui-body text-xs text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">
                    {room.description || "포스트잇과 회의 안건 카드로 자유롭게 아이디어를 구성해보세요."}
                  </p>
                </div>

                <div className="pt-4 border-t border-outline-variant/60 flex items-center justify-between mt-4">
                  <span className="ui-caption text-on-surface-variant/80 flex items-center gap-1.5">
                    <Users size={12} />
                    {room.creatorName || "팀원"}
                  </span>

                  <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    캔버스 입장하기 →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 회의실 개설 모달 */}
        {isCreateRoomOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md p-6 shadow-lg animate-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <LayoutGrid size={18} />
                  </div>
                  <div>
                    <h3 className="ui-section-title">새 아이디어 회의실 개설</h3>
                    <p className="ui-caption">팀원들과 함께할 독립된 캔버스 룸을 생성합니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateRoomOpen(false)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="flex flex-col gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    회의실 이름 <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 2026 하반기 신규 기능 브레인스토밍"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    카테고리
                  </label>
                  <select
                    value={newRoomCategory}
                    onChange={(e) => setNewRoomCategory(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-hidden focus:border-primary transition-all font-medium"
                  >
                    <option value="브레인스토밍">브레인스토밍</option>
                    <option value="기획 회의">기획 회의</option>
                    <option value="디자인 리뷰">디자인 리뷰</option>
                    <option value="시험대비">시험대비</option>
                    <option value="코드 아키텍처">코드 아키텍처</option>
                    <option value="자유 토론">자유 토론</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    설명 (선택)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="회의의 목적이나 아젠다를 적어주세요."
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary transition-all font-medium resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateRoomOpen(false)}
                    className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    회의실 개설
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3.5 select-none" onMouseUp={handleMouseUp}>
      {/* ================= 1. 최상단 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          {/* 목록으로 돌아가기 버튼 */}
          <button
            type="button"
            onClick={() => {
              setSelectedRoomId(null);
              router.push("/canvas");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors cursor-pointer mr-1 shadow-xs"
            title="캔버스 목록으로 돌아가기"
          >
            <ArrowLeft size={14} className="text-primary" />
            <span>캔버스 목록</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="ui-page-title text-on-surface">{currentRoom.title}</h1>
              <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {currentRoom.category}
              </span>

              {/* 회의실 선택 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setIsRoomMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] font-semibold text-on-surface transition-colors cursor-pointer"
                >
                  <DoorOpen size={12} className="text-primary" />
                  <span>룸 전환</span>
                  <ChevronDown size={10} className="text-on-surface-variant" />
                </button>

                {isRoomMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[11px] font-bold text-on-surface-variant border-b border-outline-variant/60 mb-1">
                      회의실 선택 ({rooms.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {rooms.map((r) => (
                        <button
                          key={r.roomId}
                          onClick={() => {
                            setActiveRoomId(r.roomId);
                            setSelectedRoomId(r.roomId);
                            setIsRoomMenuOpen(false);
                            router.push(`/canvas?id=${r.roomId}`);
                            toast.info(`'${r.title}' 회의실로 이동했습니다.`);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            activeRoomId === r.roomId
                              ? "bg-primary text-on-primary font-bold"
                              : "hover:bg-surface-container-low text-on-surface"
                          }`}
                        >
                          <span className="truncate">{r.title}</span>
                          <span className="text-[10px] opacity-70 ml-1 shrink-0">{r.category}</span>
                        </button>
                      ))}
                    </div>
                    <div className="pt-1.5 border-t border-outline-variant/60 mt-1">
                      <button
                        onClick={() => {
                          setIsRoomMenuOpen(false);
                          setIsCreateRoomOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary cursor-pointer transition-colors"
                      >
                        <Plus size={12} />
                        <span>새 회의실 개설</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <span className="ui-page-subtitle block mt-0.5">
              피그마처럼 자유롭게 포스트잇을 붙이고, 실시간 스티커 투표 및 회의 아젠다를 관리하세요. (Ctrl + 휠로 캔버스 줌)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 회의 타이머 위젯 */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container border border-outline-variant text-on-surface">
            <Clock size={13} className="text-primary" />
            <span className="font-mono text-xs font-bold">{timerStr}</span>
            <button
              onClick={() => setIsTimerRunning((prev) => !prev)}
              className="p-1 hover:bg-surface-container-high rounded cursor-pointer text-primary"
              title={isTimerRunning ? "일시정지" : "시작"}
            >
              {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(15 * 60);
              }}
              className="p-1 hover:bg-surface-container-high rounded cursor-pointer text-on-surface-variant"
              title="15분 리셋"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />
        </div>
      </div>

      {/* ================= 2. 인터랙티브 툴바 ================= */}
      <div className="flex items-center justify-between gap-2 p-2 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-x-auto no-scrollbar scrollbar-none flex-nowrap max-w-full">
        {/* 좌측 도구 버튼들 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 포스트잇 색상 선택 칩 */}
          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-md border border-outline-variant shrink-0">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.id)}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer shrink-0 ${
                  c.id === "yellow"
                    ? "bg-amber-300"
                    : c.id === "pink"
                    ? "bg-pink-300"
                    : c.id === "green"
                    ? "bg-emerald-300"
                    : c.id === "blue"
                    ? "bg-sky-300"
                    : "bg-purple-300"
                } ${selectedColor === c.id ? "scale-125 ring-2 ring-primary" : "hover:scale-110"}`}
                title={`${c.name} 포스트잇`}
              />
            ))}
          </div>

          {/* 포스트잇 추가 버튼 */}
          <button
            onClick={handleAddSticky}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
          >
            <Plus size={13} className="shrink-0" />
            <span>포스트잇 메모지</span>
          </button>

          {/* 회의 안건 카드 추가 */}
          <button
            onClick={handleAddMeetingCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-medium ui-button transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <CheckSquare size={13} className="text-secondary shrink-0" />
            <span>회의 안건 카드</span>
          </button>

          <div className="h-4 w-px bg-outline-variant mx-1 shrink-0" />

          {/* 스티커 반응 도장 */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="ui-caption text-on-surface-variant flex items-center gap-1 pr-1 font-semibold shrink-0">
              <Smile size={12} className="shrink-0" />
              스티커:
            </span>
            {STICKER_PALETTE.map((stk) => (
              <button
                key={stk}
                onClick={() => {
                  if (activeSticker === stk) {
                    setActiveSticker(null);
                  } else {
                    setActiveSticker(stk);
                    toast.info(`'${stk}' 스티커 도장이 선택되었습니다. 원하는 메모지를 클릭하세요!`);
                  }
                }}
                className={`p-1 text-sm rounded hover:bg-surface-container transition-transform cursor-pointer shrink-0 ${
                  activeSticker === stk ? "bg-primary/20 scale-125 ring-1 ring-primary" : ""
                }`}
                title={`${stk} 도장 선택`}
              >
                {stk}
              </button>
            ))}
          </div>
        </div>

        {/* 우측 줌 & 화면 이동 도구 */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant mr-1">
            <button
              type="button"
              onClick={() => {
                setIsHandToolActive(false);
                setIsSpaceHeld(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                !isHandToolActive && !isSpaceHeld
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="선택 도구 (단축키: V)"
            >
              <Move size={12} />
              <span className="hidden sm:inline">선택 (V)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHandToolActive((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                isHandToolActive || isSpaceHeld
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="잡기 / 화면 이동 (단축키: H 또는 Space 홀드)"
            >
              <Hand size={12} />
              <span className="hidden sm:inline">잡기 (H/Space)</span>
            </button>
          </div>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
            title="축소"
          >
            <ZoomOut size={13} />
          </button>
          <span className="font-mono text-xs font-semibold px-1 text-on-surface min-w-[40px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
            title="확대"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
            title="화면 위치 및 배율 초기화"
          >
            <Maximize2 size={13} />
          </button>
          <div className="h-4 w-px bg-outline-variant mx-1" />
          <button
            onClick={handleClearBoard}
            className="p-1.5 rounded-md bg-surface-container hover:bg-error/10 hover:text-error text-on-surface-variant transition-colors cursor-pointer"
            title="캔버스 비우기"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ================= 3. 2D 캔버스 작업 영역 ================= */}
      <div
        ref={canvasRef}
        onMouseDown={(e) => {
          if (e.target === canvasRef.current || isHandToolActive || isSpaceHeld) {
            handleMouseDownCanvas(e);
          }
        }}
        onMouseMove={handleMouseMove}
        onTouchStart={(e) => {
          if (e.target === canvasRef.current || isHandToolActive) {
            handleTouchStartCanvas(e);
          }
        }}
        onTouchMove={handleTouchMoveCanvas}
        onTouchEnd={handleTouchEndCanvas}
        className={`relative w-full h-[calc(100vh-230px)] min-h-[580px] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-inner touch-none ${
          isPanning ? "cursor-grabbing" : isHandToolActive || isSpaceHeld ? "cursor-grab" : "cursor-default"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(var(--outline-variant) 1px, transparent 1px)",
          backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      >
        {/* 안내 워터마크 */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary/70">
              <StickyNote size={24} />
            </div>
            <h3 className="ui-section-title text-on-surface">캔버스가 비어 있습니다</h3>
            <p className="ui-caption text-on-surface-variant max-w-sm">
              상단의 [포스트잇 메모지 붙이기] 버튼을 눌러 아이디어를 등록하고, 마우스나 터치로 자유롭게 드래그하여 배치하세요.
            </p>
          </div>
        )}

        {/* 캔버스 아이템 렌더링 컨테이너 */}
        <div
          data-canvas-bg="true"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).getAttribute("data-canvas-bg") || isHandToolActive) {
              handleMouseDownCanvas(e);
            }
          }}
          onTouchStart={(e) => {
            if ((e.target as HTMLElement).getAttribute("data-canvas-bg") || isHandToolActive) {
              handleTouchStartCanvas(e);
            }
          }}
          className="w-full h-full relative"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: "0 0",
          }}
        >
          {items.map((item) => {
            const colorPreset =
              COLOR_PRESETS.find((c) => c.id === item.color) || COLOR_PRESETS[0];
            const isSelected = selectedItemId === item._id;

            if (item.type === "meeting_card") {
              return (
                <div
                  key={item._id}
                  onMouseDown={(e) => handleMouseDown(e, item)}
                  onTouchStart={(e) => handleTouchStartItem(e, item)}
                  onClick={() => {
                    setSelectedItemId(item._id);
                    if (activeSticker) {
                      handleAddStickerToItem(item._id, activeSticker);
                    }
                  }}
                  style={{
                    transform: `translate(${item.x}px, ${item.y}px)`,
                    width: `${item.width}px`,
                  }}
                  className={`absolute p-3 rounded-lg border-2 shadow-md bg-surface-container-low border-secondary/50 cursor-grab active:cursor-grabbing transition-shadow ${
                    draggingItemId === item._id
                      ? "shadow-2xl ring-2 ring-primary z-50 opacity-90 scale-102"
                      : isSelected
                      ? "ring-2 ring-primary z-40 shadow-lg"
                      : "z-10"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMeetingStatus(item._id);
                      }}
                      className={`ui-badge px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                        item.meetingStatus === "done"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : item.meetingStatus === "in_progress"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-surface-container text-on-surface-variant border border-outline-variant"
                      }`}
                    >
                      {item.meetingStatus === "done"
                        ? "완료"
                        : item.meetingStatus === "in_progress"
                        ? "진행중"
                        : "회의 안건"}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item._id);
                      }}
                      className="text-on-surface-variant hover:text-error p-0.5 rounded cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <textarea
                    value={item.content}
                    onChange={(e) => handleUpdateContent(item._id, e.target.value)}
                    placeholder="회의 아젠다 및 실행 방안을 작성하세요..."
                    className="w-full mt-2 h-18 bg-transparent resize-none text-xs text-on-surface outline-hidden placeholder:text-on-surface-variant/50 font-sans"
                  />

                  {/* 하단 메타 */}
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/50 mt-1">
                    <span className="text-[10px] text-on-surface-variant">{item.authorName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(item._id);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-80 cursor-pointer"
                    >
                      <ThumbsUp size={11} />
                      <span>{item.votes || 0}</span>
                    </button>
                  </div>
                </div>
              );
            }

            // 기본 포스트잇 메모지
            return (
              <div
                key={item._id}
                onMouseDown={(e) => handleMouseDown(e, item)}
                onTouchStart={(e) => handleTouchStartItem(e, item)}
                onClick={() => {
                  setSelectedItemId(item._id);
                  if (activeSticker) {
                    handleAddStickerToItem(item._id, activeSticker);
                  }
                }}
                style={{
                  transform: `translate(${item.x}px, ${item.y}px)`,
                  width: `${item.width}px`,
                }}
                className={`absolute p-3 rounded-lg border shadow-md ${colorPreset.bg} cursor-grab active:cursor-grabbing transition-shadow ${
                  draggingItemId === item._id
                    ? "shadow-2xl ring-2 ring-primary z-50 opacity-95 scale-102"
                    : isSelected
                    ? "ring-2 ring-primary z-40 shadow-lg"
                    : "z-10"
                }`}
              >
                {/* 상단 핀 & 작성자 & 삭제 */}
                <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
                  <span className="text-[11px] font-bold opacity-80">{item.authorName}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(item._id);
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-bold hover:bg-black/10 cursor-pointer"
                      title="좋아요 +1"
                    >
                      <ThumbsUp size={10} />
                      <span>{item.votes || 0}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item._id);
                      }}
                      className="p-1 text-black/50 dark:text-white/50 hover:text-red-500 rounded cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* 메모 본문 */}
                <textarea
                  value={item.content}
                  onChange={(e) => handleUpdateContent(item._id, e.target.value)}
                  placeholder="아이디어, 메모, 질문을 입력하세요..."
                  className="w-full mt-2 h-24 bg-transparent resize-none text-xs outline-hidden placeholder:opacity-50 font-sans leading-relaxed"
                />

                {/* 하단 스티커 반응 뱃지들 */}
                {item.stickers && item.stickers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-black/10 dark:border-white/10 mt-1">
                    {item.stickers.map((stk, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-1 py-0.5 rounded bg-black/5 dark:bg-white/10"
                      >
                        {stk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 📱 모바일/선택 아이템 하단 플로팅 액션 독 */}
        {selectedItemId && (() => {
          const selectedItem = items.find((i) => i._id === selectedItemId);
          if (!selectedItem) return null;
          return (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-md animate-in slide-in-from-bottom-2 duration-150 select-none"
            >
              <span className="text-[11px] font-bold text-on-surface truncate max-w-[120px] px-1">
                {selectedItem.type === "meeting_card" ? "회의 안건" : "메모지"}
              </span>
              <div className="h-3.5 w-px bg-outline-variant" />
              {selectedItem.type === "meeting_card" && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handleToggleMeetingStatus(selectedItem._id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-on-surface cursor-pointer"
                >
                  상태 변경
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => handleVote(selectedItem._id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold cursor-pointer"
              >
                <ThumbsUp size={11} />
                <span>{selectedItem.votes || 0}</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  handleDeleteItem(selectedItem._id);
                  setSelectedItemId(null);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error text-[11px] font-bold cursor-pointer"
              >
                <Trash2 size={11} />
                <span>삭제</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSelectedItemId(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer text-[11px]"
                title="선택 해제"
              >
                ✕
              </button>
            </div>
          );
        })()}

        {/* PC 단축키 안내 팁 */}
        <div className="absolute left-4 bottom-3 hidden md:flex bg-surface-container-lowest border border-outline-variant px-3 py-1.5 rounded-xl ui-caption text-on-surface-variant items-center gap-2 shadow-xs pointer-events-none">
          <span><strong>V</strong>: 선택</span>
          <span>•</span>
          <span><strong>H / Space 홀드</strong>: 잡기</span>
          <span>•</span>
          <span><strong>N/S</strong>: 포스트잇</span>
          <span>•</span>
          <span><strong>M</strong>: 회의안건</span>
          <span>•</span>
          <span><strong>Del</strong>: 삭제</span>
        </div>
      </div>

      {/* 회의실 개설 모달 */}
      {isCreateRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md p-6 shadow-lg animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h3 className="ui-section-title">새 아이디어 회의실 개설</h3>
                  <p className="ui-caption">팀원들과 함께할 독립된 캔버스 룸을 생성합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateRoomOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  회의실 이름 <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 2026 하반기 신규 기능 브레인스토밍"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  required
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  카테고리
                </label>
                <select
                  value={newRoomCategory}
                  onChange={(e) => setNewRoomCategory(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-hidden focus:border-primary transition-all font-medium"
                >
                  {categories
                    .filter((c) => c !== "전체")
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  설명 (선택)
                </label>
                <textarea
                  rows={2}
                  placeholder="회의의 목적이나 아젠다를 적어주세요."
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary transition-all font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRoomOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  회의실 개설
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
