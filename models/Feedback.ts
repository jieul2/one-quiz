import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  userEmail: string;
  userName?: string;
  type: "bug" | "feature" | "inquiry" | "feedback";
  title: string;
  content: string;
  rating?: number; // 1 ~ 5 별점
  status: "pending" | "in_progress" | "resolved" | "dismissed";
  adminReply?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userEmail: { type: String, required: true, index: true },
    userName: { type: String, default: "학습자" },
    type: {
      type: String,
      enum: ["bug", "feature", "inquiry", "feedback"],
      default: "feedback",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    adminReply: { type: String, default: "" },
    repliedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", FeedbackSchema);
