"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DriveView } from "@/components/drive/DriveView";


export default function DrivePage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <DriveView />
      </Suspense>
    </AppShell>
  );
}
