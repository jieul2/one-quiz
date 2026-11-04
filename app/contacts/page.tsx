"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ContactsView } from "@/components/contacts/ContactsView";


export default function ContactsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <ContactsView />
      </Suspense>
    </AppShell>
  );
}
