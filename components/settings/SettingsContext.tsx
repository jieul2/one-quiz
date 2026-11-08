"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { SaveStatus } from "@/components/common/SaveStatusIndicator";

interface SettingsContextType {
  saveStatus: SaveStatus;
  savedTimeStr: string;
  setSaveStatus: (status: SaveStatus) => void;
  markSaved: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  const markSaved = useCallback(() => {
    const now = new Date();
    setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setSaveStatus("saved");
  }, []);

  return (
    <SettingsContext.Provider value={{ saveStatus, savedTimeStr, setSaveStatus, markSaved }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
