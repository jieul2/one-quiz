const fs = require("fs");
const content = fs.readFileSync("scripts/dashboard_main.html", "utf8");

// Let's print out the text chunks in order
const chunks = content
  .split(/<\/?div[^>]*>/)
  .map((s) =>
    s
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
  .filter((s) => s.length > 5);
console.log("Main text blocks:");
const uniqueBlocks = [...new Set(chunks)];
console.log(uniqueBlocks.slice(0, 30));
