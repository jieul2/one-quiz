const fs = require("fs");
const path = require("path");

const screens = [];
for (let i = 1; i <= 10; i++) {
  const dir = path.join(__dirname, "..", "stitch_ai_drawing_replicator", "orbee_" + i);
  const htmlPath = path.join(dir, "code.html");
  if (!fs.existsSync(htmlPath)) continue;

  const content = fs.readFileSync(htmlPath, "utf8");
  // Check main tag
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const mainHtml = mainMatch ? mainMatch[1] : "";

  // Check right aside
  const rightAsideMatch = content.match(/<aside[^>]*right-0[\s\S]*?<\/aside>/i);

  screens.push({
    id: i,
    hasMain: !!mainMatch,
    mainSnippet: mainHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150),
    hasRightAside: !!rightAsideMatch,
  });
}

console.log(JSON.stringify(screens, null, 2));
