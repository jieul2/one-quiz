export interface RoadmapComment {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  color?: string;
  comments: RoadmapComment[];
  sourceBacklogId?: string;
  assignee?: string;
}

export interface ProjectRoadmap {
  id: string;
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string;
  isPublic: boolean;
  members: { email: string; name: string; role: "admin" | "editor" | "viewer" }[];
  items: RoadmapItem[];
}

export interface BacklogItem {
  id: string;
  _id?: string;
  title: string;
  description: string;
  status: "idea" | "review" | "approved" | "promoted" | "completed";
  priority: "urgent" | "high" | "medium" | "low";
  isPublic: boolean;
  createdAt: string;
  completedAt?: string;
  tags: string[];
  assignee?: string;
  promotedToProjectId?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
}
