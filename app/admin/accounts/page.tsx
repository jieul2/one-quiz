"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminAccountsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=admin-accounts");
  }, [router]);

  return null;
}
