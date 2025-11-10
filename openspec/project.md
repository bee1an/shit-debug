# Project Context

## Purpose
Shit Debug 是一个高效的浏览器扩展调试工具，专门用于检测和提取页面中 iframe 的信息。主要功能包括：
- 自动检测页面中的所有 iframe 元素
- 提取 iframe 的 hash 路由信息
- 获取 iframe 内部的 sessionStorage 数据（特别是 SET_LOGIN_DATA）
- 一键复制提取的数据到剪切板
- 支持单个和多个 iframe 的处理

## Tech Stack
- **前端框架**: Vue 3 (Composition API)
- **开发语言**: TypeScript (严格模式，禁止使用 any)
- **构建工具**: Vite
- **样式框架**: UnoCSS
- **包管理器**: pnpm
- **测试框架**: Vitest (单元测试) + Playwright (E2E测试)
- **代码检查**: ESLint (@antfu/eslint-config)
- **浏览器扩展**: WebExtension API (Manifest V3)
- **状态管理**: Vue 3 Reactivity + VueUse
- **类型安全**: 严格 TypeScript 配置

## Project Conventions

### Code Style
- **语言**: 必须使用中文回复用户
- **TypeScript**: 严格模式，禁止使用 `any` 类型
- **浏览器 API**: 使用 `browser` 代替 `chrome` 变量
- **组件风格**: Vue 3 Composition API + `<script setup>`
- **代码格式**: 使用 @antfu/eslint-config 标准
- **文件命名**: kebab-case 用于文件，camelCase 用于变量/函数
- **导入方式**: 自动导入 Vue API 和 webextension-polyfill

### Architecture Patterns
- **模块化结构**: 按功能模块组织代码（popup、options、contentScripts、background）
- **Composables**: 使用 Vue 3 组合式函数封装业务逻辑
- **类型安全**: 完整的 TypeScript 类型定义
- **响应式存储**: 使用响应式存储管理状态
- **消息通信**: 基于 WebExtension 消息传递机制

### Testing Strategy
- **单元测试**: 使用 Vitest + jsdom
- **E2E测试**: 使用 Playwright
- **代码质量**: ESLint + TypeScript 类型检查
- **测试命令**:
  - `pnpm test` - 单元测试
  - `pnpm test:e2e` - E2E测试
  - `pnpm lint` - 代码检查
  - `pnpm typecheck` - 类型检查

### Git Workflow
- **分支策略**: 主要分支为 `main`
- **提交规范**: 使用 simple-git-hooks 进行预提交检查
- **代码质量**: 提交前自动运行 ESLint 修复
- **包管理**: 使用 pnpm 作为包管理器

## Domain Context
- **浏览器扩展开发**: 基于 Manifest V3 规范
- **iframe 跨域访问**: 使用 postMessage 进行 iframe 通信
- **WebExtension API**: tabs、storage、activeTab、scripting 权限
- **数据提取**: hash 路由、sessionStorage 数据的提取和复制
- **浏览器兼容性**: 支持 Chrome 和 Firefox

## Important Constraints
- **安全限制**: iframe 跨域访问受限，需要通过消息传递
- **扩展权限**: 需要适当的 host_permissions 和 content_scripts 配置
- **性能考虑**: 大量 iframe 的处理需要优化性能
- **浏览器差异**: Chrome 和 Firefox 在侧边栏支持上的差异
- **代码质量**: 保持 ESLint 和 TypeScript 零错误状态

## External Dependencies
- **WebExtension API**: browser.tabs、browser.storage、browser.clipboard
- **消息传递**: iframe postMessage 通信机制
- **构建工具**: Vite 开发服务器和构建优化
- **浏览器兼容**: webextension-polyfill 提供跨浏览器支持
