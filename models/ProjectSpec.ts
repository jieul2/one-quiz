import mongoose, { Schema, Document, Model } from "mongoose";

export interface ErdField {
  id: string;
  name: string;
  type: string; // String, Number, Boolean, Date, ObjectId, Array, JSON
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface ErdTable {
  id: string;
  name: string;
  comment?: string;
  color?: string; // primary, emerald, amber, purple, rose, blue, slate
  x: number;
  y: number;
  fields: ErdField[];
}

export interface ErdRelation {
  id: string;
  fromTable: string; // table id or name
  fromField: string; // field id or name
  toTable: string;
  toField: string;
  type: "1:1" | "1:N" | "N:M";
  comment?: string;
}

export interface FunctionalSpecItem {
  id: string;
  module: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  assignee?: string;
}

export interface ApiSpecItem {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  description: string;
  requestParams?: string;
  authRequired: "admin" | "user" | "none";
  responseStatus: string;
}

export interface RevisionSnapshot {
  version: string;
  message: string;
  authorEmail: string;
  createdAt: Date;
  snapshot: {
    tables: ErdTable[];
    relations: ErdRelation[];
    architectureMd: string;
    functionalSpecs: FunctionalSpecItem[];
    apiSpecs: ApiSpecItem[];
  };
}

export interface IProjectSpec extends Document {
  userEmail: string;
  title: string;
  description?: string;
  version: string;
  status: "draft" | "in_progress" | "reviewed" | "published";
  tables: ErdTable[];
  relations: ErdRelation[];
  architectureMd: string;
  functionalSpecs: FunctionalSpecItem[];
  apiSpecs: ApiSpecItem[];
  revisions: RevisionSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

const ErdFieldSchema = new Schema<ErdField>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, default: "String" },
    isPrimaryKey: { type: Boolean, default: false },
    isForeignKey: { type: Boolean, default: false },
    isUnique: { type: Boolean, default: false },
    isNullable: { type: Boolean, default: true },
    defaultValue: { type: String },
    comment: { type: String },
  },
  { _id: false }
);

const ErdTableSchema = new Schema<ErdTable>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    comment: { type: String },
    color: { type: String, default: "primary" },
    x: { type: Number, default: 100 },
    y: { type: Number, default: 100 },
    fields: { type: [ErdFieldSchema], default: [] },
  },
  { _id: false }
);

const ErdRelationSchema = new Schema<ErdRelation>(
  {
    id: { type: String, required: true },
    fromTable: { type: String, required: true },
    fromField: { type: String, required: true },
    toTable: { type: String, required: true },
    toField: { type: String, required: true },
    type: { type: String, enum: ["1:1", "1:N", "N:M"], default: "1:N" },
    comment: { type: String },
  },
  { _id: false }
);

const FunctionalSpecSchema = new Schema<FunctionalSpecItem>(
  {
    id: { type: String, required: true },
    module: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "in_progress" },
    assignee: { type: String, default: "" },
  },
  { _id: false }
);

const ApiSpecSchema = new Schema<ApiSpecItem>(
  {
    id: { type: String, required: true },
    method: { type: String, enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], default: "GET" },
    endpoint: { type: String, required: true },
    description: { type: String, default: "" },
    requestParams: { type: String, default: "" },
    authRequired: { type: String, enum: ["admin", "user", "none"], default: "user" },
    responseStatus: { type: String, default: "200 OK" },
  },
  { _id: false }
);

const RevisionSnapshotSchema = new Schema<RevisionSnapshot>(
  {
    version: { type: String, required: true },
    message: { type: String, required: true },
    authorEmail: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    snapshot: {
      tables: { type: [ErdTableSchema], default: [] },
      relations: { type: [ErdRelationSchema], default: [] },
      architectureMd: { type: String, default: "" },
      functionalSpecs: { type: [FunctionalSpecSchema], default: [] },
      apiSpecs: { type: [ApiSpecSchema], default: [] },
    },
  },
  { _id: false }
);

const ProjectSpecSchema = new Schema<IProjectSpec>(
  {
    userEmail: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "시스템 아키텍처 및 ERD 명세서" },
    description: { type: String, default: "데이터베이스 엔티티 관계도 및 시스템 기능/API 형상관리 명세서" },
    version: { type: String, default: "1.0.0" },
    status: {
      type: String,
      enum: ["draft", "in_progress", "reviewed", "published"],
      default: "in_progress",
    },
    tables: { type: [ErdTableSchema], default: [] },
    relations: { type: [ErdRelationSchema], default: [] },
    architectureMd: { type: String, default: "" },
    functionalSpecs: { type: [FunctionalSpecSchema], default: [] },
    apiSpecs: { type: [ApiSpecSchema], default: [] },
    revisions: { type: [RevisionSnapshotSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

const ProjectSpec: Model<IProjectSpec> =
  mongoose.models.ProjectSpec || mongoose.model<IProjectSpec>("ProjectSpec", ProjectSpecSchema);

export default ProjectSpec;
