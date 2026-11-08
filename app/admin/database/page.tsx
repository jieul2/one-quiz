"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDatabaseRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/database");
  }, [router]);

  return null;
}
