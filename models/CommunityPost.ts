import mongoose, { Schema, Document } from "mongoose";

export interface IComment {
  id: string;
  authorEmail: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface ICommunityPost extends Document {
  authorEmail: string;
  authorName: string;
  category: "자유" | "질문답변" | "정보공유" | "일상·라이프" | "프로젝트" | "스터디모집" | "시험후기";
  title: string;
  content: string;
  tags: string[];
  views: number;
  likes: string[]; // userEmails
  comments: IComment[];
  linkedCalendarDate?: string; // e.g. "2026-11-20"
  createdAt: Date;
  updatedAt: Date;
}

const CommunityPostSchema: Schema = new Schema(
  {
    authorEmail: { type: String, required: true, index: true },
    authorName: { type: String, default: "학습자" },
    category: {
      type: String,
      enum: ["자유", "질문답변", "정보공유", "일상·라이프", "프로젝트", "스터디모집", "시험후기"],
      default: "자유",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    views: { type: Number, default: 0 },
    likes: { type: [String], default: [] },
    comments: [
      {
        id: { type: String, required: true },
        authorEmail: { type: String, required: true },
        authorName: { type: String, default: "학습자" },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    linkedCalendarDate: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

CommunityPostSchema.index({ category: 1, createdAt: -1 });

export default mongoose.models.CommunityPost ||
  mongoose.model<ICommunityPost>("CommunityPost", CommunityPostSchema);
