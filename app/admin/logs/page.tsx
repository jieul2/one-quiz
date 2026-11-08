"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=admin-logs");
  }, [router]);

  return null;
}
