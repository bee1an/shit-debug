#  项目信息

## 项目概述

- **类型**: 浏览器扩展 (Chrome & Firefox)
- **技术栈**: Vue 3 + TypeScript + Vite + UnoCSS

## 完成时

- [x] 修复eslint错误, 命令(pnpm run lint --fix) ✅ 无ESLint错误
- [x] 修复ts错误, 命令(pnpm run typecheck) ✅ 无TypeScript错误

非必要不要写测试

## 核心功能

### iframe检测与管理
- **核心文件**: `src/composables/useIframeDetector.ts`
- **功能**: 检测页面中的iframe，提取hash路由和sessionStorage数据
- **特性**:
  - 自动检测页面所有iframe
  - 支持单个/多个iframe处理
  - 提取iframe的hash内容和SET_LOGIN_DATA
  - 一键复制到剪切板
