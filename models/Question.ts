import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion extends Document {
  subjectId: mongoose.Types.ObjectId; // 👈 분리된 과목 스키마 참조
  examType: string;
  questionNumber: number;
  questionType: "multiple-choice" | "short-answer";
  title: string;
  codeSnippet?: string;
  options?: string[]; // 객관식 보기 배열 (기본 4개, 최소 2개 이상)
  correctAnswer: string[]; // 주관식/객관식 복수 정답 대응 배열
  explanation?: string;
  isActive: boolean; // 👈 문제 활성화 여부
  history: {
    isCorrect: boolean;
    timestamp: Date;
  }[];
}

const QuestionSchema: Schema = new Schema({
  subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true }, // 👈 과목 컬렉션과 연동
  examType: { type: String, required: true },
  questionNumber: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  questionType: {
    type: String,
    required: true,
    enum: ["multiple-choice", "short-answer"],
    default: "multiple-choice",
  },
  title: { type: String, required: true },
  codeSnippet: { type: String },
  options: {
    type: [String],
    default: ["", "", "", ""], // 기본 4개 보기
    validate: {
      validator: function (this: IQuestion, v: string[]) {
        if (this.questionType === "multiple-choice") {
          return v && v.length >= 2;
        }
        return true;
      },
      message: "객관식 문제는 최소 2개 이상의 보기가 필요합니다.",
    },
  },
  correctAnswer: {
    type: [String],
    required: true,
    validate: {
      validator: function (v: string[]) {
        return v && v.length > 0;
    },
      message: "최소 한 개 이상의 정답이 필요합니다.",
    },
  },
  explanation: { type: String },
  history: {
    type: [
      {
        isCorrect: { type: Boolean, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
});

export default mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);
