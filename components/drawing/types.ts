export type DrawTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "text"
  | "hand";

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
  elementCount?: number;
  updatedAt: string;
  createdAt?: string;
}

export const PRESET_COLORS = [
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

export const STROKE_WIDTHS = [
  { label: "얇게", value: 2 },
  { label: "보통", value: 4 },
  { label: "굵게", value: 8 },
  { label: "아주 굵게", value: 16 },
  { label: "마커", value: 28 },
];

export const BG_PATTERNS: { id: BgPattern; label: string; desc: string }[] = [
  { id: "blank", label: "클린 화이트", desc: "순백색 캔버스" },
  { id: "grid", label: "모눈종이 격자", desc: "와이어프레임 & 설계" },
  { id: "dots", label: "점선 도트", desc: "불렛저널 스타일" },
  { id: "ruled", label: "줄노트", desc: "필기 & 아이디어 노트" },
  { id: "dark", label: "블랙보드 칠판", desc: "초크 다크 모드" },
];
