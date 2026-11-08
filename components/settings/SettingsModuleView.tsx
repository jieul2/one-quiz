"use client";

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { GeneralSettingsModule } from "./modules/GeneralSettingsModule";
import { CalendarSettingsModule } from "./modules/CalendarSettingsModule";
import { NotesSettingsModule } from "./modules/NotesSettingsModule";
import { TasksSettingsModule } from "./modules/TasksSettingsModule";
import { DriveSettingsModule } from "./modules/DriveSettingsModule";
import { BookmarksSettingsModule } from "./modules/BookmarksSettingsModule";
import { ContactsSettingsModule } from "./modules/ContactsSettingsModule";
import { MindmapSettingsModule } from "./modules/MindmapSettingsModule";
import { ProjectsSettingsModule } from "./modules/ProjectsSettingsModule";
import { ChatSettingsModule } from "./modules/ChatSettingsModule";
import { AdminAccountsModule } from "./modules/AdminAccountsModule";
import { AdminLogsModule } from "./modules/AdminLogsModule";
import { AdminSystemSettingsModule } from "./modules/AdminSystemSettingsModule";
import { AdminFeedbackModule } from "./modules/AdminFeedbackModule";
import { AdminQuestionsModule } from "./modules/AdminQuestionsModule";
import { AdminCategoriesModule } from "./modules/AdminCategoriesModule";
import { AdminDatabaseModule } from "./modules/AdminDatabaseModule";
import { SettingsLayout } from "./SettingsLayout";
import { SettingsProvider } from "./SettingsContext";

interface SettingsModuleViewProps {
  moduleName?: string;
}

export function SettingsModuleView({ moduleName = "overview" }: SettingsModuleViewProps) {
  // 모듈 키 정규화
  const normalizedKey =
    moduleName === "admin-settings"
      ? "system"
      : moduleName === "admin-categories"
      ? "categories"
      : moduleName === "admin-accounts"
      ? "accounts"
      : moduleName === "admin-logs"
      ? "logs"
      : moduleName === "admin-feedback"
      ? "feedback"
      : moduleName === "admin-questions"
      ? "questions"
      : moduleName === "admin-database"
      ? "database"
      : moduleName;

  const renderModule = () => {
    switch (normalizedKey) {
      case "overview":
        return <GeneralSettingsModule />;
      case "calendar":
        return <CalendarSettingsModule />;
      case "notes":
        return <NotesSettingsModule />;
      case "tasks":
        return <TasksSettingsModule />;
      case "drive":
        return <DriveSettingsModule />;
      case "bookmarks":
        return <BookmarksSettingsModule />;
      case "contacts":
        return <ContactsSettingsModule />;
      case "mindmap":
        return <MindmapSettingsModule />;
      case "projects":
        return <ProjectsSettingsModule />;
      case "chat":
        return <ChatSettingsModule />;
      case "accounts":
        return <AdminAccountsModule />;
      case "logs":
        return <AdminLogsModule />;
      case "system":
        return <AdminSystemSettingsModule />;
      case "feedback":
        return <AdminFeedbackModule />;
      case "questions":
        return <AdminQuestionsModule />;
      case "categories":
        return <AdminCategoriesModule />;
      case "database":
        return <AdminDatabaseModule />;
      default:
        return <GeneralSettingsModule />;
    }
  };

  return (
    <SettingsProvider>
      <SettingsLayout activeModule={normalizedKey}>
        <Suspense
          fallback={
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="ui-caption text-on-surface-variant">모듈 로딩 중...</span>
            </div>
          }
        >
          {renderModule()}
        </Suspense>
      </SettingsLayout>
    </SettingsProvider>
  );
}
