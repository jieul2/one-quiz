const fs = require("fs");
const path = require("path");

for (let i = 1; i <= 10; i++) {
  const dir = path.join(__dirname, "..", "stitch_ai_drawing_replicator", "orbee_" + i);
  const htmlPath = path.join(dir, "code.html");
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    // find body content or main sections
    const mainMatch =
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const mainText = mainMatch ? mainMatch[1] : html;

    // find all visible text or elements
    const headings = [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
    const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((b) => b.length > 0 && b.length < 40);

    console.log(`\n=================== orbee_${i} ===================`);
    console.log("Headings:", headings);
    console.log("Buttons:", [...new Set(buttons)].slice(0, 10));
    // Check if orbee_10 has any specific structure
    if (i === 10) {
      console.log(
        "Preview orbee_10 first 1000 chars of body:",
        mainText.slice(0, 800).replace(/\s+/g, " "),
      );
    }
    if (i === 7) {
      console.log("Preview orbee_7 dashboard:", headings);
    }
  }
}
