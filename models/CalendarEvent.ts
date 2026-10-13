import mongoose, { Document } from "mongoose";

export interface ICalendarEvent extends Document {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  category: "work" | "personal" | "meeting" | "reminder" | "other";
  color?: string; // 캘린더 이벤트 색상 구분용
  authorEmail: string; // 작성자 이메일
  calendarType: "personal" | "group"; // 개인 캘린더 or 그룹 캘린더
  groupId?: string; // 그룹 공유 시 그룹 ID (추후 확장용)
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
    enum: ["work", "personal", "meeting", "reminder", "other"],
    default: "personal",
  },
  color: { type: String, default: "#3b82f6" }, // 기본 파란색
  authorEmail: { type: String, required: true },
  calendarType: { type: String, enum: ["personal", "group"], default: "personal" },
  groupId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.CalendarEvent ||
  mongoose.model<ICalendarEvent>("CalendarEvent", CalendarEventSchema);
