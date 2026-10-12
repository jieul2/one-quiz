import mongoose, { Schema, Document } from 'mongoose';

export interface IDiaryItem {
  title: string;
  content: string;
  images: string[]; // 👈 여러 개의 Cloudinary 이미지 URL을 담는 배열
}

export interface IDiary extends Document {
  userEmail: string;
  items: IDiaryItem[];
  createdAt: Date;
}

const DiaryItemSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  images: { type: [String], default: [] }, // 👈 여러 개의 Cloudinary 이미지 URL을 담는 배열
});

const DiarySchema: Schema = new Schema({
  userEmail: { type: String, required: true, index: true },
  items: [DiaryItemSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Diary || mongoose.model<IDiary>('Diary', DiarySchema);