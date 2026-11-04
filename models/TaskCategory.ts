import mongoose, { Document } from "mongoose";

export interface ITaskCategory extends Document {
  authorEmail: string;
  categoryId: string;
  name: string;
  order: number;
}

const TaskCategorySchema = new mongoose.Schema(
  {
    authorEmail: { type: String, required: true, index: true },
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.TaskCategory ||
  mongoose.model<ITaskCategory>("TaskCategory", TaskCategorySchema);
