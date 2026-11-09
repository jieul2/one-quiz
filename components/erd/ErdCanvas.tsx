"use client";

import React, { useRef, useState, useCallback } from "react";
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
}

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
}: ErdCanvasProps) {
  // 드래그 및 마우스 조작 refs
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
  const draggingTableIdRef = useRef<string | null>(null);
  const tableDragOffsetRef = useRef({ x: 0, y: 0 });

  // 호버된 테이블 / 관계선 (복잡한 다이어그램에서 가독성 극대화)
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 카드나 버튼 클릭 시 캔버스 패닝 방지
    if ((e.target as HTMLElement).closest("[data-table-card]")) return;
    if ((e.target as HTMLElement).closest("button")) return;

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
      return;
    }

    if (draggingTableIdRef.current) {
      const tableId = draggingTableIdRef.current;
      const dx = (e.clientX - tableDragOffsetRef.current.x) / zoom;
      const dy = (e.clientY - tableDragOffsetRef.current.y) / zoom;

      onUpdateTablePos(tableId, dx, dy);
      tableDragOffsetRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingTableIdRef.current) {
      draggingTableIdRef.current = null;
      onDragEnd();
    }
    isDraggingCanvasRef.current = false;
  };

  const handleStartDragTable = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    draggingTableIdRef.current = tableId;
    tableDragOffsetRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div className="space-y-3">
      {/* 캔버스 상단 툴바 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddTable}
            className="ui-button px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>테이블 추가</span>
          </button>

          <button
            type="button"
            onClick={onAddRelation}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Link2 size={14} className="text-primary" />
            <span>관계 연결</span>
          </button>
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

      {/* 캔버스 뷰포트 (무한 2D 평면: 음수/양수 자유 이동 지원) */}
      <div
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        className="relative w-full h-[720px] rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden cursor-grab active:cursor-grabbing shadow-inner select-none"
        style={{
          backgroundImage: `radial-gradient(var(--outline-variant) 1px, transparent 1px)`,
          backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* ================= 관계선 SVG 오버레이 ================= */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {relations.map((rel) => {
            const fromTable = tables.find((t) => t.id === rel.fromTable || t.name === rel.fromTable);
            const toTable = tables.find((t) => t.id === rel.toTable || t.name === rel.toTable);
            if (!fromTable || !toTable) return null;

            // 정확한 카드 폭(310) 및 높이 상수 정합성 보장
            const isFromLeftOfTo = fromTable.x + CARD_WIDTH / 2 < toTable.x + CARD_WIDTH / 2;
            const startTableX = isFromLeftOfTo ? fromTable.x + CARD_WIDTH : fromTable.x;
            const endTableX = isFromLeftOfTo ? toTable.x : toTable.x + CARD_WIDTH;

            // 세로 방향: 매칭되는 필드가 있으면 해당 행 정중앙, 없으면 카드 상단 헤더 정중앙
            const fromFieldIdx = fromTable.fields.findIndex(
              (f) => f.id === rel.fromField || f.name === rel.fromField
            );
            const toFieldIdx = toTable.fields.findIndex(
              (f) => f.id === rel.toField || f.name === rel.toField
            );

            const startTableY =
              fromFieldIdx >= 0
                ? fromTable.y + HEADER_HEIGHT + fromFieldIdx * ROW_HEIGHT + ROW_HEIGHT / 2
                : fromTable.y + HEADER_HEIGHT / 2;

            const endTableY =
              toFieldIdx >= 0
                ? toTable.y + HEADER_HEIGHT + toFieldIdx * ROW_HEIGHT + ROW_HEIGHT / 2
                : toTable.y + HEADER_HEIGHT / 2;

            // 화면 픽셀 좌표계로 투영 변환
            const startX = startTableX * zoom + pan.x;
            const startY = startTableY * zoom + pan.y;
            const endX = endTableX * zoom + pan.x;
            const endY = endTableY * zoom + pan.y;

            // 전문 ERD 수평 S자 베지어 곡선 (Cubic Bezier with Horizontal Handles)
            const dx = Math.abs(endX - startX);
            const curvature = Math.max(40, Math.min(220, dx * 0.45));
            const cp1x = isFromLeftOfTo ? startX + curvature : startX - curvature;
            const cp2x = isFromLeftOfTo ? endX - curvature : endX + curvature;

            const pathD = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            // 다이어그램 선 가독성 최적화: 마우스 호버 시 강조 / 미선택 시 은은한 가독성 보장
            const isConnectedToHovered =
              hoveredTableId === fromTable.id || hoveredTableId === toTable.id;
            const isSelfHovered = hoveredRelId === rel.id;
            const isAnyHovered = Boolean(hoveredTableId || hoveredRelId);

            let strokeOpacity = 0.65;
            let strokeWidth = 2;
            if (isAnyHovered) {
              if (isSelfHovered || isConnectedToHovered) {
                strokeOpacity = 1.0;
                strokeWidth = 2.8;
              } else {
                strokeOpacity = 0.22;
              }
            }

            return (
              <g
                key={rel.id}
                className="pointer-events-auto group cursor-pointer"
                onMouseEnter={() => setHoveredRelId(rel.id)}
                onMouseLeave={() => setHoveredRelId(null)}
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={rel.type === "N:M" ? "5,5" : undefined}
                  style={{ opacity: strokeOpacity }}
                  className="transition-all duration-150"
                />

                {/* 시작점 & 끝점 앵커 포트 원 */}
                <circle
                  cx={startX}
                  cy={startY}
                  r="4"
                  fill="var(--primary)"
                  style={{ opacity: strokeOpacity }}
                />
                <circle
                  cx={endX}
                  cy={endY}
                  r="4"
                  fill="var(--primary)"
                  style={{ opacity: strokeOpacity }}
                />

                {/* 관계선 라벨 및 삭제 트리거 */}
                <foreignObject
                  x={midX - 35}
                  y={midY - 14}
                  width={70}
                  height={28}
                  className="overflow-visible"
                >
                  <div className="flex items-center justify-center">
                    <span
                      onClick={() => onDeleteRelation(rel.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-container-high border border-outline-variant text-primary shadow-xs hover:bg-error hover:text-white cursor-pointer transition-all ${
                        isSelfHovered || isConnectedToHovered ? "scale-110 ring-2 ring-primary/40" : ""
                      }`}
                      title={`${rel.comment || "테이블 관계"} (클릭하여 관계선 삭제)`}
                    >
                      {rel.type}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
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

            return (
              <div
                key={table.id}
                data-table-card
                onMouseEnter={() => setHoveredTableId(table.id)}
                onMouseLeave={() => setHoveredTableId(null)}
                style={{
                  transform: `translate(${table.x}px, ${table.y}px)`,
                  width: CARD_WIDTH,
                }}
                className={`absolute pointer-events-auto bg-surface-container-lowest border rounded-2xl shadow-md overflow-hidden transition-all duration-150 z-20 group ${
                  isHovered
                    ? "border-primary ring-2 ring-primary/40 shadow-xl"
                    : "border-outline-variant hover:border-primary/60 hover:shadow-lg"
                }`}
              >
                {/* 테이블 헤더 바 (드래그 핸들) */}
                <div
                  onMouseDown={(e) => handleStartDragTable(e, table.id)}
                  style={{ height: HEADER_HEIGHT }}
                  className={`p-3 border-b border-outline-variant/60 flex items-center justify-between cursor-move ${c.bg}`}
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
                <div className="p-2 space-y-1 max-h-[320px] overflow-y-auto">
                  {table.fields.map((field) => (
                    <div
                      key={field.id}
                      style={{ height: ROW_HEIGHT }}
                      className="flex items-center justify-between px-2 rounded-lg hover:bg-surface-container-low text-xs transition-colors group/field"
                    >
                      {/* 필드 키 인디케이터 및 컬럼명 */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {field.isPrimaryKey ? (
                          <span title="Primary Key" className="shrink-0 flex items-center">
                            <Key size={12} className="text-amber-500" />
                          </span>
                        ) : field.isForeignKey ? (
                          <span title="Foreign Key" className="shrink-0 flex items-center">
                            <Link2 size={12} className="text-blue-500" />
                          </span>
                        ) : (
                          <span className="w-3" />
                        )}

                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => onUpdateField(table.id, field.id, { name: e.target.value })}
                          className="bg-transparent font-medium text-on-surface focus:bg-surface-container-high px-1 py-0.5 rounded text-xs truncate focus:outline-none w-28"
                        />
                      </div>

                      {/* 필드 타입 및 옵션 */}
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={field.type}
                          onChange={(e) => onUpdateField(table.id, field.id, { type: e.target.value })}
                          className="text-[11px] font-mono px-1 py-0.5 rounded bg-surface-container-low border border-outline-variant/60 text-on-surface-variant focus:outline-none"
                        >
                          <option value="String">String</option>
                          <option value="Number">Number</option>
                          <option value="Boolean">Boolean</option>
                          <option value="Date">Date</option>
                          <option value="ObjectId">ObjectId</option>
                          <option value="Array">Array</option>
                          <option value="JSON">JSON</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => onDeleteField(table.id, field.id)}
                          className="opacity-0 group-hover/field:opacity-100 p-1 text-on-surface-variant hover:text-error transition-opacity cursor-pointer"
                          title="컬럼 삭제"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 하단 컬럼 추가 버튼 */}
                <div className="p-2 border-t border-outline-variant/40 bg-surface-container-low/40">
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

        {/* 캔버스 좌측 하단 정보 뱃지 */}
        <div className="absolute left-4 bottom-4 bg-surface-container-lowest/80 backdrop-blur-xs border border-outline-variant/60 rounded-xl px-3 py-1.5 text-[11px] font-mono text-on-surface-variant pointer-events-none shadow-xs flex items-center gap-2">
          <span>배율: {Math.round(zoom * 100)}%</span>
          <span>·</span>
          <span>테이블: {tables.length}개</span>
          <span>·</span>
          <span>엔티티 관계: {relations.length}개</span>
        </div>
      </div>
    </div>
  );
}
