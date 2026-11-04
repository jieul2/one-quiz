"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DiaryView } from "@/components/diary/DiaryView";


export default function NotesPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <DiaryView initialTab="notes" />
      </Suspense>
    </AppShell>
  );
}
