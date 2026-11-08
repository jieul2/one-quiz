import mongoose, { Schema, Document } from "mongoose";

export interface IQuestionAttempt extends Document {
  userEmail: string;
  questionId: mongoose.Types.ObjectId;
  isCorrect: boolean;
  userAnswer?: string;
  subject?: string;
  examType?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionAttemptSchema: Schema = new Schema(
  {
    userEmail: { type: String, required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    isCorrect: { type: Boolean, required: true },
    userAnswer: { type: String, default: "" },
    subject: { type: String, default: "" },
    examType: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 사용자별 + 문제별 빠른 조회를 위한 복합 인덱스
QuestionAttemptSchema.index({ userEmail: 1, questionId: 1 });
QuestionAttemptSchema.index({ userEmail: 1, timestamp: -1 });

export default mongoose.models.QuestionAttempt ||
  mongoose.model<IQuestionAttempt>("QuestionAttempt", QuestionAttemptSchema);
