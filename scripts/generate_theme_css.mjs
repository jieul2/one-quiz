import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read themeList.ts text and parse the configs or directly evaluate
const themeListContent = fs.readFileSync(
  path.join(__dirname, "..", "lib", "themes", "themeList.ts"),
  "utf8",
);

// We can extract THEME_LIST using a quick JS eval by stripping typescript types
const jsCode = themeListContent
  .replace(/export interface[\s\S]*?}\n/g, "")
  .replace(/: ThemeConfig\[\]/g, "")
  .replace(/: ThemeConfig/g, "")
  .replace(/: string/g, "")
  .replace(/export /g, "");

const evalContext = {};
const fn = new Function("exports", jsCode + "\nreturn { THEME_LIST };");
const { THEME_LIST } = fn(evalContext);

let css = `/* 🎨 Auto-generated Theme CSS Variables (24 Themes & Extensible) */
:root {
  /* Default fallback to light theme */
  --background: #f8fafc;
  --on-background: #0f172a;
  --surface: #ffffff;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f1f5f9;
  --surface-container: #e2e8f0;
  --surface-container-high: #cbd5e1;
  --surface-container-highest: #94a3b8;
  --on-surface: #0f172a;
  --on-surface-variant: #64748b;
  --primary: #4f46e5;
  --on-primary: #ffffff;
  --primary-container: #e0e7ff;
  --on-primary-container: #3730a3;
  --secondary: #06b6d4;
  --on-secondary: #ffffff;
  --secondary-container: #cffafe;
  --on-secondary-container: #155e75;
  --outline: #94a3b8;
  --outline-variant: #e2e8f0;
  --error: #ef4444;
  --error-container: #fee2e2;
}

`;

for (const theme of THEME_LIST) {
  const c = theme.colors;
  const isDark = theme.type === "dark";
  css += `[data-theme="${theme.id}"] {\n`;
  css += `  --background: ${c.background};\n`;
  css += `  --on-background: ${c.onBackground};\n`;
  css += `  --surface: ${c.surface};\n`;
  css += `  --surface-container-lowest: ${c.surfaceContainerLowest};\n`;
  css += `  --surface-container-low: ${c.surfaceContainerLow};\n`;
  css += `  --surface-container: ${c.surfaceContainer};\n`;
  css += `  --surface-container-high: ${c.surfaceContainerHigh};\n`;
  css += `  --surface-container-highest: ${c.surfaceContainerHighest};\n`;
  css += `  --on-surface: ${c.onSurface};\n`;
  css += `  --on-surface-variant: ${c.onSurfaceVariant};\n`;
  css += `  --primary: ${c.primary};\n`;
  css += `  --on-primary: ${c.onPrimary};\n`;
  css += `  --primary-container: ${c.primaryContainer};\n`;
  css += `  --on-primary-container: ${c.onPrimaryContainer};\n`;
  css += `  --secondary: ${c.secondary};\n`;
  css += `  --on-secondary: ${c.onSecondary};\n`;
  css += `  --secondary-container: ${c.secondaryContainer};\n`;
  css += `  --on-secondary-container: ${c.onSecondaryContainer};\n`;
  css += `  --outline: ${c.outline};\n`;
  css += `  --outline-variant: ${c.outlineVariant};\n`;
  css += `  --error: ${c.error};\n`;
  css += `  --error-container: ${c.errorContainer};\n`;
  css += `  color-scheme: ${isDark ? "dark" : "light"};\n`;
  css += `}\n\n`;
}

// Add dark mode fallback when .dark class is used without data-theme
css += `.dark:not([data-theme]) {\n`;
const darkC = THEME_LIST.find((t) => t.id === "dark").colors;
css += `  --background: ${darkC.background};\n`;
css += `  --on-background: ${darkC.onBackground};\n`;
css += `  --surface: ${darkC.surface};\n`;
css += `  --surface-container-lowest: ${darkC.surfaceContainerLowest};\n`;
css += `  --surface-container-low: ${darkC.surfaceContainerLow};\n`;
css += `  --surface-container: ${darkC.surfaceContainer};\n`;
css += `  --surface-container-high: ${darkC.surfaceContainerHigh};\n`;
css += `  --surface-container-highest: ${darkC.surfaceContainerHighest};\n`;
css += `  --on-surface: ${darkC.onSurface};\n`;
css += `  --on-surface-variant: ${darkC.onSurfaceVariant};\n`;
css += `  --primary: ${darkC.primary};\n`;
css += `  --on-primary: ${darkC.onPrimary};\n`;
css += `  --primary-container: ${darkC.primaryContainer};\n`;
css += `  --on-primary-container: ${darkC.onPrimaryContainer};\n`;
css += `  --secondary: ${darkC.secondary};\n`;
css += `  --on-secondary: ${darkC.onSecondary};\n`;
css += `  --secondary-container: ${darkC.secondaryContainer};\n`;
css += `  --on-secondary-container: ${darkC.onSecondaryContainer};\n`;
css += `  --outline: ${darkC.outline};\n`;
css += `  --outline-variant: ${darkC.outlineVariant};\n`;
css += `  --error: ${darkC.error};\n`;
css += `  --error-container: ${darkC.errorContainer};\n`;
css += `  color-scheme: dark;\n`;
css += `}\n`;

fs.writeFileSync(path.join(__dirname, "..", "app", "themes.css"), css, "utf8");
console.log("Successfully generated app/themes.css for", THEME_LIST.length, "themes!");
