"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BookmarksView } from "@/components/bookmarks/BookmarksView";


export default function BookmarksPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <BookmarksView />
      </Suspense>
    </AppShell>
  );
}
