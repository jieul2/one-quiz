import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDriveDoc extends Document {
  authorEmail: string;
  id: string;
  name: string;
  type: "text" | "sheet" | "draw";
  size: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriveDocSchema = new Schema<IDriveDoc>(
  {
    authorEmail: { type: String, required: true, index: true },
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "sheet", "draw"],
      default: "text",
    },
    size: { type: String, default: "12 KB" },
  },
  { timestamps: true },
);

const DriveDoc: Model<IDriveDoc> =
  mongoose.models.DriveDoc || mongoose.model<IDriveDoc>("DriveDoc", DriveDocSchema);

export default DriveDoc;
