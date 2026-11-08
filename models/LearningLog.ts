import mongoose, { Schema, Document } from "mongoose";

export interface ISubjectStat {
  subject: string;
  solved: number;
  correct: number;
}

export interface IActivityItem {
  type: "exam" | "diary" | "task" | "timer";
  title: string;
  timestamp: Date;
}

export interface ILearningLog extends Document {
  userEmail: string;
  date: string; // YYYY-MM-DD
  studyMinutes: number; // 스터디 집중 시간 (분)
  questionsSolved: number; // 푼 문제 수
  questionsCorrect: number; // 맞힌 문제 수
  diaryWritten: boolean; // 일기 작성 여부
  tasksCompleted: number; // 완료한 할일 수
  subjectBreakdown: ISubjectStat[];
  recentActivities: IActivityItem[];
  createdAt: Date;
  updatedAt: Date;
}

const LearningLogSchema = new Schema<ILearningLog>(
  {
    userEmail: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    studyMinutes: { type: Number, default: 0 },
    questionsSolved: { type: Number, default: 0 },
    questionsCorrect: { type: Number, default: 0 },
    diaryWritten: { type: Boolean, default: false },
    tasksCompleted: { type: Number, default: 0 },
    subjectBreakdown: [
      {
        subject: { type: String, required: true },
        solved: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
      },
    ],
    recentActivities: [
      {
        type: { type: String, enum: ["exam", "diary", "task", "timer"], required: true },
        title: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 사용자 + 일자 복합 유니크 인덱스
LearningLogSchema.index({ userEmail: 1, date: 1 }, { unique: true });

export default mongoose.models.LearningLog ||
  mongoose.model<ILearningLog>("LearningLog", LearningLogSchema);
