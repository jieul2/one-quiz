"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminCategoriesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/categories");
  }, [router]);

  return null;
}
