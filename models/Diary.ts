import mongoose, { Schema, Document } from 'mongoose';

export interface IDiary extends Document {
  userEmail: string;
  title: string;
  content: string;
  createdAt: Date;
}

const DiarySchema: Schema = new Schema({
  userEmail: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Diary || mongoose.model<IDiary>('Diary', DiarySchema);