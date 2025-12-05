# 自动填充功能设计文档

## 1. 架构设计

### 1.1 整体架构

自动填充功能采用三层架构设计，确保关注点分离和模块可测试性：

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (Popup)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Popup.vue (Button)  →  SettingsPage.vue (Form) │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                Business Logic Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  useAutoFillSettings.ts (Config Management)      │
│  │  usePopupSettings.ts (Existing)                  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                Storage Layer (browser)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  browser.storage.local: auto-fill-config         │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Execution Layer (Content Script)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  autoFill.ts (Form Filling Logic)                │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 组件关系图

```
Popup.vue
  ├── useIframeDetector (existing)
  ├── useAutoFillSettings (new)
  └── usePopupSettings (existing)
       └── browser.storage.local
            ├── popup-settings
            └── auto-fill-config (new)

KeyValueInput.vue (new)
  └── BaseInput (existing)

AutoFillIcon.vue (new)

Content Script (new)
  └── autoFill.ts (new)
```

## 2. 数据流设计

### 2.1 配置保存流程

```
用户输入配置
  ↓
SettingsPage.vue (表单验证)
  ↓ (通过saveSettings)
useAutoFillSettings.ts (数据处理)
  ↓ (browser.storage.local.set)
browser.storage.local
  ↓ (Promise resolve)
显示成功消息
```

**关键设计点**:
- 验证在UI层进行，确保及早反馈
- 保存操作异步但不阻塞UI
- 自动合并新旧配置，避免覆盖其他设置

### 2.2 自动填充执行流程

```
用户点击自动填充按钮
  ↓
Popup.vue (按钮状态设为loading)
  ↓ (读取配置)
browser.storage.local.get('auto-fill-config')
  ↓ (配置验证)
Popup.vue (发送消息到内容脚本)
  ↓ (chrome.tabs.sendMessage)
Content Script
  ↓ (执行填充逻辑)
autoFill.ts (查找元素并填充)
  ↓ (返回结果)
Popup.vue (显示结果消息，恢复原状态)
```

**关键设计点**:
- 按钮状态管理确保不重复点击
- 异步消息通信需要超时处理(5秒)
- 错误信息需要清晰指导用户

### 2.3 数据格式设计

```typescript
// 配置存储格式
interface AutoFillConfig {
  containerSelector: string // CSS选择器，如 ".el-form"
  fieldMappings: Array<{ // 键值对数组
    label: string // 表单标签文本，如 "用户名"
    value: string // 填充值，如 "test_user@example.com"
  }>
}

// 存储示例
const exampleConfig = {
  'auto-fill-config': {
    containerSelector: '.el-form',
    fieldMappings: [
      { label: '用户名', value: 'test_user' },
      { label: '邮箱', value: 'test@example.com' },
      { label: '密码', value: 'Test123456' }
    ]
  }
}

// 消息通信格式
interface AutoFillMessage {
  type: 'EXECUTE_AUTO_FILL'
  config: AutoFillConfig
}

interface AutoFillResult {
  success: boolean
  filledCount: number // 成功填充的字段数
  totalCount: number // 总匹配字段数
  ignoredCount: number // 忽略的字段数
  message?: string // 结果消息
}
```

## 3. 核心算法设计

### 3.1 表单元素查找算法

```typescript
function findFormElements(
  containerSelector: string
): HTMLElement[] {
  // 查找容器元素
  const container = document.querySelector(containerSelector)
  if (!container) {
    throw new Error('Container not found')
  }

  // 获取所有 .el-form-item 元素
  return Array.from(container.querySelectorAll('.el-form-item'))
}
```

**复杂度**: O(n)，n为容器下元素总数
**优化**: 使用CSS选择器，由浏览器优化执行

### 3.2 标签文本匹配算法

```typescript
function processLabelText(element: HTMLElement): string {
  const text = element.textContent || ''

  return text
    .trim() // 去除前后空格
    .replace(/[:：]\s*$/, '') // 移除末尾冒号（中英文）
}

function findMatchingField(
  labelText: string,
  fieldMappings: FieldMapping[]
): FieldMapping | undefined {
  // 精确匹配（忽略大小写）
  const exactMatch = fieldMappings.find(
    mapping => mapping.label.toLowerCase() === labelText.toLowerCase()
  )
  if (exactMatch)
    return exactMatch

  // 模糊匹配：包含关系
  const partialMatch = fieldMappings.find(
    mapping => labelText.includes(mapping.label)
    || mapping.label.includes(labelText)
  )
  if (partialMatch)
    return partialMatch

  return undefined
}
```

**复杂度**: O(m)，m为fieldMappings数组长度
**注意**: 目前只支持精确匹配，未来可扩展模糊匹配

### 3.3 填充执行算法

```typescript
function fillFormElement(
  formItem: HTMLElement,
  fieldMappings: FieldMapping[]
): FillResult {
  const children = Array.from(formItem.children)

  // 验证子元素数量
  if (children.length !== 2) {
    return { status: 'ignored', reason: 'invalid-structure' }
  }

  const [labelEl, valueEl] = children as HTMLElement[]

  // 提取并处理标签文本
  const labelText = processLabelText(labelEl)
  if (!labelText) {
    return { status: 'ignored', reason: 'empty-label' }
  }

  // 查找匹配的配置
  const mapping = findMatchingField(labelText, fieldMappings)
  if (!mapping) {
    return { status: 'ignored', reason: 'no-match' }
  }

  // 查找input元素
  const input = valueEl.querySelector('input')
  if (!input) {
    return { status: 'ignored', reason: 'no-input' }
  }

  // 填充值
  input.value = mapping.value

  // 触发表单事件
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))

  return { status: 'filled', field: labelText }
}
```

**复杂度**: O(m) 每个元素, 总体 O(n*m) 但 n通常<20，m通常<10
**优化**: 将fieldMappings转换为Map，复杂度降至 O(1) 查找

### 3.4 主填充算法

```typescript
function executeAutoFill(config: AutoFillConfig): AutoFillResult {
  try {
    // 查找表单元素
    const formItems = findFormElements(config.containerSelector)

    if (formItems.length === 0) {
      return {
        success: true,
        filledCount: 0,
        totalCount: 0,
        ignoredCount: 0,
        message: '未找到表单元素'
      }
    }

    // 执行填充
    const results = formItems.map(item =>
      fillFormElement(item, config.fieldMappings)
    )

    // 统计结果
    const filledCount = results.filter(r => r.status === 'filled').length
    const ignoredCount = results.filter(r => r.status === 'ignored').length

    return {
      success: true,
      filledCount,
      totalCount: results.length,
      ignoredCount,
      message: `成功填充 ${filledCount} 个字段`
    }
  }
  catch (error) {
    return {
      success: false,
      filledCount: 0,
      totalCount: 0,
      ignoredCount: 0,
      message: error instanceof Error ? error.message : '未知错误'
    }
  }
}
```

**改进建议**: 将fieldMappings转为Map减少查找时间
```typescript
const fieldMap = new Map(
  fieldMappings.map(m => [m.label.toLowerCase(), m])
)
// 查找时复杂度降至 O(1)
const mapping = fieldMap.get(labelText.toLowerCase())
```

## 4. 容错与降级设计

### 4.1 错误处理策略

| 错误场景 | 处理策略 | 用户反馈 |
|---------|---------|---------|
| 未找到容器元素 | 抛出Error，中止执行 | "未找到指定容器" |
| 未找到表单元素 | 继续执行，返回0填充 | "未找到表单元素" |
| 配置为空 | 在Popup层验证，不发送消息 | "请先配置自动填充规则" |
| 元素结构不符合预期 | 忽略该元素，继续处理其他 | 静默忽略，统计时显示忽略数 |
| 标签文本不匹配 | 忽略该元素 | 静默忽略 |
| 未找到input元素 | 忽略该元素 | 静默忽略 |
| 消息通信失败 | 超时检测（5秒），重试一次 | "无法与页面通信" |

### 4.2 安全限制

1. **协议限制**: 仅在 `http://` 和 `https://` 协议页面执行
2. **敏感字段过滤**: 检查input的type，跳过password, hidden, file等
3. **作用域限制**: 填充仅在指定的containerSelector内执行
4. **用户确认**: 首次使用显示确认提示

### 4.3 性能保护

1. **超时机制**: 单次填充操作超过5秒自动中止
2. **批量更新**: 使用DocumentFragment减少重排
3. **防抖处理**: 短时间重复点击自动忽略（1秒内）
4. **元素数量限制**: 超过50个表单元素显示警告

## 5. 用户界面设计

### 5.1 设置页面布局

```
┌─────────────────────────────────────┐
│  Host配置                           │
│  [输入框]                           │
│                                     │
│  自动填充配置                       │
│  ─────────────────────────────────  │
│                                     │
│  容器选择器                         │
│  [输入框: .el-form]                 │
│                                     │
│  字段映射                           │
│  ┌───────────────────────────────┐  │
│  │ 标签: [用户名] 值: [test_user] │  │
│  │ 标签: [邮箱]    值: [test@...] │  │
│  │ + 添加键值对                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  [保存配置] [重置为默认]            │
└─────────────────────────────────────┘
```

**设计原则**:
- 清晰的视觉分组，使用分隔线区分
- 紧凑的布局，但不要过度拥挤
- 一致的输入框样式
- 明显的视觉焦点引导

### 5.2 Popup按钮布局

```
┌──────────────────────────────────────────────────┐
│  ... iframe列表 ...                              │
│                                                  │
│  [获取Key] [屏蔽广告] [自动填充] [设置]          │
└──────────────────────────────────────────────────┘
```

**布局适配**:
- 默认宽度380px，按钮居中分布
- 最小宽度320px，按钮间隔缩小到6px
- 宽度不足时允许水平滚动
- 按钮图标在16-24px之间自适应

### 5.3 状态显示设计

**按钮状态**:
- 默认: 灰色图标 (#666666)
- 加载: 蓝色旋转动画
- 成功: 绿色图标 + 淡入动画
- 错误: 红色图标 + 抖动动画

**消息提示**:
```
┌──────────────────────────────┐
│ ✓ 成功填充 3 个字段        │ (位置: 顶部中心)
└──────────────────────────────┘
  显示2秒，淡入淡出
```

## 6. 测试策略

### 6.1 单元测试重点

1. **配置验证**: 各种有效和无效输入的边界测试
2. **标签处理**: 不同格式的标签文本处理能力
3. **元素匹配**: 精确匹配的准确率

### 6.2 集成测试场景

1. **空配置**: 提示用户先配置
2. **无效选择器**: 显示容器未找到
3. **部分匹配**: 部分字段填充，部分忽略
4. **完整流程**: 配置→保存→填充→验证
5. **错误恢复**: 失败后重新配置并重试

### 6.3 手动测试清单

- [ ] Element UI表单 (主要场景)
- [ ] 嵌套容器结构
- [ ] 多个表单同时存在
- [ ] 动态生成的表单
- [ ] 响应式布局下的显示
- [ ] 键盘导航和可访问性

## 7. 可扩展性考虑

### 7.1 未来增强可能性

1. **模糊匹配**: 支持拼写容错、同义词匹配
2. **正则表达式**: 支持高级用户配置匹配规则
3. **多容器支持**: 一次填充多个容器
4. **字段类型识别**: 根据input type智能填充
5. **模板系统**: 预设测试数据集（用户信息、订单信息等）
6. **导入导出**: 配置分享和备份
7. **云同步**: 跨设备配置同步

### 7.2 代码扩展点

1. **匹配算法**: 将findMatchingField改为可插拔策略
2. **填充逻辑**: 支持除input外的其他表单控件
3. **事件系统**: 提供填充前后钩子函数

### 7.3 技术债务管理

- 当前使用Element UI特定的class名，未来版本可考虑更通用的选择器
- 标签文本匹配仅支持精确匹配，考虑后续添加模糊匹配选项
- 配置存储使用单一storage项，大量配置时可考虑压缩或分页

本设计文档完整描述了自动填充功能的架构、算法、容错机制和扩展性考虑，为实施提供了全面的技术指导，同时为未来功能增强预留了清晰的扩展点。
