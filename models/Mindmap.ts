import mongoose, { Document } from "mongoose";

export interface IMindmap extends Document {
  authorEmail: string;
  title: string;
  nodeCount: number;
  lastEdited: string;
  rootNode: string;
  branches: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MindmapSchema = new mongoose.Schema(
  {
    authorEmail: { type: String, required: true, index: true },
    title: { type: String, required: true },
    nodeCount: { type: Number, default: 5 },
    lastEdited: { type: String, default: "2026-11-04" },
    rootNode: { type: String, required: true },
    branches: [{ type: String }],
  },
  { timestamps: true },
);

export default mongoose.models.Mindmap || mongoose.model<IMindmap>("Mindmap", MindmapSchema);
