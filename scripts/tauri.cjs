const { spawnSync } = require("node:child_process");

const result = spawnSync("npx", ["tauri", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
