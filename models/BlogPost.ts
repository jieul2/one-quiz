import mongoose, { Schema, Document } from "mongoose";

export interface IBlogPost extends Document {
  authorEmail: string;
  authorName: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Markdown
  category: "기술/개발" | "생산성/라이프" | "트렌드/이슈" | "기획/디자인" | "알고리즘" | "자격증" | "공부법" | "회고";
  tags: string[];
  readTime: number; // minutes
  views: number;
  likes: string[]; // userEmails
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema: Schema = new Schema(
  {
    authorEmail: { type: String, required: true, index: true },
    authorName: { type: String, default: "원퀴즈 에디터" },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ["기술/개발", "생산성/라이프", "트렌드/이슈", "기획/디자인", "알고리즘", "자격증", "공부법", "회고"],
      default: "기술/개발",
      index: true,
    },
    tags: { type: [String], default: [] },
    readTime: { type: Number, default: 3 },
    views: { type: Number, default: 0 },
    likes: { type: [String], default: [] },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

BlogPostSchema.index({ category: 1, createdAt: -1 });

export default mongoose.models.BlogPost ||
  mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);
