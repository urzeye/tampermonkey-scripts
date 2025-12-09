# Gemini-helper

> 为 Gemini 和 Gemini Enterprise 打造的提示词管理器，提升 AI 对话效率

## ✨ 功能特性

### 📝 提示词管理

- **快速插入**：一键将常用提示词插入对话框
- **分类管理**：支持按类别筛选、重命名、删除分类
- **搜索功能**：快速查找需要的提示词
- **增删改查**：自定义管理你的提示词库
- **复制功能**：一键复制提示词内容到剪贴板
- **拖动排序**：自由调整提示词显示顺序

### 🚀 快捷导航

- **跳转顶部/底部**：长对话中快速定位
- **悬浮按钮组**：面板收起时仍可使用

### 🎯 智能适配

- ✅ Gemini 标准版 (gemini.google.com)
- ✅ Gemini 企业版 (business.gemini.google)
- ✅ Genspark (genspark.ai)

## 📸 功能预览

- 右侧悬浮面板，支持拖拽移动（优化拖动体验，不会误选文本）
- 渐变色主题，美观大方
- 悬浮条显示当前提示词，支持一键清除

![功能主图](https://raw.githubusercontent.com/urzeye/tampermonkey-scripts/refs/heads/main/images/gemini-helper/gemini-helper-1.png "功能主图")
![分类管理](https://raw.githubusercontent.com/urzeye/tampermonkey-scripts/refs/heads/main/images/gemini-helper/gemini-helper-2.png "分类管理")
![折叠状态](https://raw.githubusercontent.com/urzeye/tampermonkey-scripts/refs/heads/main/images/gemini-helper/gemini-helper-3.png "折叠状态")

## 🔧 使用方法

1. 安装 Tampermonkey 浏览器扩展
2. 安装本脚本
3. 打开 Gemini 页面，右侧会出现提示词管理面板
4. 点击提示词即可快速插入

## ⌨️ 快捷操作

| 操作        | 说明              |
| ----------- | ----------------- |
| 点击提示词  | 插入到输入框      |
| 📋 复制按钮 | 复制提示词内容    |
| ☰ 拖动按钮  | 拖动调整排序      |
| ✏ 编辑按钮  | 编辑提示词        |
| 🗑 删除按钮  | 删除提示词        |
| ⚙ 管理分类  | 重命名/删除分类   |
| 点击 × 按钮 | 清除已插入的内容  |
| Enter 发送  | 自动隐藏悬浮条    |
| ⬆ / ⬇ 按钮  | 跳转页面顶部/底部 |

## 📋 [更新日志](./changelog.md)

### v1.5.3

- 🚑 **紧急修复**：修正输入框检测逻辑，彻底解决点击面板导致的全选和样式异常

### v1.5.2

- 🔧 **优化**：拖拽排序仅限手柄触发；优化滚动锁定和防误触提示

### v1.5.1

- 🔧 **优化**：新增滚动锁定机制，防止滚动期间误触提示词导致错乱

### v1.5.0

- ⚡️ **重构**：引入站点适配器模式 (Site Adapter Pattern)，大幅提升代码扩展性
- 🛠 **优化**：解耦特定站点逻辑，为未来支持更多 AI 平台奠定基础

- 修复页面加载后首次插入提示词时，多行文本只能插入首行

### v1.4.4

- 修复切换提示词时内容叠加

### v1.4.3

- 优化拖动悬浮窗体验，避免误选文本

### v1.4.2

- 新增拖动排序功能

### v1.4.1

- 新增复制提示词功能

### v1.4.0

- 新增分类管理功能（重命名、删除）
- 修复新分类不实时显示问题

### v1.3.0

- 优化悬浮条逻辑，发送后自动隐藏

### v1.2.0

- 新增快捷跳转按钮（顶部/底部）

### v1.1.0

- 支持 Gemini 企业版 (Shadow DOM 适配)

## 🐛 反馈问题

如有问题或建议，请在 [GitHub Issues](https://github.com/urzeye/tampermonkey-scripts/issues) 反馈

## 📄 开源协议

MIT License
