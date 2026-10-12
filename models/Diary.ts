import mongoose, { Schema, Document } from 'mongoose';

export interface IDiaryItem {
  title: string;
  content: string;
}

export interface IDiary extends Document {
  userEmail: string;
  items: IDiaryItem[];
  createdAt: Date;
}

const DiaryItemSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
});

const DiarySchema: Schema = new Schema({
  userEmail: { type: String, required: true, index: true },
  items: [DiaryItemSchema], // 👈 제목과 내용이 배열 형태로 저장됨
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Diary || mongoose.model<IDiary>('Diary', DiarySchema);