import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBacklogItem extends Document {
  authorEmail: string;
  id: string;
  title: string;
  description: string;
  status: "idea" | "review" | "approved" | "promoted";
  priority: "urgent" | "high" | "medium" | "low";
  isPublic: boolean;
  tags: string[];
  assignee?: string;
  promotedToProjectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BacklogItemSchema = new Schema<IBacklogItem>(
  {
    authorEmail: { type: String, required: true, index: true },
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["idea", "review", "approved", "promoted"],
      default: "idea",
    },
    priority: {
      type: String,
      enum: ["urgent", "high", "medium", "low"],
      default: "medium",
    },
    isPublic: { type: Boolean, default: true },
    tags: [{ type: String }],
    assignee: { type: String },
    promotedToProjectId: { type: String },
  },
  { timestamps: true },
);

const BacklogItem: Model<IBacklogItem> =
  mongoose.models.BacklogItem || mongoose.model<IBacklogItem>("BacklogItem", BacklogItemSchema);

export default BacklogItem;
