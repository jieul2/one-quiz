import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoadmapComment {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
}

export interface IRoadmapItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string;
  comments: IRoadmapComment[];
  sourceBacklogId?: string;
  assignee?: string;
}

export interface IProjectRoadmap extends Document {
  authorEmail: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  members: { email: string; name: string; role: "admin" | "editor" | "viewer" }[];
  items: IRoadmapItem[];
}

const RoadmapCommentSchema = new Schema<IRoadmapComment>(
  {
    id: { type: String, required: true },
    authorName: { type: String, required: true },
    authorEmail: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false },
);

const RoadmapItemSchema = new Schema<IRoadmapItem>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    color: { type: String },
    comments: [RoadmapCommentSchema],
    sourceBacklogId: { type: String },
    assignee: { type: String },
  },
  { _id: false },
);

const ProjectRoadmapSchema = new Schema<IProjectRoadmap>(
  {
    authorEmail: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    isPublic: { type: Boolean, default: true },
    members: [
      {
        email: { type: String, required: true },
        name: { type: String, required: true },
        role: {
          type: String,
          enum: ["admin", "editor", "viewer"],
          default: "editor",
        },
        _id: false,
      },
    ],
    items: [RoadmapItemSchema],
  },
  { timestamps: true },
);

const ProjectRoadmap: Model<IProjectRoadmap> =
  mongoose.models.ProjectRoadmap ||
  mongoose.model<IProjectRoadmap>("ProjectRoadmap", ProjectRoadmapSchema);

export default ProjectRoadmap;
