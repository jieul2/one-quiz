import mongoose, { Document } from "mongoose";

export interface ICalendarEvent extends Document {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  category: string;
  color?: string; // 캘린더 이벤트 색상 구분용
  authorEmail: string; // 작성자 이메일
  calendarType: "personal" | "group"; // 개인 캘린더 or 그룹 캘린더
  groupId?: string; // 그룹 공유 시 그룹 ID (추후 확장용)
  isTodo?: boolean; // 작은 단위의 일 (할 일 / To-Do)
  isCompleted?: boolean; // 완료 여부
  recurrence?: string; // 반복 유형 ("none" | "daily" | "weekly" | "monthly")
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  allDay: { type: Boolean, default: false },
  category: {
    type: String,
    default: "personal",
  },
  color: { type: String, default: "#4f46e5" },
  authorEmail: { type: String, required: true },
  calendarType: { type: String, enum: ["personal", "group"], default: "personal" },
  groupId: { type: String, default: null },
  isTodo: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  recurrence: { type: String, default: "none" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models.CalendarEvent) {
  delete (mongoose.models as Record<string, unknown>).CalendarEvent;
}

export default mongoose.model<ICalendarEvent>("CalendarEvent", CalendarEventSchema);
