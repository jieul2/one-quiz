import mongoose, { Document } from "mongoose";

export interface IMindmapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  parentId?: string | null;
  color?: string;
  fontSize?: number;
  isRoot?: boolean;
}

export interface IMindmap extends Document {
  authorEmail: string;
  title: string;
  nodeCount: number;
  lastEdited: string;
  rootNode: string;
  branches: string[];
  nodes?: IMindmapNode[];
  createdAt: Date;
  updatedAt: Date;
}

const MindmapNodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    parentId: { type: String, default: null },
    color: { type: String, default: "primary" },
    fontSize: { type: Number, default: 14 },
    isRoot: { type: Boolean, default: false },
  },
  { _id: false }
);

const MindmapSchema = new mongoose.Schema(
  {
    authorEmail: { type: String, required: true, index: true },
    title: { type: String, required: true },
    nodeCount: { type: Number, default: 5 },
    lastEdited: { type: String, default: "2026-11-04" },
    rootNode: { type: String, required: true },
    branches: [{ type: String }],
    nodes: [MindmapNodeSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Mindmap || mongoose.model<IMindmap>("Mindmap", MindmapSchema);
