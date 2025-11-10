# iframe鉴权规格

本规格定义了浏览器扩展的iframe检测和openKey鉴权功能。

## Requirements

### Requirement: iframe检测
系统 SHALL 检测当前页面中的所有iframe元素。

#### Scenario: 单个iframe检测
- **WHEN** 页面包含单个iframe元素
- **THEN** 系统 SHALL 检测到该iframe并提取其hash内容
- **AND** 提取iframe的src属性
- **AND** 系统 SHALL 自动尝试获取openKey

#### Scenario: 多个iframe检测
- **WHEN** 页面包含多个iframe元素
- **THEN** 系统 SHALL 检测到所有iframe
- **AND** 显示iframe列表供用户选择
- **AND** 为每个iframe获取openKey

#### Scenario: 无iframe检测
- **WHEN** 页面不包含任何iframe元素
- **THEN** 系统 SHALL 报告当前页面没有找到iframe
- **AND** 显示相应的提示消息

### Requirement: OpenKey获取
系统 SHALL 通过API调用获取openKey用于iframe鉴权。

#### Scenario: OpenKey获取成功
- **WHEN** 系统调用openKey API
- **AND** API返回有效的响应
- **THEN** 系统 SHALL 提取返回的openKey值
- **AND** 验证API响应格式的有效性
- **AND** 系统 SHALL 支持重试机制（最多3次）

#### Scenario: OpenKey获取失败
- **WHEN** API调用失败或返回无效响应
- **THEN** 系统 SHALL 显示错误消息
- **AND** 记录详细的错误信息
- **AND** 系统 SHALL 提供降级处理选项

### Requirement: URL参数替换
系统 SHALL 支持替换URL中的openKey参数。

#### Scenario: Hash中openKey替换
- **WHEN** iframe URL包含hash中的openKey参数
- **AND** 系统获取了新的openKey
- **THEN** 系统 SHALL 替换hash中的openKey参数值
- **AND** 保持URL的其他部分不变
- **AND** 系统 SHALL 返回更新后的完整URL

#### Scenario: Search中openKey替换
- **WHEN** iframe URL包含search参数中的openKey
- **AND** 系统获取了新的openKey
- **THEN** 系统 SHALL 替换search中的openKey参数值
- **AND** 保持URL的其他部分不变
- **AND** 系统 SHALL 返回更新后的完整URL

#### Scenario: 新openKey添加
- **WHEN** iframe URL不包含openKey参数
- **AND** 系统获取了新的openKey
- **THEN** 系统 SHALL 添加openKey参数到hash部分
- **AND** 使用适当的分隔符（?或&）
- **AND** 系统 SHALL 返回更新后的完整URL

### Requirement: 用户界面集成
系统 SHALL 提供直观的用户界面支持iframe操作。

#### Scenario: iframe状态显示
- **WHEN** 系统处理iframe信息
- **THEN** 界面 SHALL 显示iframe的状态指示器
- **AND** 使用颜色编码表示不同状态（成功/失败/处理中）
- **AND** 显示hash内容存在指示器
- **AND** 显示openKey获取状态指示器

#### Scenario: URL复制和跳转
- **WHEN** 用户选择iframe进行操作
- **THEN** 系统 SHALL 将更新后的URL复制到剪贴板
- **AND** 提供跳转到localhost的选项
- **AND** 显示操作成功的反馈消息
- **AND** 保存操作历史记录

#### Scenario: 批量操作
- **WHEN** 用户选择打开所有iframe
- **THEN** 系统 SHALL 为每个iframe创建新的标签页
- **AND** 优先使用更新后的URL
- **AND** 等待页面加载完成
- **AND** 激活最后一个创建的标签页

### Requirement: 错误处理和恢复
系统 SHALL 提供完善的错误处理和用户恢复机制。

#### Scenario: 配置缺失
- **WHEN** 系统检测到缺少有效的openKey配置
- **THEN** 系统 SHALL 显示配置缺失的提示消息
- **AND** 指导用户先访问目标页面
- **AND** 阻止进一步的openKey API调用

#### Scenario: 网络错误
- **WHEN** API调用遇到网络连接问题
- **THEN** 系统 SHALL 实现重试机制
- **AND** 使用递增延迟（1秒、2秒、3秒）
- **AND** 在最终失败时提供清晰的错误描述

#### Scenario: 响应解析错误
- **WHEN** API返回格式不正确的响应
- **THEN** 系统 SHALL 捕获解析异常
- **AND** 提供响应格式错误的详细信息
- **AND** 系统 SHALL 优雅降级到基础功能
