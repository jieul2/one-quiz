"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { THEME_LIST } from "@/lib/themes/themeList";

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const themeIds = THEME_LIST.map((t) => t.id);

  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      themes={themeIds}
    >
      {children}
    </NextThemesProvider>
  );
}
