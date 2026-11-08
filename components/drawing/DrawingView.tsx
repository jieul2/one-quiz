"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  PenTool,
  Highlighter,
  Eraser,
  Minus,
  ArrowRight,
  Square,
  Circle,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Copy,
  FolderOpen,
  Plus,
  Check,
  X,
  Palette,
  FileImage,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";
import { alertModal } from "@/lib/alert";
import { useMounted } from "@/lib/hooks/useMounted";

export type DrawTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "text";

export type BgPattern = "blank" | "grid" | "dots" | "ruled" | "dark";

export interface Point {
  x: number;
  y: number;
}

export interface DrawElement {
  id: string;
  type: DrawTool;
  points?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  color: string;
  strokeWidth: number;
  opacity: number;
  filled?: boolean;
  text?: string;
  fontSize?: number;
}

export interface SavedDrawingMeta {
  _id: string;
  title: string;
  thumbnail?: string;
  backgroundPattern?: BgPattern;
  backgroundColor?: string;
  updatedAt: string;
}

const PRESET_COLORS = [
  { id: "black", label: "블랙", hex: "#1e293b" },
  { id: "slate", label: "그레이", hex: "#64748b" },
  { id: "white", label: "화이트", hex: "#ffffff" },
  { id: "red", label: "레드", hex: "#ef4444" },
  { id: "orange", label: "오렌지", hex: "#f97316" },
  { id: "amber", label: "옐로우", hex: "#f59e0b" },
  { id: "green", label: "에메랄드", hex: "#10b981" },
  { id: "teal", label: "민트", hex: "#14b8a6" },
  { id: "blue", label: "블루", hex: "#3b82f6" },
  { id: "indigo", label: "인디고", hex: "#6366f1" },
  { id: "violet", label: "퍼플", hex: "#8b5cf6" },
  { id: "pink", label: "핑크", hex: "#ec4899" },
];

const STROKE_WIDTHS = [
  { label: "얇게", value: 2 },
  { label: "보통", value: 4 },
  { label: "굵게", value: 8 },
  { label: "아주 굵게", value: 16 },
  { label: "마커", value: 28 },
];

const BG_PATTERNS: { id: BgPattern; label: string; desc: string }[] = [
  { id: "blank", label: "클린 화이트", desc: "순백색 캔버스" },
  { id: "grid", label: "모눈종이 격자", desc: "와이어프레임 & 설계" },
  { id: "dots", label: "점선 도트", desc: "불렛저널 스타일" },
  { id: "ruled", label: "줄노트", desc: "필기 & 아이디어 노트" },
  { id: "dark", label: "블랙보드 칠판", desc: "초크 다크 모드" },
];

export function DrawingView() {
  const mounted = useMounted();
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 1. 드로잉 핵심 상태 (Lazy 초기화로 SSR 정합성 및 Cascading Render 방지)
  const [currentId, setCurrentId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("onequiz_drawing_autosave");
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.id || null;
      }
    } catch {}
    return null;
  });

  const [title, setTitle] = useState(() => {
    if (typeof window === "undefined") return "새로운 스케치";
    try {
      const cached = localStorage.getItem("onequiz_drawing_autosave");
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.title || "새로운 스케치";
      }
    } catch {}
    return "새로운 스케치";
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const [elements, setElements] = useState<DrawElement[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("onequiz_drawing_autosave");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.elements)) return parsed.elements;
      }
    } catch {}
    return [];
  });
  const [undoStack, setUndoStack] = useState<DrawElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawElement[][]>([]);

  // 2. 툴바 & 스타일 상태
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState("#1e293b");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isFilled, setIsFilled] = useState(false);
  const [bgPattern, setBgPattern] = useState<BgPattern>(() => {
    if (typeof window === "undefined") return "blank";
    try {
      const cached = localStorage.getItem("onequiz_drawing_autosave");
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.backgroundPattern || "blank";
      }
    } catch {}
    return "blank";
  });
  const [customColor, setCustomColor] = useState("#1e293b");

  // 3. 인터랙션 상태
  const [isDrawing, setIsDrawing] = useState(false);
  const currentElementRef = useRef<DrawElement | null>(null);

  // 텍스트 입력 모달 상태
  const [textModal, setTextModal] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    text: string;
    fontSize: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    text: "",
    fontSize: 20,
  });

  // 4. 저장 및 자동 동기화 인디케이터
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState("최신");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 5. 갤러리 모달 상태
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedDrawingMeta[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  // 6. 다운로드 드롭다운 상태
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // ==========================================
  // A. 캔버스 렌더링 엔진 (Vector-based)
  // ==========================================
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // 1. 캔버스 초기화
    ctx.clearRect(0, 0, width, height);

    // 2. 배경 채우기
    if (bgPattern === "dark") {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    // 3. 배경 패턴 렌더링
    if (bgPattern === "grid") {
      ctx.strokeStyle = "rgba(100, 116, 139, 0.15)";
      ctx.lineWidth = 1;
      const step = 28;
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (bgPattern === "dots") {
      ctx.fillStyle = "rgba(100, 116, 139, 0.3)";
      const step = 24;
      for (let x = step / 2; x < width; x += step) {
        for (let y = step / 2; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgPattern === "ruled") {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
      ctx.lineWidth = 1;
      const step = 32;
      ctx.beginPath();
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    // 4. 개별 요소 렌더링 함수
    const drawSingleElement = (el: DrawElement) => {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = el.opacity;

      if (el.type === "pen" && el.points && el.points.length > 0) {
        ctx.beginPath();
        if (el.points.length === 1) {
          ctx.arc(el.points[0].x, el.points[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length - 1; i++) {
            const xc = (el.points[i].x + el.points[i + 1].x) / 2;
            const yc = (el.points[i].y + el.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
          }
          ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
          ctx.stroke();
        }
      } else if (el.type === "highlighter" && el.points && el.points.length > 0) {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = el.strokeWidth * 2.5;
        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === "eraser" && el.points && el.points.length > 0) {
        ctx.strokeStyle = bgPattern === "dark" ? "#1e293b" : "#ffffff";
        ctx.lineWidth = el.strokeWidth * 3.5;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === "line" && el.startPoint && el.endPoint) {
        ctx.beginPath();
        ctx.moveTo(el.startPoint.x, el.startPoint.y);
        ctx.lineTo(el.endPoint.x, el.endPoint.y);
        ctx.stroke();
      } else if (el.type === "arrow" && el.startPoint && el.endPoint) {
        const { x: x1, y: y1 } = el.startPoint;
        const { x: x2, y: y2 } = el.endPoint;
        const headLength = Math.max(12, el.strokeWidth * 3);
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLength * Math.cos(angle - Math.PI / 6),
          y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x2 - headLength * Math.cos(angle + Math.PI / 6),
          y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (el.type === "rect" && el.startPoint && el.endPoint) {
        const rx = Math.min(el.startPoint.x, el.endPoint.x);
        const ry = Math.min(el.startPoint.y, el.endPoint.y);
        const rw = Math.abs(el.endPoint.x - el.startPoint.x);
        const rh = Math.abs(el.endPoint.y - el.startPoint.y);

        if (el.filled) {
          ctx.fillStyle = el.color;
          ctx.fillRect(rx, ry, rw, rh);
        }
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (el.type === "circle" && el.startPoint && el.endPoint) {
        const cx = (el.startPoint.x + el.endPoint.x) / 2;
        const cy = (el.startPoint.y + el.endPoint.y) / 2;
        const rx = Math.abs(el.endPoint.x - el.startPoint.x) / 2;
        const ry = Math.abs(el.endPoint.y - el.startPoint.y) / 2;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (el.filled) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (el.type === "text" && el.startPoint && el.text) {
        const size = el.fontSize || 20;
        ctx.font = `600 ${size}px Pretendard, system-ui, sans-serif`;
        ctx.fillStyle = el.color;
        ctx.fillText(el.text, el.startPoint.x, el.startPoint.y);
      }

      ctx.restore();
    };

    // 5. 완료된 요소들 렌더링
    elements.forEach(drawSingleElement);

    // 6. 현재 드래그 중인 임시 요소 렌더링
    if (currentElementRef.current) {
      drawSingleElement(currentElementRef.current);
    }
  }, [elements, bgPattern]);

  // ==========================================
  // B. 캔버스 리사이즈 & Retina 고해상도 동기화
  // ==========================================
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // ==========================================
  // C. 자동 저장 (Debounced Auto-Save)
  // ==========================================
  const triggerAutoSave = useCallback(
    (newElements: DrawElement[], currentTitle: string, currentPattern: BgPattern) => {
      setSaveStatus("saving");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          // 썸네일 데이터 생성
          const canvas = canvasRef.current;
          let thumbnail = "";
          if (canvas) {
            thumbnail = canvas.toDataURL("image/png", 0.3);
          }

          // 1. 로컬 스토리지에 캐시 백업
          const localPayload = {
            id: currentId,
            title: currentTitle,
            elements: newElements,
            backgroundPattern: currentPattern,
            thumbnail,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem("onequiz_drawing_autosave", JSON.stringify(localPayload));

          // 2. 로그인 상태이면 DB 서버 동기화
          if (session?.user?.email) {
            const res = await fetch("/api/drawing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: currentId || undefined,
                title: currentTitle,
                elements: newElements,
                backgroundPattern: currentPattern,
                thumbnail,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data?.drawing?._id && !currentId) {
                setCurrentId(data.drawing._id);
              }
            }
          }

          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes()
          ).padStart(2, "0")}`;
          setSavedTimeStr(timeStr);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      }, 500);
    },
    [currentId, session]
  );


  // ==========================================
  // D. 마우스 / 터치 포인터 인터랙션
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Rule 50: 드래그 시 브라우저 텍스트 블록 선택 잔상 원천 차단
    window.getSelection()?.removeAllRanges();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 텍스트 도구일 때
    if (tool === "text") {
      setTextModal({
        isOpen: true,
        x,
        y,
        text: "",
        fontSize: strokeWidth * 4 + 12,
      });
      return;
    }

    setIsDrawing(true);
    canvas.setPointerCapture(e.pointerId);

    const newId = `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      currentElementRef.current = {
        id: newId,
        type: tool,
        points: [{ x, y }],
        color: tool === "eraser" ? (bgPattern === "dark" ? "#1e293b" : "#ffffff") : color,
        strokeWidth,
        opacity: tool === "highlighter" ? 0.4 : 1,
      };
    } else {
      // 도형 도구 (line, arrow, rect, circle)
      currentElementRef.current = {
        id: newId,
        type: tool,
        startPoint: { x, y },
        endPoint: { x, y },
        color,
        strokeWidth,
        opacity: 1,
        filled: isFilled,
      };
    }

    renderCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElementRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const el = currentElementRef.current;

    if (el.type === "pen" || el.type === "highlighter" || el.type === "eraser") {
      if (el.points) {
        el.points.push({ x, y });
      }
    } else {
      el.endPoint = { x, y };
    }

    renderCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (currentElementRef.current) {
      const finishedEl = { ...currentElementRef.current };
      currentElementRef.current = null;

      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);

      const nextElements = [...elements, finishedEl];
      setElements(nextElements);
      triggerAutoSave(nextElements, title, bgPattern);
    }
  };

  // 텍스트 추가 확인
  const handleConfirmText = () => {
    if (!textModal.text.trim()) {
      setTextModal((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    const newEl: DrawElement = {
      id: `elem_txt_${Date.now()}`,
      type: "text",
      startPoint: { x: textModal.x, y: textModal.y },
      text: textModal.text,
      fontSize: textModal.fontSize,
      color,
      strokeWidth: 1,
      opacity: 1,
    };

    setUndoStack((prev) => [...prev, elements]);
    setRedoStack([]);

    const nextElements = [...elements, newEl];
    setElements(nextElements);
    triggerAutoSave(nextElements, title, bgPattern);
    setTextModal((prev) => ({ ...prev, isOpen: false, text: "" }));
  };

  // ==========================================
  // E. 실행 취소 / 다시 실행
  // ==========================================
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, stack.length - 1));
    setRedoStack((stack) => [...stack, elements]);
    setElements(prev);
    triggerAutoSave(prev, title, bgPattern);
  }, [undoStack, elements, title, bgPattern, triggerAutoSave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, stack.length - 1));
    setUndoStack((stack) => [...stack, elements]);
    setElements(next);
    triggerAutoSave(next, title, bgPattern);
  }, [redoStack, elements, title, bgPattern, triggerAutoSave]);

  // 전체 지우기
  const handleClearCanvas = async () => {
    if (elements.length === 0) return;
    const confirmed = await alertModal.confirm({
      title: "캔버스 초기화",
      message: "캔버스의 모든 그림을 지우시겠습니까? (되돌리기로 복원 가능)",
      confirmText: "초기화",
      cancelText: "취소",
      isDestructive: true,
    });
    if (confirmed) {
      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);
      setElements([]);
      triggerAutoSave([], title, bgPattern);
      toast.success("캔버스를 전체 초기화했습니다.");
    }
  };

  // ==========================================
  // F. 단축키 (Keyboard Shortcuts)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === "p") {
        setTool("pen");
      } else if (e.key.toLowerCase() === "h") {
        setTool("highlighter");
      } else if (e.key.toLowerCase() === "e") {
        setTool("eraser");
      } else if (e.key.toLowerCase() === "l") {
        setTool("line");
      } else if (e.key.toLowerCase() === "r") {
        setTool("rect");
      } else if (e.key.toLowerCase() === "c") {
        setTool("circle");
      } else if (e.key.toLowerCase() === "t") {
        setTool("text");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ==========================================
  // G. 이미지 다운로드 & 클립보드 복사
  // ==========================================
  const handleDownload = (format: "png" | "jpeg") => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (format === "png") {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title.replace(/\s+/g, "_")}.png`;
      a.click();
      toast.success("PNG 이미지 다운로드가 완료되었습니다.");
    } else {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title.replace(/\s+/g, "_")}.jpg`;
      a.click();
      toast.success("JPEG 이미지 다운로드가 완료되었습니다.");
    }
    setIsDownloadOpen(false);
  };

  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("이미지 데이터 변환 실패");
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("스케치 이미지가 클립보드에 복사되었습니다!");
      });
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  };

  // ==========================================
  // H. 갤러리 불러오기 및 새 스케치
  // ==========================================
  const loadGalleryList = async () => {
    setIsGalleryOpen(true);
    setIsLoadingGallery(true);
    try {
      const res = await fetch("/api/drawing");
      if (res.ok) {
        const data = await res.json();
        setSavedList(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error("보관함 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleOpenSavedDrawing = async (item: SavedDrawingMeta) => {
    try {
      const res = await fetch(`/api/drawing?id=${item._id}`);
      if (!res.ok) throw new Error("그림 불러오기 실패");
      const doc = await res.json();

      setCurrentId(doc._id);
      setTitle(doc.title || "무제");
      setElements(doc.elements || []);
      setBgPattern(doc.backgroundPattern || "blank");
      setUndoStack([]);
      setRedoStack([]);
      setIsGalleryOpen(false);
      toast.success(`'${doc.title}' 스케치를 불러왔습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오기 실패");
    }
  };

  const handleDeleteSavedDrawing = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await alertModal.confirm({
      title: "스케치 삭제",
      message: "이 스케치를 보관함에서 영구 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/drawing?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedList((list) => list.filter((i) => i._id !== id));
        if (currentId === id) {
          setCurrentId(null);
        }
        toast.success("스케치가 삭제되었습니다.");
      }
    } catch {
      toast.error("삭제 실패");
    }
  };

  const handleNewDrawing = async () => {
    if (elements.length > 0) {
      const confirmed = await alertModal.confirm({
        title: "새 스케치 시작",
        message: "새 스케치를 시작하시겠습니까? (현재 작업은 자동 저장됨)",
        confirmText: "새로 만들기",
        cancelText: "취소",
      });
      if (!confirmed) return;
    }
    setCurrentId(null);
    setTitle("새로운 스케치");
    setElements([]);
    setUndoStack([]);
    setRedoStack([]);
    setBgPattern("blank");
    toast.success("새 스케치 캔버스가 준비되었습니다.");
  };

  return (
    <div className="w-full space-y-4 pb-12">
      {/* ================= 1. 최상단 플랫 헤더 (Rule 52 & Rule 51 준수) ================= */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 타이틀 및 저장 상태 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <PenTool size={20} />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    autoFocus
                    className="ui-section-title px-2 py-0.5 rounded-lg border border-primary bg-surface-container-low text-on-surface focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setTitle(tempTitle.trim() || "무제 스케치");
                        setIsEditingTitle(false);
                        triggerAutoSave(elements, tempTitle.trim() || "무제 스케치", bgPattern);
                      } else if (e.key === "Escape") {
                        setTempTitle(title);
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      setTitle(tempTitle.trim() || "무제 스케치");
                      setIsEditingTitle(false);
                      triggerAutoSave(elements, tempTitle.trim() || "무제 스케치", bgPattern);
                    }}
                    className="p-1 rounded text-primary hover:bg-primary/10"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTempTitle(title);
                    setIsEditingTitle(true);
                  }}
                  className="ui-page-title text-on-surface hover:text-primary transition-colors text-left flex items-center gap-2 group"
                  title="클릭하여 제목 수정"
                >
                  <span>{mounted ? title : "새로운 스케치"}</span>
                  <span className="text-xs text-on-surface-variant font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                    (수정)
                  </span>
                </button>
              )}
              <span className="ui-badge bg-primary/10 text-primary border border-primary/20 font-mono px-2 py-0.5 rounded-full">
                Vector Canvas
              </span>
            </div>
            <p className="ui-caption text-on-surface-variant">
              자유로운 아이디어 스케치, 다이어그램, 수식 필기 및 고해상도 이미지 내보내기 지원
            </p>
          </div>
        </div>

        {/* 액션 버튼군 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Rule 51: 너비 고정 저장 인디케이터 (w-[118px]) */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          <button
            onClick={loadGalleryList}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
          >
            <FolderOpen size={15} />
            <span>보관함</span>
          </button>

          <button
            onClick={handleNewDrawing}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
          >
            <Plus size={15} />
            <span>새 스케치</span>
          </button>

          <button
            onClick={handleCopyClipboard}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
            title="클립보드에 이미지 복사"
          >
            <Copy size={15} />
            <span className="hidden sm:inline">복사</span>
          </button>

          {/* 다운로드 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setIsDownloadOpen((prev) => !prev)}
              className="ui-button px-3.5 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 flex items-center gap-1.5 font-medium transition-all shadow-xs"
            >
              <Download size={15} />
              <span>내보내기</span>
              <ChevronDown size={13} />
            </button>

            {isDownloadOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-1.5 z-40 space-y-1 animate-in fade-in-50 zoom-in-95">
                <button
                  onClick={() => handleDownload("png")}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2"
                >
                  <FileImage size={14} className="text-primary" />
                  <span>PNG 다운로드</span>
                </button>
                <button
                  onClick={() => handleDownload("jpeg")}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2"
                >
                  <FileImage size={14} className="text-amber-500" />
                  <span>JPEG 다운로드</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. 인터랙티브 도구 툴바 ================= */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* 도구 모음 */}
        <div className="flex flex-wrap items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/60">
          {[
            { id: "pen", label: "펜 (P)", icon: PenTool },
            { id: "highlighter", label: "형광펜 (H)", icon: Highlighter },
            { id: "eraser", label: "지우개 (E)", icon: Eraser },
            { id: "line", label: "직선 (L)", icon: Minus },
            { id: "arrow", label: "화살표", icon: ArrowRight },
            { id: "rect", label: "사각형 (R)", icon: Square },
            { id: "circle", label: "원 (C)", icon: Circle },
            { id: "text", label: "텍스트 (T)", icon: Type },
          ].map((item) => {
            const Icon = item.icon;
            const active = tool === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTool(item.id as DrawTool)}
                className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-medium ${
                  active
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
                title={item.label}
              >
                <Icon size={16} />
                <span className="hidden xl:inline">{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* 굵기 선택 */}
        <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl border border-outline-variant/60">
          <span className="text-[11px] text-on-surface-variant px-1.5 hidden sm:inline">굵기</span>
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.value}
              onClick={() => setStrokeWidth(sw.value)}
              className={`px-2 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                strokeWidth === sw.value
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
              title={`${sw.label} (${sw.value}px)`}
            >
              <span
                className="rounded-full bg-current inline-block"
                style={{ width: Math.min(10, sw.value / 2 + 3), height: Math.min(10, sw.value / 2 + 3) }}
              />
              <span className="hidden md:inline">{sw.value}px</span>
            </button>
          ))}
        </div>

        {/* 도형 채우기 토글 (사각형/원일 때만 활성화) */}
        {(tool === "rect" || tool === "circle") && (
          <button
            onClick={() => setIsFilled((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
              isFilled
                ? "bg-primary/10 border-primary text-primary"
                : "border-outline-variant hover:bg-surface-container-high text-on-surface-variant"
            }`}
          >
            <span>도형 내부 채우기</span>
            <span
              className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[10px] ${
                isFilled ? "bg-primary text-on-primary" : "border border-outline-variant"
              }`}
            >
              {isFilled && "✓"}
            </span>
          </button>
        )}

        {/* 컬러 팔레트 */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/60">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setColor(c.hex);
                setCustomColor(c.hex);
              }}
              className={`w-6 h-6 rounded-lg transition-transform border border-black/15 dark:border-white/20 relative flex items-center justify-center ${
                color === c.hex ? "scale-115 ring-2 ring-primary ring-offset-1" : "hover:scale-105"
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.label}
            >
              {color === c.hex && (
                <span
                  className={`text-[10px] font-bold ${
                    c.hex === "#ffffff" ? "text-slate-800" : "text-white"
                  }`}
                >
                  ✓
                </span>
              )}
            </button>
          ))}

          {/* 커스텀 컬러 피커 */}
          <label className="relative cursor-pointer ml-1 w-6 h-6 rounded-lg border border-dashed border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <Palette size={13} className="text-on-surface-variant" />
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setColor(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="커스텀 색상 선택"
            />
          </label>
        </div>

        {/* 배경 패턴 & 실행 취소 / 다시 실행 */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* 배경 스타일 셀렉터 */}
          <select
            value={bgPattern}
            onChange={(e) => {
              const val = e.target.value as BgPattern;
              setBgPattern(val);
              triggerAutoSave(elements, title, val);
            }}
            className="text-xs bg-surface-container-low border border-outline-variant text-on-surface rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            title="캔버스 배경 스타일"
          >
            {BG_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {/* 실행 취소 / 다시 실행 버튼 */}
          <div className="flex items-center bg-surface-container-low border border-outline-variant/60 rounded-xl p-0.5">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="다시 실행 (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <button
            onClick={handleClearCanvas}
            className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 border border-outline-variant/60 transition-colors"
            title="캔버스 전체 지우기"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ================= 3. 메인 인터랙티브 캔버스 작업 영역 (Rule 52: Full Width) ================= */}
      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-235px)] min-h-[580px] rounded-2xl border border-outline-variant shadow-sm overflow-hidden relative select-none bg-surface-container-lowest"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`w-full h-full block ${
            tool === "eraser"
              ? "cursor-crosshair"
              : tool === "text"
              ? "cursor-text"
              : "cursor-crosshair"
          }`}
          style={{ touchAction: "none" }}
        />

        {/* 좌측 하단 키보드 단축키 가이드 힌트 칩 */}
        <div className="absolute left-3 bottom-3 hidden lg:flex items-center gap-2 bg-surface-container-lowest/80 backdrop-blur-xs border border-outline-variant/60 rounded-xl px-3 py-1.5 text-[11px] text-on-surface-variant pointer-events-none shadow-xs">
          <span className="font-semibold text-on-surface">단축키:</span>
          <span>펜 P</span> · <span>지우개 E</span> · <span>직선 L</span> · <span>사각형 R</span> ·{" "}
          <span>원 C</span> · <span>텍스트 T</span> · <span>실행취소 Ctrl+Z</span>
        </div>

        {/* 우측 하단 요소 개수 뱃지 */}
        <div className="absolute right-3 bottom-3 bg-surface-container-lowest/80 backdrop-blur-xs border border-outline-variant/60 rounded-xl px-2.5 py-1 text-[11px] font-mono text-on-surface-variant pointer-events-none shadow-xs">
          오브젝트 {mounted ? elements.length : 0}개
        </div>
      </div>

      {/* ================= 4. 모달: 텍스트 스탬프 입력 ================= */}
      {textModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={18} className="text-primary" />
                <h3 className="ui-card-title text-on-surface font-bold">텍스트 스탬프 추가</h3>
              </div>
              <button
                onClick={() => setTextModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={textModal.text}
                onChange={(e) => setTextModal((prev) => ({ ...prev, text: e.target.value }))}
                autoFocus
                placeholder="캔버스에 새길 문구를 입력하세요..."
                className="w-full px-3 py-2 text-sm rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmText();
                  if (e.key === "Escape") setTextModal((prev) => ({ ...prev, isOpen: false }));
                }}
              />

              <div className="flex items-center justify-between gap-2">
                <span className="ui-caption text-on-surface-variant">글자 크기</span>
                <div className="flex items-center gap-1.5">
                  {[16, 20, 28, 36].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTextModal((prev) => ({ ...prev, fontSize: s }))}
                      className={`px-2 py-1 rounded-lg text-xs font-mono ${
                        textModal.fontSize === s
                          ? "bg-primary text-on-primary font-bold"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTextModal((prev) => ({ ...prev, isOpen: false }))}
                className="ui-button px-3.5 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-xs text-on-surface"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmText}
                className="ui-button px-4 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold"
              >
                스탬프 삽입
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. 모달: 스케치 보관함 (Gallery) ================= */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FolderOpen size={18} />
                </div>
                <div>
                  <h3 className="ui-card-title text-on-surface font-bold">내 스케치 보관함</h3>
                  <p className="ui-caption text-on-surface-variant">
                    저장된 드로잉 목록을 열람하거나 불러올 수 있습니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGalleryOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {isLoadingGallery ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="ui-caption">저장된 그림 목록을 불러오는 중...</span>
                </div>
              ) : savedList.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-outline-variant rounded-2xl space-y-2">
                  <PenTool size={32} className="mx-auto text-on-surface-variant/60" />
                  <div className="ui-card-title text-on-surface font-semibold">
                    저장된 스케치가 없습니다
                  </div>
                  <div className="ui-caption text-on-surface-variant">
                    캔버스에서 자유롭게 그림을 그린 뒤 자동 저장해 보세요.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {savedList.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => handleOpenSavedDrawing(item)}
                      className={`group bg-surface-container-low border rounded-xl overflow-hidden hover:border-primary cursor-pointer transition-all flex flex-col justify-between ${
                        currentId === item._id
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-outline-variant"
                      }`}
                    >
                      {/* 썸네일 미리보기 */}
                      <div className="w-full h-36 bg-surface-container-high/40 flex items-center justify-center overflow-hidden relative">
                        {item.thumbnail ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <PenTool size={28} className="text-on-surface-variant/40" />
                        )}

                        <button
                          onClick={(e) => handleDeleteSavedDrawing(e, item._id)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
                          title="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* 정보 영역 */}
                      <div className="p-3 space-y-1">
                        <div className="ui-card-title text-on-surface font-semibold truncate">
                          {item.title}
                        </div>
                        <div className="ui-caption text-on-surface-variant font-mono text-[11px]">
                          {item.updatedAt
                            ? new Date(item.updatedAt).toLocaleDateString()
                            : "최근"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-container-low/50 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsGalleryOpen(false);
                  handleNewDrawing();
                }}
                className="ui-button px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>+ 새 스케치 시작하기</span>
              </button>

              <button
                onClick={() => setIsGalleryOpen(false)}
                className="ui-button px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high text-xs text-on-surface"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
