const fs = require("fs");
const path = require("path");

const html7 = fs.readFileSync(
  path.join(__dirname, "..", "stitch_ai_drawing_replicator", "orbee_7", "code.html"),
  "utf8",
);

// Check head tag (fonts, scripts, tailwind, icons)
const headMatch = html7.match(/<head>([\s\S]*?)<\/head>/i);
console.log("Head tag content:");
console.log(headMatch ? headMatch[1] : "No head");
