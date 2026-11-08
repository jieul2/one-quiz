import mongoose, { Document } from "mongoose";

export interface IRunningLog extends Document {
  userEmail: string;
  userName?: string;
  date: Date;
  distanceKm: number; // 거리 (km)
  durationMinutes: number; // 운동 시간 (분)
  pace: string; // 페이스 (예: "5'24\"")
  calories: number; // 칼로리 (kcal)
  heartRateAvg?: number; // 평균 심박수 (bpm)
  cadence?: number; // 케이던스 (spm)
  location?: string; // 코스/장소
  shoes?: string; // 러닝화 모델
  weather?: string; // 날씨
  memo?: string; // 메모/소감
  proofImageUrl?: string; // 달리기 인증 사진 URL
  aiFeedback?: string; // AI 코치 맞춤 피드백
  createdAt: Date;
  updatedAt: Date;
}

const RunningLogSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    distanceKm: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    pace: { type: String, required: true },
    calories: { type: Number, default: 0 },
    heartRateAvg: { type: Number, default: 0 },
    cadence: { type: Number, default: 0 },
    location: { type: String, default: "" },
    shoes: { type: String, default: "" },
    weather: { type: String, default: "맑음" },
    memo: { type: String, default: "" },
    proofImageUrl: { type: String, default: "" },
    aiFeedback: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.RunningLog ||
  mongoose.model<IRunningLog>("RunningLog", RunningLogSchema);
