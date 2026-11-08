import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  groupId: string; // "global" 또는 Group ObjectId
  channelName: string; // "일반", "공지사항", "질문답변", "자료공유"
  senderEmail: string;
  senderName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    groupId: { type: String, required: true, default: "global", index: true },
    channelName: { type: String, required: true, default: "일반", index: true },
    senderEmail: { type: String, required: true, index: true },
    senderName: { type: String, default: "학습자" },
    content: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
);

ChatMessageSchema.index({ groupId: 1, channelName: 1, createdAt: 1 });

export default mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
