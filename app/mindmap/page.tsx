"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MindmapView } from "@/components/mindmap/MindmapView";


export default function MindmapPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <MindmapView />
      </Suspense>
    </AppShell>
  );
}
