import mongoose, { Document, Schema } from "mongoose";

export interface IPoint {
  x: number;
  y: number;
}

export type DrawToolType =
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "rect"
  | "circle"
  | "arrow"
  | "text";

export interface IDrawElement {
  id: string;
  type: DrawToolType;
  points?: IPoint[];
  startPoint?: IPoint;
  endPoint?: IPoint;
  color: string;
  strokeWidth: number;
  opacity: number;
  filled?: boolean;
  fillColor?: string;
  text?: string;
  fontSize?: number;
}

export interface IDrawing extends Document {
  userEmail: string;
  title: string;
  elements: IDrawElement[];
  thumbnail?: string;
  backgroundColor: string;
  backgroundPattern: "blank" | "grid" | "dots" | "ruled" | "dark";
  canvasWidth?: number;
  canvasHeight?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DrawElementSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    points: [{ x: Number, y: Number, _id: false }],
    startPoint: { x: Number, y: Number, _id: false },
    endPoint: { x: Number, y: Number, _id: false },
    color: { type: String, default: "#1e293b" },
    strokeWidth: { type: Number, default: 4 },
    opacity: { type: Number, default: 1 },
    filled: { type: Boolean, default: false },
    text: { type: String },
    fontSize: { type: Number },
  },
  { _id: false }
);

const DrawingSchema = new Schema<IDrawing>(
  {
    userEmail: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "새로운 스케치" },
    elements: { type: [DrawElementSchema], default: [] },
    thumbnail: { type: String },
    backgroundColor: { type: String, default: "#ffffff" },
    backgroundPattern: {
      type: String,
      enum: ["blank", "grid", "dots", "ruled", "dark"],
      default: "blank",
    },
    canvasWidth: { type: Number, default: 1920 },
    canvasHeight: { type: Number, default: 1080 },
  },
  { timestamps: true }
);

export default mongoose.models.Drawing || mongoose.model<IDrawing>("Drawing", DrawingSchema);
