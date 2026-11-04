const fs = require("fs");
const path = require("path");

// We can read themeList from themeList.ts or export directly
const { THEME_LIST } = require("../lib/themes/themeList.ts"); // Wait, ts file can't be required directly in plain node unless transpiled or written in js
