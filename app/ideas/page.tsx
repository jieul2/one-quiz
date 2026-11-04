"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BacklogView } from "@/components/projects/BacklogView";


export default function IdeasPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <BacklogView />
      </Suspense>
    </AppShell>
  );
}
