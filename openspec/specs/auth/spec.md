# iframe鉴权规格

## Purpose
定义浏览器扩展的iframe检测和openKey鉴权功能，包括手动获取OpenKey的界面交互。

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

### Requirement: 手动获取OpenKey
系统 SHALL 提供一个显式的按钮让用户手动获取OpenKey。

#### Scenario: 成功获取OpenKey
- **WHEN** 用户点击"获取OpenKey"按钮
- **AND** 系统存在有效的key_req_host配置
- **AND** API调用成功返回有效的openKey
- **THEN** 系统 SHALL 显示获取成功的消息
- **AND** 将openKey值复制到系统剪贴板
- **AND** 按钮状态显示为成功状态

#### Scenario: 无有效配置获取失败
- **WHEN** 用户点击"获取OpenKey"按钮
- **AND** 系统不存在有效的key_req_host配置
- **THEN** 系统 SHALL 显示配置缺失的错误消息
- **AND** 指导用户先访问目标页面以获取配置
- **AND** 按钮状态显示为失败状态

#### Scenario: 网络错误获取失败
- **WHEN** 用户点击"获取OpenKey"按钮
- **AND** API调用遇到网络错误
- **THEN** 系统 SHALL 显示具体的网络错误信息
- **AND** 提供重试建议
- **AND** 按钮状态显示为失败状态

#### Scenario: API响应格式错误
- **WHEN** 用户点击"获取OpenKey"按钮
- **AND** API返回格式不正确的响应
- **THEN** 系统 SHALL 显示响应解析错误信息
- **AND** 显示原始响应内容供用户参考
- **AND** 按钮状态显示为失败状态

### Requirement: 按钮状态管理
系统 SHALL 管理获取OpenKey按钮的不同状态。

#### Scenario: 按钮加载状态
- **WHEN** 用户点击"获取OpenKey"按钮
- **THEN** 系统 SHALL 将按钮状态设置为加载中
- **AND** 禁用按钮防止重复点击
- **AND** 显示加载动画或进度指示器
- **AND** 在操作完成后恢复按钮状态

#### Scenario: 按钮成功状态
- **WHEN** OpenKey获取成功完成
- **THEN** 系统 SHALL 将按钮状态设置为成功
- **AND** 显示成功图标或颜色变化
- **AND** 在一段时间后恢复按钮到初始状态

#### Scenario: 按钮失败状态
- **WHEN** OpenKey获取失败
- **THEN** 系统 SHALL 将按钮状态设置为失败
- **AND** 显示错误图标或颜色变化
- **AND** 在一段时间后恢复按钮到初始状态

### Requirement: 获取结果展示
系统 SHALL 清晰展示OpenKey获取的结果信息。

#### Scenario: 显示获取的OpenKey
- **WHEN** OpenKey获取成功
- **AND** 系统成功解析出openKey值
- **THEN** 系统 SHALL 在界面上显示获取到的openKey值
- **AND** 显示获取时间戳
- **AND** 显示API响应状态码

#### Scenario: 复制到剪贴板反馈
- **WHEN** 系统成功将openKey复制到剪贴板
- **THEN** 系统 SHALL 显示复制成功的反馈消息
- **AND** 消息应该清晰明确且易于理解
- **AND** 反馈应该在适当的时间后自动消失

#### Scenario: 显示详细错误信息
- **WHEN** OpenKey获取或解析失败
- **THEN** 系统 SHALL 显示详细的错误信息
- **AND** 包括错误类型和可能的原因
- **AND** 提供用户可操作的建议
