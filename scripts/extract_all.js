const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "extracted");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (let i = 1; i <= 10; i++) {
  const htmlPath = path.join(
    __dirname,
    "..",
    "stitch_ai_drawing_replicator",
    `orbee_${i}`,
    "code.html",
  );
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      fs.writeFileSync(path.join(outDir, `page_${i}.html`), mainMatch[1]);
      console.log(`page_${i}.html extracted, length: ${mainMatch[1].length}`);
    }
  }
}
