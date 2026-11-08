"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LearningView } from "@/components/learning/LearningView";

export default function LearningPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <LearningView />
      </Suspense>
    </AppShell>
  );
}
