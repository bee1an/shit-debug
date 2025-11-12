## Why
当前扩展的iframe检测功能需要依赖页面自动获取openKey，但在某些情况下用户可能需要手动获取openKey。提供一个显式的获取openKey按钮可以让用户更灵活地控制openKey的获取时机，提高用户体验。

## What Changes
- 在popup主界面添加一个"获取OpenKey"按钮
- 点击按钮时调用openKey接口获取openKey
- 显示获取结果（成功时显示openKey，失败时显示错误信息）
- 将获取到的openKey复制到剪贴板
- 按钮状态管理（加载中、成功、失败）

## Impact
- 受影响规格: auth (iframe鉴权功能)
- 受影响代码:
  - `src/popup/Popup.vue` - 添加按钮和处理逻辑
  - `src/utils/openKey.ts` - 可能添加新的工具函数
- 新增用户交互流程，需要处理异步操作状态
- 需要与现有的iframe检测功能协调工作
