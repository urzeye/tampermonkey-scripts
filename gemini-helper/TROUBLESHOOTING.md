# Gemini Helper 疑难杂症排查手册

> 记录开发过程中遇到的稀奇古怪问题及其解决方案，供后续参考。

---

## 📋 目录

1. [滚动容器错误匹配](#1-滚动容器错误匹配)
2. [阅读历史会话切换后不更新](#2-阅读历史会话切换后不更新)
3. [用户看完生成结果后切换页面仍收到通知](#3-用户看完生成结果后切换页面仍收到通知)
4. [面板拖拽跳动问题](#4-面板拖拽跳动问题)

---

## 1. 滚动容器错误匹配

**日期**: 2025-12-18

### 症状

- "去顶部"/"去底部"按钮点击后，**侧边栏会话列表**滚动了，而非主对话区域
- 锚点跳转失效
- 大纲点击跳转到错误位置

### 背景

在开发"会话"Tab 功能时新增了以下代码：

- `SiteAdapter.getSidebarScrollContainer()` - 返回侧边栏的 `infinite-scroller`
- `SiteAdapter.loadAllConversations()` - 滚动侧边栏加载全部会话

### 根因

Gemini 页面中存在 **两个 `infinite-scroller` 元素**：

1. **主对话区域**: `infinite-scroller.chat-history`
2. **侧边栏会话列表**: `infinite-scroller[scrollable="true"]`

`DOMToolkit.findScrollContainer()` 在查找时，如果用户提供的选择器都未匹配，会**遍历 DOM 查找第一个满足滚动条件的元素**（`scrollHeight > clientHeight` 且 `overflow: auto/scroll`）。

由于侧边栏的 `infinite-scroller` 也满足滚动条件，在特定情况下可能被优先匹配。

### 修复方案

在 `SiteAdapter.getScrollContainer()` 的选择器数组**首位**添加精确选择器：

```javascript
getScrollContainer() {
    return DOMToolkit.findScrollContainer({
        selectors: [
            'infinite-scroller.chat-history', // 精确匹配主对话区域
            '.chat-mode-scroller',
            'main',
            '[role="main"]',
            '.conversation-container',
            '.chat-container',
        ],
    });
}
```

### 经验总结

| 教训                       | 说明                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **选择器要精确**           | 当页面存在多个相似元素时，通用选择器（如标签名）可能匹配到错误元素                                |
| **新增功能可能影响旧功能** | 新增侧边栏操作虽然没有直接修改滚动逻辑，但改变了 DOM 结构或查找顺序                               |
| **对比法排查**             | 使用 Git 找回正常版本进行对比，快速定位差异范围                                                   |
| **复用现有选择器**         | `getResponseContainerSelector()` 返回的 `infinite-scroller.chat-history` 正是我们需要的精确选择器 |

---

## 2. 阅读历史会话切换后不更新

**日期**: 2025-12-23

### 症状

- 在会话 A 中滚动后，切换到会话 B，再回到 A，发现阅读位置没有更新
- 只有第一个打开的会话的阅读位置会被记录

### 背景

`ReadingProgressManager` 通过监听滚动容器的 `scroll` 事件来记录位置。

### 根因

Gemini 是 SPA 应用，会话切换时 DOM 会重新渲染，**旧的滚动容器元素会被销毁**。

问题代码：

```javascript
startRecording() {
    if (this.isRecording) return;  // ⚠️ 已在记录，直接返回
    // ... 绑定监听到当前容器
}
```

会话切换后：

1. `restoreReadingProgress` 调用 `startRecording()`
2. 但 `isRecording = true`（首次进入时已设置），直接返回
3. 结果：监听仍绑定在已销毁的旧容器上，新容器没有监听

### 修复方案

新增 `restartRecording()` 方法，会话切换时强制重新绑定：

```javascript
restartRecording() {
    this.stopRecording();  // 先移除旧监听
    this.startRecording(); // 再绑定新容器
}
```

调用点修改：

```javascript
// restoreReadingProgress 中
this.readingProgressManager.restartRecording();  // 原为 startRecording()
```

### 经验总结

| 教训               | 说明                                                     |
|------------------|--------------------------------------------------------|
| **SPA 容器会变**     | 单页应用中 DOM 元素可能随时被替换，事件监听需要重新绑定                         |
| **状态标志需配套**      | `isRecording` 防重入是好的，但需要配套提供 `restart` 方法处理容器更换场景      |
| **getter vs 引用** | `scrollManager.container` 是 getter，每次调用重新查询 DOM，不是固定引用 |

---

## 3. 用户看完生成结果后切换页面仍收到通知

**日期**: 2025-12-24

### 症状

- 用户在 Gemini 页面前台观看 AI 生成回复
- AI 生成完成后，用户看完内容并切换到其他页面
- 切换后收到"生成完成"的桌面通知（不应该发送）

### 背景

Gemini 普通版有两套生成完成检测机制：

1. **NetworkMonitor**（网络层）：通过 Hook Fetch 监控 API 请求，使用 3 秒静默期（`silenceThreshold`）判断完成
2. **isGenerating()**（DOM 层）：检测停止按钮 `mat-icon[fonticon="stop"]` 是否存在

通知触发的原代码逻辑：

```javascript
_onAiComplete() {
    if (wasGenerating && document.hidden) {
        this._sendCompletionNotification();
    }
}
```

### 根因

**时序问题**：`silenceThreshold` 导致的 3 秒判定延迟窗口

```
T+0s: AI 生成完成，停止按钮消失
T+0s~T+3s: NetworkMonitor 等待静默确认
T+1.5s: 用户切换到其他页面（document.hidden = true）
T+3s: NetworkMonitor 确认完成，触发 _onAiComplete()
     → wasGenerating = true, document.hidden = true
     → 发送通知（错误！用户已经看完了）
```

核心问题：**只检查 `onComplete` 触发时的 `document.hidden`，无法区分"用户一直在后台等待"和"用户看完才离开"**。

### 修复方案

通过监听 `visibilitychange` 事件，追踪用户是否在前台看到过生成完成：

```javascript
constructor()
{
    this._userSawCompletion = false;
    this._boundVisibilityHandler = this._onVisibilityChange.bind(this);
}

start()
{
    document.addEventListener('visibilitychange', this._boundVisibilityHandler);
}

_onVisibilityChange()
{
    // 用户切换页面时，检查 DOM 状态
    // 如果正在生成但 DOM 显示已完成，说明用户看到了完成状态
    if (this._aiState === 'generating' && !this.adapter.isGenerating()) {
        this._userSawCompletion = true;
    }
}

_onAiComplete()
{
    // 只有用户没看到过完成状态时才发通知
    if (wasGenerating && document.hidden && !this._userSawCompletion) {
        this._sendCompletionNotification();
    }
    this._userSawCompletion = false;  // 重置
}

stop()
{
    document.removeEventListener('visibilitychange', this._boundVisibilityHandler);
}
```

### 经验总结

| 教训                      | 说明                                              |
|-------------------------|-------------------------------------------------|
| **时序问题难以复现**            | 用户行为是任意的，需要穷举所有时序场景进行验证                         |
| **状态快照 vs 实时检测**        | `onComplete` 时检测 `hidden` 只是快照，无法反映整个生成过程中用户的行为 |
| **visibilitychange 可靠** | 标准 W3C API，覆盖标签页切换、最小化、锁屏等场景，性能开销几乎为零           |
| **边界情况可接受**             | DOM 更新的几十毫秒窗口期可能导致极小概率误判，但实际影响可忽略               |

---

## 4. 面板拖拽跳动问题

**日期**: 2025-12-25

### 症状

- 页面刷新后，首次长按面板顶部拖拽时，面板会猛的向下跳动约半屏
- 拖拽完成后，缩小浏览器窗口，面板可能跑到屏幕外不可见

### 背景

面板使用 CSS 实现垂直居中和拖拽功能：

CSS 初始定位：

```css
#gemini-helper-panel {
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);  /* 关键：居中 */
    transition: all 0.3s ease;
}
```

拖拽逻辑（旧）：

```javascript
let xOffset = 0, yOffset = 0;

// mousedown
initialX = e.clientX - xOffset;  // = clientX - 0
initialY = e.clientY - yOffset;  // = clientY - 0

// mousemove
panel.style.transform = `translate(${currentX}px, ${currentY}px)`;  // 覆盖了 translateY(-50%)
```

### 根因

**问题 1：首次拖拽跳动半屏**

| 阶段 | 状态 |
|------|------|
| 初始 | CSS `top: 50%` + `translateY(-50%)` = 真正的垂直居中 |
| 拖拽开始 | `xOffset = 0, yOffset = 0`，oldTransform 被覆盖 |
| 拖拽中 | `translate(0, 0)` 覆盖了 `translateY(-50%)` |
| 结果 | 面板从「垂直居中」变成「顶部边缘在屏幕中间」= 向下跳半屏 |

**问题 2：首次拖拽微小抖动**

`transition: all 0.3s ease` 使得 `transform` 变化产生过渡动画，视觉上有短暂抖动。

**问题 3：窗口缩小后面板消失**

拖拽后使用绝对像素 `left/top` 定位，窗口变小时面板可能超出视口。

### 修复方案

**1. 重写 `makeDraggable`：读取实际位置 + 切换定位方式**

```javascript
header.addEventListener('mousedown', (e) => {
    // 读取面板当前的实际位置
    const rect = panel.getBoundingClientRect();
    
    // 计算鼠标相对于面板左上角的偏移
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // 切换为 left/top 定位
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.style.transform = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        panel.style.left = (e.clientX - offsetX) + 'px';
        panel.style.top = (e.clientY - offsetY) + 'px';
    }
});
```

**2. CSS 精细化过渡**

```css
/* 旧 */
transition: all 0.3s ease;

/* 新：只对需要动画的属性生效 */
transition: box-shadow 0.3s ease, border-color 0.3s ease;
```

**3. 窗口边界检测**

```javascript
let hasDragged = false;

const clampToViewport = () => {
    // 跳过：未拖拽过 或 面板已收起
    if (!hasDragged || panel.classList.contains('collapsed')) return;
    
    const rect = panel.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    
    let newLeft = parseFloat(panel.style.left);
    let newTop = parseFloat(panel.style.top);
    
    if (rect.right > vw) newLeft = vw - rect.width - 10;
    if (rect.bottom > vh) newTop = vh - rect.height - 10;
    if (rect.left < 0) newLeft = 10;
    if (rect.top < 0) newTop = 10;
    
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
};

window.addEventListener('resize', clampToViewport);
```

### 经验总结

| 教训 | 说明 |
|------|------|
| **CSS 定位方式切换** | 拖拽场景中，`transform` 和 `top/right` 混用容易产生冲突，应在拖拽开始时统一为一种方式 |
| **transition: all 的副作用** | 会影响所有属性变化，包括定位属性，导致意外的过渡动画 |
| **SPA 中的 resize 处理** | 用户可能在任意时刻调整窗口，需要考虑边界情况 |
| **状态标记的价值** | `hasDragged` 可以区分「从未拖拽」和「已拖拽过」，避免不必要的边界检测 |

---

## N. 问题标题

**日期**: YYYY-MM-DD

### 症状

- 描述用户可观察到的异常行为

### 背景

- 问题出现的上下文

### 根因

- 技术层面的原因分析

### 修复方案

```javascript
// 关键代码片段
```

### 经验总结

| 教训 | 说明 |
| ---- | ---- |
| ...  | ...  |

-->
