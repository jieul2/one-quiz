const fs = require("fs");
const path = require("path");

for (let i = 1; i <= 10; i++) {
  const dir = path.join(__dirname, "..", "stitch_ai_drawing_replicator", "orbee_" + i);
  const htmlPath = path.join(dir, "code.html");
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    // find h1, h2, h3, title, and major nav
    const headers = [...html.matchAll(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
    const navs = [...html.matchAll(/<(?:span|a|p)[^>]*>(.*?)<\/(?:span|a|p)>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.length > 1 && t.length < 30 && !t.includes("{") && !t.includes("\n"));

    console.log(`\n=================== orbee_${i} ===================`);
    console.log("Headers:", headers.slice(0, 8));
    console.log("Sample texts:", [...new Set(navs)].slice(0, 12));
  }
}
