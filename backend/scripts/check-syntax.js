const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = [path.resolve(__dirname, "../src"), path.resolve(__dirname, "../scripts"), path.resolve(__dirname, "../prisma")];
const files = [];
function walk(target) {
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.name.endsWith(".js") && fullPath !== __filename) files.push(fullPath);
  }
}
for (const root of roots) walk(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax OK: ${files.length} JavaScript files`);
