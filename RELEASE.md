# Release Guide

本文档固化 SidePanel Navigator 的版本发布流程。目标是让每次版本更新后，GitHub Actions 自动构建 Chrome 扩展，并把可导入浏览器的 zip 包发布到 GitHub Release。

## 发布产物

GitHub Release 会包含一个 zip 文件：

```text
sidepanel-navigator-v{version}.zip
```

zip 内部直接包含扩展根文件，例如 `manifest.json`、`sidepanel.html`、`background.js`、`assets/` 和 `icons/`。用户下载后解压，即可在 Chrome 的“加载已解压的扩展程序”中选择解压目录。

## 自动发布触发条件

工作流文件位于 `.github/workflows/release.yml`。

默认分支推送以下文件变更时会触发工作流：

- `package.json`
- `public/manifest.json`
- `CHANGELOG.md`
- `.github/workflows/release.yml`
- `scripts/extract-changelog.mjs`

工作流只在仓库默认分支发布 Release。非默认分支不会发布，避免误发。

## 发版步骤

1. 修改 `package.json` 的 `version`。
2. 修改 `public/manifest.json` 的 `version`，并确保它与 `package.json` 完全一致。
3. 在 `CHANGELOG.md` 顶部新增对应版本段落，格式如下：

```markdown
## 0.2.1 - 2026-06-06

### 新增

- 本次新增内容。

### 改进

- 本次改进内容。
```

4. 本地执行验证：

```bash
pnpm verify
node scripts/extract-changelog.mjs 0.2.1 CHANGELOG.md /tmp/sidepanel-release-notes.md
```

5. 提交并推送到默认分支：

```bash
git add package.json public/manifest.json CHANGELOG.md README.md RELEASE.md .github/workflows/release.yml scripts/extract-changelog.mjs
git commit -m "chore: release v0.2.1"
git push origin main
```

6. 在 GitHub Actions 中检查 `Release extension` 工作流是否成功。
7. 在 GitHub Releases 中确认 `v0.2.1` 已创建，并且包含 `sidepanel-navigator-v0.2.1.zip`。

## 工作流校验规则

发布工作流会执行以下检查：

- `package.json` 与 `public/manifest.json` 的版本号必须一致。
- `CHANGELOG.md` 必须存在当前版本的 `## {version} - YYYY-MM-DD` 段落。
- `pnpm verify` 必须通过。
- `dist/manifest.json` 中的版本号必须与发布版本一致。
- 如果同名 Release 已存在，工作流会覆盖上传 zip 并更新 Release notes。

## 失败处理

如果工作流失败：

- 版本号不一致：同步 `package.json` 和 `public/manifest.json` 后重新推送。
- 缺少更新日志：在 `CHANGELOG.md` 顶部补齐当前版本段落后重新推送。
- 测试或构建失败：本地运行 `pnpm verify`，修复后重新推送。
- Release 已存在但资产错误：修复后重新运行工作流，zip 会使用 `--clobber` 覆盖。

也可以在 GitHub Actions 页面手动运行 `Release extension` 工作流。手动运行仍只会在默认分支发布。
