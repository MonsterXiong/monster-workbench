# Monster Tools 热更新检验步骤

下面步骤用于验证：

1. 桌面窗口最小尺寸是否为 `900 × 630`
2. 应用壳更新是否读取 GitHub Release `latest.json`
3. Vue 资源热更新是否读取 GitHub Release `web-assets.manifest.json`
4. `web-assets.zip` 的 `sha256` 校验是否生效
5. `minShellVersion` 是否能阻止不兼容资源更新

---

## 一、基础配置检查

### 1. 检查软件命名

确认：

```txt
package.json -> name = monster-tools
src-tauri/tauri.conf.json -> productName = Monster Tools
src-tauri/src/main.rs -> window title = Monster Tools
```

### 2. 检查窗口最小尺寸

确认 `src-tauri/src/main.rs` 中：

```rust
.min_inner_size(900.0, 630.0)
```

运行：

```bash
npm run tauri:dev
```

手动拖拽窗口缩小，窗口不应小于 `900 × 630`。

---

## 二、准备 GitHub Release

### 1. 替换仓库地址

把 `OWNER/REPO` 替换成真实仓库，例如：

```txt
https://github.com/your-name/monster-tools
```

需要改两个位置：

```txt
src-tauri/tauri.conf.json
src-tauri/src/main.rs
```

### 2. 配置 Tauri updater public key

```bash
npm run tauri signer generate -w ~/.tauri/monster-tools.key
```

把 public key 写入：

```txt
src-tauri/tauri.conf.json -> plugins.updater.pubkey
```

### 3. 发布完整应用版本

更新 `package.json` 版本，例如：

```json
"version": "0.1.0"
```

创建 tag：

```bash
git tag app-v0.1.0
git push origin app-v0.1.0
```

GitHub Actions 成功后，Release 中应包含：

```txt
latest.json
安装包
.sig 签名文件
web-assets.zip
web-assets.manifest.json
```

---

## 三、验证应用壳更新

### 1. 安装旧版本

先安装 `app-v0.1.0`。

### 2. 发布新壳版本

修改 `package.json`：

```json
"version": "0.1.1"
```

创建新 tag：

```bash
git tag app-v0.1.1
git push origin app-v0.1.1
```

### 3. 客户端检查

打开已安装的旧版本，点击：

```txt
检查应用壳更新
```

预期结果：

```txt
1. 能发现新版本
2. 能下载更新包
3. 下载完成后自动 relaunch
4. 重启后应用版本变成 0.1.1
```

如果失败，优先检查：

```txt
1. latest.json 是否存在
2. latest.json 是否在 GitHub 最新 Release 中
3. pubkey 是否正确
4. .sig 文件是否存在
5. GitHub Release 是否为 Draft
```

---

## 四、验证 Vue 资源热更新

资源热更新不需要重新打安装包，可以覆盖当前最新 Release 中的：

```txt
web-assets.zip
web-assets.manifest.json
```

### 1. 修改一个明显的 UI 文案

例如修改 `src/App.vue`：

```txt
Tauri v2 + Vue 3 + GitHub Release 安装和热更新示例。
```

改成：

```txt
资源热更新验证成功。
```

### 2. 构建资源热更新包

```bash
RESOURCE_VERSION=202606050001 npm run build:web-hot
```

Windows PowerShell：

```powershell
$env:RESOURCE_VERSION="202606050001"
npm run build:web-hot
```

生成：

```txt
release-web/web-assets.zip
release-web/web-assets.manifest.json
```

### 3. 上传到当前最新 Release

```bash
gh release upload app-v0.1.1 \
  release-web/web-assets.zip \
  release-web/web-assets.manifest.json \
  --clobber
```

### 4. 客户端检查资源更新

打开已安装客户端，点击：

```txt
检查资源更新
```

预期结果：

```txt
1. 显示远端资源版本 202606050001
2. 显示发现资源更新
3. 点击安装资源更新
4. 应用自动重启
5. 重启后看到新的 UI 文案
```

---

## 五、验证 sha256 校验失败

### 1. 故意破坏 sha256

打开：

```txt
release-web/web-assets.manifest.json
```

把：

```json
"sha256": "真实 hash"
```

改成：

```json
"sha256": "0000000000000000000000000000000000000000000000000000000000000000"
```

上传：

```bash
gh release upload app-v0.1.1 release-web/web-assets.manifest.json --clobber
```

### 2. 客户端安装资源更新

点击：

```txt
检查资源更新
安装资源更新
```

预期结果：

```txt
资源热更新失败：sha256 mismatch
```

并且不会切换到错误资源。

---

## 六、验证 minShellVersion

### 1. 修改 manifest

打开：

```txt
release-web/web-assets.manifest.json
```

把：

```json
"minShellVersion": "0.1.1"
```

改成：

```json
"minShellVersion": "99.0.0"
```

上传：

```bash
gh release upload app-v0.1.1 release-web/web-assets.manifest.json --clobber
```

### 2. 客户端检查资源更新

点击：

```txt
检查资源更新
```

预期结果：

```txt
资源包要求更高壳版本，请先更新应用壳
```

并且 `安装资源更新` 按钮不可用。

---

## 七、验证 GitHub Release 为唯一版本源

检查客户端代码：

```txt
src-tauri/tauri.conf.json
src-tauri/src/main.rs
```

应用壳更新来源：

```txt
https://github.com/OWNER/REPO/releases/latest/download/latest.json
```

资源热更新来源：

```txt
https://github.com/OWNER/REPO/releases/latest/download/web-assets.manifest.json
```

资源包下载来源：

```txt
web-assets.manifest.json -> url
```

预期：

```txt
客户端不依赖自建更新服务器；GitHub Release 是唯一版本源。
```

---

## 八、常见问题

### 1. 点检查应用壳更新失败

优先检查：

```txt
latest.json 是否存在
pubkey 是否匹配
.sig 是否存在
Release 是否是最新 Release
Release 是否不是 Draft
```

### 2. 点检查资源更新失败

优先检查：

```txt
web-assets.manifest.json 是否存在
JSON 字段是否完整
url 是否能下载 web-assets.zip
sha256 是否和 zip 一致
```

### 3. 热更新后没有变化

优先检查：

```txt
resourceVersion 是否变化
上传时是否使用 --clobber 覆盖旧资源
GitHub CDN 是否仍在返回旧文件
应用是否已 relaunch
```
