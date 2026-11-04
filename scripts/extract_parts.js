const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
  path.join(__dirname, "..", "stitch_ai_drawing_replicator", "orbee_7", "code.html"),
  "utf8",
);

// Extract main content
const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
if (mainMatch) {
  fs.writeFileSync(path.join(__dirname, "dashboard_main.html"), mainMatch[1]);
  console.log("Saved dashboard_main.html, length:", mainMatch[1].length);
}

// Extract right aside
const asides = [...html.matchAll(/<aside[^>]*>([\s\S]*?)<\/aside>/gi)];
if (asides.length > 1) {
  fs.writeFileSync(path.join(__dirname, "right_aside.html"), asides[1][0]);
  console.log("Saved right_aside.html, length:", asides[1][0].length);
}
