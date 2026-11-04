const fs = require("fs");
const content = fs.readFileSync("scripts/dashboard_main.html", "utf8");

console.log("Total characters:", content.length);
// Find all headings and strong texts
const headings = [
  ...content.matchAll(
    /<(?:h[1-6]|span|p)[^>]*class=\"[^\"]*(?:headline|display|font-bold)[^\"]*\"[^>]*>([\s\S]*?)<\/(?:h[1-6]|span|p)>/gi,
  ),
]
  .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
  .filter(Boolean);

console.log("Key headings & titles:");
console.log([...new Set(headings)].slice(0, 20));
