"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const { data: session } = useSession();
  const [mindmaps, setMindmaps] = useState<MindmapItem[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
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

  // 캔버스 드래그 및 노드 드래그
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const idCounterRef = useRef(1);

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

  // 🌟 2. Ctrl + 휠 & 키보드 브라우저 줌 100% 방지 및 마인드맵 자체 줌
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
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setZoomLevel((prev) => Math.min(2.0, Number((prev + 0.1).toFixed(2))));
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setZoomLevel((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))));
        } else if (e.key === "0") {
          e.preventDefault();
          setZoomLevel(1);
        }
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("keydown", onKeyDown, { capture: true });
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

  // 4. 노드 드래그 핸들러
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // 좌클릭만 허용
    // 🌟 마인드맵 노드를 잡고 이동할 때 기존 텍스트 선택 영역 즉시 해제 (잔상 방지)
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left) / zoomLevel;
    const mouseY = (e.clientY - canvasRect.top) / zoomLevel;

    dragOffsetRef.current = {
      x: mouseX - targetNode.x,
      y: mouseY - targetNode.y,
    };
    setDraggingNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left) / zoomLevel;
    const mouseY = (e.clientY - canvasRect.top) / zoomLevel;

    const newX = Math.round(mouseX - dragOffsetRef.current.x);
    const newY = Math.round(mouseY - dragOffsetRef.current.y);

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
    );
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      saveToServer(nodes, mapTitle, activeMapId);
    }
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
      spawnX = Math.round((clickX - rect.left) / zoomLevel);
      spawnY = Math.round((clickY - rect.top) / zoomLevel);
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
        if (selectedMapId === mapId) {
          setSelectedMapId(null);
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

  // 곡선 베지어 커넥터 계산
  const renderConnectors = () => {
    return nodes
      .filter((n) => n.parentId)
      .map((node) => {
        const parent = nodes.find((p) => p.id === node.parentId);
        if (!parent) return null;

        const startX = parent.x;
        const startY = parent.y;
        const endX = node.x;
        const endY = node.y;

        // 부드러운 S자 곡선 (Cubic Bezier)
        const dx = endX - startX;
        const cp1x = startX + dx * 0.5;
        const cp1y = startY;
        const cp2x = startX + dx * 0.5;
        const cp2y = endY;

        const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
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
                {m.branches && m.branches.length > 0 && (
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
            onClick={() => setSelectedMapId(null)}
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

          {/* 줌 컨트롤 */}
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
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="원래 크기 (100%)"
            >
              <RotateCcw size={13} />
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

      {/* 2. 인터랙티브 2D 캔버스 뷰포트 */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenuCanvas}
        className="relative w-full h-[calc(100vh-230px)] min-h-[580px] rounded-3xl border border-outline-variant overflow-hidden shadow-xs cursor-crosshair bg-surface-container-lowest"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--outline-variant) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* 확대/축소 스케일 컨테이너 */}
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75"
          style={{
            transform: `scale(${zoomLevel})`,
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
            const colorDef = COLOR_MAP[node.color || "primary"] || COLOR_MAP.primary;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                onContextMenu={(e) => handleContextMenuNode(e, node.id)}
                onDoubleClick={() => startEditingNode(node)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
                className={`absolute z-10 px-4 py-2.5 rounded-2xl border-2 transition-shadow shadow-md cursor-grab active:cursor-grabbing backdrop-blur-xs ${
                  colorDef.bg
                } ${colorDef.border} ${
                  isDragging ? "shadow-2xl scale-105 z-30 opacity-90" : "hover:shadow-lg"
                } ${node.isRoot ? "ring-2 ring-primary/40 px-5 py-3.5" : ""}`}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editingText}
                    autoFocus
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

        {/* 캔버스 하단 좌측 안내 팁 */}
        <div className="absolute left-4 bottom-4 bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant px-3 py-1.5 rounded-xl ui-caption text-on-surface-variant flex items-center gap-2 shadow-xs pointer-events-none">
          <span>💡 노드 더블클릭: 텍스트 수정</span>
          <span>•</span>
          <span>우클릭: 속성 및 가지 관리</span>
          <span>•</span>
          <span>Ctrl+휠: 캔버스 줌</span>
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
