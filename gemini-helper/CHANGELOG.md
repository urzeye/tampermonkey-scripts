# Gemini 助手 - 变更日志

## 版本 1.6.1 (2025-12-10)

### 新功能：页面加宽

#### 问题描述

1. **普通版 Gemini**：用户消息在页面加宽后没有正确右对齐
2. **Gemini Business (px 模式)**：优化了容器宽度处理

#### 修复方案

**普通版 Gemini**：

- 为 `user-query` 和 `.user-query-container` 添加 `display: flex; justify-content: flex-end` 样式
- 确保用户消息在宽页面下保持右对齐

**架构优化**：

- 新增 `noCenter` 配置选项，支持容器元素不应用自动居中
- 优化 `generateCSS()` 和 `generateShadowCSS()` 方法支持条件性居中

---

## 版本 1.6.0 (2025-12-10) - [6ac436d](https://github.com/urzeye/tampermonkey-scripts/commit/6ac436d)

### 新功能：Tab 切换架构与设置面板

#### 功能概述

- **面板重命名**：从"提示词管理"改为"Gemini 助手"(✨ 图标)
- **Tab 切换**：支持"📝 提示词"和"⚙️ 设置"两个标签页
- **设置面板**：仅在 Gemini Business 中显示
  - "发送后自动修复中文输入"开关（默认关闭）
  - 使用 `GM_setValue/GM_getValue` 持久化存储

#### 多语言支持

根据 `navigator.language` 自动检测语言，支持：

- 简体中文 (zh-CN)
- 繁體中文 (zh-TW)
- English (en)

#### 技术实现

**新增常量与配置**：

```javascript
const SETTING_KEYS = {
    CLEAR_TEXTAREA_ON_SEND: 'gemini_business_clear_on_send',
    LANGUAGE: 'ui_language'
};

const I18N = {
    'zh-CN': { panelTitle: 'Gemini 助手', ... },
    'zh-TW': { panelTitle: 'Gemini 助手', ... },
    'en': { panelTitle: 'Gemini Helper', ... }
};
```

**新增方法**：

- `detectLanguage()` - 语言检测
- `t(key)` - 获取翻译文本
- `loadSettings()` / `saveSettings()` - 设置持久化
- `switchTab(tabName)` - Tab 切换
- `createSettingsContent(container)` - 创建设置面板

**事件处理修改**：

```javascript
// 根据设置决定是否调用 clearTextarea
if (
  this.siteAdapter instanceof GeminiBusinessAdapter &&
  this.settings.clearTextareaOnSend
) {
  setTimeout(() => {
    this.siteAdapter.clearTextarea();
  }, 200);
}
```

---

## 版本 1.5.5 (2025-12-10) - [431525d](https://github.com/urzeye/tampermonkey-scripts/commit/431525d)

### 修复问题：Gemini Business 提示词发送后，悬浮条不隐藏问题

#### 问题描述

- 在 Gemini Business（使用 Shadow DOM + ProseMirror）场景下，脚本原先通过 `e.target.closest(...)` 或简单的 `document` 查询来识别“发送”动作与编辑器节点；但在 Shadow DOM 或事件代理路径中，`e.target` 可能是 Shadow host 或其他容器，导致未正确识别发送事件或未更新 `siteAdapter.textarea`，从而无法在发送后隐藏“当前提示词”悬浮条。
- 此外，早期通过 `document.execCommand('delete')` / `insertText` 等命令清空编辑器的方式在 ProseMirror 中有兼容性问题，会破坏编辑器内部段落结构，造成光标跳转或插入的空格/换行丢失。

#### 修复思路

- 使用事件的 `composedPath()`（或兼容 `path`）来遍历事件传播链，优先在传播路径中找到真实的编辑器节点或发送按钮（支持 Shadow DOM）。
- 在判断 Enter/发送来源时，先做严格的 DOM 特征检测（`contenteditable="true"`、`role=textbox`、`.ProseMirror`、`TEXTAREA`），再降级到适配器的 `isValidTextarea()`，最后才用通用的 `.matches(...)` 兜底。这样尽量减少误判（例如把提示面板误当输入框）。
- 针对 ProseMirror（Gemini Business）的清空操作，改为保留段落结构的方式：确保存在 `<p>` 节点、写入零宽空格 `\u200B`、派发 `InputEvent` 并用 Selection 定位光标，同时加入短延迟重试以应对站点脚本的并发修改。

#### 关键代码（节选）

- 1. 在事件中通过 `composedPath` 找到发送按钮（`UniversalPromptManager.findElementByComposedPath`）

```javascript
function findElementByComposedPath(e) {
  const path =
    (e && typeof e.composedPath === "function" && e.composedPath()) ||
    e.path ||
    [];
  const selectors = this.siteAdapter.getSubmitButtonSelectors() || [];
  const combined = selectors.join(",");
  for (const node of path) {
    if (!node || !(node instanceof Element)) continue;
    try {
      if (combined && node.matches && node.matches(combined)) return node;
    } catch (err) {
      /* ignore */
    }
  }
  return null;
}
```

- 2. Enter 键路径遍历与严格判定（在 `UniversalPromptManager` 的按键处理处）

```javascript
const path = (e && e.composedPath && e.composedPath()) || e.path || [e.target];
let foundEditor = null;
for (const node of path) {
  if (!node || !(node instanceof Element)) continue;

  // 严格判定：显式可编辑特征优先
  const isStrictEditable =
    (typeof node.getAttribute === "function" &&
      node.getAttribute("contenteditable") === "true") ||
    (typeof node.getAttribute === "function" &&
      node.getAttribute("role") === "textbox") ||
    (node.classList &&
      node.classList.contains &&
      node.classList.contains("ProseMirror")) ||
    node.tagName === "TEXTAREA";
  if (isStrictEditable) {
    foundEditor = node;
    break;
  }

  // 次级判定：让适配器判断（适配器可能有站点特殊逻辑）
  try {
    if (this.siteAdapter.isValidTextarea(node)) {
      foundEditor = node;
      break;
    }
  } catch (err) {}

  // 最后兜底：常见可编辑选择器
  try {
    if (
      node.matches &&
      node.matches('[contenteditable="true"], .ProseMirror, textarea')
    ) {
      foundEditor = node;
      break;
    }
  } catch (err) {}
}
if (foundEditor) {
  this.siteAdapter.textarea = foundEditor;
  // 延迟隐藏，避免与页面脚本竞争
  setTimeout(() => this.clearSelectedPrompt(), 100);
}
```

- 3. 针对 Gemini Business（ProseMirror）的清空逻辑（`GeminiBusinessAdapter.clearTextarea` 的核心）

```javascript
const tryClear = () => {
  const ta = this.textarea;
  if (!ta) return;

  // 普通 textarea/input
  if (ta.tagName === "TEXTAREA" || ta.tagName === "INPUT") {
    ta.value = "";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // contenteditable / ProseMirror 场景：保留段落结构
  let p = ta.querySelector("p");
  if (!p) {
    p = document.createElement("p");
    ta.appendChild(p);
  }
  // 写入零宽空格以避免破坏段落结构
  p.textContent = "\u200B";
  ta.dispatchEvent(new InputEvent("input", { bubbles: true }));

  // 把光标放到 p 的末尾
  const range = document.createRange();
  range.selectNodeContents(p);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  // 若清空失败（站点脚本可能在并发修改），250ms 后重试一次
  setTimeout(() => {
    if (ta.textContent && ta.textContent.trim() !== "") tryClear();
  }, 250);
};
tryClear();
```

#### 其它改动（兼容与稳健性）

- 统一 `getSubmitButtonSelectors()` 返回类型为数组，避免在组合选择器时出现异常。
- 在发送按钮点击与 Enter 事件中都显式调用 `this.siteAdapter.clearTextarea()`（带短延迟），确保在发送后及时清空输入并隐藏悬浮条。
- 为关键判断加入 try/catch，防止第三方站点脚本抛错影响脚本整体运行。

以上更改已在本地 `gemini-helper.user.js` 中实现并在多种场景下进行兼容调整，推荐在目标站点（Gemini 普通版 / Gemini Business / Genspark）上进行实机测试以验证没有回归。

## 版本 1.5.4 (2025-12-09) - [944f03f](https://github.com/urzeye/tampermonkey-scripts/commit/944f03f)

### 修复问题：Gemini Business 中文输入首字母自动转换为英文

#### 修复方案

- 在 `afterPropertiesSet` 中，先全选，再插入空格，再全选，再插入新内容

## 版本 1.5.3 (2025-12-09) - [1314b25](https://github.com/urzeye/tampermonkey-scripts/commit/1314b25)

### 紧急修复

1. **修复点击面板触发全局编辑/全选**：

   - 彻底修复了一个严重 Bug，该 Bug 曾导致脚本将“提示词面板”本身误判为“Gemini 输入框”。
   - 修正了 `isValidTextarea` 判断逻辑，现在严格校验 `contenteditable` 属性并排除面板自身。
   - 解决了点击提示词可能导致提示词变大、页面全选或样式异常的问题。

2. **UI 健壮性增强**：
   - 添加 `user-select: none`，防止误触。

---

## 版本 1.5.0 (2025-12-09) - [63eff8d](https://github.com/urzeye/tampermonkey-scripts/commit/63eff8d)

### 重构：引入站点适配器模式 (Site Adapter Pattern)

**核心改进**：为了提高代码的可维护性和扩展性，本次版本彻底重构了底层架构，引入了站点适配器模式。现在添加对新 AI 站点的支持变得异常简单。

#### 架构变更

- **SiteAdapter (基类)**: 定义了统一的接口（匹配规则、主题色、输入框查找、内容插入等）。
- **SiteRegistry (注册表)**: 统一管理所有适配器，自动检测当前运行环境。
- **UniversalPromptManager**: 不再包含特定站点的 `if/else` 逻辑，完全解耦。

#### 代码实现预览

```javascript
/**
 * 站点适配器基类
 */
class SiteAdapter {
  match() {
    throw new Error("必须实现 match()");
  }
  getName() {
    throw new Error("必须实现 getName()");
  }
  getThemeColors() {
    throw new Error("必须实现 getThemeColors()");
  }
  findTextarea() {
    /* 通用查找逻辑 */
  }
  insertPrompt(content) {
    throw new Error("必须实现 insertPrompt()");
  }
}

/**
 * 示例：Gemini 适配器
 */
class GeminiAdapter extends SiteAdapter {
  match() {
    return window.location.hostname.includes("gemini.google");
  }
  getName() {
    return "Gemini";
  }
  insertPrompt(content) {
    // Gemini 特定的 DOM 操作逻辑
  }
}
```

现在，如果想为脚本添加一个新的 AI 网站支持，只需继承 `SiteAdapter` 并注册即可，无需修改核心业务逻辑。

---

## 版本 1.4.5 (2025-12-09) - [bd3df12](https://github.com/urzeye/tampermonkey-scripts/commit/bd3df12)

### 修复问题：页面加载后首次插入提示词时，多行文本只能插入首行

**问题描述**：页面加载后首次插入提示词时，多行文本只能插入首行

`document.execCommand('delete')` 太彻底了。 它不仅删除了文字，还把编辑器内部用于维持段落格式的容器标签（如 `<p>`或 `<div>`）也给删掉了。 `当编辑器变成一个“光杆”容器时，Chrome` 的 `insertText` 命令在处理换行符 `\n` 时就会失效，因为它不知道该在哪里创建新段落，于是就丢弃了换行后的所有内容。

### 修复方案

```javascript
// 先全选
document.execCommand("selectAll", false, null);
// 【关键 Trick】插入一个空格来“替换”旧内容
// 直接 delete 会破坏 DOM 结构导致多行失效
// 用 insertText 插入空格，既清空了旧文，又保留了段落标签 <p>
document.execCommand("insertText", false, " ");
// 再次全选（为了选中刚才那个空格，准备覆盖它）
// 如果不加这步，提示词前面会多一个空格
document.execCommand("selectAll", false, null);
// 然后插入新内容
const success = document.execCommand("insertText", false, promptContent);
```

## 版本 1.4.4 (2025-12-08) - [75dd3e5](https://github.com/urzeye/tampermonkey-scripts/commit/75dd3e5)

### 修复问题：切换提示词时内容叠加

**问题描述**：切换提示词时，新提示词内容会叠加到旧内容末尾，而不是替换。

#### 修复方案

**Gemini 普通版**：

- 在 `insertToGemini` 方法中，插入前先执行 `selectAll` + `delete` 清空内容
- 降级方案改为直接替换 `editor.textContent`，不再叠加

**Gemini Business 版**：

- 在 `insertToGeminiBusiness` 方法中，插入前先执行 `selectAll` + `delete` 清空内容
- 降级方案改为直接替换 `p.textContent`，移除了占位符检测逻辑

---

## 版本 1.4.3 (2025-12-08) - [9887b4c](https://github.com/urzeye/tampermonkey-scripts/commit/9887b4c)

### 优化功能：拖动悬浮窗体验

**功能描述**：优化拖动悬浮窗体验，避免误选中文本。

#### 优化细节

- **标题栏样式**：添加 `user-select: none` 阻止标题文字被选中
- **阻止默认行为**：`mousedown` 事件中调用 `e.preventDefault()` 阻止文本选中
- **全局选中控制**：拖动时设置 `document.body.style.userSelect = 'none'`，结束后恢复
- **平滑体验**：拖动过程中不会选中页面任何文本内容

---

## 版本 1.4.2 (2025-12-08) - [7455551](https://github.com/urzeye/tampermonkey-scripts/commit/7455551)

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

## 版本 1.4.1 (2025-12-08) - [74b296e](https://github.com/urzeye/tampermonkey-scripts/commit/74b296e)

### 新增功能：复制提示词

**功能描述**：在提示词项操作按钮中添加复制功能。

#### 实现细节

- 在提示词右上角添加「📋 复制」按钮
- 点击复制按钮可直接复制提示词内容到剪贴板
- 使用现代 `navigator.clipboard` API，并提供 `execCommand` 降级方案
- 复制成功后显示 toast 提示

---

## 版本 1.4.0 (2025-12-08) - [98daaba](https://github.com/urzeye/tampermonkey-scripts/commit/98daaba)

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

## 版本 1.3.0 (2025-12-08) - [e17b2a0](https://github.com/urzeye/tampermonkey-scripts/commit/e17b2a0)

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

## 版本 1.2.0 (2025-12-08) - [6bffe6b](https://github.com/urzeye/tampermonkey-scripts/commit/6bffe6b)

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

## 版本 1.1.0 (2025-12-08) - [a398a05](https://github.com/urzeye/tampermonkey-scripts/commit/a398a05)

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
