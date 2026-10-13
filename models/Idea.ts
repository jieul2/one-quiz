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
  title: string;
  description?: string;
  status: string;
  priority: string;
  authorEmail?: string;
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
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: "idea" },
  priority: { type: String, default: "medium" },
  authorEmail: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  historyLogs: [HistoryLogSchema],
});

export default mongoose.models.Idea || mongoose.model<IIdea>("Idea", IdeaSchema);
