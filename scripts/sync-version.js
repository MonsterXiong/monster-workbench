import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkgPath = path.join(root, "package.json");
const tauriConfPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(root, "src-tauri", "Cargo.toml");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));

tauriConf.productName = "Monster Tools";
tauriConf.version = pkg.version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");

let cargo = fs.readFileSync(cargoTomlPath, "utf8");
cargo = cargo.replace(/^version = "[^"]+"/m, `version = "${pkg.version}"`);
fs.writeFileSync(cargoTomlPath, cargo);

console.log(`synced Monster Tools version: ${pkg.version}`);
