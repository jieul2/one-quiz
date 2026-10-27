import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  userId?: string;
  email: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  statusCode: number;
  level: "INFO" | "WARN" | "ERROR" | "SECURITY";
  ip: string;
  userAgent: string;
  responseTime: number;
  message: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  userId: { type: String },
  email: { type: String, required: true, default: "anonymous" },
  method: { type: String, required: true, enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
  endpoint: { type: String, required: true },
  statusCode: { type: Number, required: true, default: 200 },
  level: {
    type: String,
    required: true,
    enum: ["INFO", "WARN", "ERROR", "SECURITY"],
    default: "INFO",
  },
  ip: { type: String, default: "127.0.0.1" },
  userAgent: { type: String, default: "Unknown" },
  responseTime: { type: Number, default: 0 },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// 최신 로그를 빠르게 조회하기 위한 인덱스 설정
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ email: 1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
