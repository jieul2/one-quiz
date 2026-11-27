import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  userEmail: string;
  userName?: string;
  type: "bug" | "feature" | "inquiry" | "feedback" | "report";
  title: string;
  content: string;
  rating?: number; // 1 ~ 5 별점
  status: "pending" | "in_progress" | "resolved" | "dismissed";
  adminReply?: string;
  repliedAt?: Date;
  questionId?: mongoose.Types.ObjectId;
  subject?: string;
  examType?: string;
  questionNumber?: number;
  reportId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userEmail: { type: String, required: true, index: true },
    userName: { type: String, default: "학습자" },
    type: {
      type: String,
      enum: ["bug", "feature", "inquiry", "feedback", "report"],
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
    questionId: { type: Schema.Types.ObjectId, ref: "Question" },
    subject: { type: String },
    examType: { type: String },
    questionNumber: { type: Number },
    reportId: { type: Schema.Types.ObjectId, ref: "Report" },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Feedback || mongoose.model<IFeedback>("Feedback", FeedbackSchema);
