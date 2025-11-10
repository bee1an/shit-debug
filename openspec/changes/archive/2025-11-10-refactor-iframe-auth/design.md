## Context

当前浏览器扩展的iframe鉴权机制依赖于从iframe的sessionStorage中提取SET_LOGIN_DATA数据。这种方法存在以下问题：

1. **跨域限制**：iframe可能来自不同域，sessionStorage访问受限
2. **可靠性问题**：依赖iframe内部状态，容易受到页面变化影响
3. **安全风险**：直接访问iframe存储可能存在安全隐患

## Goals / Non-Goals

- **Goals**:
  - 实现基于API调用的可靠鉴权机制
  - 保持现有的用户交互流程不变
  - 提高错误处理能力和用户体验
  - 确保向后兼容性

- **Non-Goals**:
  - 完全重新设计用户界面
  - 修改其他与鉴权无关的功能
  - 改变浏览器扩展的基本架构

## Decisions

### Decision 1: 使用OpenKey API替代sessionStorage
- **What**: 将鉴权数据来源从iframe的sessionStorage改为通过openKey API获取
- **Why**: API调用更可靠，不受跨域限制，便于错误处理
- **How**: 扩展现有的openKey.ts工具，添加URL参数处理功能

### Decision 2: 保持现有iframe检测流程
- **What**: 维持现有的iframe检测和用户选择逻辑
- **Why**: 用户界面和交互流程已经成熟，减少学习成本
- **How**: 只修改鉴权数据获取部分，其他逻辑保持不变

### Decision 3: URL参数替换机制
- **What**: 解析iframe URL中的openKey参数，用API返回的新值替换
- **Why**: 保持URL结构完整，只更新必要的鉴权参数
- **How**: 使用URL API解析和重建URL字符串

## Risks / Trade-offs

### Risk 1: API调用失败
- **Mitigation**: 实现重试机制和降级处理，提供清晰的错误提示

### Risk 2: URL解析错误
- **Mitigation**: 添加URL格式验证，处理边界情况

### Trade-off 1: 增加了网络请求
- **Justification**: 相比sessionStorage的不可靠性，API调用更值得信赖

## Migration Plan

1. **Phase 1**: 扩展openKey.ts，添加URL处理功能
2. **Phase 2**: 重构useIframeDetector.ts，替换鉴权逻辑
3. **Phase 3**: 更新相关的类型定义和接口
4. **Phase 4**: 测试和验证新功能
5. **Phase 5**: 清理和文档更新

**Rollback**: 保留原始实现作为备份，确保可以快速回滚

## Resolved Questions

### Q: openKey API的调用频率限制是什么？
**A**: 不限制调用频率

### Q: 是否需要缓存openKey结果以提高性能？
**A**: 不能缓存，一个openKey只能打开一个页面

### Q: 如何处理多个iframe需要不同openKey的情况？
**A**: 为每个iframe发送独立的openKey API请求

## Implementation Constraints

Based on the resolved questions, the following constraints apply:

1. **No API Rate Limiting**: System can make unlimited API calls
2. **No Caching Strategy**: Each openKey is single-use, cannot be cached
3. **Per-iframe API Calls**: Multiple iframes require separate API requests
