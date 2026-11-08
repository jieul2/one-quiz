import mongoose, { Schema, Document } from "mongoose";

export interface ICanvasRoom extends Document {
  roomId: string;
  title: string;
  description: string;
  category: string;
  creatorEmail: string;
  creatorName: string;
  createdAt: Date;
  updatedAt: Date;
}

const CanvasRoomSchema: Schema = new Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "브레인스토밍" },
    creatorEmail: { type: String, required: true },
    creatorName: { type: String, default: "학습자" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CanvasRoom ||
  mongoose.model<ICanvasRoom>("CanvasRoom", CanvasRoomSchema);
