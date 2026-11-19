"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Plus,
  Link2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Edit3,
  Trash2,
  TableProperties,
  Key,
  LayoutGrid,
  Copy,
  CornerDownRight,
  Spline,
  X,
  Check,
} from "lucide-react";
import {
  ErdTable,
  ErdRelation,
  ErdField,
  CARD_WIDTH,
  HEADER_HEIGHT,
  ROW_HEIGHT,
} from "./types";

interface ErdCanvasProps {
  tables: ErdTable[];
  relations: ErdRelation[];
  pan: { x: number; y: number };
  zoom: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (updater: (z: number) => number) => void;
  onAddTable: () => void;
  onAddRelation: () => void;
  onResetView: () => void;
  onEditTable: (table: ErdTable) => void;
  onDeleteTable: (tableId: string) => void;
  onAddField: (tableId: string) => void;
  onUpdateField: (tableId: string, fieldId: string, partial: Partial<ErdField>) => void;
  onDeleteField: (tableId: string, fieldId: string) => void;
  onDeleteRelation: (relId: string) => void;
  onUpdateTablePos: (tableId: string, dx: number, dy: number) => void;
  onDragEnd: () => void;
  onAutoLayout?: () => void;
  onDuplicateTable?: (tableId: string) => void;
  onChangeTableColor?: (tableId: string, color: string) => void;
  onConnectRelation?: (fromTableId: string, toTableId: string, fromFieldId?: string, toFieldId?: string) => void;
  onToggleRelationType?: (relId: string) => void;
}

// 자주 쓰이는 주요 자료형 프리셋
const COMMON_DATA_TYPES = [
  "VARCHAR(255)",
  "INT",
  "BIGINT",
  "BOOLEAN",
  "TIMESTAMP",
  "TEXT",
  "JSON",
  "UUID",
  "DECIMAL",
];

// 테이블 실제 렌더링 높이 근사치 계산
const getTableHeight = (table: ErdTable) => {
  return HEADER_HEIGHT + Math.max(1, table.fields.length) * ROW_HEIGHT + 44;
};

// 🌟 객체(컬럼/필드) 단위의 정확한 좌우 앵커 좌표 계산
const getFieldAnchor = (
  table: ErdTable,
  fieldId?: string,
  side: "left" | "right" = "right"
) => {
  let fieldIndex = 0;
  if (fieldId) {
    const idx = table.fields.findIndex((f) => f.id === fieldId || f.name === fieldId);
    if (idx !== -1) fieldIndex = idx;
  } else {
    const pkIdx = table.fields.findIndex((f) => f.isPrimaryKey);
    if (pkIdx !== -1) fieldIndex = pkIdx;
  }

  // HEADER_HEIGHT(52) + 컨테이너 p-2(8px) + idx * (ROW_HEIGHT(38) + gap(4px)) + ROW_HEIGHT/2(19)
  const y = table.y + HEADER_HEIGHT + 8 + fieldIndex * 42 + 19;
  const x = side === "right" ? table.x + CARD_WIDTH : table.x;

  return { x, y, direction: side };
};

// 🌟 두 테이블 및 필드 간의 최적 앵커 좌표 계산 (상대적 위치에 따라 좌/우 포트 자동 분기)
const getRelationAnchors = (
  fromTable: ErdTable,
  fromFieldId: string | undefined,
  toTable: ErdTable,
  toFieldId: string | undefined
) => {
  if (fromTable.x + CARD_WIDTH + 20 <= toTable.x) {
    // from이 왼쪽, to가 오른쪽 -> from의 우측에서 to의 좌측으로 진입
    return {
      start: getFieldAnchor(fromTable, fromFieldId, "right"),
      end: getFieldAnchor(toTable, toFieldId, "left"),
      alignment: "horizontal-lr" as const,
    };
  } else if (toTable.x + CARD_WIDTH + 20 <= fromTable.x) {
    // to가 왼쪽, from이 오른쪽 -> from의 좌측에서 to의 우측으로 진입
    return {
      start: getFieldAnchor(fromTable, fromFieldId, "left"),
      end: getFieldAnchor(toTable, toFieldId, "right"),
      alignment: "horizontal-rl" as const,
    };
  } else {
    // 위아래로 겹치거나 수평 간격이 좁을 경우 -> 외곽으로 우회 루프
    if (fromTable.x <= toTable.x) {
      return {
        start: getFieldAnchor(fromTable, fromFieldId, "right"),
        end: getFieldAnchor(toTable, toFieldId, "right"),
        alignment: "loop-right" as const,
      };
    } else {
      return {
        start: getFieldAnchor(fromTable, fromFieldId, "left"),
        end: getFieldAnchor(toTable, toFieldId, "left"),
        alignment: "loop-left" as const,
      };
    }
  }
};

// 🌟 모서리가 라운딩 처리된 직각선(Orthogonal/Manhattan) & 부드러운 베지어 곡선 경로 빌더
const computeRelationPath = (
  start: { x: number; y: number; direction: "left" | "right" },
  end: { x: number; y: number; direction: "left" | "right" },
  alignment: "horizontal-lr" | "horizontal-rl" | "loop-right" | "loop-left",
  lineStyle: "orthogonal" | "bezier"
) => {
  if (lineStyle === "orthogonal") {
    let midX: number;
    if (alignment === "horizontal-lr" || alignment === "horizontal-rl") {
      midX = (start.x + end.x) / 2;
    } else if (alignment === "loop-right") {
      midX = Math.max(start.x, end.x) + 36;
    } else {
      midX = Math.min(start.x, end.x) - 36;
    }

    // 모서리 라운딩 반경 (r = 8px)
    const r = Math.min(8, Math.abs(midX - start.x) / 2, Math.abs(end.y - start.y) / 2);

    if (Math.abs(start.y - end.y) < 4) {
      return {
        pathD: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
        midX: (start.x + end.x) / 2,
        midY: start.y,
      };
    }

    const signX1 = midX > start.x ? 1 : -1;
    const signY1 = end.y > start.y ? 1 : -1;
    const signX2 = end.x > midX ? 1 : -1;

    const pathD = [
      `M ${start.x} ${start.y}`,
      `L ${midX - signX1 * r} ${start.y}`,
      `Q ${midX} ${start.y} ${midX} ${start.y + signY1 * r}`,
      `L ${midX} ${end.y - signY1 * r}`,
      `Q ${midX} ${end.y} ${midX + signX2 * r} ${end.y}`,
      `L ${end.x} ${end.y}`,
    ].join(" ");

    return {
      pathD,
      midX,
      midY: (start.y + end.y) / 2,
    };
  } else {
    // 3차 베지어 곡선
    const dx = Math.max(40, Math.abs(end.x - start.x) * 0.5);
    const cp1x = start.direction === "right" ? start.x + dx : start.x - dx;
    const cp2x = end.direction === "right" ? end.x + dx : end.x - dx;

    return {
      pathD: `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${end.y}, ${end.x} ${end.y}`,
      midX: (start.x + end.x) / 2,
      midY: (start.y + end.y) / 2,
    };
  }
};

export function ErdCanvas({
  tables,
  relations,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
  onAddTable,
  onAddRelation,
  onResetView,
  onEditTable,
  onDeleteTable,
  onAddField,
  onUpdateField,
  onDeleteField,
  onDeleteRelation,
  onUpdateTablePos,
  onDragEnd,
  onAutoLayout,
  onDuplicateTable,
  onChangeTableColor,
  onConnectRelation,
  onToggleRelationType,
}: ErdCanvasProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 🌟 관계선 스타일: 직각선(orthogonal) vs 곡선(bezier) (기본: 직각선)
  const [lineStyle, setLineStyle] = useState<"orthogonal" | "bezier">("orthogonal");

  // 🌟 자료형 팝오버 픽커 활성 상태 ({ tableId, fieldId })
  const [activeTypePicker, setActiveTypePicker] = useState<string | null>(null);
  const [customTypeInput, setCustomTypeInput] = useState("");

  // 캔버스 팬(이동) 드래그 ref
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  // 🌟 테이블 고속 드래그 상태 (RAF 누적 가속 최적화: 딜레이 0ms)
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const tableDragOffsetRef = useRef({ x: 0, y: 0 });
  const isTickingRef = useRef(false);
  const pendingDxRef = useRef(0);
  const pendingDyRef = useRef(0);

  // 호버 상태
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);

  // 🌟 객체(컬럼/필드) 단위 실시간 인터랙티브 관계선 연결 상태
  const [connectingState, setConnectingState] = useState<{
    fromTableId: string;
    fromFieldId: string;
    fromFieldName: string;
    startX: number;
    startY: number;
  } | null>(null);
  const [connectingCursor, setConnectingCursor] = useState<{ x: number; y: number } | null>(null);
  const [connectTarget, setConnectTarget] = useState<{
    tableId: string;
    fieldId: string;
    fieldName: string;
  } | null>(null);

  // 🌟 우클릭 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: "canvas" | "table";
    targetTable?: ErdTable;
  } | null>(null);

  // 컨텍스트 메뉴 및 팝오버 닫기 (외부 클릭 감지)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setContextMenu(null);
      if (
        !(e.target as HTMLElement).closest("[data-type-picker-trigger]") &&
        !(e.target as HTMLElement).closest("[data-type-picker-popup]")
      ) {
        setActiveTypePicker(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ========================================================
  // 🌟 1. 테이블 드래그 이동 (전역 윈도우 마우스 바인딩 & 프레임 드랍 0%)
  // ========================================================
  useEffect(() => {
    if (!draggingTableId) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - tableDragOffsetRef.current.x) / zoom;
      const dy = (e.clientY - tableDragOffsetRef.current.y) / zoom;
      tableDragOffsetRef.current = { x: e.clientX, y: e.clientY };

      pendingDxRef.current += dx;
      pendingDyRef.current += dy;

      if (!isTickingRef.current) {
        isTickingRef.current = true;
        requestAnimationFrame(() => {
          onUpdateTablePos(draggingTableId, pendingDxRef.current, pendingDyRef.current);
          pendingDxRef.current = 0;
          pendingDyRef.current = 0;
          isTickingRef.current = false;
        });
      }
    };

    const handleWindowMouseUp = () => {
      setDraggingTableId(null);
      isTickingRef.current = false;
      pendingDxRef.current = 0;
      pendingDyRef.current = 0;
      onDragEnd();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [draggingTableId, zoom, onUpdateTablePos, onDragEnd]);

  // ========================================================
  // 🌟 2. 관계선 실시간 긋기 (전역 마우스 바인딩: 0ms 초고속 반응)
  // ========================================================
  useEffect(() => {
    if (!connectingState) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const canvasMouseX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasMouseY = (e.clientY - rect.top - pan.y) / zoom;
      setConnectingCursor({ x: canvasMouseX, y: canvasMouseY });
    };

    const handleWindowMouseUp = () => {
      if (connectTarget && connectTarget.tableId !== connectingState.fromTableId) {
        onConnectRelation?.(
          connectingState.fromTableId,
          connectTarget.tableId,
          connectingState.fromFieldId,
          connectTarget.fieldId
        );
      }
      setConnectingState(null);
      setConnectingCursor(null);
      setConnectTarget(null);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [connectingState, connectTarget, pan.x, pan.y, zoom, onConnectRelation]);

  // 캔버스 배경 드래그(Pan) 핸들러
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) return;
    if ((e.target as HTMLElement).closest("[data-table-card]")) return;
    if ((e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest("[data-connect-handle]")) return;

    setContextMenu(null);
    setActiveTypePicker(null);
    isDraggingCanvasRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingCanvasRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onPanChange({
        x: dragStartRef.current.initialPanX + dx,
        y: dragStartRef.current.initialPanY + dy,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    isDraggingCanvasRef.current = false;
  };

  // 테이블 드래그 시작
  const handleStartDragTable = (e: React.MouseEvent, tableId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setContextMenu(null);
    setActiveTypePicker(null);
    setDraggingTableId(tableId);
    tableDragOffsetRef.current = { x: e.clientX, y: e.clientY };
  };

  // 🌟 객체(컬럼/필드) 단위 관계선 연결 시작
  const handleStartConnectField = (
    e: React.MouseEvent,
    table: ErdTable,
    field: ErdField
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu(null);
    setActiveTypePicker(null);

    const anchor = getFieldAnchor(table, field.id, "right");
    setConnectingState({
      fromTableId: table.id,
      fromFieldId: field.id,
      fromFieldName: field.name,
      startX: anchor.x,
      startY: anchor.y,
    });

    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const canvasMouseX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasMouseY = (e.clientY - rect.top - pan.y) / zoom;
      setConnectingCursor({ x: canvasMouseX, y: canvasMouseY });
    }
  };

  // 🌟 테이블 헤더에서의 간편 관계선 연결 시작 (PK 또는 1번 필드 기준)
  const handleStartConnectTable = (e: React.MouseEvent, table: ErdTable) => {
    const pk = table.fields.find((f) => f.isPrimaryKey) || table.fields[0];
    if (pk) {
      handleStartConnectField(e, table, pk);
    }
  };

  // 🌟 우클릭 컨텍스트 메뉴 트리거
  const handleContextMenu = (e: React.MouseEvent, targetTable?: ErdTable) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setContextMenu({
      visible: true,
      x,
      y,
      type: targetTable ? "table" : "canvas",
      targetTable,
    });
  };

  return (
    <div className="space-y-3 relative">
      {/* 캔버스 상단 툴바 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onAddTable}
            className="ui-button px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Plus size={14} />
            <span>테이블 추가</span>
          </button>

          <button
            type="button"
            onClick={onAddRelation}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="테이블 간 외래키(FK) 관계 생성"
          >
            <Link2 size={14} className="text-primary" />
            <span>관계 연결</span>
          </button>

          {/* 🌟 스마트 자동 정렬 버튼 */}
          {onAutoLayout && (
            <button
              type="button"
              onClick={onAutoLayout}
              className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="테이블 겹침을 방지하고 컬럼 크기에 맞춰 자동 정렬"
            >
              <LayoutGrid size={14} className="text-secondary" />
              <span>자동 정렬</span>
            </button>
          )}

          <div className="h-4 w-px bg-outline-variant mx-1" />

          {/* 🌟 직각선 vs 곡선 스타일 전환 토글 스위치 */}
          <div className="flex items-center bg-surface-container rounded-xl p-0.5 border border-outline-variant/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLineStyle("orthogonal")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                lineStyle === "orthogonal"
                  ? "bg-surface-container-lowest text-primary font-bold shadow-2xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="직각으로 꺾이는 직각선 (Orthogonal / Manhattan)"
            >
              <CornerDownRight size={13} />
              <span>직각선</span>
            </button>
            <button
              type="button"
              onClick={() => setLineStyle("bezier")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                lineStyle === "bezier"
                  ? "bg-surface-container-lowest text-primary font-bold shadow-2xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="부드럽게 이어지는 베지어 곡선 (Smooth Bezier)"
            >
              <Spline size={13} />
              <span>곡선</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onResetView}
            className="ui-button px-2.5 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs text-on-surface flex items-center gap-1 cursor-pointer"
            title="화면 위치 및 배율 초기화"
          >
            <RotateCcw size={13} />
            <span>화면 초기화</span>
          </button>

          <div className="h-4 w-px bg-outline-variant mx-0.5" />

          <button
            type="button"
            onClick={() => onZoomChange((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant cursor-pointer"
            title="확대 (Ctrl+Wheel 위로)"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={() => onZoomChange((z) => Math.max(0.3, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant cursor-pointer"
            title="축소 (Ctrl+Wheel 아래로)"
          >
            <ZoomOut size={15} />
          </button>
        </div>
      </div>

      {/* 캔버스 뷰포트 (무한 2D 평면) */}
      <div
        ref={canvasContainerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onContextMenu={(e) => handleContextMenu(e)}
        className="relative w-full h-[520px] sm:h-[640px] md:h-[720px] rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden cursor-grab active:cursor-grabbing shadow-inner select-none"
        style={{
          backgroundImage: `radial-gradient(var(--outline-variant) 1.2px, transparent 1.2px)`,
          backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* ================= 관계선 SVG 오버레이 =================
            🌟 핵심 개선: SVG 자체를 테이블 컨테이너와 동일한 transform 그룹으로 감싸
            화면 이동(Pan) / 확대(Zoom) 시 하드웨어 가속으로 딜레이 없이 100% 동기화! */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            {/* 세련된 화살표 마커 */}
            <marker
              id="erd-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--primary)" />
            </marker>
            {/* 시작점 동그라미 마커 */}
            <marker
              id="erd-circle"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
            >
              <circle cx="5" cy="5" r="3.5" fill="var(--primary)" />
            </marker>
          </defs>

          {/* 🌟 브라우저 GPU 하드웨어 가속 레이어 동기화: pan/zoom 시 테이블과 일체형으로 실시간 렌더링 */}
          <g
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {/* 1. 확정된 기존 관계선들 */}
            {relations.map((rel) => {
              const fromTable = tables.find((t) => t.id === rel.fromTable || t.name === rel.fromTable);
              const toTable = tables.find((t) => t.id === rel.toTable || t.name === rel.toTable);
              if (!fromTable || !toTable) return null;

              // 🌟 객체(컬럼) 레벨 앵커 및 정밀 라운딩 직각선 경로 계산
              const { start, end, alignment } = getRelationAnchors(
                fromTable,
                rel.fromField,
                toTable,
                rel.toField
              );

              // 선택된 라인 스타일(직각 or 곡선)에 따른 경로 계산
              const { pathD, midX, midY } = computeRelationPath(
                start,
                end,
                alignment,
                lineStyle
              );

              const isConnectedToHovered =
                hoveredTableId === fromTable.id || hoveredTableId === toTable.id;
              const isSelfHovered = hoveredRelId === rel.id;
              const isAnyHovered = Boolean(hoveredTableId || hoveredRelId);

              let strokeOpacity = 0.75;
              let strokeWidth = 2.4;
              if (isAnyHovered) {
                if (isSelfHovered || isConnectedToHovered) {
                  strokeOpacity = 1.0;
                  strokeWidth = 3.2;
                } else {
                  strokeOpacity = 0.25;
                }
              }

              // 시작/끝 필드 정보
              const fromFieldObj = rel.fromField
                ? fromTable.fields.find((f) => f.id === rel.fromField || f.name === rel.fromField)
                : fromTable.fields.find((f) => f.isPrimaryKey) || fromTable.fields[0];
              const toFieldObj = rel.toField
                ? toTable.fields.find((f) => f.id === rel.toField || f.name === rel.toField)
                : toTable.fields.find((f) => f.isPrimaryKey) || toTable.fields[0];
              const relTooltip = `${fromTable.name}.${fromFieldObj?.name || "pk"} → ${toTable.name}.${toFieldObj?.name || "fk"}`;

              return (
                <g
                  key={rel.id}
                  className="pointer-events-auto group cursor-pointer"
                  onMouseEnter={() => setHoveredRelId(rel.id)}
                  onMouseLeave={() => setHoveredRelId(null)}
                >
                  <title>{relTooltip}</title>
                  {/* 클릭/호버 감지용 보이지 않는 굵은 히트박스 경로 */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="cursor-pointer"
                    onClick={() => onToggleRelationType?.(rel.id)}
                  />

                  {/* 실제 렌더링되는 관계선 경로 */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={rel.type === "N:M" ? "6,4" : undefined}
                    markerEnd="url(#erd-arrow)"
                    markerStart="url(#erd-circle)"
                    style={{ opacity: strokeOpacity }}
                    className="transition-all duration-100"
                  />

                  {/* 시작점과 끝점의 필드 포트 핀 표시 */}
                  <circle cx={start.x} cy={start.y} r={isSelfHovered ? 4.5 : 3.5} fill="var(--primary)" />
                  <circle cx={end.x} cy={end.y} r={isSelfHovered ? 4.5 : 3.5} fill="var(--primary)" />

                  {/* 중앙 관계 타입 라벨 (1:1, 1:N, N:M 순환 변경 및 삭제 배지) */}
                  <foreignObject
                    x={midX - 44}
                    y={midY - 14}
                    width={88}
                    height={28}
                    className="overflow-visible"
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`group/badge flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-container-high border border-outline-variant text-primary shadow-sm transition-all select-none ${
                          isSelfHovered || isConnectedToHovered
                            ? "scale-110 ring-2 ring-primary/40 shadow-md"
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleRelationType?.(rel.id)}
                          className="hover:underline cursor-pointer"
                          title={`${relTooltip} (클릭하여 관계 변경: 1:1 ↔ 1:N ↔ N:M)`}
                        >
                          {rel.type}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRelation(rel.id);
                          }}
                          className="opacity-0 group-hover/badge:opacity-100 hover:text-error transition-opacity ml-0.5 cursor-pointer"
                          title="관계선 삭제"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}

            {/* 🌟 2. 마우스로 직접 긋는 실시간 가이드선 (Interactive Dragging Line: 딜레이 0ms) */}
            {connectingState && connectingCursor && (
              (() => {
                const startX = connectingState.startX;
                const startY = connectingState.startY;

                let endX = connectingCursor.x;
                let endY = connectingCursor.y;

                // 스냅 대상 컬럼/테이블이 있는 경우 타겟 앵커 좌표로 착 달라붙음
                if (connectTarget) {
                  const targetTable = tables.find((t) => t.id === connectTarget.tableId);
                  if (targetTable) {
                    const side = targetTable.x > startX ? "left" : "right";
                    const targetAnchor = getFieldAnchor(targetTable, connectTarget.fieldId, side);
                    endX = targetAnchor.x;
                    endY = targetAnchor.y;
                  }
                }

                let guidePath = "";
                if (lineStyle === "orthogonal") {
                  const midX = (startX + endX) / 2;
                  const r = Math.min(8, Math.abs(midX - startX) / 2, Math.abs(endY - startY) / 2);
                  const signX1 = midX > startX ? 1 : -1;
                  const signY1 = endY > startY ? 1 : -1;
                  const signX2 = endX > midX ? 1 : -1;

                  if (Math.abs(startY - endY) < 4) {
                    guidePath = `M ${startX} ${startY} L ${endX} ${endY}`;
                  } else {
                    guidePath = [
                      `M ${startX} ${startY}`,
                      `L ${midX - signX1 * r} ${startY}`,
                      `Q ${midX} ${startY} ${midX} ${startY + signY1 * r}`,
                      `L ${midX} ${endY - signY1 * r}`,
                      `Q ${midX} ${endY} ${midX + signX2 * r} ${endY}`,
                      `L ${endX} ${endY}`,
                    ].join(" ");
                  }
                } else {
                  const dx = Math.max(30, Math.abs(endX - startX) * 0.5);
                  guidePath = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
                }

                return (
                  <g className="pointer-events-none">
                    <path
                      d={guidePath}
                      fill="none"
                      stroke={connectTarget ? "rgb(16, 185, 129)" : "var(--primary)"}
                      strokeWidth="2.8"
                      strokeDasharray="6,4"
                      markerEnd="url(#erd-arrow)"
                      className="animate-pulse"
                    />
                    <circle cx={startX} cy={startY} r="5" fill="var(--primary)" />
                    <circle
                      cx={endX}
                      cy={endY}
                      r={connectTarget ? "6" : "4"}
                      fill={connectTarget ? "rgb(16, 185, 129)" : "var(--primary)"}
                    />
                  </g>
                );
              })()
            )}
          </g>
        </svg>

        {/* ================= 테이블 카드 렌더링 컨테이너 ================= */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {tables.map((table) => {
            const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
              primary: { bg: "bg-primary/10", border: "border-primary/40", text: "text-primary" },
              blue: { bg: "bg-blue-500/10", border: "border-blue-500/40", text: "text-blue-500" },
              purple: { bg: "bg-purple-500/10", border: "border-purple-500/40", text: "text-purple-500" },
              emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-500" },
              rose: { bg: "bg-rose-500/10", border: "border-rose-500/40", text: "text-rose-500" },
              amber: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-500" },
            };
            const c = colorStyles[table.color || "primary"] || colorStyles.primary;
            const isHovered = hoveredTableId === table.id;
            const isDropTargetTable =
              connectingState &&
              connectingState.fromTableId !== table.id &&
              connectTarget?.tableId === table.id;

            return (
              <div
                key={table.id}
                data-table-card
                onMouseEnter={() => {
                  setHoveredTableId(table.id);
                  if (connectingState && connectingState.fromTableId !== table.id) {
                    const targetPk = table.fields.find((f) => f.isPrimaryKey) || table.fields[0];
                    if (targetPk && !connectTarget) {
                      setConnectTarget({
                        tableId: table.id,
                        fieldId: targetPk.id,
                        fieldName: targetPk.name,
                      });
                    }
                  }
                }}
                onMouseLeave={() => {
                  setHoveredTableId(null);
                  if (connectTarget?.tableId === table.id) {
                    setConnectTarget(null);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, table)}
                style={{
                  transform: `translate(${table.x}px, ${table.y}px)`,
                  width: CARD_WIDTH,
                }}
                className={`absolute pointer-events-auto bg-surface-container-lowest border rounded-2xl shadow-md overflow-visible transition-shadow duration-100 z-20 group ${
                  isDropTargetTable
                    ? "border-emerald-500 ring-4 ring-emerald-500/40 scale-[1.01] shadow-2xl"
                    : isHovered
                    ? "border-primary ring-2 ring-primary/40 shadow-xl"
                    : "border-outline-variant hover:border-primary/60 hover:shadow-lg"
                }`}
              >
                {/* 테이블 헤더 바 (드래그 이동 핸들) */}
                <div
                  onMouseDown={(e) => handleStartDragTable(e, table.id)}
                  style={{ height: HEADER_HEIGHT }}
                  className={`p-3 rounded-t-2xl border-b border-outline-variant/60 flex items-center justify-between cursor-move select-none ${c.bg}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TableProperties size={16} className={c.text} />
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-on-surface truncate block">
                        {table.name}
                      </span>
                      {table.comment && (
                        <span className="text-[11px] text-on-surface-variant truncate block font-light">
                          {table.comment}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* 🌟 테이블 기본키(PK) 간편 관계선 연결 핸들 */}
                    <button
                      type="button"
                      data-connect-handle
                      onMouseDown={(e) => handleStartConnectTable(e, table)}
                      className="p-1 rounded-md text-primary bg-primary/10 hover:bg-primary hover:text-on-primary transition-all cursor-crosshair shadow-2xs"
                      title="이 테이블의 기본키(PK)를 드래그하여 다른 테이블로 관계선을 연결하세요 (Drag to Connect)"
                    >
                      <Link2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTable(table);
                      }}
                      className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer"
                      title="테이블 수정"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTable(table.id);
                      }}
                      className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-surface-container cursor-pointer"
                      title="테이블 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* 컬럼 및 필드 목록 */}
                <div className="p-2 space-y-1 max-h-[360px] overflow-y-auto">
                  {table.fields.map((field) => {
                    const isPickerOpen = activeTypePicker === field.id;
                    const isFieldTarget =
                      connectTarget?.tableId === table.id && connectTarget?.fieldId === field.id;
                    const isFieldSource =
                      connectingState?.fromTableId === table.id &&
                      connectingState?.fromFieldId === field.id;

                    return (
                      <div
                        key={field.id}
                        data-field-row
                        onMouseEnter={() => {
                          if (connectingState && connectingState.fromTableId !== table.id) {
                            setConnectTarget({
                              tableId: table.id,
                              fieldId: field.id,
                              fieldName: field.name,
                            });
                          }
                        }}
                        style={{ height: ROW_HEIGHT }}
                        className={`relative flex items-center justify-between px-2 rounded-lg text-xs transition-all group/field ${
                          isFieldTarget
                            ? "bg-emerald-500/15 ring-2 ring-emerald-500 text-emerald-600 font-semibold scale-[1.01] shadow-xs"
                            : isFieldSource
                            ? "bg-primary/15 ring-2 ring-primary font-semibold"
                            : "hover:bg-surface-container-low text-on-surface"
                        }`}
                      >
                        {/* 좌측: PK 토글 버튼 + 필드 이름 인풋 */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {/* 🌟 기본키(PK) 원클릭 토글 버튼 */}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateField(table.id, field.id, {
                                isPrimaryKey: !field.isPrimaryKey,
                              })
                            }
                            className={`shrink-0 p-1 rounded-md transition-all cursor-pointer ${
                              field.isPrimaryKey
                                ? "text-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40"
                                : "text-on-surface-variant/30 hover:text-amber-500 hover:bg-surface-container"
                            }`}
                            title={
                              field.isPrimaryKey
                                ? "기본키(PK) 해제 (클릭)"
                                : "기본키(PK)로 지정 (클릭)"
                            }
                          >
                            <Key
                              size={12}
                              className={field.isPrimaryKey ? "fill-amber-500/30" : ""}
                            />
                          </button>

                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) =>
                              onUpdateField(table.id, field.id, { name: e.target.value })
                            }
                            className="bg-transparent font-medium text-on-surface focus:bg-surface-container-high px-1 py-0.5 rounded text-xs truncate focus:outline-none flex-1 min-w-0"
                            placeholder="column_name"
                          />
                        </div>

                        {/* 우측: 컬럼 관계선 포트 핸들 + 간소화된 자료형 뱃지 칩 + 삭제 버튼 */}
                        <div className="flex items-center gap-1 shrink-0 relative">
                          {/* 🌟 개별 컬럼(객체) 단위 관계선 연결 핸들 포트 */}
                          <button
                            type="button"
                            data-connect-handle
                            onMouseDown={(e) => handleStartConnectField(e, table, field)}
                            className={`p-1 rounded-md transition-all cursor-crosshair ${
                              isFieldSource
                                ? "bg-primary text-on-primary ring-1 ring-primary"
                                : isFieldTarget
                                ? "bg-emerald-500 text-white"
                                : "opacity-0 group-hover/field:opacity-100 text-primary hover:bg-primary/20"
                            }`}
                            title={`${table.name}.${field.name} 컬럼에서 드래그하여 다른 컬럼으로 관계선 연결`}
                          >
                            <Link2 size={11} />
                          </button>
                          {/* 🌟 번거로운 콤보박스 대신 깔끔한 미니멀 타입 뱃지 */}
                          <button
                            type="button"
                            data-type-picker-trigger
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPickerOpen) {
                                setActiveTypePicker(null);
                              } else {
                                setActiveTypePicker(field.id);
                                setCustomTypeInput(field.type);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                              isPickerOpen
                                ? "bg-primary text-on-primary shadow-xs"
                                : "bg-surface-container border border-outline-variant/60 text-primary hover:bg-primary/15"
                            }`}
                            title="자료형 변경 (클릭)"
                          >
                            {field.type || "VARCHAR"}
                          </button>

                          {/* 🌟 자료형 선택 팝오버 (클릭 시에만 가볍게 등장) */}
                          {isPickerOpen && (
                            <div
                              data-type-picker-popup
                              className="absolute right-0 top-full mt-1 z-50 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl p-2 w-48 text-xs animate-in fade-in zoom-in-95 duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 px-1">
                                자료형 선택
                              </div>
                              <div className="grid grid-cols-2 gap-1 mb-2">
                                {COMMON_DATA_TYPES.map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                      onUpdateField(table.id, field.id, { type: t });
                                      setActiveTypePicker(null);
                                    }}
                                    className={`px-1.5 py-1 text-[11px] font-mono rounded text-left truncate cursor-pointer transition-colors ${
                                      field.type === t
                                        ? "bg-primary text-on-primary font-bold"
                                        : "hover:bg-surface-container text-on-surface"
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>

                              {/* 직접 입력 인풋 */}
                              <div className="pt-1.5 border-t border-outline-variant/50 flex items-center gap-1">
                                <input
                                  type="text"
                                  value={customTypeInput}
                                  onChange={(e) => setCustomTypeInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && customTypeInput.trim()) {
                                      onUpdateField(table.id, field.id, {
                                        type: customTypeInput.trim(),
                                      });
                                      setActiveTypePicker(null);
                                    }
                                  }}
                                  placeholder="직접 입력..."
                                  className="w-full text-[11px] font-mono px-2 py-1 rounded bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary text-on-surface"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (customTypeInput.trim()) {
                                      onUpdateField(table.id, field.id, {
                                        type: customTypeInput.trim(),
                                      });
                                      setActiveTypePicker(null);
                                    }
                                  }}
                                  className="p-1 rounded bg-primary text-on-primary hover:bg-primary/90 cursor-pointer shrink-0"
                                  title="적용"
                                >
                                  <Check size={12} />
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeleteField(table.id, field.id)}
                            className="opacity-0 group-hover/field:opacity-100 p-1 text-on-surface-variant hover:text-error transition-opacity cursor-pointer"
                            title="컬럼 삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 하단 컬럼 추가 버튼 */}
                <div className="p-2 border-t border-outline-variant/40 bg-surface-container-low/40 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => onAddField(table.id)}
                    className="w-full py-1 text-center text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>컬럼 추가</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🌟 우클릭 컨텍스트 메뉴 (Context Menu Popup) */}
        {contextMenu && (
          <div
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="absolute z-50 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl p-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-100 text-xs font-medium text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.type === "table" && contextMenu.targetTable ? (
              <div className="space-y-0.5">
                <div className="px-2.5 py-1 text-[11px] font-bold text-on-surface-variant border-b border-outline-variant/50 flex items-center justify-between">
                  <span>{contextMenu.targetTable.name}</span>
                  <span className="text-[10px] font-mono opacity-70">테이블</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onEditTable(contextMenu.targetTable!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-left cursor-pointer"
                >
                  <Edit3 size={13} className="text-primary" />
                  <span>테이블 속성 수정</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onAddField(contextMenu.targetTable!.id);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-left cursor-pointer"
                >
                  <Plus size={13} className="text-secondary" />
                  <span>새 컬럼 추가</span>
                </button>

                {onDuplicateTable && (
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateTable(contextMenu.targetTable!.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-left cursor-pointer"
                  >
                    <Copy size={13} className="text-blue-500" />
                    <span>테이블 복제</span>
                  </button>
                )}

                {/* 색상 변경 서브 메뉴 */}
                {onChangeTableColor && (
                  <div className="pt-1 border-t border-outline-variant/50">
                    <span className="px-2.5 py-1 text-[10px] text-on-surface-variant block font-semibold">
                      테마 색상 변경
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      {[
                        { id: "primary", bg: "bg-primary" },
                        { id: "blue", bg: "bg-blue-500" },
                        { id: "purple", bg: "bg-purple-500" },
                        { id: "emerald", bg: "bg-emerald-500" },
                        { id: "rose", bg: "bg-rose-500" },
                        { id: "amber", bg: "bg-amber-500" },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onChangeTableColor(contextMenu.targetTable!.id, c.id);
                            setContextMenu(null);
                          }}
                          className={`w-4 h-4 rounded-full ${c.bg} hover:scale-125 transition-transform cursor-pointer shadow-xs`}
                          title={c.id}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-outline-variant/50 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    onDeleteTable(contextMenu.targetTable!.id);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-error/15 text-error text-left cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>테이블 삭제</span>
                </button>
              </div>
            ) : (
              /* 캔버스 빈 영역 우클릭 메뉴 */
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onAddTable();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-left cursor-pointer"
                >
                  <Plus size={13} className="text-primary" />
                  <span>새 테이블 추가</span>
                </button>

                {onAutoLayout && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoLayout();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-left cursor-pointer"
                  >
                    <LayoutGrid size={13} className="text-secondary" />
                    <span>스마트 자동 정렬</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onAddRelation();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-left cursor-pointer"
                >
                  <Link2 size={13} className="text-blue-500" />
                  <span>관계선 연결 모달</span>
                </button>

                <div className="h-px bg-outline-variant/50 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    onResetView();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-left cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>화면 초기화 (100%)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🌟 실시간 관계선 드래그 피드백 플로팅 뱃지 */}
        {connectingState && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high/95 backdrop-blur-md border border-primary/50 shadow-xl text-xs font-medium text-on-surface">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>
                <strong className="text-primary font-bold">
                  {tables.find((t) => t.id === connectingState.fromTableId)?.name}.{connectingState.fromFieldName}
                </strong>
                {" → "}
                {connectTarget ? (
                  <strong className="text-emerald-500 font-bold">
                    {tables.find((t) => t.id === connectTarget.tableId)?.name}.{connectTarget.fieldName}
                  </strong>
                ) : (
                  <span className="text-on-surface-variant font-normal">
                    대상 테이블 또는 컬럼 위로 마우스를 가져가세요
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* 캔버스 좌측 하단 정보 뱃지 및 인터랙션 안내 */}
        <div className="absolute left-4 bottom-14 sm:bottom-4 bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/80 rounded-xl px-3 py-1.5 text-[11px] font-mono text-on-surface-variant pointer-events-none shadow-md flex items-center gap-2">
          <span>배율: {Math.round(zoom * 100)}%</span>
          <span>·</span>
          <span>테이블 {tables.length}개</span>
          <span>·</span>
          <span>관계 {relations.length}개</span>
          <span className="hidden sm:inline opacity-70">
            · 💡 팁: 각 컬럼의 🔗 버튼을 드래그하여 객체(컬럼) 간 관계를 연결하세요!
          </span>
        </div>
      </div>
    </div>
  );
}
