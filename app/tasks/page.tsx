"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TasksView } from "@/components/tasks/TasksView";


export default function TasksPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <TasksView />
      </Suspense>
    </AppShell>
  );
}
