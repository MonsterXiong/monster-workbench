import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkgPath = path.join(root, "package.json");
const packageLockPath = path.join(root, "package-lock.json");
const tauriConfPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(root, "src-tauri", "Cargo.toml");
const cargoLockPath = path.join(root, "src-tauri", "Cargo.lock");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));

tauriConf.productName = "Monster Tools";
tauriConf.version = pkg.version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");

let cargo = fs.readFileSync(cargoTomlPath, "utf8");
cargo = cargo.replace(/^version = "[^"]+"/m, `version = "${pkg.version}"`);
fs.writeFileSync(cargoTomlPath, cargo);

if (fs.existsSync(cargoLockPath)) {
  let cargoLock = fs.readFileSync(cargoLockPath, "utf8");
  cargoLock = cargoLock.replace(
    /(\[\[package\]\]\r?\nname = "monster-tools"\r?\nversion = ")[^"]+"/,
    `$1${pkg.version}"`
  );
  fs.writeFileSync(cargoLockPath, cargoLock);
  console.log(`✓ synced Cargo.lock monster-tools version: ${pkg.version}`);
}

if (fs.existsSync(packageLockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
  packageLock.version = pkg.version;
  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = pkg.version;
  }
  fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + "\n");
  console.log(`✓ synced package-lock.json version: ${pkg.version}`);
}

// 同步更新 .env 中的 VITE_APP_VERSION
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(/^VITE_APP_VERSION=.*/m, `VITE_APP_VERSION=${pkg.version}`);
  fs.writeFileSync(envPath, envContent, "utf8");
  console.log(`✓ synced .env VITE_APP_VERSION: ${pkg.version}`);
}

console.log(`synced Monster Tools version: ${pkg.version}`);
