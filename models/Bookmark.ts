import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookmark extends Document {
  authorEmail: string;
  id: string;
  title: string;
  url: string;
  category: string;
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    authorEmail: { type: String, required: true, index: true },
    id: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    category: { type: String, default: "자격시험" },
    starred: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Bookmark: Model<IBookmark> =
  mongoose.models.Bookmark || mongoose.model<IBookmark>("Bookmark", BookmarkSchema);

export default Bookmark;

