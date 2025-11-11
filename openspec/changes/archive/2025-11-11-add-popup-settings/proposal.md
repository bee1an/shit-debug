## Why
当前popup中的iframe链接跳转功能硬编码了localhost:4000前缀，缺乏灵活性。用户需要能够配置不同的host前缀以适应不同的开发环境或部署环境。同时，popup组件代码过于庞大，需要进行模块化重构以提高可维护性。

## What Changes
- 添加popup设置页面功能，允许用户配置host前缀
- 重构popup组件，将功能拆分为多个子组件
- 新增配置存储管理功能
- 修改iframe链接跳转逻辑以使用配置的host前缀
- 保持现有功能的向后兼容性

## Impact
- **新增规格**: popup-settings（弹窗设置管理）
- **影响规格**: 无（现有功能保持兼容）
- **影响代码**:
  - `src/popup/Popup.vue` - 重构为模块化结构
  - `src/popup/components/` - 新增子组件目录
  - `src/composables/` - 新增配置管理composable
  - `src/popup/SettingsPage.vue` - 新增设置页面
- **存储变更**: 新增host配置到扩展存储
