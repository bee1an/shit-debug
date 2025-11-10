## Why

当前的iframe鉴权逻辑依赖于从iframe的sessionStorage中提取SET_LOGIN_DATA，这种方式不够灵活且可能受到跨域限制。需要重构为通过openKey API获取鉴权token，提高系统的可靠性和安全性。

## What Changes

- 重构iframe鉴权逻辑，从获取sessionStorage改为调用openKey API
- 修改iframe URL处理逻辑，使用API返回的openKey替换URL中的openKey参数
- 更新IframeInfo接口，移除sessionStorageData，添加openKey相关字段
- 保持现有的iframe检测和复制功能不变

## Impact

- **Affected specs**: 新增iframe-auth规格
- **Affected code**:
  - `src/composables/useIframeDetector.ts` - 主要重构文件
  - `src/utils/openKey.ts` - 需要扩展以支持URL参数替换
  - 相关的Vue组件可能需要更新以适配新的数据结构
