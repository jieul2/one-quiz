import mongoose, { Schema, Document } from "mongoose";

export interface IGroupMember {
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

export interface ISharedItem {
  id?: string;
  type: "quiz" | "note" | "calendar" | "canvas";
  title: string;
  link: string;
  sharedBy: string;
  createdAt: Date;
}

export interface IGroup extends Document {
  name: string;
  description: string;
  ownerEmail: string;
  ownerName: string;
  inviteCode: string;
  category: "시험대비" | "자격증" | "코딩/개발" | "자율스터디";
  members: IGroupMember[];
  sharedItems: ISharedItem[];
  channels: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    ownerEmail: { type: String, required: true, index: true },
    ownerName: { type: String, default: "스터디장" },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["시험대비", "자격증", "코딩/개발", "자율스터디"],
      default: "시험대비",
    },
    members: [
      {
        email: { type: String, required: true },
        name: { type: String, default: "회원" },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    sharedItems: [
      {
        type: {
          type: String,
          enum: ["quiz", "note", "calendar", "canvas"],
          required: true,
        },
        title: { type: String, required: true },
        link: { type: String, required: true },
        sharedBy: { type: String, default: "회원" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    channels: {
      type: [String],
      default: ["일반", "공지사항", "질문답변", "자료공유"],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);
