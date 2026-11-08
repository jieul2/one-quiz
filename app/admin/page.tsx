"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminConsolePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=admin-settings");
  }, [router]);

  return null;
}
