import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContact extends Document {
  authorEmail: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    authorEmail: { type: String, required: true, index: true },
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    role: { type: String, default: "팀원" },
    label: { type: String, default: "팀원" },
  },
  { timestamps: true },
);

const Contact: Model<IContact> =
  mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);

export default Contact;
