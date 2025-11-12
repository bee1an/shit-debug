## ADDED Requirements

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
