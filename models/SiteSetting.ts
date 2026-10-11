import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSetting extends Document {
  siteTitle: string;
  landingSubtitle: string;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceUpdatedAt?: Date | null;
  disabledFeatures: Record<string, boolean>;
  updatedAt: Date;
}

const SiteSettingSchema: Schema = new Schema({
  siteTitle: { type: String, required: true, default: 'oneQuiz' },
  landingSubtitle: { type: String, required: true, default: '🔥🔥🔥🔥' },
  isMaintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: '시스템 서버 안정화 작업' },
  maintenanceUpdatedAt: { type: Date, default: null },
  disabledFeatures: { 
    type: Schema.Types.Mixed, 
    default: { exam: false, diary: false, ideas: false, admin: false } 
  },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.SiteSetting || mongoose.model<ISiteSetting>('SiteSetting', SiteSettingSchema);