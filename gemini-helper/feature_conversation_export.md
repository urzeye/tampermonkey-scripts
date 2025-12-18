# Gemini Helper 会话管理与导出功能需求文档

> **文档版本**: v2.1  
> **最后更新**: 2025-12-18  
> **状态**: 需求细化完成，待开发

---

## 1. 功能概述

本功能旨在为 Gemini Helper 添加一个独立的 **"会话" Tab**，解决以下用户痛点：

1. **对话过多难以定位**：历史对话列表过长，翻找成本高
2. **无法归类整理**：相关主题的对话无法"打包"或"归类"
3. **内容导出需求**：需要将对话导出为可存档、可阅读的格式

---

## 2. MVP 核心功能 (P0)

### 2.1 独立"会话" Tab

-   **Tab 名称**：`会话`（zh-CN）/ `會話`（zh-TW）/ `Conversations`（en）
-   **位置**：与现有 Prompts、Outline、Settings Tab 并列
-   **可配置**：
    -   在 `设置 → 界面排版` 中添加"会话"选项
    -   支持调整 Tab 位置顺序
    -   支持动态启用/禁用
-   **站点隔离**：每个站点的会话数据独立存储，互不干扰
-   **数据迁移**：兼容老用户，检测到本地存储无此 Tab 设置时自动添加并保存

---

### 2.2 对话列表展示

#### 数据来源

-   从页面左侧边栏（Sidebar）手动同步获取会话列表
-   支持**增量同步**：只添加新会话，不删除已有记录

#### UI 布局：可展开分组式

```
┌──────────────────────────────────────────┐
│ 会话                      🔄  ➕  ⚙️    │  ← 🔄同步 ➕新建文件夹 ⚙️管理
├──────────────────────────────────────────┤
│ 🔍 搜索...                    ☑ ☐ ⟲     │  ← 全选 反选 取消
├──────────────────────────────────────────┤
│ ▾ 📥 收件箱                    (12) ⋯   │  ← ⋯ 更多(重命名/删除/改图标)
│   ┌────────────────────────────────────┐ │
│   │ 会话标题A              12-18 10:13 │ │  ← 悬浮显示 [移动][删除]
│   │ 会话标题B              12-17 14:22 │ │
│   └────────────────────────────────────┘ │
│ ▾ 🎨 诗歌                       (5) ⋯   │
│   ┌────────────────────────────────────┐ │
│   │ ☑ 古诗词赏析           12-16 09:30 │ │  ← 勾选后可批量操作
│   │ ☐ 现代诗创作           12-15 16:45 │ │
│   └────────────────────────────────────┘ │
│ ▸ 💼 工作                       (8) ⋯   │  ← 折叠状态
│                                          │
│ • 已选 2 个会话 •  [移动] [删除]         │  ← 底部悬浮操作栏
└──────────────────────────────────────────┘
```

#### 交互功能

| 功能                | 交互设计                                  |
| ------------------- | ----------------------------------------- |
| **文件夹展开/折叠** | 点击 ▾/▸ 箭头或文件夹名称                 |
| **文件夹多选**      | 点击文件夹复选框 → 自动勾选所有会话       |
| **会话单选**        | 点击会话项的复选框                        |
| **会话跳转**        | 点击会话标题 → 跳转到该会话页面           |
| **悬浮按钮**        | 鼠标悬停会话项 → 显示 `[🏷️移动] [🗑️删除]` |
| **批量操作**        | 底部悬浮栏显示"已选 X 个会话" + 操作按钮  |
| **搜索筛选**        | 顶部搜索框，实时过滤对话标题              |

---

### 2.3 对话文件夹/分类

#### 分类结构

-   **单层文件夹**：MVP 阶段不支持嵌套，降低复杂度
-   **默认文件夹**：`📥 收件箱`，不可删除，可重命名
-   **用户自定义**：支持创建、重命名、删除、自定义图标（emoji）
-   **新会话归类**：自动归入**当前选中**或**上次使用**的文件夹

#### 文件夹操作

| 操作         | 触发方式      | 说明                           |
| ------------ | ------------- | ------------------------------ |
| **新建**     | 顶部 ➕ 按钮  | 弹出输入框，输入名称和选择图标 |
| **重命名**   | 文件夹 ⋯ 菜单 | 弹出编辑框                     |
| **删除**     | 文件夹 ⋯ 菜单 | 确认弹窗，会话移至默认文件夹   |
| **更改图标** | 文件夹 ⋯ 菜单 | emoji 选择器                   |

#### Emoji 选择器实现

-   **预设快捷选择**：提供 12-15 个常用图标按钮（📁📂📥📚💼🎨🔬📝💡🏠🎯⭐🔖）
-   **自定义输入**：支持用户直接输入任意 emoji（可使用 Win+. 调出系统选择器）
-   **预估代码量**：~50-80 行

#### 会话移动

-   **触发方式**：悬浮按钮 `🏷️ 移动`
-   **交互方式**：弹窗显示文件夹列表，可搜索，点击目标文件夹完成移动

#### 数据存储

-   使用 `GM_setValue` 持久化存储
-   **按站点隔离**：每个站点独立存储
-   存储结构示例：
    ```javascript
    // 存储 key: gemini_helper_conversations_${siteId}
    // siteId: 'gemini' | 'gemini-business' | 'genspark'
    {
        "folders": [
            { "id": "inbox", "name": "📥 收件箱", "icon": "📥", "isDefault": true },
            { "id": "poetry", "name": "诗歌", "icon": "🎨", "isDefault": false }
        ],
        "tags": [],  // 🚧 预留字段，后续支持标签系统
        "conversations": {
            "conversation-id-1": {
                "title": "古诗词赏析",
                "folderId": "poetry",
                "tagIds": [],  // 🚧 预留字段
                "updatedAt": 1734480000000
            },
            "conversation-id-2": { "title": "API设计", "folderId": "inbox", "updatedAt": 1734393600000 }
        },
        "lastUsedFolderId": "poetry"  // 用于新会话自动归类
    }
    ```

---

### 2.4 当前会话完美导出

#### 触发方式

-   Tab 内"导出当前会话"按钮
-   或：对话区域的悬浮工具栏快捷入口

#### 导出前预处理

> [!IMPORTANT] > **历史加载问题**：长对话可能未完全加载，需确保滚动到对话开头后再导出。

实现策略：

1. 检测当前对话是否已加载到开头（判断是否存在"加载更多"或首条消息）
2. 如未加载完整，自动滚动到顶部触发历史加载
3. 等待加载完成后，再执行内容抓取
4. 提供加载进度反馈（Toast 提示）

#### 导出格式

| 格式         | 用途                         | MVP     |
| ------------ | ---------------------------- | ------- |
| **JSON**     | 数据备份、程序化处理、可恢复 | ✅      |
| **Markdown** | 人类可读、笔记软件兼容       | ✅      |
| HTML         | 高保真、离线查看             | ⬜ 后续 |
| TXT          | 纯文本                       | ⬜ 后续 |

---

### 2.5 Markdown 导出格式规范

#### 标题层级冲突解决方案

**问题**：AI 回复中可能包含 `#` 标题，与用户/AI 消息分隔标题冲突。

**解决方案**：分隔符 + 角色前缀 + 标题降级

```markdown
---
title: '对话标题'
source: 'https://gemini.google.com/app/xxx'
exported_at: '2025-12-17 22:30:00'
model: 'Gemini 1.5 Pro'
message_count: 12
---

---

## 👤 User

你好，请介绍一下 TypeScript

---

## 🤖 Gemini

TypeScript 是一种...

### 核心特性

1. 静态类型
2. ...

---

## 👤 User

能给个例子吗？

---

## 🤖 Gemini

...
```

**格式规则**：

1. **Frontmatter**：YAML 元数据（标题、来源 URL、导出时间、模型、消息数）
2. **角色标题**：`## 👤 User` / `## 🤖 Gemini`（H2 级别）
3. **标题降级**：AI 回复内部的标题**全部降 2 级**（H1→H3, H2→H4, ...）
4. **消息分隔**：使用 `---` 水平线分隔每条消息

#### 特殊内容处理

| 内容类型           | 处理方式                           |
| ------------------ | ---------------------------------- |
| **LaTeX 数学公式** | 保留原始 `$...$` 和 `$$...$$` 语法 |
| **Markdown 表格**  | 保留原始表格语法                   |
| **代码块**         | 保留语言标识和完整内容             |
| **图片**           | 见下方"图片导出"章节               |

#### 图片导出策略

> [!WARNING] > **已知问题**：由于 Google CSP 安全策略限制，`fetch('blob:...')` 获取图片会被拦截（报错 `Refused to connect`）。

**解决方案**：采用 HTML5 Canvas 绘图提取

1. 将页面上已显示的图片绘制到内存 Canvas
2. 通过 `canvas.toBlob()` / `toDataURL()` 导出二进制数据
3. 完全绕过网络请求层面的 CSP 限制

**Markdown 中的图片引用**：

-   方案 A：内嵌 Base64（`![](data:image/png;base64,...)`）—— 文件较大但自包含
-   方案 B：导出为 ZIP，图片作为独立文件 —— 更干净但复杂度高
-   **MVP 建议**：先用 Base64 内嵌，后续可选 ZIP 打包

---

### 2.6 站点适配

| 站点                     | MVP 支持 | 备注                     |
| ------------------------ | -------- | ------------------------ |
| **Gemini 普通版**        | ✅       | 优先适配                 |
| Gemini Advanced/Business | ⬜ 后续  | DOM 结构可能不同，需适配 |
| Genspark                 | ⬜ 后续  | 需单独分析               |

---

## 3. 非功能性需求

| 需求          | 说明                                                           |
| ------------- | -------------------------------------------------------------- |
| **UI 一致性** | 与现有 Tab 风格保持统一                                        |
| **性能**      | 对话列表渲染不卡顿，大对话导出需有进度反馈                     |
| **代码安全**  | **绝不破坏**现有功能（Prompts、Outline、自动宽屏、模型锁定等） |
| **数据安全**  | 老用户数据迁移平滑，不丢失已有设置                             |

---

## 4. 后续扩展功能 (Backlog)

### 4.1 🚀 批量导出 / 自动巡航

**痛点**：后台会话（非当前页面）无法直接获取内容。

**机制**：

1. 用户勾选多个会话并点击"深度导出"
2. 脚本自动按顺序跳转到每个会话 URL
3. 等待页面加载 → 抓取内容 → 保存 → 跳转下一个
4. 全程自动化，完成后桌面通知

**预留接口**：

-   MVP 阶段在数据结构和 UI 上预留多选能力
-   导出逻辑抽象为可复用函数

---

### 4.2 🏷️ 标签系统

-   一个对话可打多个标签
-   支持按标签筛选
-   与文件夹互补（文件夹是位置，标签是属性）

---

### 4.3 🤖 智能分类

| 方式                | 说明                                |
| ------------------- | ----------------------------------- |
| **关键字/正则匹配** | 用户定义规则，自动归类              |
| **AI 自动分类**     | 调用 LLM API，根据标题/内容智能归类 |

---

### 4.4 📄 更多导出格式

| 格式         | 说明                           |
| ------------ | ------------------------------ |
| **HTML**     | 高保真，保留代码高亮、气泡样式 |
| **ZIP 打包** | Markdown + 图片资源分离        |
| **PDF**      | 通过浏览器打印功能生成         |

---

### 4.5 🎨 UX 增强

| 功能               | 说明                            |
| ------------------ | ------------------------------- |
| **Shift 范围选择** | 按住 Shift 连续多选             |
| **拖拽排序**       | 文件夹和对话均可拖拽调整顺序    |
| **导出仪表盘**     | 底部浮动栏显示"已选中 X 个会话" |
| **模型/站点图标**  | 列表项显示对应模型或站点图标    |

---

### 4.6 🌐 多站点适配

-   Gemini Advanced / Business
-   Genspark
-   其他 AI 对话平台（按需）

---

## 5. 技术备忘

### 5.1 已知问题与解决方案

| 问题                   | 解决方案                           |
| ---------------------- | ---------------------------------- |
| CSP 拦截图片 Fetch     | HTML5 Canvas 绘图提取              |
| PDF/二进制文件上传损坏 | 使用浏览器原生 FormData API        |
| PDF Blob 无法下载      | 智能判断，失败时降级为灰色提示文本 |
| 长对话历史未加载       | 自动滚动到顶部触发加载             |

### 5.2 数据存储 Key

```javascript
// 文件夹与分类数据
GM_setValue('gemini_helper_conversation_folders', { ... });

// Tab 配置（已有，需扩展）
GM_setValue('gemini_helper_tab_order', ['prompts', 'outline', 'conversations', 'settings']);
GM_setValue('gemini_helper_tab_visibility', { prompts: true, outline: true, conversations: true, settings: true });
```

---

## 6. 渐进式开发计划

> **原则**：每一步可追溯、可恢复、可验证，绝不破坏已有功能

### 6.1 阶段总览

| 阶段        | 内容                         | 预估代码量 | Git Tag          | 状态 |
| ----------- | ---------------------------- | ---------- | ---------------- | ---- |
| **Phase 1** | Tab 骨架 + 空面板            | ~100 行    | `v1.9.0-conv-p1` | ⬜   |
| **Phase 2** | 数据存储 + 文件夹管理        | ~250 行    | `v1.9.0-conv-p2` | ⬜   |
| **Phase 3** | 会话同步 + 列表展示          | ~300 行    | `v1.9.0-conv-p3` | ⬜   |
| **Phase 4** | 交互功能（多选、移动、删除） | ~250 行    | `v1.9.0-conv-p4` | ⬜   |
| **Phase 5** | 设置集成 + 收尾              | ~100 行    | `v1.9.0`         | ⬜   |

### 6.2 Phase 1：Tab 骨架 + 空面板

**目标**：添加"会话"Tab，显示占位面板，**设置面板可控制显隐**，不影响现有功能。

**代码变更**：

-   `TAB_DEFINITIONS` 新增 `conversations`
-   `I18N` 新增多语言文案
-   新增 `ConversationManager` 类（空骨架）
-   设置面板"界面排版"中添加"会话"开关

**验证清单**：

-   [ ] 面板显示 4 个 Tab
-   [ ] 点击"会话"Tab 显示占位文字
-   [ ] 设置 → 界面排版中可禁用"会话"Tab
-   [ ] 禁用后刷新，会话 Tab 不显示
-   [ ] 其他 Tab 功能正常

### 6.3 Phase 2：数据存储 + 文件夹管理

**目标**：实现文件夹 CRUD，数据按站点隔离存储。

**代码变更**：

-   `loadData()` / `saveData()` 方法
-   `createFolder()` / `renameFolder()` / `deleteFolder()` 方法
-   Emoji 选择器组件

**验证清单**：

-   [ ] 新建、重命名、删除文件夹正常
-   [ ] 收件箱不可删除
-   [ ] 刷新后数据保留

### 6.4 Phase 3：会话同步 + 列表展示

**目标**：从 Sidebar 同步会话，渲染可展开分组式 UI。

**代码变更**：

-   `SiteAdapter.getConversationList()` 方法
-   `syncConversations()` 增量同步
-   可展开分组 UI 渲染

**验证清单**：

-   [ ] 点击同步按钮获取会话列表
-   [ ] 文件夹可展开/折叠
-   [ ] 搜索过滤正常
-   [ ] 点击会话跳转

### 6.5 Phase 4：交互功能

**目标**：实现多选、移动、删除等交互。

**代码变更**：

-   复选框状态管理
-   移动到文件夹弹窗
-   批量操作栏

**验证清单**：

-   [ ] 单选、全选、反选正常
-   [ ] 文件夹多选 = 选中所有子会话
-   [ ] 移动会话到其他文件夹
-   [ ] 单个/批量删除

### 6.6 Phase 5：收尾 + 边界处理

**目标**：处理边界情况，代码清理。

**代码变更**：

-   空状态 UI 优化
-   错误处理
-   代码清理、移除调试日志

**验证清单**：

-   [ ] 空状态提示有引导
-   [ ] 完整流程可用
-   [ ] 回归测试通过

### 6.7 验证策略

由于项目没有自动化测试，采用**手动验证 + 用户确认**策略：

1. **每个 Phase 完成后**：按验证清单手动测试
2. **用户确认后**：commit + tag，推送代码
3. **发现问题**：可通过 `git checkout <tag>` 回退

> [!WARNING] 如果在任何阶段发现破坏了现有功能，立即停止并回退：
>
> ```bash
> git checkout v1.8.2-before-conv
> ```

## 附录：相关截图

### Gemini CSP 与 Blob 处理问题

![Gemini CSP 问题说明](C:/Users/urzeye/.gemini/antigravity/brain/47203d65-198c-4873-bc68-62acc9db23fb/uploaded_image_1765983218355.png)

> 上图说明了 Gemini 平台的 CSP 限制及 PDF Blob 处理的已知问题和解决方案。

### 其他人写的 gemini 导出脚本

```javascript
// ==UserScript==
// @name         Gemini 聊天记录导出器（Markdown版）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动滚动 Gemini 聊天界面，捕获用户消息和 AI 回答，导出为 Markdown 文件
// @author       Modified for Gemini
// @match        https://gemini.google.com/app/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwNzhmZiI+PHBhdGggZD0iTTE5LjUgMi4yNWgtMTVjLTEuMjQgMC0yLjI1IDEuMDEtMi4yNSAyLjI1djE1YzAgMS4yNCAxLjAxIDIuMjUgMi4yNSAyLjI1aDE1YzEuMjQgMCAyLjI1LTEuMDEgMi4yNS0yLjI1di0xNWMwLTEuMjQtMS4wMS0yLjI1LTIuMjUtMi4yNXptLTIuMjUgNmgtMTAuNWMtLjQxIDAtLjc1LS4zNC0uNzUtLjc1cy4zNC0uNzUuNzUtLjc1aDEwLjVjLjQxIDAgLjc1LjM0Ljc1Ljc1cy0uMzQuNzUtLjc1Ljc1em0wIDRoLTEwLjVjLS40MSAwLS43NS0uMzQtLjc1LS43NXMuMzQtLjc1Ljc1LS43NWgxMC41Yy40MSAwIC43NS4zNC43NS43NXMtLjM0Ljc1LS4yNS43NXptLTMgNGgtNy41Yy0uNDEgMC0uNzUtLjM0LS43NS0uNzVzLjM0LS43NS43NS0uNzVoNy41Yy40MSAwIC43NS4zNC43NS43NXMtLjM0Ljc1LS43NS43NXoiLz48L3N2Zz4=
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // --- 全局配置常量 ---
    const buttonTextStartScroll = '滚动导出Markdown';
    const buttonTextStopScroll = '停止滚动';
    const buttonTextProcessingScroll = '处理滚动数据...';
    const successTextScroll = '滚动导出 Markdown 成功!';
    const errorTextScroll = '滚动导出失败';

    const exportTimeout = 3000;

    // --- 脚本内部状态变量 ---
    let isScrolling = false;
    let collectedData = new Map();

    // --- UI 界面元素变量 ---
    let captureButtonScroll = null;
    let stopButtonScroll = null;
    let statusDiv = null;
    let hideButton = null;
    let buttonContainer = null;

    // --- 辅助工具函数 ---
    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 将 Gemini 的数学公式替换为 Markdown 格式的 LaTeX
     * @param {Element} container - 要处理的容器元素
     * @returns {Element} - 处理后的容器元素
     */
    function replaceGeminiMathWithLatex(container) {
        // 处理行内公式 .math-inline
        const inlineMath = container.querySelectorAll('.math-inline');
        inlineMath.forEach((el) => {
            const latex = el.getAttribute('data-math');
            if (latex) {
                el.replaceWith(document.createTextNode(`$${latex}$`));
            }
        });

        // 处理块级公式 .math-block 和 .math-display
        const blockMath = container.querySelectorAll('.math-block, .math-display');
        blockMath.forEach((el) => {
            const latex = el.getAttribute('data-math');
            if (latex) {
                el.replaceWith(document.createTextNode(`\n$$${latex}$$\n`));
            }
        });

        return container;
    }

    function getCurrentTimestamp() {
        const n = new Date();
        const YYYY = n.getFullYear();
        const MM = (n.getMonth() + 1).toString().padStart(2, '0');
        const DD = n.getDate().toString().padStart(2, '0');
        const hh = n.getHours().toString().padStart(2, '0');
        const mm = n.getMinutes().toString().padStart(2, '0');
        const ss = n.getSeconds().toString().padStart(2, '0');
        return `${YYYY}${MM}${DD}_${hh}${mm}${ss}`;
    }

    /**
     * 获取默认的项目名称
     */
    function getProjectName() {
        return 'Gemini_Chat';
    }

    /**
     * 查找 Gemini 的滚动容器
     */
    function getMainScrollerElement_Gemini() {
        console.log('尝试查找滚动容器 (Gemini)...');

        // 策略 1: 查找 #chat-history 的父容器（通常是真正的滚动容器）
        let chatHistory = document.querySelector('#chat-history');
        if (chatHistory) {
            let parent = chatHistory.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
                const style = window.getComputedStyle(parent);
                if (parent.scrollHeight > parent.clientHeight + 10 && (style.overflowY === 'auto' || style.overflowY === 'scroll')) {
                    console.log('找到滚动容器 (策略 1: #chat-history 的父元素):', parent);
                    return parent;
                }
                parent = parent.parentElement;
            }
        }

        // 策略 2: 直接尝试 infinite-scroller 的父容器
        let infiniteScroller = document.querySelector('infinite-scroller');
        if (infiniteScroller) {
            let parent = infiniteScroller.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
                const style = window.getComputedStyle(parent);
                if (parent.scrollHeight > parent.clientHeight + 10 && (style.overflowY === 'auto' || style.overflowY === 'scroll')) {
                    console.log('找到滚动容器 (策略 2: infinite-scroller 的父元素):', parent);
                    return parent;
                }
                parent = parent.parentElement;
            }
        }

        // 策略 3: 查找包含消息的父容器
        const messageContainer = document.querySelector('.user-query-bubble-with-background, .markdown.markdown-main-panel');
        if (messageContainer) {
            let parent = messageContainer.parentElement;
            for (let i = 0; i < 15 && parent; i++) {
                const style = window.getComputedStyle(parent);
                if (parent.scrollHeight > parent.clientHeight + 10 && (style.overflowY === 'auto' || style.overflowY === 'scroll')) {
                    console.log('找到滚动容器 (策略 3: 从消息向上查找父元素):', parent);
                    return parent;
                }
                parent = parent.parentElement;
            }
        }

        console.warn('警告: 未能找到 Gemini 滚动区域，将使用 document.documentElement');
        return document.documentElement;
    }

    // --- UI 界面创建与更新 ---
    function createUI() {
        console.log('开始创建 UI 元素...');

        buttonContainer = document.createElement('div');
        buttonContainer.id = 'exporter-button-container';
        buttonContainer.style.cssText = `position: fixed; top: 80px; left: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;`;
        document.body.appendChild(buttonContainer);

        captureButtonScroll = document.createElement('button');
        captureButtonScroll.textContent = buttonTextStartScroll;
        captureButtonScroll.id = 'capture-chat-scroll-button';
        captureButtonScroll.style.cssText = `padding: 10px 15px; background-color: #1a73e8; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; box-shadow: 2px 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;`;
        captureButtonScroll.addEventListener('click', handleScrollExtraction);
        buttonContainer.appendChild(captureButtonScroll);

        stopButtonScroll = document.createElement('button');
        stopButtonScroll.textContent = buttonTextStopScroll;
        stopButtonScroll.id = 'stop-scrolling-button';
        stopButtonScroll.style.cssText = `padding: 10px 15px; background-color: #d93025; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; box-shadow: 2px 2px 5px rgba(0,0,0,0.2); display: none; transition: background-color 0.3s ease;`;
        stopButtonScroll.addEventListener('click', () => {
            if (isScrolling) {
                updateStatus('手动停止滚动信号已发送...');
                isScrolling = false;
                stopButtonScroll.disabled = true;
                stopButtonScroll.textContent = '正在停止...';
            }
        });
        buttonContainer.appendChild(stopButtonScroll);

        hideButton = document.createElement('button');
        hideButton.textContent = '�️';
        hideButton.id = 'hide-exporter-buttons';
        hideButton.style.cssText = `position: fixed; top: 20px; left: 180px; z-index: 10000; padding: 5px 8px; background-color: rgba(0, 0, 0, 0.3); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px;`;
        hideButton.addEventListener('click', () => {
            const isHidden = buttonContainer.style.display === 'none';
            buttonContainer.style.display = isHidden ? 'flex' : 'none';
            hideButton.textContent = isHidden ? '👁️' : '🙈';
        });
        document.body.appendChild(hideButton);

        statusDiv = document.createElement('div');
        statusDiv.id = 'extract-status-div';
        statusDiv.style.cssText = `position: fixed; top: 80px; left: 200px; z-index: 9998; padding: 5px 10px; background-color: rgba(0,0,0,0.7); color: white; font-size: 12px; border-radius: 3px; display: none;`;
        document.body.appendChild(statusDiv);

        GM_addStyle(`
            #capture-chat-scroll-button:disabled, #stop-scrolling-button:disabled {
                opacity: 0.6; cursor: not-allowed; background-color: #aaa !important;
            }
            #capture-chat-scroll-button.success { background-color: #1e8e3e !important; }
            #capture-chat-scroll-button.error { background-color: #d93025 !important; }
        `);
        console.log('UI 元素创建完成。');
    }

    function updateStatus(message) {
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.style.display = message ? 'block' : 'none';
        }
        console.log(`[Status] ${message}`);
    }

    // --- 核心业务逻辑 (滚动导出) ---
    function extractDataIncremental_Gemini() {
        let newlyFoundCount = 0;

        // 收集所有消息元素及其类型
        const allMessages = [];

        // 收集用户消息
        document.querySelectorAll('.user-query-bubble-with-background').forEach((userBubble) => {
            const textElement = userBubble.querySelector('.query-text-line');
            if (textElement) {
                allMessages.push({
                    element: userBubble,
                    textElement: textElement,
                    type: 'user',
                });
            }
        });

        // 收集 AI 回复
        document.querySelectorAll('.markdown.markdown-main-panel').forEach((responseDiv) => {
            allMessages.push({
                element: responseDiv,
                textElement: responseDiv,
                type: 'ai',
            });
        });

        // 按 DOM 中的实际位置排序
        allMessages.sort((a, b) => {
            const position = a.element.compareDocumentPosition(b.element);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                return -1; // a 在 b 前面
            } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                return 1; // a 在 b 后面
            }
            return 0;
        });

        // 按顺序处理消息
        allMessages.forEach((msg, index) => {
            // 克隆节点以避免修改原始 DOM
            let clonedNode = msg.textElement.cloneNode(true);
            replaceGeminiMathWithLatex(clonedNode);
            const text = clonedNode.innerText.trim();

            if (text) {
                // 使用文本内容的前100个字符 + 类型作为唯一标识，避免重复
                const uniqueKey = `${msg.type}_${text.substring(0, 100)}`;

                if (!collectedData.has(uniqueKey)) {
                    collectedData.set(uniqueKey, {
                        domOrder: index,
                        type: msg.type,
                        text: text,
                    });
                    newlyFoundCount++;
                }
            }
        });

        updateStatus(`已收集 ${collectedData.size} 条记录...`);

        return newlyFoundCount > 0;
    }

    function formatAndTriggerDownloadScroll() {
        updateStatus(`处理 ${collectedData.size} 条记录并生成文件...`);

        // 按 DOM 顺序排序
        let sortedData = Array.from(collectedData.values()).sort((a, b) => a.domOrder - b.domOrder);

        if (sortedData.length === 0) {
            updateStatus('没有收集到任何有效记录。');
            alert('滚动结束后未能收集到任何聊天记录，无法导出。');
            captureButtonScroll.textContent = buttonTextStartScroll;
            captureButtonScroll.disabled = false;
            captureButtonScroll.classList.remove('success', 'error');
            updateStatus('');
            return;
        }

        let fileContent = '# 对话历史记录\n\n> 以下是之前的对话内容，供参考。\n\n---\n\n';

        sortedData.forEach((item) => {
            if (item.type === 'user') {
                fileContent += `> **用户：**\n> ${item.text.replace(/\n/g, '\n> ')}\n\n`;
            } else if (item.type === 'ai') {
                fileContent += `**助手：**\n${item.text}\n\n`;
            }
            fileContent += '---\n\n';
        });

        fileContent = fileContent.trim();

        try {
            const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            const projectName = getProjectName();
            link.download = `${projectName}_scroll_${getCurrentTimestamp()}.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // 自动复制到剪贴板
            GM_setClipboard(fileContent);

            captureButtonScroll.textContent = successTextScroll;
            captureButtonScroll.classList.add('success');
            updateStatus('✅ 已导出并复制到剪贴板！');
        } catch (e) {
            console.error('导出文件失败:', e);
            captureButtonScroll.textContent = `${errorTextScroll}: 创建失败`;
            captureButtonScroll.classList.add('error');
            alert('创建下载文件时出错: ' + e.message);
        }

        setTimeout(() => {
            captureButtonScroll.textContent = buttonTextStartScroll;
            captureButtonScroll.disabled = false;
            captureButtonScroll.classList.remove('success', 'error');
            updateStatus('');
        }, exportTimeout);
    }

    async function handleScrollExtraction() {
        if (isScrolling) return;

        captureButtonScroll.disabled = true;
        captureButtonScroll.textContent = '滚动中...';
        stopButtonScroll.style.display = 'block';
        stopButtonScroll.disabled = false;
        stopButtonScroll.textContent = buttonTextStopScroll;

        const scroller = getMainScrollerElement_Gemini();
        if (!scroller) {
            alert('未能找到滚动容器');
            captureButtonScroll.disabled = false;
            stopButtonScroll.style.display = 'none';
            return;
        }

        const isWindowScroller = scroller === document.documentElement || scroller === document.body;
        isScrolling = true;

        // 清空旧数据
        collectedData.clear();

        try {
            // 【快速模式】步骤 1: 快速滚到底部
            updateStatus('快速滚动到底部...');
            const maxScroll = isWindowScroller ? document.documentElement.scrollHeight : scroller.scrollHeight;
            if (isWindowScroller) {
                window.scrollTo({ top: maxScroll, behavior: 'auto' });
            } else {
                scroller.scrollTo({ top: maxScroll, behavior: 'auto' });
            }
            await delay(800); // 等待懒加载触发

            // 【快速模式】步骤 2: 循环滚到真正的顶部
            let lastHeight = -1;
            let stableCount = 0; // 连续多少次高度不变
            let attempts = 0;
            const maxAttempts = 30; // 最多尝试 30 次，防止死循环
            const requiredStableCount = 2; // 需要连续 2 次高度不变才确认到顶

            while (attempts < maxAttempts && isScrolling) {
                // 滚到顶部
                if (isWindowScroller) {
                    window.scrollTo({ top: 0, behavior: 'auto' });
                } else {
                    scroller.scrollTo({ top: 0, behavior: 'auto' });
                }

                // 等待更长时间，确保懒加载完成
                await delay(1200);

                const currentHeight = isWindowScroller ? document.documentElement.scrollHeight : scroller.scrollHeight;
                updateStatus(`加载历史消息... (第 ${attempts + 1} 次，高度: ${currentHeight}, 稳定: ${stableCount}/${requiredStableCount})`);

                // 如果高度不再增加
                if (currentHeight === lastHeight) {
                    stableCount++;
                    if (stableCount >= requiredStableCount) {
                        updateStatus('✅ 已到达最顶部（高度已稳定）');
                        break;
                    }
                } else {
                    // 高度还在变化，重置稳定计数
                    stableCount = 0;
                    lastHeight = currentHeight;
                }

                attempts++;
            }

            if (attempts >= maxAttempts) {
                updateStatus('⚠️ 警告: 达到最大尝试次数，可能还有未加载的历史消息');
            }

            // 最后等待一下，确保所有消息渲染完成
            await delay(500);

            // 【快速模式】步骤 3: 一次性收集所有数据
            updateStatus('收集所有消息...');
            extractDataIncremental_Gemini();
            await delay(300);

            // 生成文件
            captureButtonScroll.textContent = buttonTextProcessingScroll;
            updateStatus('准备下载...');
            formatAndTriggerDownloadScroll();
        } catch (error) {
            console.error('滚动处理过程中发生错误:', error);
            updateStatus(`错误: ${error.message}`);
            alert(`滚动处理过程中发生错误: ${error.message}`);
            captureButtonScroll.textContent = `${errorTextScroll}: 处理出错`;
            captureButtonScroll.classList.add('error');
            setTimeout(() => {
                captureButtonScroll.textContent = buttonTextStartScroll;
                captureButtonScroll.disabled = false;
                captureButtonScroll.classList.remove('error');
                updateStatus('');
            }, exportTimeout);
        } finally {
            stopButtonScroll.style.display = 'none';
            isScrolling = false;
        }
    }

    // --- 脚本初始化入口 ---
    function initScript() {
        console.log('Gemini 导出脚本: 检查页面是否准备就绪...');

        // 检查页面是否已加载关键元素
        const checkInterval = setInterval(() => {
            const chatHistory = document.querySelector('#chat-history');
            const infiniteScroller = document.querySelector('infinite-scroller');

            if (chatHistory || infiniteScroller || document.readyState === 'complete') {
                console.log('Gemini 导出脚本: 页面已准备就绪，创建 UI...');
                clearInterval(checkInterval);
                createUI();
            }
        }, 500);

        // 最多等待 10 秒
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!buttonContainer) {
                console.log('Gemini 导出脚本: 超时，强制创建 UI...');
                createUI();
            }
        }, 10000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }
})();
```
