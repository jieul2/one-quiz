"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Network,
  Plus,
  Trash2,
  Edit2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Palette,
  ArrowLeft,
  Search,
  Calendar,
  X,
  Hand,
  Move,
  Edit3,
  Maximize2,
} from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";

export interface MindmapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  parentId?: string | null;
  color?: string; // "primary" | "emerald" | "amber" | "rose" | "violet" | "slate"
  fontSize?: number;
  isRoot?: boolean;
}

export interface MindmapItem {
  id: string;
  _id?: string;
  title: string;
  nodeCount: number;
  lastEdited: string;
  rootNode: string;
  branches: string[];
  nodes?: MindmapNode[];
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  primary: {
    bg: "bg-primary/10 dark:bg-primary/20",
    border: "border-primary",
    text: "text-primary",
    fill: "#6366f1",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    fill: "#10b981",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    fill: "#f59e0b",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    fill: "#f43f5e",
  },
  violet: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    border: "border-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    fill: "#8b5cf6",
  },
  slate: {
    bg: "bg-surface-container-high",
    border: "border-outline",
    text: "text-on-surface",
    fill: "#64748b",
  },
};

const DEFAULT_STARTER_NODES: MindmapNode[] = [
  { id: "root-1", label: "🎯 2026 핵심 목표", x: 450, y: 300, isRoot: true, color: "primary" },
  { id: "child-1", label: "💻 기술 역량 강화", x: 220, y: 180, parentId: "root-1", color: "emerald" },
  { id: "child-2", label: "🏃 건강 & 러닝 루틴", x: 680, y: 180, parentId: "root-1", color: "amber" },
  { id: "child-3", label: "📚 정보처리기사 자격증", x: 220, y: 420, parentId: "root-1", color: "violet" },
  { id: "child-4", label: "🚀 one-quiz 프로젝트 완성", x: 680, y: 420, parentId: "root-1", color: "rose" },
];

export function MindmapView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const { data: session } = useSession();
  const [mindmaps, setMindmaps] = useState<MindmapItem[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(queryId);
  const [activeMapId, setActiveMapId] = useState<string>("");
  const [nodes, setNodes] = useState<MindmapNode[]>(DEFAULT_STARTER_NODES);
  const [mapTitle, setMapTitle] = useState("새 마인드맵");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateMapModalOpen, setIsCreateMapModalOpen] = useState(false);
  const [newMapTitleInput, setNewMapTitleInput] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetNodeId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    targetNodeId: null,
  });

  // 인라인 이름 편집 상태
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // 캔버스 패닝(화면 이동) & 노드 드래그 상태
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isHandToolActive, setIsHandToolActive] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
  const pinchDistRef = useRef<number | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const idCounterRef = useRef(1);

  // 최신 상태 ref (이벤트 리스너용)
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;
  const nodesRef = useRef<MindmapNode[]>(nodes);
  nodesRef.current = nodes;
  const isHandToolActiveRef = useRef(isHandToolActive);
  isHandToolActiveRef.current = isHandToolActive;
  const isSpaceHeldRef = useRef(isSpaceHeld);
  isSpaceHeldRef.current = isSpaceHeld;

  const markSaved = useCallback(() => {
    const now = new Date();
    setSavedTimeStr(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
    setSaveStatus("saved");
  }, []);

  // 1. 초기 마인드맵 목록 조회
  useEffect(() => {
    let ignore = false;
    async function loadMindmaps() {
      if (!session?.user?.email) return;
      try {
        const res = await fetch("/api/mindmap");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const list: MindmapItem[] = data.map((d) => ({
              id: d._id || d.id,
              _id: d._id,
              title: d.title,
              nodeCount: d.nodes?.length || d.nodeCount || 5,
              lastEdited: d.lastEdited || new Date().toISOString().slice(0, 10),
              rootNode: d.rootNode || d.title,
              branches: d.branches || [],
              nodes: d.nodes && d.nodes.length > 0 ? d.nodes : undefined,
            }));
            setMindmaps(list);
            const first = list[0];
            setActiveMapId(first.id);
            setMapTitle(first.title);
            if (first.nodes && first.nodes.length > 0) {
              setNodes(first.nodes);
            } else {
              // 기존 레거시 데이터는 노드로 자동 변환
              const legacyNodes: MindmapNode[] = [
                { id: "root", label: first.rootNode || first.title, x: 450, y: 300, isRoot: true, color: "primary" },
                ...(first.branches || []).map((b, i) => {
                  const angle = (i / Math.max(1, first.branches.length)) * Math.PI * 2;
                  return {
                    id: `b-${i}`,
                    label: b,
                    x: Math.round(450 + Math.cos(angle) * 220),
                    y: Math.round(300 + Math.sin(angle) * 160),
                    parentId: "root",
                    color: ["emerald", "amber", "rose", "violet"][i % 4],
                  };
                }),
              ];
              setNodes(legacyNodes);
            }
            markSaved();
            return;
          }
        }
      } catch (e) {
        console.warn("Mindmap fetch error:", e);
      }

      // 데이터가 없는 경우 기본 스타터 노드 유지
      if (!ignore) markSaved();
    }

    loadMindmaps();
    return () => {
      ignore = true;
    };
  }, [session, markSaved]);

  // 🌟 URL 쿼리 파라미터(?id=...) 동기화
  useEffect(() => {
    setSelectedMapId(queryId || null);
    if (queryId && mindmaps.length > 0) {
      const found = mindmaps.find((m) => m.id === queryId || m._id === queryId);
      if (found) {
        setActiveMapId(found.id);
        setMapTitle(found.title);
        if (found.nodes && found.nodes.length > 0) {
          setNodes(found.nodes);
        }
      }
    }
  }, [queryId, mindmaps]);

  // 🌟 2. PC 단축키 & 휠 줌 (스페이스바 잡기, V 선택, H 핸드툴, Del 삭제, Tab 하위추가 등)
  useEffect(() => {
    if (!selectedMapId) return;

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

      // 텍스트 인라인 수정 중일 때에는 텍스트 입력 우선
      if (isInputActive) {
        if (e.key === "Escape") {
          setEditingNodeId(null);
        }
        return;
      }

      // 2) 스페이스바 홀드: 화면 이동(잡기/Hand) 모드 즉시 활성화
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpaceHeld(true);
        return;
      }

      // 3) V키: 선택 도구 전환
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setIsHandToolActive(false);
        toast.info("선택 도구로 전환되었습니다 (V)");
        return;
      }

      // 4) H키: 화면 이동(잡기) 도구 토글
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setIsHandToolActive((prev) => {
          const next = !prev;
          toast.info(next ? "잡기 도구로 전환되었습니다 (H)" : "선택 도구로 전환되었습니다 (V)");
          return next;
        });
        return;
      }

      // 5) Escape키: 선택 해제 및 모드 리셋
      if (e.key === "Escape") {
        setIsHandToolActive(false);
        setIsSpaceHeld(false);
        setSelectedNodeId(null);
        setEditingNodeId(null);
        setContextMenu({ visible: false, x: 0, y: 0, targetNodeId: null });
        return;
      }

      // 6) Delete / Backspace: 선택된 노드 삭제
      if (e.key === "Delete" || e.key === "Backspace") {
        const curSelected = selectedNodeIdRef.current;
        if (curSelected) {
          e.preventDefault();
          handleDeleteNode(curSelected);
          setSelectedNodeId(null);
        }
        return;
      }

      // 7) Tab: 선택된 노드에 하위 가지 노드 추가
      if (e.key === "Tab") {
        const curSelected = selectedNodeIdRef.current;
        if (curSelected) {
          e.preventDefault();
          handleAddChildNode(curSelected);
        }
        return;
      }

      // 8) Enter: 선택된 노드 이름 수정
      if (e.key === "Enter") {
        const curSelected = selectedNodeIdRef.current;
        if (curSelected) {
          e.preventDefault();
          const target = nodesRef.current.find((n) => n.id === curSelected);
          if (target) {
            startEditingNode(target);
          }
        }
        return;
      }

      // 9) C키: 색상 테마 순환 변경
      if (e.key === "c" || e.key === "C") {
        const curSelected = selectedNodeIdRef.current;
        if (curSelected) {
          e.preventDefault();
          handleCycleNodeColor(curSelected);
        }
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
  }, [selectedMapId]);

  // 3. 서버에 마인드맵 저장
  const saveToServer = useCallback(
    async (currentNodes: MindmapNode[], title: string, mapId: string) => {
      if (!session?.user?.email) return;
      setSaveStatus("saving");
      try {
        const root = currentNodes.find((n) => n.isRoot) || currentNodes[0];
        const payload = {
          id: mapId,
          _id: mapId,
          title: title || "마인드맵",
          rootNode: root ? root.label : title,
          nodeCount: currentNodes.length,
          branches: currentNodes.filter((n) => !n.isRoot).map((n) => n.label),
          nodes: currentNodes,
        };

        let res;
        if (mapId) {
          res = await fetch("/api/mindmap", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch("/api/mindmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        if (res.ok) {
          const resData = await res.json();
          if (resData.data?._id && !mapId) {
            setActiveMapId(resData.data._id);
            setSelectedMapId(resData.data._id);
            router.push(`/mindmap?id=${resData.data._id}`);
          }
          markSaved();
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [session, markSaved]
  );

  // 4. 노드 드래그 및 패닝 핸들러 (모바일 터치 & PC 마우스 통합 지원 - 60fps RAF 최적화)
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // 좌클릭만 허용

    // 화면 이동(핸드) 모드 또는 스페이스바 홀드 중이면 노드 드래그 대신 화면 이동 수행
    if (isHandToolActive || isSpaceHeld) {
      handleMouseDownCanvas(e);
      return;
    }

    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode || !canvasRef.current) return;

    canvasRectRef.current = canvasRef.current.getBoundingClientRect();
    setSelectedNodeId(nodeId);
    const canvasRect = canvasRectRef.current;
    const mouseX = (e.clientX - canvasRect.left - panOffset.x) / zoomLevel;
    const mouseY = (e.clientY - canvasRect.top - panOffset.y) / zoomLevel;

    dragOffsetRef.current = {
      x: mouseX - targetNode.x,
      y: mouseY - targetNode.y,
    };
    setDraggingNodeId(nodeId);
  };

  const handleTouchStartNode = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    if (isHandToolActive) {
      handleTouchStartCanvas(e);
      return;
    }
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode || !canvasRef.current) return;

    canvasRectRef.current = canvasRef.current.getBoundingClientRect();
    setSelectedNodeId(nodeId);
    const touch = e.touches[0];
    const canvasRect = canvasRectRef.current;
    const touchX = (touch.clientX - canvasRect.left - panOffset.x) / zoomLevel;
    const touchY = (touch.clientY - canvasRect.top - panOffset.y) / zoomLevel;

    dragOffsetRef.current = {
      x: touchX - targetNode.x,
      y: touchY - targetNode.y,
    };
    setDraggingNodeId(nodeId);
  };

  // 캔버스 배경 드래그(화면 이동 / Pan) 시작
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    canvasRectRef.current = canvasRef.current?.getBoundingClientRect() || null;
    setSelectedNodeId(null);
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    };
  };

  const handleTouchStartCanvas = (e: React.TouchEvent) => {
    canvasRectRef.current = canvasRef.current?.getBoundingClientRect() || null;
    if (e.touches.length === 1) {
      setSelectedNodeId(null);
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const canvasRect = canvasRectRef.current || canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const mouseX = (clientX - canvasRect.left - panOffset.x) / zoomLevel;
        const mouseY = (clientY - canvasRect.top - panOffset.y) / zoomLevel;
        const newX = Math.round(mouseX - dragOffsetRef.current.x);
        const newY = Math.round(mouseY - dragOffsetRef.current.y);

        setNodes((prev) =>
          prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
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

  const handleTouchMoveCanvas = (e: React.TouchEvent) => {
    if (draggingNodeId) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const canvasRect = canvasRectRef.current || canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        const touchClientX = touch.clientX;
        const touchClientY = touch.clientY;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const touchX = (touchClientX - canvasRect.left - panOffset.x) / zoomLevel;
          const touchY = (touchClientY - canvasRect.top - panOffset.y) / zoomLevel;
          const newX = Math.round(touchX - dragOffsetRef.current.x);
          const newY = Math.round(touchY - dragOffsetRef.current.y);

          setNodes((prev) =>
            prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
          );
        });
      }
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

  const handleMouseUp = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (draggingNodeId) {
      setDraggingNodeId(null);
      setNodes((currentNodes) => {
        saveToServer(currentNodes, mapTitle, activeMapId);
        return currentNodes;
      });
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleTouchEndCanvas = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (draggingNodeId) {
      setDraggingNodeId(null);
      setNodes((currentNodes) => {
        saveToServer(currentNodes, mapTitle, activeMapId);
        return currentNodes;
      });
    }
    setIsPanning(false);
    pinchDistRef.current = null;
  };

  const handleResetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  };

  const COLOR_KEYS = ["primary", "emerald", "amber", "rose", "violet", "slate"];
  const handleCycleNodeColor = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const curIdx = COLOR_KEYS.indexOf(node.color || "primary");
    const nextColor = COLOR_KEYS[(curIdx + 1) % COLOR_KEYS.length];
    handleChangeNodeColor(nodeId, nextColor);
  };

  // 5. 우클릭 컨텍스트 메뉴 핸들러
  const handleContextMenuNode = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetNodeId: nodeId,
    });
  };

  const handleContextMenuCanvas = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetNodeId: null,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, targetNodeId: null });
  };

  // 6. 컨텍스트 메뉴 액션들
  // (1) 하위 브랜치 노드 추가
  const handleAddChildNode = (parentNodeId: string) => {
    const parent = nodes.find((n) => n.id === parentNodeId);
    if (!parent) return;

    const childCount = nodes.filter((n) => n.parentId === parentNodeId).length;
    const angle = ((childCount * 60) * Math.PI) / 180;
    const newX = Math.round(parent.x + 180 * Math.cos(angle));
    const newY = Math.round(parent.y + 120 * Math.sin(angle));

    const colorKeys = ["emerald", "amber", "rose", "violet", "primary"];
    const chosenColor = colorKeys[childCount % colorKeys.length];

    const nextSeq = idCounterRef.current++;
    const newNode: MindmapNode = {
      id: `node-${nodes.length + 1}-${nextSeq}`,
      label: "새 아이디어 노드",
      x: newX,
      y: newY,
      parentId: parentNodeId,
      color: chosenColor,
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    closeContextMenu();
    saveToServer(nextNodes, mapTitle, activeMapId);
    toast.success("하위 노드가 추가되었습니다!");
  };

  // (2) 새 독립 루트 노드 추가
  const handleAddRootNode = (clickX?: number, clickY?: number) => {
    let spawnX = 450;
    let spawnY = 300;
    if (clickX !== undefined && clickY !== undefined && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      spawnX = Math.round((clickX - rect.left - panOffset.x) / zoomLevel);
      spawnY = Math.round((clickY - rect.top - panOffset.y) / zoomLevel);
    } else if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      spawnX = Math.round((rect.width / 2 - panOffset.x) / zoomLevel);
      spawnY = Math.round((rect.height / 2 - panOffset.y) / zoomLevel);
    }

    const nextSeq = idCounterRef.current++;
    const newNode: MindmapNode = {
      id: `root-${nodes.length + 1}-${nextSeq}`,
      label: "새 중심 주제",
      x: spawnX,
      y: spawnY,
      isRoot: true,
      color: "primary",
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    closeContextMenu();
    saveToServer(nextNodes, mapTitle, activeMapId);
    toast.success("새 중심 노드가 생성되었습니다!");
  };

  // (3) 노드 삭제 (자식 노드도 재귀적으로 삭제)
  const handleDeleteNode = (nodeId: string) => {
    const getDescendantIds = (targetId: string): string[] => {
      const children = nodes.filter((n) => n.parentId === targetId);
      let ids = [targetId];
      for (const c of children) {
        ids = [...ids, ...getDescendantIds(c.id)];
      }
      return ids;
    };

    const idsToDelete = new Set(getDescendantIds(nodeId));
    const nextNodes = nodes.filter((n) => !idsToDelete.has(n.id));

    setNodes(nextNodes);
    closeContextMenu();
    saveToServer(nextNodes, mapTitle, activeMapId);
    toast.info("노드가 삭제되었습니다.");
  };

  // (4) 노드 색상 테마 변경
  const handleChangeNodeColor = (nodeId: string, color: string) => {
    const nextNodes = nodes.map((n) => (n.id === nodeId ? { ...n, color } : n));
    setNodes(nextNodes);
    closeContextMenu();
    saveToServer(nextNodes, mapTitle, activeMapId);
  };

  // (5) 인라인 이름 편집 시작
  const startEditingNode = (node: MindmapNode) => {
    setEditingNodeId(node.id);
    setEditingText(node.label);
    closeContextMenu();
  };

  const handleFinishEditing = () => {
    if (!editingNodeId) return;
    const nextNodes = nodes.map((n) =>
      n.id === editingNodeId ? { ...n, label: editingText.trim() || n.label } : n
    );
    setNodes(nextNodes);
    setEditingNodeId(null);
    saveToServer(nextNodes, mapTitle, activeMapId);
  };

  // 새 마인드맵 생성 제출
  const handleCreateNewMapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newMapTitleInput.trim();
    if (!title) {
      toast.error("마인드맵 제목을 입력해주세요.");
      return;
    }

    const initialNodes: MindmapNode[] = [
      { id: "root-main", label: title, x: 450, y: 300, isRoot: true, color: "primary" },
      { id: "c-1", label: "주요 기획", x: 250, y: 200, parentId: "root-main", color: "emerald" },
      { id: "c-2", label: "일정 및 리소스", x: 650, y: 200, parentId: "root-main", color: "amber" },
      { id: "c-3", label: "핵심 과제", x: 450, y: 460, parentId: "root-main", color: "rose" },
    ];

    setMapTitle(title);
    setNodes(initialNodes);
    setActiveMapId("");
    saveToServer(initialNodes, title, "");
    setIsCreateMapModalOpen(false);
    setNewMapTitleInput("");
    toast.success(`'${title}' 마인드맵 캔버스가 개설되었습니다!`);
  };

  // 마인드맵 삭제
  const handleDeleteMindmap = async (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    if (!confirm("정말 이 마인드맵을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/mindmap?id=${encodeURIComponent(mapId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("마인드맵이 삭제되었습니다.");
        setMindmaps((prev) => prev.filter((m) => m.id !== mapId));
        if (selectedMapId === mapId || queryId === mapId) {
          setSelectedMapId(null);
          router.push("/mindmap");
        }
      } else {
        toast.error("삭제 실패");
      }
    } catch {
      toast.error("통신 오류 발생");
    }
  };

  // 마인드맵 선택 전환 및 캔버스 진입
  const handleSelectMindmap = (item: MindmapItem) => {
    setActiveMapId(item.id);
    setSelectedMapId(item.id);
    router.push(`/mindmap?id=${item.id}`);
    setMapTitle(item.title);
    if (item.nodes && item.nodes.length > 0) {
      setNodes(item.nodes);
    } else {
      const legacyNodes: MindmapNode[] = [
        { id: "root", label: item.rootNode || item.title, x: 450, y: 300, isRoot: true, color: "primary" },
        ...(item.branches || []).map((b, i) => {
          const angle = (i / Math.max(1, item.branches.length)) * Math.PI * 2;
          return {
            id: `b-${i}`,
            label: b,
            x: Math.round(450 + Math.cos(angle) * 220),
            y: Math.round(300 + Math.sin(angle) * 160),
            parentId: "root",
            color: ["emerald", "amber", "rose", "violet"][i % 4],
          };
        }),
      ];
      setNodes(legacyNodes);
    }
  };

  // 곡선 베지어 커넥터 계산 (노드 테두리 가장자리 앵커 연결)
  const renderConnectors = () => {
    return nodes
      .filter((n) => n.parentId)
      .map((node) => {
        const parent = nodes.find((p) => p.id === node.parentId);
        if (!parent) return null;

        const isRight = node.x >= parent.x;
        // 노드 중심이 아닌 외곽 앵커에서 출발 및 도착 (가로 110px 노드 기준 약 50px 오프셋)
        const nodeHalfWidth = parent.isRoot ? 65 : 55;
        const targetHalfWidth = node.isRoot ? 65 : 55;

        const sourceX = isRight ? parent.x + nodeHalfWidth : parent.x - nodeHalfWidth;
        const sourceY = parent.y;
        const targetX = isRight ? node.x - targetHalfWidth : node.x + targetHalfWidth;
        const targetY = node.y;

        // 부드러운 수평 S자 곡선 (Cubic Bezier)
        const dx = Math.abs(targetX - sourceX);
        const curvature = Math.max(30, Math.min(140, dx * 0.5));
        const cp1x = isRight ? sourceX + curvature : sourceX - curvature;
        const cp2x = isRight ? targetX - curvature : targetX + curvature;

        const pathData = `M ${sourceX} ${sourceY} C ${cp1x} ${sourceY}, ${cp2x} ${targetY}, ${targetX} ${targetY}`;
        const nodeColorDef = COLOR_MAP[node.color || "primary"] || COLOR_MAP.primary;

        return (
          <path
            key={`line-${parent.id}-${node.id}`}
            d={pathData}
            fill="none"
            stroke={nodeColorDef.fill}
            strokeWidth="2.5"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
        );
      });
  };

  // 🌟 마인드맵 미선택 시: 카드 갤러리 목록 뷰 제공
  if (!selectedMapId) {
    const filteredMindmaps = mindmaps.filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.rootNode && m.rootNode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.branches && m.branches.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return (
      <div className="w-full space-y-6 pb-12 animate-fade-in select-none">
        {/* 상단 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Network className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="ui-page-title flex items-center gap-2">
                마인드맵 갤러리
                <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                  {mindmaps.length}개 마인드맵
                </span>
              </h1>
              <p className="ui-page-subtitle">
                생각의 구조를 2D 노드로 시각화할 마인드맵을 선택하거나 새로 개설하세요.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateMapModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>새 마인드맵 개설</span>
          </button>
        </div>

        {/* 검색창 */}
        <div className="flex justify-end">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder="마인드맵 제목 및 가지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary font-medium"
            />
          </div>
        </div>

        {/* 마인드맵 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 w-full">
          {/* 새 마인드맵 개설 점선 카드 */}
          <div
            onClick={() => setIsCreateMapModalOpen(true)}
            className="group min-h-[190px] border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:bg-surface-container-low/50"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <div>
              <div className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                새 마인드맵 개설하기
              </div>
              <p className="ui-caption text-on-surface-variant mt-0.5">
                핵심 주제와 서브 브랜치를 자유롭게 확장할 새 맵 생성
              </p>
            </div>
          </div>

          {/* 마인드맵 카드들 */}
          {filteredMindmaps.map((m) => (
            <div
              key={m.id}
              onClick={() => handleSelectMindmap(m)}
              className="group relative bg-surface-container-lowest border border-outline-variant hover:border-primary/60 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between pb-3">
                  <span className="ui-badge px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-[11px] flex items-center gap-1">
                    <Network size={12} />
                    {m.nodeCount}개 노드
                  </span>

                  <button
                    onClick={(e) => handleDeleteMindmap(e, m.id)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                    title="마인드맵 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <h3 className="ui-card-title text-base font-bold text-on-surface group-hover:text-primary transition-colors mt-1">
                  {m.title}
                </h3>
                <p className="ui-caption text-on-surface-variant mt-1">
                  중심 주제: <strong className="text-on-surface font-semibold">{m.rootNode}</strong>
                </p>

                {/* 서브 브랜치 칩 프리뷰 */}
                {Array.isArray(m.branches) && m.branches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {m.branches.slice(0, 3).map((branch, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium"
                      >
                        {branch}
                      </span>
                    ))}
                    {m.branches.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded text-on-surface-variant/70">
                        +{m.branches.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-outline-variant/60 flex items-center justify-between mt-4">
                <span className="ui-caption text-on-surface-variant/80 flex items-center gap-1.5">
                  <Calendar size={12} />
                  {m.lastEdited}
                </span>

                <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  마인드맵 열기 →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 새 마인드맵 개설 모달 */}
        {isCreateMapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Network size={18} />
                  </div>
                  <div>
                    <h3 className="ui-section-title">새 마인드맵 개설</h3>
                    <p className="ui-caption">생각을 체계적으로 확장할 새 캔버스를 시작합니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateMapModalOpen(false)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateNewMapSubmit} className="flex flex-col gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    마인드맵 제목 <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 2026 하반기 신규 서비스 아키텍처"
                    value={newMapTitleInput}
                    onChange={(e) => setNewMapTitleInput(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary transition-all font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setIsCreateMapModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-semibold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    마인드맵 개설
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
    <div
      onClick={closeContextMenu}
      className="w-full space-y-4 pb-6 animate-fade-in select-none"
    >
      {/* 1. 상단 타이틀 & 캔버스 툴바 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2">
          {/* 목록으로 돌아가기 버튼 */}
          <button
            type="button"
            onClick={() => {
              setSelectedMapId(null);
              router.push("/mindmap");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors cursor-pointer mr-1 shadow-xs"
            title="마인드맵 목록으로 돌아가기"
          >
            <ArrowLeft size={14} className="text-primary" />
            <span>마인드맵 목록</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="ui-page-title text-on-surface">{mapTitle}</h1>

              <span className="ui-badge px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[11px] font-bold">
                CANVAS
              </span>
            </div>
            <p className="ui-page-subtitle">
              노드를 자유롭게 드래그하고, <strong>우클릭</strong>으로 가지 추가/수정/삭제/색상을 변경하세요.
            </p>
          </div>
        </div>

        {/* 우측 도구: 저장 상태 & 줌 컨트롤 & 액션 버튼 */}
        <div className="flex items-center gap-2 flex-wrap">
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          {/* 줌 컨트롤 & 화면 이동 도구 */}
          <div className="flex items-center gap-0.5 bg-surface-container rounded-xl p-1 border border-outline-variant shadow-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="축소"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-on-surface">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="확대"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="화면 위치 및 크기 초기화"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* 선택 (V) vs 잡기/화면 이동 (H / Space) 모드 세그먼트 도구 */}
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-xl border border-outline-variant">
            <button
              type="button"
              onClick={() => {
                setIsHandToolActive(false);
                setIsSpaceHeld(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isHandToolActive && !isSpaceHeld
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="선택 도구 (단축키: V)"
            >
              <Move size={13} />
              <span>선택 (V)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHandToolActive((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isHandToolActive || isSpaceHeld
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="잡기 / 화면 이동 (단축키: H 또는 Space 홀드)"
            >
              <Hand size={13} />
              <span>잡기 (H/Space)</span>
            </button>
          </div>

          <button
            onClick={() => handleAddRootNode()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant hover:border-primary text-on-surface text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} className="text-primary" />
            <span>새 노드</span>
          </button>

          <button
            onClick={() => setIsCreateMapModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Sparkles size={14} />
            <span>새 맵</span>
          </button>
        </div>
      </div>

      {/* 2. 인터랙티브 2D 캔버스 뷰포트 (화면 드래그/패닝 & 터치 제스처 지원) */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStartCanvas}
        onTouchMove={handleTouchMoveCanvas}
        onTouchEnd={handleTouchEndCanvas}
        onContextMenu={handleContextMenuCanvas}
        className={`relative w-full h-[calc(100vh-230px)] min-h-[580px] rounded-3xl border border-outline-variant overflow-hidden shadow-xs bg-surface-container-lowest select-none ${
          isPanning
            ? "cursor-grabbing"
            : isHandToolActive || isSpaceHeld
            ? "cursor-grab"
            : "cursor-default"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--outline-variant) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          touchAction: "none",
        }}
      >
        {/* 확대/축소 스케일 및 패닝 이동 컨테이너 (패닝/드래그 시 transition 제거로 0ms 즉각 반응) */}
        <div
          className={`absolute inset-0 origin-top-left ${
            isPanning ? "" : "transition-transform duration-75"
          }`}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: "0 0",
            width: "3000px",
            height: "2400px",
          }}
        >
          {/* SVG 곡선 커넥터 레이어 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {renderConnectors()}
          </svg>

          {/* 캔버스 노드들 */}
          {nodes.map((node) => {
            const isDragging = draggingNodeId === node.id;
            const isEditing = editingNodeId === node.id;
            const isSelected = selectedNodeId === node.id;
            const colorDef = COLOR_MAP[node.color || "primary"] || COLOR_MAP.primary;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                onTouchStart={(e) => handleTouchStartNode(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                }}
                onContextMenu={(e) => handleContextMenuNode(e, node.id)}
                onDoubleClick={() => startEditingNode(node)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
                className={`absolute z-10 px-4 py-2.5 rounded-2xl border-2 shadow-md cursor-grab active:cursor-grabbing backdrop-blur-xs ${
                  colorDef.bg
                } ${colorDef.border} ${
                  isDragging
                    ? "shadow-2xl scale-105 z-30 opacity-90 transition-none"
                    : "transition-[box-shadow,border-color,background-color] hover:shadow-lg"
                } ${node.isRoot ? "ring-2 ring-primary/40 px-5 py-3.5" : ""} ${
                  isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-102" : ""
                }`}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editingText}
                    autoFocus
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={handleFinishEditing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishEditing();
                      if (e.key === "Escape") setEditingNodeId(null);
                    }}
                    className="bg-surface-container-lowest text-on-surface text-xs font-bold px-2 py-1 rounded-lg border border-primary outline-hidden shadow-xs min-w-[120px]"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold select-none text-xs sm:text-sm whitespace-nowrap ${
                        node.isRoot ? "text-on-surface font-black" : colorDef.text
                      }`}
                    >
                      {node.label}
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddChildNode(node.id);
                      }}
                      className="w-5 h-5 rounded-full bg-primary/20 hover:bg-primary text-primary hover:text-on-primary flex items-center justify-center transition-colors cursor-pointer text-xs"
                      title="하위 가지 추가"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 🌟 모바일 & PC 노드 빠른 제어 독 (선택 시 화면 하단 플로팅 툴바 - 이벤트 버블링 차단) */}
        {selectedNodeId && (() => {
          const selNode = nodes.find((n) => n.id === selectedNodeId);
          if (!selNode) return null;
          return (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 select-none"
            >
              <span className="px-2 text-xs font-bold text-on-surface truncate max-w-[110px] border-r border-outline-variant/60 hidden sm:inline">
                {selNode.label}
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddChildNode(selNode.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:opacity-90 shadow-xs cursor-pointer"
                title="하위 가지 추가 (Tab)"
              >
                <Plus size={13} />
                <span>하위 추가</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingNode(selNode);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors cursor-pointer"
                title="이름 수정 (Enter)"
              >
                <Edit3 size={14} className="text-primary" />
                <span>이름 수정</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCycleNodeColor(selNode.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors cursor-pointer"
                title="색상 변경 (C)"
              >
                <Palette size={14} className="text-secondary" />
                <span>색상 변경</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(selNode.id);
                  setSelectedNodeId(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-error/10 text-on-surface-variant hover:text-error text-xs font-semibold transition-colors cursor-pointer"
                title="노드 삭제 (Del)"
              >
                <Trash2 size={14} />
                <span>삭제</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(null);
                }}
                className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant cursor-pointer text-xs"
                title="선택 해제 (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          );
        })()}

        {/* 캔버스 하단 좌측 단축키 안내 팁 */}
        <div className="absolute left-4 bottom-4 hidden md:flex bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant px-3 py-1.5 rounded-xl ui-caption text-on-surface-variant items-center gap-2 shadow-xs pointer-events-none">
          <span>💡 <strong>V</strong>: 선택</span>
          <span>•</span>
          <span><strong>H / Space 홀드</strong>: 화면 이동</span>
          <span>•</span>
          <span><strong>Tab</strong>: 하위 추가</span>
          <span>•</span>
          <span><strong>Enter</strong>: 수정</span>
          <span>•</span>
          <span><strong>Del</strong>: 삭제</span>
        </div>
      </div>

      {/* 3. 우클릭 전용 컨텍스트 메뉴 (Portal 대체 절대 좌표) */}
      {contextMenu.visible && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-[999999] w-52 bg-surface-container-lowest border border-outline-variant rounded-2xl p-1.5 shadow-2xl animate-in zoom-in-95 duration-100"
        >
          {contextMenu.targetNodeId ? (
            /* 노드 클릭 시 메뉴 */
            <div className="flex flex-col gap-0.5 text-xs text-on-surface font-semibold">
              <div className="px-2.5 py-1 ui-caption font-bold text-on-surface-variant border-b border-outline-variant/60 mb-1">
                노드 옵션
              </div>

              <button
                type="button"
                onClick={() => handleAddChildNode(contextMenu.targetNodeId!)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-surface-container text-primary transition-colors cursor-pointer text-left font-bold"
              >
                <Plus size={14} /> 하위 가지 추가
              </button>

              <button
                type="button"
                onClick={() => {
                  const node = nodes.find((n) => n.id === contextMenu.targetNodeId);
                  if (node) startEditingNode(node);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-surface-container transition-colors cursor-pointer text-left"
              >
                <Edit2 size={13} /> 이름 수정
              </button>

              {/* 색상 테마 팔레트 */}
              <div className="px-2.5 py-1.5">
                <div className="ui-caption font-bold text-on-surface-variant mb-1.5 flex items-center gap-1">
                  <Palette size={12} /> 노드 테마 변경
                </div>
                <div className="flex items-center gap-1.5">
                  {(["primary", "emerald", "amber", "rose", "violet", "slate"] as const).map(
                    (colorKey) => (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => handleChangeNodeColor(contextMenu.targetNodeId!, colorKey)}
                        className="w-5 h-5 rounded-full border border-black/20 hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: COLOR_MAP[colorKey].fill }}
                        title={colorKey}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="h-px bg-outline-variant/60 my-1" />

              <button
                type="button"
                onClick={() => handleDeleteNode(contextMenu.targetNodeId!)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-error/10 text-error transition-colors cursor-pointer text-left"
              >
                <Trash2 size={13} /> 노드 및 하위 가지 삭제
              </button>
            </div>
          ) : (
            /* 빈 캔버스 클릭 시 메뉴 */
            <div className="flex flex-col gap-0.5 text-xs text-on-surface font-semibold">
              <div className="px-2.5 py-1 ui-caption font-bold text-on-surface-variant border-b border-outline-variant/60 mb-1">
                캔버스 옵션
              </div>

              <button
                type="button"
                onClick={() => handleAddRootNode(contextMenu.x, contextMenu.y)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-surface-container text-primary transition-colors cursor-pointer text-left font-bold"
              >
                <Plus size={14} /> 여기에 새 중심 노드 생성
              </button>

              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-surface-container transition-colors cursor-pointer text-left"
              >
                <RotateCcw size={13} /> 캔버스 줌 리셋 (100%)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
