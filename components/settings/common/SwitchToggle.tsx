"use client";

import React from "react";

export function SwitchToggle({
  checked,
  onChange,
  activeLabel,
  inactiveLabel,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      {(activeLabel || inactiveLabel) && (
        <span
          className={`ui-caption ${
            checked ? "font-semibold text-on-surface" : "text-on-surface-variant font-light"
          }`}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>
      )}
      <div
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-150 ${
          checked ? "bg-primary" : "bg-surface-container-high border border-outline-variant"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform duration-150 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
