# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Vite 的 WebExtension 浏览器扩展项目，支持 Chrome、Firefox 等浏览器。项目使用 Vue 3 + TypeScript + UnoCSS 技术栈，采用现代化的开发工具链。

## 开发命令

### 开发模式
```bash
# 启动开发服务器 (Chrome)
pnpm dev

# 启动开发服务器 (Firefox)
pnpm dev-firefox
```

### 构建
```bash
# 构建生产版本
pnpm build

# 清理构建文件
pnpm clear
```

### 打包
```bash
# 打包为所有格式
pnpm pack

# 打包为 ZIP (通用)
pnpm pack:zip

# 打包为 CRX (Chrome)
pnpm pack:crx

# 打包为 XPI (Firefox)
pnpm pack:xpi
```

### 测试
```bash
# 运行单元测试
pnpm test

# 运行 E2E 测试
pnpm test:e2e

# 类型检查
pnpm typecheck
```

### 代码质量
```bash
# ESLint 检查
pnpm lint
```

## 项目架构

### 核心目录结构

- `src/` - 主要源代码目录
  - `background/` - 后台脚本，处理扩展的后台逻辑
  - `contentScripts/` - 内容脚本，注入到网页中的脚本
  - `popup/` - 弹窗页面，点击扩展图标时显示
  - `options/` - 选项页面，扩展的设置页面
  - `sidepanel/` - 侧边栏页面 (Chrome Side Panel / Firefox Sidebar)
  - `components/` - 共享 Vue 组件，自动导入
  - `composables/` - Vue 组合式函数
  - `logic/` - 业务逻辑和共享工具
  - `styles/` - 共享样式
  - `assets/` - 静态资源
  - `manifest.ts` - 动态生成 manifest.json

- `extension/` - 扩展打包输出目录
  - `dist/` - 构建后的文件
  - `assets/` - 扩展图标等静态资源

- `scripts/` - 构建和开发脚本
  - `utils.ts` - 共享工具函数
  - `prepare.ts` - 构建准备脚本

### 关键配置文件

- `vite.config.mts` - 主 Vite 配置 (popup/options/sidepanel)
- `vite.config.background.mts` - 后台脚本构建配置
- `vite.config.content.mts` - 内容脚本构建配置
- `unocss.config.ts` - UnoCSS 配置
- `playwright.config.ts` - E2E 测试配置

### 扩展架构特点

1. **多上下文通信**: 使用 `webext-bridge` 实现 background、content script、popup 等不同上下文之间的通信
2. **动态 Manifest**: `src/manifest.ts` 根据环境和浏览器类型动态生成 manifest.json
3. **模块化构建**: 分别构建后台脚本、内容脚本和各个页面
4. **Shadow DOM**: 内容脚本使用 Shadow DOM 避免样式冲突
5. **热更新**: 开发模式下支持所有模块的热更新

### 自动化配置

- **组件自动导入**: `src/components/` 下的 Vue 组件会自动导入
- **API 自动导入**: Vue、WebExtension API 等会自动导入，无需手动 import
- **图标自动导入**: 支持从任何图标集自动导入图标
- **TypeScript 支持**: 完整的类型检查和自动生成类型定义

### 开发注意事项

1. 开发时需要在浏览器中加载 `extension/` 文件夹作为扩展
2. Firefox 使用 `sidebar_action`，Chrome 使用 `side_panel`
3. Content Script 使用 Shadow DOM 封装，避免与页面样式冲突
4. 后台脚本在 Firefox 中使用普通脚本，在 Chrome 中使用 Service Worker
5. 开发模式下 HMR 端口为 3303，生产环境下禁用 sourcemap

### 测试策略

- 单元测试使用 Vitest + jsdom
- E2E 测试使用 Playwright，支持扩展测试
- 开发服务器启动后自动运行 E2E 测试
