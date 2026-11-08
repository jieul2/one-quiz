"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuestionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/questions");
  }, [router]);

  return null;
}
