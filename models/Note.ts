import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  userEmail: string;
  folder: string;
  title: string;
  content: string;
  tags: string[];
  sourceDiaryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema(
  {
    userEmail: { type: String, required: true, index: true },
    folder: { type: String, required: true, default: "일반", index: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    tags: { type: [String], default: [] },
    sourceDiaryId: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

NoteSchema.index({ userEmail: 1, folder: 1, updatedAt: -1 });

export default mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);
