import mongoose, { Schema, Document, Model } from "mongoose";
import type { CollabModuleType, CollabRole } from "@/lib/collaborationTypes";

export interface ICollaborationInvite extends Document {
  moduleType: CollabModuleType;
  targetId: string;
  targetTitle: string;
  role: CollabRole;
  senderEmail: string;
  senderName: string;
  receiverEmail: string;
  receiverName: string;
  message: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  rejectReason?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CollaborationInviteSchema = new Schema<ICollaborationInvite>(
  {
    moduleType: {
      type: String,
      enum: ["canvas", "roadmap", "backlog", "mindmap", "erd", "drawing"],
      required: true,
      index: true,
    },
    targetId: { type: String, required: true, index: true },
    targetTitle: { type: String, required: true },
    role: {
      type: String,
      enum: ["editor", "viewer"],
      default: "editor",
    },
    senderEmail: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    receiverEmail: { type: String, required: true, index: true },
    receiverName: { type: String, required: true },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    rejectReason: { type: String, default: "" },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

CollaborationInviteSchema.index({
  moduleType: 1,
  targetId: 1,
  receiverEmail: 1,
  status: 1,
});

const CollaborationInvite: Model<ICollaborationInvite> =
  mongoose.models.CollaborationInvite ||
  mongoose.model<ICollaborationInvite>(
    "CollaborationInvite",
    CollaborationInviteSchema
  );

export default CollaborationInvite;
