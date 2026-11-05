import mongoose, { Document } from "mongoose";

export interface IHistoryChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface IHistoryLog {
  message: string;
  changes: IHistoryChange[];
  updatedAt: Date;
}

export interface IIdea extends Document {
  id?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  authorEmail?: string;
  tags?: string[];
  isPublic?: boolean;
  assignee?: string;
  promotedToProjectId?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  historyLogs: IHistoryLog[];
}

const HistoryLogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  changes: [
    {
      field: String,
      oldValue: String,
      newValue: String,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

const IdeaSchema = new mongoose.Schema({
  id: { type: String, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, default: "idea" },
  priority: { type: String, default: "medium" },
  authorEmail: { type: String },
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: true },
  assignee: { type: String },
  promotedToProjectId: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  color: { type: String, default: "#0284c7" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  historyLogs: [HistoryLogSchema],
});

export default mongoose.models.Idea || mongoose.model<IIdea>("Idea", IdeaSchema);
