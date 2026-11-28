import mongoose, { Schema, Document, Model } from "mongoose";
import type { CollabModuleType, CollabRole } from "@/lib/collaborationTypes";

export interface INotification extends Document {
  recipientEmail: string;
  senderEmail: string;
  senderName: string;
  type:
    | "collab_invite"
    | "collab_accepted"
    | "collab_rejected"
    | "collab_removed"
    | "collab_left"
    | "collab_role_changed"
    | "system";
  moduleType: CollabModuleType;
  targetId: string;
  targetTitle: string;
  inviteId?: string;
  role?: CollabRole;
  title: string;
  message: string;
  actionStatus: "pending" | "accepted" | "rejected" | "none";
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientEmail: { type: String, required: true, index: true },
    senderEmail: { type: String, required: true },
    senderName: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "collab_invite",
        "collab_accepted",
        "collab_rejected",
        "collab_removed",
        "collab_left",
        "collab_role_changed",
        "system",
      ],
      required: true,
    },
    moduleType: {
      type: String,
      enum: ["canvas", "roadmap", "backlog", "mindmap", "erd", "drawing"],
      required: true,
    },
    targetId: { type: String, required: true },
    targetTitle: { type: String, required: true },
    inviteId: { type: String },
    role: { type: String, enum: ["editor", "viewer"] },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    actionStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "none"],
      default: "none",
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientEmail: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
