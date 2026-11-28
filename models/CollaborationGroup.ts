import mongoose, { Schema, Document, Model } from "mongoose";
import type { CollabModuleType, CollabRole } from "@/lib/collaborationTypes";

export interface ICollaborationMember {
  email: string;
  name: string;
  role: CollabRole;
  joinedAt: Date;
}

export interface ICollaborationGroup extends Document {
  moduleType: CollabModuleType;
  targetId: string;
  targetTitle: string;
  ownerEmail: string;
  ownerName: string;
  members: ICollaborationMember[];
  createdAt: Date;
  updatedAt: Date;
}

const CollaborationMemberSchema = new Schema<ICollaborationMember>(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["editor", "viewer"],
      default: "editor",
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CollaborationGroupSchema = new Schema<ICollaborationGroup>(
  {
    moduleType: {
      type: String,
      enum: ["canvas", "roadmap", "backlog", "mindmap", "erd", "drawing"],
      required: true,
    },
    targetId: { type: String, required: true },
    targetTitle: { type: String, required: true },
    ownerEmail: { type: String, required: true, index: true },
    ownerName: { type: String, required: true },
    members: { type: [CollaborationMemberSchema], default: [] },
  },
  { timestamps: true }
);

CollaborationGroupSchema.index(
  { moduleType: 1, targetId: 1 },
  { unique: true }
);
CollaborationGroupSchema.index({ moduleType: 1, "members.email": 1 });

const CollaborationGroup: Model<ICollaborationGroup> =
  mongoose.models.CollaborationGroup ||
  mongoose.model<ICollaborationGroup>(
    "CollaborationGroup",
    CollaborationGroupSchema
  );

export default CollaborationGroup;
