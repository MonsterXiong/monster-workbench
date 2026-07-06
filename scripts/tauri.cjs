const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const forwardedArgs = args[0] === "build" ? args.slice(1) : args;
const result = spawnSync("npx", ["tauri", "build", ...forwardedArgs], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
