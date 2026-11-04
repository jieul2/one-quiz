"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RoadmapView } from "@/components/projects/RoadmapView";


export default function ProjectsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <RoadmapView />
      </Suspense>
    </AppShell>
  );
}
