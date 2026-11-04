import mongoose, { Document } from "mongoose";

export interface ITask extends Document {
  authorEmail: string;
  categoryId: string;
  title: string;
  memo?: string;
  dueDate?: string | null;
  completed: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new mongoose.Schema(
  {
    authorEmail: { type: String, required: true, index: true },
    categoryId: { type: String, default: "cat-today", index: true },
    title: { type: String, required: true },
    memo: { type: String, default: "" },
    dueDate: { type: String, default: null },
    completed: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
