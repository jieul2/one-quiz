import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  subject: string;
  examType: string;
  questionNumber: number;
  questionType: 'multiple-choice' | 'short-answer';
  title: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  history: {
    isCorrect: boolean;
    timestamp: Date;
  }[];
}

const QuestionSchema: Schema = new Schema({
  subject: { type: String, required: true },
  examType: { type: String, required: true },
  questionNumber: { type: Number, required: true },
  questionType: { type: String, required: true, enum: ['multiple-choice', 'short-answer'], default: 'multiple-choice' },
  title: { type: String, required: true },
  codeSnippet: { type: String },
  options: {
    type: [String],
    validate: {
      validator: function(this: IQuestion, v: string[]) {
        if (this.questionType === 'multiple-choice') {
          return v && v.length === 4;
        }
        return true;
      },
      message: '객관식 문제는 4개의 보기가 필요합니다.'
    }
  },
  correctAnswer: { type: String, required: true },
  explanation: { type: String },
  history: {
    type: [{
      isCorrect: { type: Boolean, required: true },
      timestamp: { type: Date, default: Date.now }
    }],
    default: []
  }
});

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);