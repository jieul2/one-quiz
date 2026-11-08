"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=admin-settings");
  }, [router]);

  return null;
}
