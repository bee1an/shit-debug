## ADDED Requirements

### Requirement: Host配置管理
用户SHALL能够配置iframe链接跳转时使用的主机前缀，以适应不同的开发和部署环境。

#### Scenario: 设置自定义Host前缀
- **WHEN** 用户在设置页面输入有效的host前缀（如 `http://localhost:3000` 或 `https://example.com`）
- **AND** 点击保存按钮
- **THEN** 系统应该验证URL格式并保存配置
- **AND** 显示保存成功的提示信息

#### Scenario: 使用配置的Host前缀跳转
- **WHEN** 用户点击iframe的跳转按钮
- **AND** 已配置自定义host前缀
- **THEN** 系统应该使用配置的host前缀而不是默认的localhost:4000
- **AND** 在新标签页中打开正确的URL

#### Scenario: 默认Host配置
- **WHEN** 用户首次使用扩展或清空配置
- **THEN** 系统应该使用 `http://localhost:4000` 作为默认host前缀
- **AND** 在设置页面显示默认值

### Requirement: 设置页面导航
用户SHALL能够从主页面访问设置页面，并在配置完成后返回主页面。

#### Scenario: 从主页面导航到设置
- **WHEN** 用户点击主页面上的设置按钮
- **THEN** 系统应该显示设置页面
- **AND** 当前的host配置应该正确显示在表单中

#### Scenario: 保存配置返回主页面
- **WHEN** 用户在设置页面保存配置
- **THEN** 系统应该自动返回到主页面
- **AND** 显示配置保存成功的消息

### Requirement: Popup组件模块化
Popup组件SHALL拆分为多个独立的子组件，以提高代码的可维护性和可重用性。

#### Scenario: 组件功能分离
- **WHEN** 查看popup组件结构
- **THEN** 搜索功能应该封装在独立的SearchComponent中
- **AND** iframe管理功能应该封装在独立的IframeComponent中
- **AND** 消息显示功能应该封装在独立的MessageComponent中
- **AND** 设置页面应该是独立的SettingsPage组件

#### Scenario: 组件间通信
- **WHEN** 子组件需要与父组件通信
- **THEN** 应该使用Vue 3的emit机制进行事件传递
- **AND** 使用props进行数据传递
- **AND** 保持组件间的松耦合
