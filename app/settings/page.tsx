"use client";

import { AppShell } from "@/components/layout/AppShell";
import { UserSettingsView } from "@/components/settings/UserSettingsView";

export default function SettingsPage() {
  return (
    <AppShell>
      <UserSettingsView />
    </AppShell>
  );
}
