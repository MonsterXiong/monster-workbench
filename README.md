# Monster Tools

`monster-tools` 是一个基于 **Tauri v2 + Vue 3 + Vite** 的桌面端安装和热更新示例项目。

## 特性

- 软件命名：`Monster Tools`
- npm 包名：`monster-tools`
- 桌面窗口最小尺寸：`900 × 630`
- 应用壳更新：`@tauri-apps/plugin-updater` + GitHub Release `latest.json`
- Vue 资源热更新：GitHub Release `web-assets.manifest.json` + `web-assets.zip`
- 资源包校验：`sha256`
- 不包含 `vue-i18n`

## 需要先替换的配置

把下面两个文件中的 `OWNER/REPO` 替换为你的 GitHub 仓库：

```txt
src-tauri/tauri.conf.json
src-tauri/src/main.rs
```

把 `src-tauri/tauri.conf.json` 里的：

```txt
REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY
```

替换成你的 Tauri updater public key。

## 安装依赖

```bash
npm install
```

## 本地开发

```bash
npm run tauri:dev
```

## 构建安装包

```bash
npm run tauri
```

## 构建 Vue 资源热更新包

```bash
npm run build:web-hot
```

输出目录：

```txt
release-web/
├─ web-assets.zip
└─ web-assets.manifest.json
```

## GitHub Release 必要文件

每个用于最新版本的 Release 至少应包含：

```txt
latest.json
web-assets.zip
web-assets.manifest.json
```

如果是完整应用发布，还应包含 Tauri 生成的安装包和 `.sig` 文件。

## 生成 Tauri updater 签名密钥

```bash
npm run tauri signer generate -w ~/.tauri/monster-tools.key
```

将生成的 public key 写入：

```txt
src-tauri/tauri.conf.json -> plugins.updater.pubkey
```

CI/CD 中需要配置 GitHub Secrets：

```txt
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

## GitHub Release 上传 web 热更新资源

安装 GitHub CLI 后，可以用：

```bash
npm run build:web-hot

gh release upload app-v0.1.0 \
  release-web/web-assets.zip \
  release-web/web-assets.manifest.json \
  --clobber
```

`--clobber` 用来覆盖同名资源，适合只更新 Vue 资源、不重新发布安装包的热更新场景。
