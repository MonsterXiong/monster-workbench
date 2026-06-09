const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const result = spawnSync("npx", ["tauri", "build", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
