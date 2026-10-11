import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  questionId?: mongoose.Types.ObjectId;
  subject?: string;
  examType?: string;
  questionNumber?: number;
  questionText?: string;
  userEmail: string;
  reportReason: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: false },
  subject: { type: String, required: false },
  examType: { type: String, required: false },
  questionNumber: { type: Number, required: false },
  questionText: { type: String, required: false },
  userEmail: { type: String, default: 'anonymous' },
  reportReason: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'RESOLVED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);