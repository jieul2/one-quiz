"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Type, X } from "lucide-react";
import { SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";
import { alertModal } from "@/lib/alert";
import { useMounted } from "@/lib/hooks/useMounted";
import {
  DrawTool,
  BgPattern,
  Point,
  DrawElement,
  SavedDrawingMeta,
} from "./types";
import { DrawingGallery } from "./DrawingGallery";
import { DrawingHeader } from "./DrawingHeader";
import { DrawingToolbar } from "./DrawingToolbar";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export function DrawingView() {
  const mounted = useMounted();
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 1. 드로잉 핵심 상태
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState("새로운 스케치");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("새로운 스케치");

  const [elements, setElements] = useState<DrawElement[]>([]);
  const [undoStack, setUndoStack] = useState<DrawElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawElement[][]>([]);

  // 2. 툴바 & 스타일 상태
  const [tool, setTool] = useState<DrawTool>("pen");
  const prevToolRef = useRef<DrawTool>("pen");
  const [color, setColor] = useState("#1e293b");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isFilled, setIsFilled] = useState(false);
  const [bgPattern, setBgPattern] = useState<BgPattern>("blank");
  const [customColor, setCustomColor] = useState("#1e293b");

  // 0. URL 쿼리 파라미터(?id=...) 기반 라우팅 지원 (프로젝트 로드맵 표준)
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const [drawingSearchQuery, setDrawingSearchQuery] = useState("");

  // 사용자 계정 격리 스토리지 키 생성
  const userEmail = session?.user?.email;
  const getStorageKey = useCallback((email?: string | null) => {
    return email ? `onequiz_drawing_autosave_${email}` : "onequiz_drawing_autosave_guest";
  }, []);

  // 카드형 저장 및 일기 추가 비동기 상태
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isAddingToDiary, setIsAddingToDiary] = useState(false);

  // 1. 보관함 스케치 목록 로드
  const fetchDrawingList = useCallback(async () => {
    if (!userEmail) return [];
    try {
      const res = await fetch("/api/drawing");
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setSavedList(list);
          return list;
        }
      }
    } catch (e) {
      console.error("Failed to load drawings:", e);
    }
    return [];
  }, [userEmail]);

  useEffect(() => {
    if (!mounted || !userEmail) return;
    fetchDrawingList();
  }, [mounted, userEmail, fetchDrawingList]);

  // 2. 쿼리 파라미터(?id=...) 변경 시 해당 스케치 로드
  useEffect(() => {
    if (!mounted || !queryId) return;

    if (queryId === "new") {
      setCurrentId(null);
      setTitle("새로운 스케치");
      setTempTitle("새로운 스케치");
      setElements([]);
      setUndoStack([]);
      setRedoStack([]);
      setBgPattern("blank");
      return;
    }

    async function loadDrawing(id: string) {
      try {
        const res = await fetch(`/api/drawing?id=${id}`);
        if (res.ok) {
          const doc = await res.json();
          setCurrentId(doc._id);
          setTitle(doc.title || "새로운 스케치");
          setTempTitle(doc.title || "새로운 스케치");
          setElements(Array.isArray(doc.elements) ? doc.elements : []);
          setBgPattern(doc.backgroundPattern || "blank");
          setUndoStack([]);
          setRedoStack([]);
        }
      } catch (e) {
        console.error("Failed to load drawing:", e);
      }
    }

    loadDrawing(queryId);
  }, [mounted, queryId]);

  // 3. Ctrl + 마우스 휠 축소/확대 지원 (브라우저 기본 줌 방지)
  useEffect(() => {
    if (!queryId) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoomLevel((z) => Math.min(3.0, Math.max(0.3, Number((z + delta).toFixed(2)))));
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [queryId]);

  // 3. 인터랙션 상태
  const [isDrawing, setIsDrawing] = useState(false);
  const currentElementRef = useRef<DrawElement | null>(null);

  // 3-1. 화면 이동(패닝) & 줌 상태
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({
    x: 0,
    y: 0,
    initialPanX: 0,
    initialPanY: 0,
  });
  const pinchDistRef = useRef<number | null>(null);

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

    // 5. 화면 패닝 및 줌 변환 적용 후 요소 렌더링
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    elements.forEach(drawSingleElement);

    // 6. 현재 드래그 중인 임시 요소 렌더링
    if (currentElementRef.current) {
      drawSingleElement(currentElementRef.current);
    }
    ctx.restore();
  }, [elements, bgPattern, panOffset, zoomLevel]);

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

          // 1. 해당 계정 전용 로컬 스토리지에 캐시 백업
          const localPayload = {
            id: currentId,
            title: currentTitle,
            elements: newElements,
            backgroundPattern: currentPattern,
            thumbnail,
            updatedAt: new Date().toISOString(),
          };
          const storageKey = getStorageKey(userEmail);
          localStorage.setItem(storageKey, JSON.stringify(localPayload));

          // 2. 로그인 상태이면 DB 서버 동기화
          if (userEmail) {
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
    [currentId, userEmail, getStorageKey]
  );


  // ==========================================
  // D. 마우스 / 터치 포인터 인터랙션 (화면 이동 & 그리기)
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Rule 50: 드래그 시 브라우저 텍스트 블록 선택 잔상 원천 차단
    window.getSelection()?.removeAllRanges();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 화면 이동(핸드) 모드일 때
    if (tool === "hand") {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left - panOffset.x) / zoomLevel);
    const y = Math.round((e.clientY - rect.top - panOffset.y) / zoomLevel);

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
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.initialPanX + dx,
        y: panStartRef.current.initialPanY + dy,
      });
      return;
    }

    if (!isDrawing || !currentElementRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left - panOffset.x) / zoomLevel);
    const y = Math.round((e.clientY - rect.top - panOffset.y) / zoomLevel);

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
    if (isPanningRef.current) {
      isPanningRef.current = false;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      return;
    }

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

  // 모바일 2핑거 핀치 줌 & 패닝 제스처 핸들러
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      setIsDrawing(false);
      currentElementRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      panStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && pinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchDistRef.current;
      if (Math.abs(ratio - 1) > 0.04) {
        setZoomLevel((z) => Math.min(3.0, Math.max(0.3, Number((z * (ratio > 1 ? 1.04 : 0.96)).toFixed(2)))));
        pinchDistRef.current = dist;
      }
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setPanOffset({
        x: panStartRef.current.initialPanX + (midX - panStartRef.current.x),
        y: panStartRef.current.initialPanY + (midY - panStartRef.current.y),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length < 2) {
      pinchDistRef.current = null;
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
  // F. 단축키 (Keyboard Shortcuts - PC 커맨드 지원)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // 스페이스바 홀드: 화면 이동(Hand) 도구 즉시 활성화
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setTool((cur) => {
          if (cur !== "hand") {
            prevToolRef.current = cur;
          }
          return "hand";
        });
        return;
      }

      // 줌 단축키 (Ctrl + = / - / 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setZoomLevel((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))));
          return;
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))));
          return;
        } else if (e.key === "0") {
          e.preventDefault();
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
          return;
        }
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
      } else if (e.key.toLowerCase() === "v") {
        setTool("pen");
        toast.info("선택/펜 도구로 전환되었습니다 (V)");
      } else if (e.key.toLowerCase() === "h") {
        setTool((cur) => {
          const next = cur === "hand" ? (prevToolRef.current || "pen") : "hand";
          toast.info(next === "hand" ? "잡기 도구로 전환되었습니다 (H)" : "선택 도구로 전환되었습니다 (V)");
          return next;
        });
      } else if (e.key.toLowerCase() === "p") {
        setTool("pen");
      } else if (e.key.toLowerCase() === "b") {
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

    const handleKeyUp = (e: KeyboardEvent) => {
      // 스페이스바를 떼면 이전 도구로 복원
      if (e.code === "Space") {
        setTool(prevToolRef.current || "pen");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleUndo, handleRedo]);

  // ==========================================
  // G. 이미지 다운로드 & 클립보드 복사
  // ==========================================
  const handleDownload = (format: "png" | "jpg" | "svg" | "json") => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (format === "png") {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title.replace(/\s+/g, "_")}.png`;
      a.click();
      toast.success("PNG 이미지 다운로드가 완료되었습니다.");
    } else if (format === "jpg") {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title.replace(/\s+/g, "_")}.jpg`;
      a.click();
      toast.success("JPEG 이미지 다운로드가 완료되었습니다.");
    } else if (format === "json") {
      const jsonStr = JSON.stringify(
        { title, elements, backgroundPattern: bgPattern, updatedAt: new Date().toISOString() },
        null,
        2
      );
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON 백업 파일 다운로드가 완료되었습니다.");
    } else if (format === "svg") {
      // SVG 내보내기
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title.replace(/\s+/g, "_")}.png`;
      a.click();
      toast.success("스케치 이미지 저장이 완료되었습니다.");
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
      setTempTitle(doc.title || "무제");
      setElements(doc.elements || []);
      setBgPattern(doc.backgroundPattern || "blank");
      setUndoStack([]);
      setRedoStack([]);
      setIsGalleryOpen(false);

      // 캐시 동기화
      const storageKey = getStorageKey(userEmail);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          id: doc._id,
          title: doc.title,
          elements: doc.elements,
          backgroundPattern: doc.backgroundPattern,
          thumbnail: doc.thumbnail,
          updatedAt: new Date().toISOString(),
        })
      );

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
        if (currentId === id || queryId === id) {
          setCurrentId(null);
          router.push("/drawing");
        }
        toast.success("스케치가 삭제되었습니다.");
      }
    } catch {
      toast.error("삭제 실패");
    }
  };

  // ==========================================
  // I. 카드형 저장 및 일기 연동
  // ==========================================
  // 1. 현재 캔버스를 독립된 새로운 카드로 DB 및 보관함에 등록
  const handleSaveAsNewCard = async () => {
    if (!userEmail) {
      toast.warning("계정에 카드로 보관하려면 로그인이 필요합니다.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSavingCard(true);
    try {
      const thumbnail = canvas.toDataURL("image/png", 0.5);
      const res = await fetch("/api/drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "새로운 스케치",
          elements,
          backgroundPattern: bgPattern,
          thumbnail,
        }),
      });

      if (!res.ok) throw new Error("카드 저장에 실패했습니다.");
      const data = await res.json();
      const newDrawing = data.drawing;

      if (newDrawing?._id) {
        setCurrentId(newDrawing._id);
        const storageKey = getStorageKey(userEmail);
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            id: newDrawing._id,
            title: newDrawing.title,
            elements: newDrawing.elements,
            backgroundPattern: newDrawing.backgroundPattern,
            thumbnail,
            updatedAt: new Date().toISOString(),
          })
        );

        setSavedList((prev) => [
          {
            _id: newDrawing._id,
            title: newDrawing.title,
            thumbnail,
            backgroundPattern: newDrawing.backgroundPattern,
            elementCount: newDrawing.elements?.length || 0,
            updatedAt: new Date().toISOString(),
          },
          ...prev.filter((i) => i._id !== newDrawing._id),
        ]);

        toast.success(`'${newDrawing.title}' 카드로 보관함에 저장되었습니다! 💾`);
        router.push(`/drawing?id=${newDrawing._id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "카드 저장 실패");
    } finally {
      setIsSavingCard(false);
    }
  };

  // 2. Cloudinary 업로드 및 오늘 일기(/api/diary/drawing) 추가 기능
  const handleAddToTodayDiary = async (customTitle?: string, customThumbnail?: string) => {
    if (!userEmail) {
      toast.warning("일기에 그림을 추가하려면 로그인이 필요합니다.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas && !customThumbnail) return;

    setIsAddingToDiary(true);
    try {
      // 1) 고해상도 PNG Data URL 획득
      const pngDataUrl = customThumbnail || (canvas ? canvas.toDataURL("image/png", 0.95) : "");
      if (!pngDataUrl) throw new Error("캔버스 이미지 데이터를 생성할 수 없습니다.");

      let finalImageUrl = pngDataUrl;

      // 2) Cloudinary 업로드 (클라이언트 직접 업로드)
      if (CLOUD_NAME && UPLOAD_PRESET) {
        try {
          const formData = new FormData();
          formData.append("file", pngDataUrl);
          formData.append("upload_preset", UPLOAD_PRESET);

          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.secure_url) {
              finalImageUrl = uploadData.secure_url;
            }
          } else {
            console.warn("Cloudinary upload failed, falling back to data URL");
          }
        } catch (uploadErr) {
          console.warn("Cloudinary connection error:", uploadErr);
        }
      }

      // 3) 오늘 일기 API에 스케치 추가 연동
      const diaryRes = await fetch("/api/diary/drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
          title: customTitle || title.trim() || "스케치",
          content: `그림판에서 생성한 '${customTitle || title.trim() || "스케치"}' 드로잉 그림입니다.`,
        }),
      });

      if (!diaryRes.ok) {
        const errorData = await diaryRes.json();
        throw new Error(errorData.error || "일기에 그림 추가 실패");
      }

      const resData = await diaryRes.json();
      toast.success(
        resData.isNewDiary
          ? "오늘 일기가 생성되고 스케치가 등록되었습니다! 📖"
          : "오늘 일기에 스케치가 성공적으로 추가되었습니다! 📖"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "일기 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAddingToDiary(false);
    }
  };

  const handleNewDrawing = async () => {
    router.push("/drawing?id=new");
  };

  // 🌟 스케치 미선택 시: 카드 갤러리 목록 뷰 제공 (?id=... 쿼리 파라미터 표준)
  if (!queryId) {
    return (
      <DrawingGallery
        savedList={savedList}
        searchQuery={drawingSearchQuery}
        onSearchChange={setDrawingSearchQuery}
        onSelectDrawing={(id) => router.push(`/drawing?id=${id}`)}
        onNewDrawing={() => router.push("/drawing?id=new")}
        onDeleteDrawing={handleDeleteSavedDrawing}
      />
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      {/* ================= 1. 최상단 플랫 헤더 (Rule 52 & Rule 51 준수) ================= */}
      <DrawingHeader
        title={title}
        isEditingTitle={isEditingTitle}
        tempTitle={tempTitle}
        mounted={mounted}
        saveStatus={saveStatus}
        savedTimeStr={savedTimeStr}
        isSavingCard={isSavingCard}
        isAddingToDiary={isAddingToDiary}
        isDownloadOpen={isDownloadOpen}
        onBackToList={() => router.push("/drawing")}
        onTitleClick={() => {
          setTempTitle(title);
          setIsEditingTitle(true);
        }}
        onTempTitleChange={setTempTitle}
        onTitleSave={() => {
          setTitle(tempTitle.trim() || "무제 스케치");
          setIsEditingTitle(false);
          triggerAutoSave(elements, tempTitle.trim() || "무제 스케치", bgPattern);
        }}
        onTitleCancel={() => {
          setTempTitle(title);
          setIsEditingTitle(false);
        }}
        onSaveAsNewCard={handleSaveAsNewCard}
        onAddToTodayDiary={handleAddToTodayDiary}
        onNewDrawing={handleNewDrawing}
        onCopyClipboard={handleCopyClipboard}
        onToggleDownload={() => setIsDownloadOpen((prev) => !prev)}
        onDownload={handleDownload}
      />

      {/* ================= 2. 인터랙티브 도구 툴바 ================= */}
      <DrawingToolbar
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        isFilled={isFilled}
        bgPattern={bgPattern}
        zoomLevel={zoomLevel}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        customColor={customColor}
        onSelectTool={setTool}
        onSelectColor={setColor}
        onSelectStrokeWidth={setStrokeWidth}
        onToggleFilled={() => setIsFilled((prev) => !prev)}
        onSelectBgPattern={(p) => {
          setBgPattern(p);
          triggerAutoSave(elements, title, p);
        }}
        onCustomColorChange={setCustomColor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearCanvas}
        onZoomIn={() => setZoomLevel((z) => Math.min(3.0, Number((z + 0.1).toFixed(1))))}
        onZoomOut={() => setZoomLevel((z) => Math.max(0.3, Number((z - 0.1).toFixed(1))))}
        onResetView={() => {
          setPanOffset({ x: 0, y: 0 });
          setZoomLevel(1);
        }}
      />

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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full h-full block ${
            tool === "hand"
              ? isDrawing ? "cursor-grabbing" : "cursor-grab"
              : tool === "eraser"
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
    </div>
  );
}
