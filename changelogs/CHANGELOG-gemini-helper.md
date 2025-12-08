# Gemini 提示词管理器 - 变更日志

## 版本 1.4.2 (2024-12-08)

### 新增功能：拖动排序

**功能描述**：支持拖动提示词项进行自定义排序。

#### 实现细节

- 在提示词右上角添加「☰ 拖动排序」按钮
- 设置提示词项为可拖动（draggable）
- 实现拖拽事件处理（dragstart, dragover, dragend）
- 拖动时显示半透明效果
- 松开鼠标后自动保存新顺序
- 保存成功后显示 toast 提示

#### 技术实现

**新增方法**：

```javascript
updatePromptOrder(); // 更新并保存提示词顺序
```

**事件处理**：

- `dragstart` - 开始拖动，添加 `.dragging` 样式
- `dragover` - 拖动中，计算插入位置
- `dragend` - 结束拖动，保存新顺序

**样式新增**：

- `.prompt-item.dragging` - 拖动时的半透明效果

---

## 版本 1.4.1 (2024-12-08)

### 新增功能：复制提示词

**功能描述**：在提示词项操作按钮中添加复制功能。

#### 实现细节

- 在提示词右上角添加「📋 复制」按钮
- 点击复制按钮可直接复制提示词内容到剪贴板
- 使用现代 `navigator.clipboard` API，并提供 `execCommand` 降级方案
- 复制成功后显示 toast 提示

---

## 版本 1.4.0 (2024-12-08)

### 新增功能：分类管理

**功能描述**：添加分类管理功能，支持重命名和删除分类，并修复新分类不实时显示的问题。

#### 实现细节

**分类管理入口**：

- 在分类栏右侧添加「⚙ 管理」按钮
- 点击弹出分类管理弹窗

**分类管理弹窗**：

- 列表展示所有分类及关联的提示词数量
- 每个分类提供「重命名」和「删除」操作按钮

**重命名分类**：

- 修改分类名称后，自动更新所有关联提示词的分类字段
- 无需逐个修改提示词

**删除分类**：

- 删除分类时，关联的提示词自动移至「未分类」
- 不会丢失提示词数据

**实时刷新**：

- 添加/修改提示词后自动刷新分类列表
- 新分类立即显示，无需刷新页面

#### 技术实现

**新增方法**：

```javascript
showCategoryModal(); // 显示分类管理弹窗
renameCategory(oldName, newName); // 重命名分类
deleteCategory(name); // 删除分类（移至"未分类"）
```

**修改方法**：

```javascript
refreshCategories(); // 添加管理按钮
addPrompt(); // 添加 refreshCategories() 调用
updatePrompt(); // 添加 refreshCategories() 调用
```

**样式新增**：

- `.category-manage-btn` - 管理按钮样式
- `.category-modal-content` - 分类管理弹窗
- `.category-item` - 分类列表项
- `.category-action-btn` - 操作按钮（重命名/删除）

---

## 版本 1.3.0 (2024-12-08)

### 优化功能：悬浮条逻辑改进

**功能描述**：恢复"当前提示词"悬浮条，并优化发送后自动隐藏逻辑。

#### 实现细节

- **恢复悬浮条**：选择提示词后显示"当前提示词"悬浮条，方便用户清除已插入的内容
- **自动隐藏**：发送消息后自动隐藏悬浮条
  - 监听发送按钮点击事件
  - 监听 Enter 键（非 Shift+Enter）发送事件

#### 技术要点

```javascript
// 监听发送按钮点击
e.target.closest('button[aria-label*="Send"], button[aria-label*="发送"], .send-button')

// 监听 Enter 键发送
if (e.key === 'Enter' && !e.shiftKey) { ... }
```

---

## 版本 1.2.0 (2024-12-08)

### 新增功能：快捷跳转按钮

**功能描述**：添加快捷跳转到页面顶部和底部的功能。

#### 实现细节

**面板展开时**：

- 面板底部显示两个按钮：`⬆ 顶部` 和 `⬇ 底部`
- 使用圆角矩形样式，填充渐变色

**面板收起时**：

- 右下角显示垂直排列的按钮组
- 包含三个按钮：⬆（顶部）、📝（打开面板）、⬇（底部）

**技术要点**：

- Gemini Business 使用 Shadow DOM，滚动容器在 Shadow DOM 内部
- 新增 `findScrollContainerInShadowDOM()` 方法递归查找滚动容器
- 滚动容器类名：`.chat-mode-scroller.tile-content`

---

## 版本 1.1.0 (2024-12-08)

### 新增功能：Gemini 商业版支持

**功能描述**：为脚本添加 Gemini 商业版（`business.gemini.google`）的支持。

#### 技术挑战

Gemini 商业版与普通版有以下重要差异：

| 特性       | 普通版 (gemini.google.com)  | 商业版 (business.gemini.google) |
| ---------- | --------------------------- | ------------------------------- |
| 编辑器类型 | Quill Editor (`.ql-editor`) | ProseMirror (`.ProseMirror`)    |
| DOM 结构   | 普通 DOM                    | Web Components + Shadow DOM     |
| 主容器     | 无                          | `<UCS-STANDALONE-APP>`          |

#### 主要修改

1. **新增 URL 匹配规则**

```javascript
// @match https://business.gemini.google/*
```

2. **站点检测变量**

```javascript
const isGeminiBusiness = window.location.hostname.includes(
  "business.gemini.google"
);
const isGemini =
  window.location.hostname.includes("gemini.google") && !isGeminiBusiness;
const isAnyGemini = isGemini || isGeminiBusiness;
```

3. **Shadow DOM 递归搜索**
   商业版的输入框在 Shadow DOM 中，普通的 `document.querySelector` 无法访问。新增了递归搜索函数。

4. **元素过滤逻辑**
   为避免误匹配（如顶部搜索框），添加了验证函数 `isValidChatInput()`。

5. **新增方法**

- `findAndInsertForBusiness()`: 商业版专用的异步查找和插入方法
- `insertToGeminiBusiness()`: 商业版专用的文本插入方法

---

## 优化记录

### 恢复并优化悬浮条逻辑 (1.2.0)

- **恢复悬浮条**：选择提示词后显示"当前提示词"悬浮条，方便用户清除已插入的内容
- **自动隐藏**：发送消息后（点击发送按钮或按 Enter 键）自动隐藏悬浮条
- 监听发送按钮点击事件
- 监听 Enter 键（非 Shift+Enter）发送事件

### 修复标题换行问题 (1.1.0)

- 添加 `white-space: nowrap` 防止标题换行
- "Gemini Enterprise" 缩短为 "Enterprise"
