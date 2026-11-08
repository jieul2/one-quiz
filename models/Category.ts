import mongoose, { Schema, Document } from "mongoose";

export type CategoryType = "board" | "blog" | "canvas" | "calendar" | "note";

export interface ICategory extends Document {
  type: CategoryType;
  name: string;
  slug: string;
  description?: string;
  color?: string; // "primary" | "emerald" | "amber" | "rose" | "violet" | "sky" | "slate"
  order: number;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["board", "blog", "canvas", "calendar", "note"],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "primary",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// type과 slug의 복합 유니크 인덱스
CategorySchema.index({ type: 1, slug: 1 }, { unique: true });
CategorySchema.index({ type: 1, order: 1, createdAt: 1 });

export default mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);
