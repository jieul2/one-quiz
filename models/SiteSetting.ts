import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSetting extends Document {
  siteTitle: string;
  landingSubtitle: string;
  // 스터디 & 학습 정책 설정
  studyGoalQuestions: number;
  pomodoroDefaultMinutes: number;
  examDefaultTimeLimit: number;
  enableOnboardingGuide: boolean;
  // 시스템 공지사항 상단 배너
  enableNoticeBanner: boolean;
  noticeBannerText: string;
  noticeBannerType: 'info' | 'event' | 'alert';
  // 감사 로그 보존 정책 (일 단위)
  logRetentionDays: number;
  updatedAt: Date;
}

const SiteSettingSchema: Schema = new Schema({
  siteTitle: { type: String, required: true, default: '원퀴즈 (OneQuiz)' },
  landingSubtitle: { type: String, default: '혼자서 공부하는 수험생을 위한 올인원 스터디 플랫폼' },
  // 스터디 & 학습 정책
  studyGoalQuestions: { type: Number, default: 20 },
  pomodoroDefaultMinutes: { type: Number, default: 25 },
  examDefaultTimeLimit: { type: Number, default: 60 },
  enableOnboardingGuide: { type: Boolean, default: true },
  // 공지사항 배너
  enableNoticeBanner: { type: Boolean, default: false },
  noticeBannerText: { type: String, default: '2026 자격증/기출문제 신규 모의고사가 업데이트되었습니다!' },
  noticeBannerType: { type: String, enum: ['info', 'event', 'alert'], default: 'info' },
  // 감사 로그 보존 기간
  logRetentionDays: { type: Number, default: 90 },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.SiteSetting || mongoose.model<ISiteSetting>('SiteSetting', SiteSettingSchema);
