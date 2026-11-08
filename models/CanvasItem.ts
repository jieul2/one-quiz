import mongoose, { Schema, Document } from "mongoose";

export interface ICanvasItem extends Document {
  userEmail: string;
  boardId: string;
  type: "sticky" | "sticker" | "meeting_card" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // e.g. "yellow", "blue", "green", "pink", "purple", "amber", "slate"
  content: string;
  authorName: string;
  stickers: string[]; // e.g. ["💡", "🔥", "✅", "🚀", "❤️"]
  votes: number;
  meetingStatus?: "todo" | "in_progress" | "done";
  createdAt: Date;
  updatedAt: Date;
}

const CanvasItemSchema: Schema = new Schema(
  {
    userEmail: { type: String, required: true, index: true },
    boardId: { type: String, required: true, default: "default-room", index: true },
    type: {
      type: String,
      enum: ["sticky", "sticker", "meeting_card", "text"],
      default: "sticky",
    },
    x: { type: Number, default: 100 },
    y: { type: Number, default: 100 },
    width: { type: Number, default: 220 },
    height: { type: Number, default: 180 },
    color: { type: String, default: "yellow" },
    content: { type: String, default: "" },
    authorName: { type: String, default: "학습자" },
    stickers: { type: [String], default: [] },
    votes: { type: Number, default: 0 },
    meetingStatus: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
    },
  },
  {
    timestamps: true,
  }
);

CanvasItemSchema.index({ boardId: 1, updatedAt: -1 });

export default mongoose.models.CanvasItem ||
  mongoose.model<ICanvasItem>("CanvasItem", CanvasItemSchema);
