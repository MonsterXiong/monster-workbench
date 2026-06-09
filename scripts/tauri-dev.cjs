const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const DEV_SERVER_PORT = 1420;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => {
      resolve(error.code === "EADDRINUSE" ? "used" : "error");
    });
    server.once("listening", () => {
      server.close(() => resolve("free"));
    });
    server.listen(port, "127.0.0.1");
  });
}

function probeDevServer(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

function spawnTauriDev(args) {
  return spawnSync("npx", ["tauri", "dev", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
}

function withReusableDevServerConfig(callback) {
  const configPath = path.join(
    os.tmpdir(),
    `monster-workbench-tauri-dev-${process.pid}.json`
  );
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      build: {
        beforeDevCommand: ""
      }
    }),
    "utf8"
  );

  try {
    return callback(configPath);
  } finally {
    fs.rmSync(configPath, { force: true });
  }
}

function printPortHelp() {
  console.error(
    `[ERR_TAURI_DEV_PORT] 开发端口 ${DEV_SERVER_PORT} 已被占用，但 ${DEV_SERVER_URL} 不是可复用的 Vite 服务。`
  );
  console.error("请先关闭占用该端口的进程，再重新运行 npm run tauri:dev。");
  if (process.platform === "win32") {
    console.error(
      `Windows 可用命令：netstat -ano | findstr :${DEV_SERVER_PORT}，再用 taskkill /PID <PID> /F 结束确认无用的进程。`
    );
  } else {
    console.error(`可用命令：lsof -i :${DEV_SERVER_PORT}，确认后结束无用进程。`);
  }
}

async function main() {
  const cliArgs = process.argv.slice(2);
  const canReuseDevServer = await probeDevServer(DEV_SERVER_URL);
  if (canReuseDevServer) {
    console.log(
      `[TAURI_DEV] 检测到 ${DEV_SERVER_URL} 已在运行，将复用现有前端 dev server 启动 Tauri。`
    );
    const result = withReusableDevServerConfig((configPath) =>
      spawnTauriDev(["--config", configPath, ...cliArgs])
    );
    process.exit(result.status ?? 1);
  }

  const portState = await checkPort(DEV_SERVER_PORT);
  if (portState === "free") {
    const result = spawnTauriDev(cliArgs);
    process.exit(result.status ?? 1);
  }

  printPortHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("[ERR_TAURI_DEV_START] 启动 Tauri 开发环境失败:", error);
  process.exit(1);
});
