import {
  ErdTable,
  ErdField,
  ErdRelation,
  FunctionalSpecItem,
  ApiSpecItem,
  RevisionSnapshot,
} from "@/models/ProjectSpec";

export type {
  ErdTable,
  ErdField,
  ErdRelation,
  FunctionalSpecItem,
  ApiSpecItem,
  RevisionSnapshot,
};

export type ErdTab = "erd" | "specs" | "history";

export type ExportFormat = "mermaid" | "sql" | "ts" | "json";

export interface ProjectSummary {
  _id: string;
  title: string;
  description?: string;
  version: string;
  status: string;
  tableCount: number;
  revisionCount: number;
  updatedAt: string;
}

export const CARD_WIDTH = 310;
export const HEADER_HEIGHT = 52;
export const ROW_HEIGHT = 38;
