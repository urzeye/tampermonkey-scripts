// ==UserScript==
// @name         gemini-helper
// @namespace    http://tampermonkey.net/
// @version      1.9.4
// @description  Gemini 助手：支持会话管理（分类/搜索/标签）、对话大纲、提示词管理、模型锁定、面板状态控制、主题一键切换、标签页增强（状态显示/隐私模式/生成完成通知）、阅读历史恢复、双向锚点、自动加宽页面、中文输入修复、智能暗色模式适配，适配 Gemini 标准版/企业版
// @description:en Gemini Helper: Supports conversation management (folders/search/tags), outline navigation, prompt management, model locking, collapsed button reorder, circular theme toggle animation, tab enhancements (status display/privacy mode/completion notification), reading history, bidirectional anchor, auto page width, Chinese input fix, smart dark mode, adaptation for Gemini/Gemini Enterprise
// @author       urzeye
// @homepage     https://github.com/urzeye
// @note         参考 https://linux.do/t/topic/925110 的代码与UI布局拓展实现
// @match        https://gemini.google.com/*
// @match        https://business.gemini.google/*
// @icon         https://raw.githubusercontent.com/gist/urzeye/8d1d3afbbcd0193dbc8a2019b1ba54d3/raw/f7113d329a259963ed1b1ab8cb981e8f635d4cea/gemini.svg
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        window.focus
// @run-at       document-idle
// @supportURL   https://github.com/urzeye/tampermonkey-scripts/issues
// @homepageURL  https://github.com/urzeye/tampermonkey-scripts
// @require      https://update.greasyfork.org/scripts/559089/1714656/background-keep-alive.js
// @require      https://update.greasyfork.org/scripts/559176/1718116/domToolkit.js
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/558318/gemini-helper.user.js
// @updateURL https://update.greasyfork.org/scripts/558318/gemini-helper.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // 防止重复初始化
    if (window.geminiHelperInitialized) {
        return;
    }
    window.geminiHelperInitialized = true;

    // ==================== 设置项与多语言 ====================

    const SETTING_KEYS = {
        CLEAR_TEXTAREA_ON_SEND: 'gemini_business_clear_on_send',
        LANGUAGE: 'gemini_language',
        PAGE_WIDTH: 'gemini_page_width',
        OUTLINE: 'gemini_outline_settings',
        TAB_ORDER: 'gemini_tab_order',
        MODEL_LOCK: 'gemini_model_lock',
        PROMPTS_SETTINGS: 'gemini_prompts_settings',
        READING_HISTORY: 'gemini_reading_history_settings',
        TAB_SETTINGS: 'gemini_tab_settings',
        CONVERSATIONS: 'gemini_conversations',
        DEFAULT_PANEL_STATE: 'gemini_default_panel_state',
        AUTO_HIDE_PANEL: 'gemini_default_auto_hide',
        THEME_MODE: 'gemini_theme_mode', // 'light' | 'dark' | null
        COLLAPSED_BUTTONS_ORDER: 'gemini_collapsed_buttons_order',
    };

    // 默认 Tab 顺序（settings 已移到 header 按钮，不参与排序）
    const DEFAULT_TAB_ORDER = ['prompts', 'outline', 'conversations'];
    const DEFAULT_PROMPTS_SETTINGS = { enabled: true };
    const DEFAULT_READING_HISTORY_SETTINGS = {
        persistence: true,
        autoRestore: false,
        cleanupDays: 30,
    };
    const DEFAULT_TAB_SETTINGS = {
        openInNewTab: true, // 新标签页打开新对话
        autoRenameTab: true, // 自动重命名标签页
        renameInterval: 3, // 检测频率(秒)
        showStatus: true, // 显示生成状态图标 (⏳/✅)
        showNotification: false, // 发送桌面通知
        autoFocus: false, // 生成完成后自动将窗口置顶
        privacyMode: false, // 隐私模式
        privacyTitle: 'Google', // 隐私模式下的伪装标题
        titleFormat: '{status}{title}-{model}', // 自定义标题格式，支持 {status}、{title}、{model}
    };

    // 默认会话数据结构
    const DEFAULT_CONVERSATION_DATA = {
        folders: [{ id: 'inbox', name: '📥 收件箱', icon: '📥', isDefault: true }],
        tags: [], // 标签定义数组 { id, name, color }
        conversations: {}, // 会话数据，key 为 conversationId
        lastUsedFolderId: 'inbox',
    };

    // 预设标签颜色 (30色 - 中国传统色精选 - 优化对比度)
    const TAG_COLORS = [
        '#ff461f', // 朱
        '#e35c64', // 桃夭
        '#db5a6b', // 海棠红
        '#f2481b', // 榴花红
        '#9d2933', // 胭脂
        '#ffa631', // 杏黄
        '#d6a01d', // 姜黄
        '#f0c239', // 缃色
        '#d9b611', // 秋香色
        '#8cc540', // 柳绿
        '#0eb83a', // 葱绿
        '#227d51', // 官绿
        '#789262', // 竹青
        '#29b7cb', // 湖蓝
        '#177cb0', // 靛蓝
        '#1685a9', // 石青
        '#4b5cc4', // 宝蓝
        '#2e4e7e', // 藏蓝
        '#b088d1', // 丁香
        '#b359ab', // 雪青
        '#8d4bbb', // 紫罗兰
        '#4c221b', // 紫檀
        '#a88462', // 驼色
        '#ca6924', // 琥珀
        '#845a33', // 赭石
        '#75878a', // 苍色
        '#57c3c2', // 天水碧
        '#ce97a8', // 藕荷
        '#5d513c', // 墨灰
        '#9b95c9', // 长春花
    ];

    // Tab 定义（用于渲染和显示）
    const TAB_DEFINITIONS = {
        prompts: { id: 'prompts', labelKey: 'tabPrompts', icon: '✏️' },
        outline: { id: 'outline', labelKey: 'tabOutline', icon: '📋' },
        conversations: { id: 'conversations', labelKey: 'tabConversations', icon: '💬' },
        settings: { id: 'settings', labelKey: 'tabSettings', icon: '⚙️' },
    };

    // 折叠面板按钮定义
    const COLLAPSED_BUTTON_DEFS = {
        scrollTop: { icon: '⬆', labelKey: 'scrollTop', canToggle: false },
        panel: { icon: '✨', labelKey: 'panelTitle', canToggle: false },
        anchor: { icon: '⚓', labelKey: 'showCollapsedAnchorLabel', canToggle: true },
        theme: { icon: '☀', labelKey: 'showCollapsedThemeLabel', canToggle: true },
        scrollBottom: { icon: '⬇', labelKey: 'scrollBottom', canToggle: false },
    };
    const DEFAULT_COLLAPSED_BUTTONS_ORDER = [
        { id: 'scrollTop', enabled: true },
        { id: 'panel', enabled: true },
        { id: 'anchor', enabled: true },
        { id: 'theme', enabled: true },
        { id: 'scrollBottom', enabled: true },
    ];

    const I18N = {
        'zh-CN': {
            panelTitle: 'Gemini 助手',
            tabPrompts: '提示词',
            tabSettings: '设置',
            searchPlaceholder: '搜索提示词...',
            addPrompt: '添加新提示词',
            allCategory: '全部',
            manageCategory: '⚙ 管理',
            currentPrompt: '当前提示词：',
            scrollTop: '顶部',
            scrollBottom: '底部',
            refresh: '刷新',
            collapse: '收起',
            edit: '编辑',
            delete: '删除',
            copy: '复制',
            drag: '拖动',
            save: '保存',
            cancel: '取消',
            add: '添加',
            anchorPoint: '锚点',
            updateAnchor: '更新锚点',
            title: '标题',
            category: '分类',
            categoryPlaceholder: '例如：编程、翻译',
            content: '提示词内容',
            editPrompt: '编辑提示词',
            addNewPrompt: '添加新提示词',
            fillTitleContent: '请填写标题和内容',
            promptUpdated: '提示词已更新',
            promptAdded: '提示词已添加',
            deleted: '已删除',
            copied: '已复制到剪贴板',
            cleared: '已清除内容',
            refreshed: '已刷新',
            orderUpdated: '已更新排序',
            inserted: '已插入提示词',
            scrolling: '页面正在滚动，请稍后...',
            noTextarea: '未找到输入框，请点击输入框后重试',
            confirmDelete: '确定删除?',
            // 设置面板
            settingsTitle: '通用设置',
            panelSettingsTitle: '面板设置',
            clearOnSendLabel: '发送后自动修复中文输入',
            clearOnSendDesc: '发送消息后插入零宽字符，修复下次输入首字母问题（仅 Gemini Business）',
            settingOn: '开',
            settingOff: '关',
            // 模型锁定
            modelLockTitle: '模型锁定',
            modelLockLabel: '自动锁定模型',
            modelLockDesc: '进入页面后自动切换到指定模型',
            modelKeywordLabel: '模型关键字',
            modelKeywordPlaceholder: '例如：3 Pro',
            modelKeywordDesc: '用于匹配目标模型名称',
            // 分类管理
            categoryManage: '分类管理',
            categoryEmpty: '暂无分类，添加提示词时会自动创建分类',
            rename: '重命名',
            newCategoryName: '请输入新的分类名称：',
            categoryRenamed: '分类已重命名',
            confirmDeleteCategory: '确定删除该分类吗？关联的提示词将移至"未分类"',
            categoryDeleted: '分类已删除',
            // 语言设置
            languageLabel: '界面语言',
            languageDesc: '设置面板显示语言，即时生效',
            languageAuto: '跟随系统',
            languageZhCN: '简体中文',
            languageZhTW: '繁體中文',
            languageEn: 'English',
            // 页面宽度设置
            pageWidthLabel: '页面宽度',
            pageWidthDesc: '调整聊天页面的宽度，即时生效',
            enablePageWidth: '启用页面加宽',
            widthValue: '宽度值',
            widthUnit: '单位',
            unitPx: '像素 (px)',
            unitPercent: '百分比 (%)',
            // 标签页设置
            tabSettingsTitle: '标签页设置',
            openNewTabLabel: '新标签页打开新对话',
            openNewTabDesc: '在面板顶部添加按钮，点击后在新标签页打开新对话',
            newTabTooltip: '新标签页开启对话',
            autoRenameTabLabel: '自动重命名标签页',
            autoRenameTabDesc: '将浏览器标签页名称改为当前对话名称',
            renameIntervalLabel: '检测频率',
            renameIntervalDesc: '检测对话名称变化的间隔时间',
            secondsSuffix: '秒',
            showStatusLabel: '显示生成状态',
            toggleTheme: '切换亮/暗主题',
            // 面板设置
            showStatusDesc: '在标签页标题中显示生成状态图标（⏳/✅）',
            showNotificationLabel: '发送桌面通知',
            showNotificationDesc: '生成完成时发送系统通知（目前仅 Gemini Business 有效）',
            autoFocusLabel: '自动窗口置顶',
            autoFocusDesc: '生成完成时自动将窗口带回前台（目前仅 Gemini Business 有效）',
            privacyModeLabel: '隐私模式',
            privacyModeDesc: '隐藏真实对话标题，显示伪装标题（双击面板标题可快速切换）',
            privacyTitleLabel: '伪装标题',
            privacyTitlePlaceholder: '如：Google、工作文档',
            titleFormatLabel: '标题格式',
            titleFormatDesc: '自定义标题格式，支持占位符：{status}、{title}、{model}',
            notificationTitle: '✅ {site} 生成完成',
            notificationBody: '点击查看结果',
            // 大纲功能
            tabOutline: '大纲',
            outlineEmpty: '暂无大纲内容',
            outlineRefresh: '刷新',
            outlineSettings: '大纲设置',
            enableOutline: '启用大纲',
            outlineMaxLevel: '显示标题级别',
            outlineLevelAll: '全部 (1-6级)',
            outlineLevel1: '仅 1 级',
            outlineLevel2: '至 2 级',
            outlineLevel3: '至 3 级',
            // 刷新按钮提示
            togglePrompts: '显示/隐藏提示词',
            toggleConversations: '显示/隐藏会话管理',
            refreshPrompts: '刷新提示词',
            refreshOutline: '刷新大纲',
            refreshSettings: '刷新设置',
            jumpToAnchor: '返回跳转前位置',
            anchorUpdated: '锚点已更新',
            // 大纲高级工具栏
            outlineScrollBottom: '滚动到底部',
            outlineScrollTop: '滚动到顶部',
            outlineExpandAll: '展开全部',
            outlineCollapseAll: '折叠全部',
            outlineSearch: '搜索大纲...',
            outlineSearchResult: '个结果',
            outlineLevelHint: '级标题',
            // Tab 顺序设置
            tabOrderSettings: '界面排版',
            tabOrderDesc: '调整面板 Tab 的显示顺序',
            moveUp: '上移',
            moveDown: '下移',
            // 阅读导航设置
            readingNavigationSettings: '阅读导航',
            readingHistorySettings: '阅读历史',
            readingHistoryPersistence: '启用阅读历史',
            readingHistoryPersistenceDesc: '自动记录阅读位置，下次打开时恢复',
            autoRestore: '自动跳转',
            autoRestoreDesc: '打开页面时自动跳转到上次位置',
            readingHistoryCleanup: '历史保留时间',
            readingHistoryCleanupDesc: '只保留最近几天的阅读进度 (-1 为永久)',
            daysSuffix: '天',
            cleanupInfinite: '永久',
            restoredPosition: '已恢复上次阅读位置',
            cleanupDone: '已清理过期数据',
            // 大纲高级设置
            outlineAutoUpdateLabel: '对话期间自动更新大纲',
            outlineAutoUpdateDesc: 'AI 生成内容时自动刷新目录结构',
            outlineUpdateIntervalLabel: '更新检测间隔 (秒)',
            outlineIntervalUpdated: '间隔已设为 {val} 秒',
            // 页面显示设置
            pageDisplaySettings: '页面显示',
            // 其他设置
            otherSettingsTitle: '其他设置',
            showCollapsedAnchorLabel: '锚点',
            showCollapsedAnchorDesc: '当面板收起时，在侧边浮动条中显示锚点按钮',
            showCollapsedThemeLabel: '主题',
            showCollapsedThemeDesc: '当面板收起时，在侧边浮动条中显示主题切换按钮',
            collapsedButtonsOrderDesc: '调整折叠面板按钮的显示顺序',
            preventAutoScrollLabel: '防止自动滚动',
            preventAutoScrollDesc: '当 AI 生成长内容时，阻止页面自动滚动到底部，方便阅读上文',
            // 界面排版开关
            defaultPanelStateLabel: '默认显示面板',
            defaultPanelStateDesc: '刷新页面后面板默认保持展开状态',
            autoHidePanelLabel: '自动隐藏面板',
            autoHidePanelDesc: '点击面板外部（如左侧侧边栏、聊天区、输入框）时自动隐藏',

            // 界面排版开关
            disableOutline: '禁用大纲',
            togglePrompts: '启用/禁用提示词',
            toggleConversations: '启用/禁用会话',
            // 会话功能
            tabConversations: '会话',
            conversationsEmpty: '暂无会话数据',
            conversationsEmptyHint: '点击上方同步按钮从侧边栏导入会话',
            conversationsSync: '同步会话',
            conversationsSyncing: '正在同步...',
            conversationsSynced: '同步完成',
            conversationsAddFolder: '新建文件夹',
            conversationsRename: '重命名',
            conversationsDelete: '删除',
            conversationsDeleteConfirm: '确定删除此文件夹吗？其中的会话将移到收件箱。',
            conversationsFolderCreated: '文件夹已创建',
            conversationsFolderRenamed: '文件夹已重命名',
            conversationsFolderDeleted: '文件夹已删除',
            conversationsCannotDeleteDefault: '无法删除默认文件夹',
            conversationsIcon: '图标',
            conversationsFolderName: '名称',
            conversationsFolderNamePlaceholder: '输入文件夹名称',
            cancel: '取消',
            confirm: '确定',
            conversationsSyncEmpty: '未找到会话',
            conversationsSyncNoChange: '无新会话',
            justNow: '刚刚',
            minutesAgo: '分钟前',
            hoursAgo: '小时前',
            daysAgo: '天前',
            conversationsSelectFolder: '选择同步目标文件夹',
            conversationsMoveTo: '移动到...',
            conversationsMoved: '已移动到',
            conversationsSyncDeleteTitle: '同步删除',
            conversationsSyncDeleteMsg: '检测到 {count} 个会话已在云端删除，是否同步删除本地记录？',
            conversationsDeleted: '已移除',
            // 会话设置
            conversationsSettingsTitle: '会话设置',
            conversationsSyncDeleteLabel: '删除时同步删除云端',
            conversationsSyncDeleteDesc: '删除本地会话记录时，同时从 {site} 云端删除',
            conversationsSyncRenameLabel: '重命名时同步云端',
            conversationsSyncRenameDesc: '修改会话标题时，同时在 {site} 侧边栏更新标题',
            conversationsCustomIcon: '自定义图标',
            batchSelected: '已选 {n} 个',
            batchMove: '移动',
            batchDelete: '删除',
            batchExit: '退出',
            conversationsRefresh: '刷新会话列表',
            conversationsSearchPlaceholder: '搜索会话...',
            conversationsSearchResult: '个结果',
            conversationsNoSearchResult: '未找到匹配结果',
            conversationsSetTags: '设置标签',
            conversationsNewTag: '新建标签',
            conversationsTagName: '标签名称',
            conversationsTagColor: '标签颜色',
            conversationsFilterByTags: '按标签筛选',
            conversationsClearTags: '清除筛选',
            conversationsTagCreated: '标签已创建',
            conversationsTagUpdated: '标签已更新',
            conversationsTagDeleted: '标签已删除',
            conversationsTagExists: '标签名称已存在',
            conversationsUpdateTag: '更新标签',
            conversationsNoTags: '暂无标签',
            conversationsManageTags: '管理标签',
            conversationsPin: '置顶📌',
            conversationsUnpin: '取消置顶',
            conversationsPinned: '已置顶',
            conversationsUnpinned: '已取消置顶',
            conversationsFilterPinned: '筛选置顶',
            conversationsClearAll: '清除所有筛选',
            conversationsBatchMode: '批量操作',
        },
        'zh-TW': {
            panelTitle: 'Gemini 助手',
            tabPrompts: '提示詞',
            tabSettings: '設置',
            searchPlaceholder: '搜尋提示詞...',
            addPrompt: '新增提示詞',
            allCategory: '全部',
            manageCategory: '⚙ 管理',
            currentPrompt: '當前提示詞：',
            scrollTop: '頂部',
            scrollBottom: '底部',
            refresh: '刷新',
            collapse: '收起',
            edit: '編輯',
            delete: '刪除',
            copy: '複製',
            drag: '拖動',
            save: '保存',
            cancel: '取消',
            add: '新增',
            title: '標題',
            category: '分類',
            categoryPlaceholder: '例如：程式設計、翻譯',
            content: '提示詞內容',
            editPrompt: '編輯提示詞',
            addNewPrompt: '新增提示詞',
            fillTitleContent: '請填寫標題和內容',
            promptUpdated: '提示詞已更新',
            promptAdded: '提示詞已新增',
            deleted: '已刪除',
            copied: '已複製到剪貼簿',
            cleared: '已清除內容',
            refreshed: '已刷新',
            orderUpdated: '已更新排序',
            inserted: '已插入提示詞',
            scrolling: '頁面正在捲動，請稍後...',
            noTextarea: '未找到輸入框，請點擊輸入框後重試',
            confirmDelete: '確定刪除?',
            // 設置面板
            settingsTitle: '通用設置',
            clearOnSendLabel: '發送後自動修復中文輸入',
            clearOnSendDesc: '發送訊息後插入零寬字元，修復下次輸入首字母問題（僅 Gemini Business）',
            settingOn: '開',
            settingOff: '關',
            // 模型鎖定
            modelLockTitle: '模型鎖定',
            modelLockLabel: '自動鎖定模型',
            modelLockDesc: '進入頁面後自動切換到指定模型',
            modelKeywordLabel: '模型關鍵字',
            modelKeywordPlaceholder: '例如：3 Pro',
            modelKeywordDesc: '用於匹配目標模型名稱',
            // 分類管理
            categoryManage: '分類管理',
            categoryEmpty: '暫無分類，新增提示詞時會自動建立分類',
            rename: '重新命名',
            newCategoryName: '請輸入新的分類名稱：',
            categoryRenamed: '分類已重新命名',
            confirmDeleteCategory: '確定刪除該分類嗎？關聯的提示詞將移至「未分類」',
            categoryDeleted: '分類已刪除',
            // 語言設置
            languageLabel: '介面語言',
            languageDesc: '設定面板顯示語言，即時生效',
            languageAuto: '跟隨系統',
            languageZhCN: '简体中文',
            languageZhTW: '繁體中文',
            languageEn: 'English',
            // 頁面寬度設置
            pageWidthLabel: '頁面寬度',
            pageWidthDesc: '調整聊天頁面的寬度，即時生效',
            enablePageWidth: '啟用頁面加寬',
            widthValue: '寬度值',
            widthUnit: '單位',
            unitPx: '像素 (px)',
            unitPercent: '百分比 (%)',
            // 標籤頁設置
            tabSettingsTitle: '標籤頁設置',
            openNewTabLabel: '新分頁開啟新對話',
            openNewTabDesc: '在面板頂部新增按鈕，點擊後在新分頁開啟新對話',
            newTabTooltip: '新分頁開啟對話',
            autoRenameTabLabel: '自動重新命名標籤頁',
            autoRenameTabDesc: '將瀏覽器標籤頁名稱改為當前對話名稱',
            renameIntervalLabel: '檢測頻率',
            renameIntervalDesc: '檢測對話名稱變化的間隔時間',
            secondsSuffix: '秒',
            showStatusLabel: '顯示生成狀態',
            showStatusDesc: '在標籤頁標題中顯示生成狀態圖示（⏳/✅）',
            showNotificationLabel: '傳送桌面通知',
            showNotificationDesc: '生成完成時傳送系统通知（僅 Gemini Business 有效）',
            autoFocusLabel: '自動視窗置頂',
            autoFocusDesc: '生成完成時自動將視窗帶回前台（僅 Gemini Business 有效）',
            privacyModeLabel: '隱私模式',
            privacyModeDesc: '隱藏真實對話標題，顯示偽裝標題（雙擊面板標題可快速切換）',
            privacyTitleLabel: '偽裝標題',
            privacyTitlePlaceholder: '如：Google、工作文件',
            titleFormatLabel: '標題格式',
            titleFormatDesc: '自訂標題格式，支援佔位符：{status}、{title}、{model}',
            notificationTitle: '✅ {site} 生成完成',
            notificationBody: '點擊查看結果',
            // 大綱功能
            tabOutline: '大綱',
            outlineEmpty: '暫無大綱內容',
            outlineRefresh: '刷新',
            outlineSettings: '大綱設置',
            enableOutline: '啟用大綱',
            outlineMaxLevel: '顯示標題級別',
            outlineLevelAll: '全部 (1-6級)',
            outlineLevel1: '僅 1 級',
            outlineLevel2: '至 2 級',
            outlineLevel3: '至 3 級',
            // 刷新按鈕提示
            refreshPrompts: '刷新提示詞',
            refreshOutline: '刷新大綱',
            refreshSettings: '刷新設置',
            // 大綱高級工具欄
            outlineScrollBottom: '滾動到底部',
            outlineScrollTop: '滾動到頂部',
            outlineExpandAll: '展開全部',
            outlineCollapseAll: '折疊全部',
            outlineSearch: '搜尋大綱...',
            outlineSearchResult: '個結果',
            outlineLevelHint: '級標題',
            // Tab 顺序设置
            tabOrderSettings: '介面排版',
            tabOrderDesc: '調整面板 Tab 的顯示順序',
            moveUp: '上移',
            moveDown: '下移',
            // 阅读导航設置
            readingNavigationSettings: '閱讀導航',
            readingHistorySettings: '閱讀歷史',
            readingHistoryPersistence: '啟用閱讀歷史',
            readingHistoryPersistenceDesc: '自動記錄閱讀位置，下次開啟時恢復',
            autoRestore: '自動跳轉',
            autoRestoreDesc: '開啟頁面時自動跳轉到上次位置',
            readingHistoryCleanup: '歷史保留時間',
            readingHistoryCleanupDesc: '只保留最近幾天的閱讀進度 (-1 為永久)',
            daysSuffix: '天',
            cleanupInfinite: '永久',
            restoredPosition: '已恢復上次閱讀位置',
            cleanupDone: '已清理過期數據',
            // 大綱高級設置
            outlineAutoUpdateLabel: '對話期間自動更新大綱',
            outlineAutoUpdateDesc: 'AI 生成內容時自動刷新目錄結構',
            outlineUpdateIntervalLabel: '更新檢測間隔 (秒)',
            outlineIntervalUpdated: '間隔已設為 {val} 秒',
            // 頁面顯示設置
            pageDisplaySettings: '頁面顯示',
            // 其他設置
            otherSettingsTitle: '其他設置',
            showCollapsedAnchorLabel: '錨點',
            showCollapsedAnchorDesc: '當面板收起時，在側邊浮動條中顯示錨點按鈕',
            showCollapsedThemeLabel: '主題',
            showCollapsedThemeDesc: '當面板收起時，在側邊浮動條中顯示主題切換按鈕',
            collapsedButtonsOrderDesc: '調整折疊面板按鈕的顯示順序',
            preventAutoScrollLabel: '防止自動滾動',
            preventAutoScrollDesc: '當 AI 生成長內容時，阻止頁面自動滾動到底部，方便閱讀上文',
            // 介面排版開關
            disableOutline: '禁用大綱',
            togglePrompts: '啟用/禁用提示詞',
            toggleConversations: '啟用/禁用會話',
            // 會話功能
            tabConversations: '會話',
            conversationsEmpty: '暫無會話數據',
            conversationsEmptyHint: '點擊上方同步按鈕從側邊欄導入會話',
            conversationsSync: '同步會話',
            conversationsSyncing: '正在同步...',
            conversationsSynced: '同步完成',
            conversationsAddFolder: '新建資料夾',
            conversationsRename: '重命名',
            conversationsDelete: '刪除',
            conversationsDeleteConfirm: '確定刪除此資料夾嗎？其中的會話將移到收件箱。',
            conversationsFolderCreated: '資料夾已創建',
            conversationsFolderRenamed: '資料夾已重命名',
            conversationsFolderDeleted: '資料夾已刪除',
            conversationsCannotDeleteDefault: '無法刪除預設資料夾',
            conversationsIcon: '圖標',
            conversationsFolderName: '名稱',
            conversationsFolderNamePlaceholder: '輸入資料夾名稱',
            cancel: '取消',
            confirm: '確定',
            conversationsSyncEmpty: '未找到會話',
            conversationsSyncNoChange: '無新會話',
            justNow: '剛剛',
            minutesAgo: '分鐘前',
            hoursAgo: '小時前',
            daysAgo: '天前',
            conversationsSelectFolder: '選擇同步目標資料夾',
            conversationsMoveTo: '移動到...',
            conversationsMoved: '已移動到',
            conversationsSyncDeleteTitle: '同步刪除',
            conversationsSyncDeleteMsg: '檢測到 {count} 個會話已在雲端刪除，是否同步刪除本地記錄？',
            conversationsDeleted: '已移除',
            // 會話設置
            conversationsSettingsTitle: '會話設置',
            conversationsSyncDeleteLabel: '刪除時同步刪除雲端',
            conversationsSyncDeleteDesc: '刪除本地會話記錄時，同時從 {site} 雲端刪除',
            conversationsSyncRenameLabel: '重命名時同步雲端',
            conversationsSyncRenameDesc: '修改會話標題時，同時在 {site} 側邊欄更新標題',
            conversationsCustomIcon: '自定義圖示',
            batchSelected: '已選 {n} 個',
            batchMove: '移動',
            batchDelete: '刪除',
            batchExit: '退出',
            conversationsRefresh: '刷新會話列表',
            conversationsSearchPlaceholder: '搜尋會話...',
            conversationsSearchResult: '個結果',
            conversationsNoSearchResult: '未找到匹配結果',
            conversationsSetTags: '設定標籤',
            conversationsNewTag: '新建標籤',
            conversationsTagName: '標籤名稱',
            conversationsTagColor: '標籤顏色',
            conversationsFilterByTags: '按標籤篩選',
            conversationsClearTags: '清除篩選',
            conversationsTagCreated: '標籤已建立',
            conversationsTagUpdated: '標籤已更新',
            conversationsTagDeleted: '標籤已刪除',
            conversationsTagExists: '標籤名稱已存在',
            conversationsUpdateTag: '更新標籤',
            conversationsNoTags: '暫無標籤',
            conversationsManageTags: '管理標籤',
            conversationsPin: '置頂📌',
            conversationsUnpin: '取消置頂',
            conversationsPinned: '已置頂',
            conversationsUnpinned: '已取消置頂',
            conversationsFilterPinned: '篩選置頂',
            conversationsClearAll: '清除所有篩選',
            conversationsBatchMode: '批次操作',
        },
        en: {
            panelTitle: 'Gemini Helper',
            tabPrompts: 'Prompts',
            tabSettings: 'Settings',
            searchPlaceholder: 'Search prompts...',
            addPrompt: 'Add New Prompt',
            allCategory: 'All',
            manageCategory: '⚙ Manage',
            currentPrompt: 'Current: ',
            scrollTop: 'Top',
            scrollBottom: 'Bottom',
            refresh: 'Refresh',
            collapse: 'Collapse',
            edit: 'Edit',
            delete: 'Delete',
            copy: 'Copy',
            drag: 'Drag',
            save: 'Save',
            cancel: 'Cancel',
            add: 'Add',
            title: 'Title',
            category: 'Category',
            categoryPlaceholder: 'e.g., Coding, Translation',
            content: 'Prompt Content',
            editPrompt: 'Edit Prompt',
            addNewPrompt: 'Add New Prompt',
            fillTitleContent: 'Please fill in title and content',
            promptUpdated: 'Prompt updated',
            promptAdded: 'Prompt added',
            deleted: 'Deleted',
            copied: 'Copied to clipboard',
            cleared: 'Content cleared',
            refreshed: 'Refreshed',
            orderUpdated: 'Order updated',
            inserted: 'Prompt inserted',
            scrolling: 'Page is scrolling, please wait...',
            noTextarea: 'Input not found, please click the input area first',
            confirmDelete: 'Delete this prompt?',
            // Settings panel
            settingsTitle: 'General Settings',
            clearOnSendLabel: 'Auto-fix Chinese input after send',
            clearOnSendDesc: 'Insert zero-width char after send to fix first letter issue (Gemini Business only)',
            settingOn: 'ON',
            settingOff: 'OFF',
            // Model Lock
            modelLockTitle: 'Model Lock',
            modelLockLabel: 'Auto Lock Model',
            modelLockDesc: 'Automatically switch to specified model upon entry',
            modelKeywordLabel: 'Model Keyword',
            modelKeywordPlaceholder: 'e.g., 3 Pro',
            modelKeywordDesc: 'Used to match target model name',
            // Category management
            categoryManage: 'Category Management',
            categoryEmpty: 'No categories yet. Categories are created when you add prompts.',
            rename: 'Rename',
            newCategoryName: 'Enter new category name:',
            categoryRenamed: 'Category renamed',
            confirmDeleteCategory: 'Delete this category? Associated prompts will be moved to "Uncategorized"',
            categoryDeleted: 'Category deleted',
            // Language settings
            languageLabel: 'Language',
            languageDesc: 'Set panel display language, takes effect immediately',
            languageAuto: 'Auto',
            languageZhCN: '简体中文',
            languageZhTW: '繁體中文',
            languageEn: 'English',
            // Page width settings
            pageWidthLabel: 'Page Width',
            pageWidthDesc: 'Adjust chat page width, takes effect immediately',
            enablePageWidth: 'Enable Page Widening',
            widthValue: 'Width Value',
            widthUnit: 'Unit',
            unitPx: 'Pixels (px)',
            unitPercent: 'Percentage (%)',
            // Tab Settings
            tabSettingsTitle: 'Tab Settings',
            openNewTabLabel: 'Open New Chat in New Tab',
            openNewTabDesc: 'Add a button to the panel header to open a new chat in a new tab',
            newTabTooltip: 'New Chat in New Tab',
            autoRenameTabLabel: 'Auto Rename Tab',
            autoRenameTabDesc: 'Change browser tab title to current conversation name',
            renameIntervalLabel: 'Detection Interval',
            renameIntervalDesc: 'Interval for detecting conversation name changes',
            secondsSuffix: 's',
            showStatusLabel: 'Show Status',
            showStatusDesc: 'Display generation status icon in tab title (⏳/✅)',
            showNotificationLabel: 'Desktop Notification',
            showNotificationDesc: 'Send system notification when generation completes (Gemini Business only)',
            autoFocusLabel: 'Auto Focus Window',
            autoFocusDesc: 'Bring window to front when generation completes (Gemini Business only)',
            privacyModeLabel: 'Privacy Mode',
            privacyModeDesc: 'Hide real conversation title, show decoy title (double-click panel header to toggle)',
            privacyTitleLabel: 'Decoy Title',
            privacyTitlePlaceholder: 'e.g., Google, Work Document',
            titleFormatLabel: 'Title Format',
            titleFormatDesc: 'Custom title format, supports placeholders: {status}, {title}, {model}',
            notificationTitle: '✅ {site} Generation Complete',
            notificationBody: 'Click to view results',
            tabOutline: 'Outline',
            outlineEmpty: 'No outline content',
            outlineRefresh: 'Refresh',
            outlineSettings: 'Outline Settings',
            enableOutline: 'Enable Outline',
            outlineMaxLevel: 'Heading Levels',
            outlineLevelAll: 'All (1-6)',
            outlineLevel1: 'Level 1 only',
            outlineLevel2: 'Up to Level 2',
            outlineLevel3: 'Up to Level 3',
            // Refresh button hints
            refreshPrompts: 'Refresh Prompts',
            refreshOutline: 'Refresh Outline',
            refreshSettings: 'Refresh Settings',
            // Outline advanced toolbar
            outlineScrollBottom: 'Scroll to bottom',
            outlineScrollTop: 'Scroll to top',
            outlineExpandAll: 'Expand all',
            outlineCollapseAll: 'Collapse all',
            outlineSearch: 'Search outline...',
            outlineSearchResult: 'result(s)',
            outlineLevelHint: 'headings',
            // Tab Order Settings
            tabOrderSettings: 'Interface Layout',
            tabOrderDesc: 'Adjust the display order of panel tabs',
            moveUp: 'Move Up',
            moveDown: 'Move Down',
            // Reading Navigation Settings
            readingNavigationSettings: 'Reading Navigation',
            anchorSettings: 'Reading History',
            anchorPersistence: 'Enable Reading History',
            anchorPersistenceDesc: 'Automatically remember reading position',
            anchorAutoRestore: 'Auto-Resume',
            anchorAutoRestoreDesc: 'Jump to last position on load',
            anchorCleanup: 'Retention Period',
            anchorCleanupDesc: 'Keep reading progress for days (-1 for infinite)',
            daysSuffix: 'Days',
            cleanupInfinite: 'Infinite',
            restoredPosition: 'Resumed last position',
            cleanupDone: 'Expired data cleaned',
            // Outline Advanced Settings
            outlineAutoUpdateLabel: 'Auto-update outline during conversation',
            outlineAutoUpdateDesc: 'Automatically refresh outline when AI generates content',
            outlineUpdateIntervalLabel: 'Update interval (seconds)',
            outlineIntervalUpdated: 'Interval set to {val} seconds',
            // Page Display Settings
            pageDisplaySettings: 'Page Display',
            // Other Settings
            otherSettingsTitle: 'Other Settings',
            showCollapsedAnchorLabel: 'Anchor',
            showCollapsedAnchorDesc: 'Display anchor button in sidebar when panel is collapsed',
            showCollapsedThemeLabel: 'Theme',
            showCollapsedThemeDesc: 'Display theme toggle button in sidebar when panel is collapsed',
            collapsedButtonsOrderDesc: 'Adjust the display order of collapsed panel buttons',
            preventAutoScrollLabel: 'Prevent auto-scroll',
            preventAutoScrollDesc: 'Stop page from auto-scrolling to bottom during AI generation',
            // Interface Toggle
            disableOutline: 'Disable Outline',
            togglePrompts: 'Toggle Prompts',
            toggleConversations: 'Toggle Conversations',
            // Conversations
            tabConversations: 'Conversations',
            conversationsEmpty: 'No conversations yet',
            conversationsEmptyHint: 'Click sync button above to import from sidebar',
            conversationsSync: 'Sync',
            conversationsSyncing: 'Syncing...',
            conversationsSynced: 'Synced',
            conversationsAddFolder: 'New Folder',
            conversationsRename: 'Rename',
            conversationsDelete: 'Delete',
            conversationsDeleteConfirm: 'Delete this folder? Conversations will be moved to Inbox.',
            conversationsFolderCreated: 'Folder created',
            conversationsFolderRenamed: 'Folder renamed',
            conversationsFolderDeleted: 'Folder deleted',
            conversationsCannotDeleteDefault: 'Cannot delete default folder',
            conversationsIcon: 'Icon',
            conversationsFolderName: 'Name',
            conversationsFolderNamePlaceholder: 'Enter folder name',
            cancel: 'Cancel',
            confirm: 'Confirm',
            conversationsSyncEmpty: 'No conversations found',
            conversationsSyncNoChange: 'No new conversations',
            justNow: 'Just now',
            minutesAgo: 'm ago',
            hoursAgo: 'h ago',
            daysAgo: 'd ago',
            conversationsSelectFolder: 'Select sync folder',
            conversationsMoveTo: 'Move to...',
            conversationsMoved: 'Moved to',
            conversationsSyncDeleteTitle: 'Sync Deletion',
            conversationsSyncDeleteMsg: '{count} conversation(s) have been deleted from cloud. Remove local records?',
            conversationsDeleted: 'Removed',
            // Conversation settings
            conversationsSettingsTitle: 'Conversation Settings',
            conversationsSyncDeleteLabel: 'Sync delete to cloud',
            conversationsSyncDeleteDesc: 'When deleting local record, also delete from {site} cloud',
            conversationsSyncRenameLabel: 'Sync rename to cloud',
            conversationsSyncRenameDesc: 'When renaming conversation, also update title in {site} sidebar',
            conversationsCustomIcon: 'Custom Icon',
            batchSelected: 'Selected {n}',
            batchMove: 'Move',
            batchDelete: 'Delete',
            batchExit: 'Exit',
            conversationsRefresh: 'Refresh List',
            conversationsSearchPlaceholder: 'Search conversations...',
            conversationsSearchResult: 'result(s)',
            conversationsNoSearchResult: 'No matching results',
            conversationsSetTags: 'Set Tags',
            conversationsNewTag: 'New Tag',
            conversationsTagName: 'Tag Name',
            conversationsTagColor: 'Tag Color',
            conversationsFilterByTags: 'Filter by Tags',
            conversationsClearTags: 'Clear Filter',
            conversationsTagCreated: 'Tag Created',
            conversationsTagUpdated: 'Tag Updated',
            conversationsTagDeleted: 'Tag Deleted',
            conversationsTagExists: 'Tag name already exists',
            conversationsUpdateTag: 'Update Tag',
            conversationsNoTags: 'No Tags',
            conversationsManageTags: 'Manage Tags',
            conversationsSetTags: 'Set Tags',
            conversationsNewTag: 'New Tag',
            conversationsTagName: 'Tag Name',
            conversationsTagColor: 'Tag Color',
            conversationsFilterByTags: 'Filter by Tags',
            conversationsClearTags: 'Clear Filter',
            conversationsTagCreated: 'Tag Created',
            conversationsTagUpdated: 'Tag Updated',
            conversationsTagDeleted: 'Tag Deleted',
            conversationsNoTags: 'No Tags',
            conversationsManageTags: 'Manage Tags',
            conversationsPin: 'Pin📌',
            conversationsUnpin: 'Unpin',
            conversationsPinned: 'Pinned',
            conversationsUnpinned: 'Unpinned',
            conversationsFilterPinned: 'Filter Pinned',
            conversationsClearAll: 'Clear all filters',
            conversationsBatchMode: 'Batch Mode',
        },
    };

    // ============= 默认提示词库 =============
    const DEFAULT_PROMPTS = [
        {
            id: 'default_1',
            title: '代码优化',
            content: '请帮我优化以下代码，提高性能和可读性：\n\n',
            category: '编程',
        },
        {
            id: 'default_2',
            title: '翻译助手',
            content: '请将以下内容翻译成中文，保持专业术语的准确性：\n\n',
            category: '翻译',
        },
    ];

    // ============= 页面宽度默认配置 =============
    const DEFAULT_WIDTH_SETTINGS = {
        gemini: { enabled: false, value: '70', unit: '%' },
        'gemini-business': { enabled: false, value: '1600', unit: 'px' },
    };

    // ============= 大纲功能默认配置 =============
    const DEFAULT_OUTLINE_SETTINGS = {
        enabled: true,
        maxLevel: 6, // 显示到几级标题 (1-6)
        autoUpdate: true,
        updateInterval: 3,
    };

    // 语言检测函数（支持手动设置）
    function detectLanguage() {
        // 优先使用用户手动设置的语言
        const savedLang = GM_getValue(SETTING_KEYS.LANGUAGE, 'auto');
        if (savedLang !== 'auto' && I18N[savedLang]) {
            return savedLang;
        }
        // 自动检测
        const lang = navigator.language || navigator.userLanguage || 'en';
        if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK') || lang.startsWith('zh-Hant')) {
            return 'zh-TW';
        }
        if (lang.startsWith('zh')) {
            return 'zh-CN';
        }
        return 'en';
    }

    // ==================== 站点适配器模式 (Site Adapter Pattern) ====================

    /**
     * 站点适配器基类
     * 添加新站点时，继承此类并实现所有抽象方法
     */
    class SiteAdapter {
        constructor() {
            this.textarea = null;
        }

        /**
         * 检测当前页面是否匹配该站点
         * @returns {boolean}
         */
        match() {
            throw new Error('必须实现 match()');
        }

        /**
         * 返回站点标识符(用于配置存储)
         * @returns {string}
         */
        getSiteId() {
            throw new Error('必须实现 getSiteId()');
        }

        /**
         * 返回站点显示名称
         * @returns {string}
         */
        getName() {
            throw new Error('必须实现 getName()');
        }

        /**
         * 获取当前会话ID (用于锚点持久化)
         * @returns {string} Session ID
         */
        getSessionId() {
            // 优化实现：先去除 URL 中的查询参数 (?及后面内容)，再获取最后一段
            const urlWithoutQuery = window.location.href.split('?')[0];
            const parts = urlWithoutQuery.split('/').filter((p) => p);
            return parts.length > 0 ? parts[parts.length - 1] : 'default';
        }

        /**
         * 是否支持在新标签页打开新对话
         * @returns {boolean}
         */
        supportsNewTab() {
            return true;
        }

        /**
         * 获取新标签页打开的 URL
         * @returns {string}
         */
        getNewTabUrl() {
            return window.location.origin;
        }

        /**
         * 是否支持标签页重命名
         * @returns {boolean}
         */
        supportsTabRename() {
            return true;
        }

        /**
         * 获取当前会话/对话名称（用于标签页重命名）
         * @returns {string|null}
         */
        getSessionName() {
            // 默认实现：尝试从 document.title 中提取
            const title = document.title;
            if (title) {
                // 去除站点名称后缀，如 "对话标题 - Gemini"
                const parts = title.split(' - ');
                if (parts.length > 1) {
                    return parts.slice(0, -1).join(' - ').trim();
                }
                return title.trim();
            }
            return null;
        }

        /**
         * 判断当前是否处于新对话页面（未发起任何对话）
         * 新对话页面不应使用旧会话标题更新标签页、不应记录阅读历史
         * @returns {boolean}
         */
        isNewConversation() {
            return false;
        }

        /**
         * 获取侧边栏会话列表
         * 子类应覆盖此方法从站点 DOM 提取会话数据
         * @returns {Array<{id: string, title: string, url: string, isActive: boolean}>}
         */
        getConversationList() {
            return [];
        }

        /**
         * 获取侧边栏可滚动容器
         * 子类应覆盖此方法返回侧边栏的可滚动容器元素
         * @returns {Element|null}
         */
        getSidebarScrollContainer() {
            return null;
        }

        /**
         * 获取会话观察器配置（用于侧边栏实时监听）
         * 子类应覆盖此方法提供站点特定的配置
         * @returns {{
         *   selector: string,                    // 会话元素 CSS 选择器
         *   shadow: boolean,                     // 是否需要 Shadow DOM 穿透
         *   extractInfo: function(Element): Object|null, // 从元素提取会话信息
         *   getTitleElement: function(Element): Element  // 获取标题元素（用于监听变化）
         * }|null} 返回 null 表示不支持
         */
        getConversationObserverConfig() {
            return null;
        }

        /**
         * 滚动加载全部会话
         * 模拟滚动侧边栏到底部，直到所有会话都加载完成
         * @returns {Promise<void>}
         */
        async loadAllConversations() {
            const container = this.getSidebarScrollContainer();
            if (!container) return;

            let lastCount = 0;
            let stableRounds = 0;
            const maxStableRounds = 3; // 连续3次无新增则停止

            while (stableRounds < maxStableRounds) {
                container.scrollTop = container.scrollHeight;
                await new Promise((r) => setTimeout(r, 500));

                // 使用 DOMToolkit 穿透 Shadow DOM 查询会话数量
                const conversations = DOMToolkit.query('.conversation', { all: true, shadow: true }) || [];
                const currentCount = conversations.length;
                if (currentCount === lastCount) {
                    stableRounds++;
                } else {
                    lastCount = currentCount;
                    stableRounds = 0;
                }
            }
        }

        /**
         * 检测 AI 是否正在生成响应
         * @returns {boolean}
         */
        isGenerating() {
            // 默认实现：子类应覆盖此方法
            return false;
        }

        /**
         * 获取当前使用的模型名称
         * @returns {string|null}
         */
        getModelName() {
            // 默认实现：子类应覆盖此方法
            return null;
        }

        /**
         * 获取网络监控配置（用于后台任务完成检测）
         * 子类可覆盖此方法提供站点特定的配置
         * @returns {{
         *   urlPatterns: string[],      // 要监控的 URL 模式（包含匹配）
         *   silenceThreshold: number    // 静默判定时间（毫秒）
         * }|null} 返回 null 表示不启用网络监控
         */
        getNetworkMonitorConfig() {
            return null;
        }

        /**
         * 返回站点主题色
         * @returns {{primary: string, secondary: string}}
         */
        getThemeColors() {
            throw new Error('必须实现 getThemeColors()');
        }

        /**
         * 返回需要加宽的CSS选择器列表
         * @returns {Array<{selector: string, property: string}>}
         */
        getWidthSelectors() {
            return [];
        }

        /**
         * 返回输入框选择器列表
         * @returns {string[]}
         */
        getTextareaSelectors() {
            return [];
        }

        /**
         * 获取提交按钮选择器，可以匹配ID、类名、属性等选择器
         *
         * @returns 提交按钮选择器
         */
        getSubmitButtonSelectors() {
            return [];
        }

        /**
         * 查找输入框元素
         * 默认实现：遍历选择器查找
         * @returns {HTMLElement|null}
         */
        findTextarea() {
            for (const selector of this.getTextareaSelectors()) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (this.isValidTextarea(element)) {
                        this.textarea = element;
                        return element;
                    }
                }
            }
            return null;
        }

        /**
         * 验证输入框是否有效
         * @param {HTMLElement} element
         * @returns {boolean}
         */
        isValidTextarea(element) {
            return element.offsetParent !== null;
        }

        /**
         * 向输入框插入内容
         * @param {string} content
         * @returns {Promise<boolean>|boolean}
         */
        insertPrompt(content) {
            throw new Error('必须实现 insertPrompt()');
        }

        /**
         * 清空输入框内容
         */
        clearTextarea() {
            if (this.textarea) {
                this.textarea.value = '';
                this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        /**
         * 获取滚动容器
         * @returns {HTMLElement}
         */
        getScrollContainer() {
            // 使用 DOMToolkit 查找滚动容器，传入站点特定选择器
            return DOMToolkit.findScrollContainer({
                selectors: [
                    'infinite-scroller.chat-history', // Gemini 主对话滚动容器（精确匹配，避免与侧边栏混淆）
                    '.chat-mode-scroller',
                    'main',
                    '[role="main"]',
                    '.conversation-container',
                    '.chat-container',
                ],
            });
        }

        /**
         * 获取当前视口中可见的锚点元素信息 (用于精准定位)
         * @returns {Object|null} { selector, offset, index }
         */
        getVisibleAnchorElement() {
            const container = this.getScrollContainer();
            if (!container) return null;

            const scrollTop = container.scrollTop;
            const selectors = this.getChatContentSelectors();
            if (!selectors.length) return null;

            // 查找所有候选元素
            const candidates = Array.from(container.querySelectorAll(selectors.join(', ')));
            if (!candidates.length) return null;

            let bestElement = null;

            for (let i = 0; i < candidates.length; i++) {
                const el = candidates[i];
                const top = el.offsetTop;

                // 策略：找到最后一个"顶部"位于视口上方(或刚露出)的元素 = 用户当前正在阅读的起始元素
                if (top <= scrollTop + 100) {
                    bestElement = el;
                } else {
                    // 后续元素都在视口下方，停止
                    break;
                }
            }

            if (!bestElement && candidates.length > 0) bestElement = candidates[0];

            if (bestElement) {
                const offset = scrollTop - bestElement.offsetTop;
                let selector = '';
                let id = bestElement.getAttribute('data-message-id') || bestElement.id;

                if (id) {
                    selector = `[data-message-id="${id}"]`;
                    if (!bestElement.matches(selector)) selector = `#${id}`;
                    return { type: 'selector', selector: selector, offset: offset };
                } else {
                    const globalIndex = candidates.indexOf(bestElement);
                    if (globalIndex !== -1) {
                        // 增强：记录文本指纹，防止历史加载导致索引偏移
                        const textSignature = (bestElement.textContent || '').trim().substring(0, 50);
                        return { type: 'index', index: globalIndex, offset: offset, textSignature: textSignature };
                    }
                }
            }
            return null;
        }

        /**
         * 根据保存的锚点信息恢复滚动
         * @param {Object} anchorData
         * @returns {boolean} 是否成功恢复
         */
        restoreScroll(anchorData) {
            const container = this.getScrollContainer();
            if (!container || !anchorData) return false;

            let targetElement = null;

            if (anchorData.type === 'selector' && anchorData.selector) {
                targetElement = container.querySelector(anchorData.selector);
            } else if (anchorData.type === 'index' && typeof anchorData.index === 'number') {
                const selectors = this.getChatContentSelectors();
                const candidates = Array.from(container.querySelectorAll(selectors.join(', ')));

                // 优先尝试使用索引
                if (candidates[anchorData.index]) {
                    targetElement = candidates[anchorData.index];

                    // 如果有文本指纹，进行校验
                    if (anchorData.textSignature) {
                        const currentText = (targetElement.textContent || '').trim().substring(0, 50);
                        // 如果文本不匹配，说明索引可能偏移了（例如加载了历史消息）
                        // 此时尝试全列表搜索
                        if (currentText !== anchorData.textSignature) {
                            // console.log('Anchor index mismatch, searching by text signature...');
                            const found = candidates.find((c) => (c.textContent || '').trim().substring(0, 50) === anchorData.textSignature);
                            if (found) targetElement = found;
                        }
                    }
                } else {
                    // 索引越界（可能消息被删了？），尝试文本搜索
                    if (anchorData.textSignature) {
                        const found = candidates.find((c) => (c.textContent || '').trim().substring(0, 50) === anchorData.textSignature);
                        if (found) targetElement = found;
                    }
                }
            }

            if (targetElement) {
                const targetTop = targetElement.offsetTop + (anchorData.offset || 0);
                container.scrollTo({ top: targetTop, behavior: 'instant' });
                return true;
            }
            return false;
        }

        /**
         * 页面加载完成后执行
         * @param {Object} options - 配置项 { clearOnInit: boolean, lockModel: boolean }
         */
        afterPropertiesSet(options = {}) {
            const { modelLockConfig } = options;
            // 默认初始化逻辑：如果有模型锁定配置且启用，尝试锁定模型
            if (modelLockConfig && modelLockConfig.enabled) {
                console.log(`[${this.getName()}] Triggering auto model lock:`, modelLockConfig.keyword);
                this.lockModel(modelLockConfig.keyword);
            }
        }

        /**
         * 判断是否应该将样式注入到指定的 Shadow Host 中
         * 用于解决 Shadow DOM 样式污染问题
         */
        shouldInjectIntoShadow(host) {
            return true;
        }

        /**
         * 获取对话历史容器的选择器
         * @returns {string} CSS 选择器
         */
        getResponseContainerSelector() {
            return '';
        }

        /**
         * 获取聊天内容元素的选择器列表
         * 用于 MutationObserver 检测新消息，配合滚动锁定功能
         * @returns {string[]} CSS 选择器列表
         */
        getChatContentSelectors() {
            return [];
        }

        /**
         * 从页面提取大纲（标题列表）
         * @param {number} maxLevel 最大标题级别 (1-6)
         * @returns {Array<{level: number, text: string, element: Element|null}>}
         */
        extractOutline(maxLevel = 6) {
            return [];
        }

        /**
         * 是否支持滚动锁定功能
         * @returns {boolean}
         */
        supportsScrollLock() {
            return false; // 默认不支持，除非子类明确声明
        }

        // ============= 新对话监听 =============

        /**
         * 获取“新对话”按钮的选择器列表
         * @returns {string[]}
         */
        getNewChatButtonSelectors() {
            return [];
        }

        /**
         * 绑定新对话触发事件（点击按钮或快捷键）
         * @param {Function} callback - 触发时的回调函数
         */
        bindNewChatListeners(callback) {
            // 1. 快捷键监听 (Ctrl + Shift + O)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && (e.key === 'o' || e.key === 'O')) {
                    console.log(`[${this.getName()}] New chat shortcut detected.`);
                    // 给予一点延迟等待页面响应
                    setTimeout(callback, 500);
                }
            });

            // 2. 按钮点击监听
            document.addEventListener(
                'click',
                (e) => {
                    const selectors = this.getNewChatButtonSelectors();
                    if (selectors.length === 0) return;

                    // 使用 composedPath() 以支持 Shadow DOM 中的元素匹配
                    const path = e.composedPath();
                    for (const target of path) {
                        if (target === document || target === window) break;

                        for (const selector of selectors) {
                            if (target.matches && target.matches(selector)) {
                                console.log(`[${this.getName()}] New chat button clicked.`);
                                setTimeout(callback, 500);
                                return;
                            }
                        }
                    }
                },
                true,
            ); // 使用捕获阶段确保捕获
        }

        // ============= 模型锁定功能（抽象接口） =============

        /**
         * 获取默认的模型锁定设置（每个站点可覆盖）
         * @returns {{ enabled: boolean, keyword: string }}
         */
        getDefaultLockSettings() {
            return { enabled: false, keyword: '' };
        }

        /**
         * 获取模型锁定配置
         * 子类需要覆盖此方法提供具体配置
         * @param {string} keyword - 目标模型关键字（由设置传入）
         * @returns {{
         *   targetModelKeyword: string,          // 目标模型名称关键字（用于匹配）
         *   selectorButtonSelectors: string[],   // 模型选择器按钮的 CSS 选择器列表
         *   menuItemSelector: string,            // 菜单项的 CSS 选择器
         *   checkInterval: number,               // 检查间隔（毫秒）
         *   maxAttempts: number,                 // 最大尝试次数
         *   menuRenderDelay: number              // 菜单渲染等待时间（毫秒）
         * }|null}
         */
        getModelSwitcherConfig(keyword) {
            return null;
        }

        /**
		 /**
		 * 通用模型锁定实现
		 * 基于 getModelSwitcherConfig() 返回的配置执行锁定逻辑
		 * @param {string} keyword - 目标模型关键字
		 * @param {Function} onSuccess 成功后的回调（可选）
		 */
        lockModel(keyword, onSuccess = null) {
            // ... (existing code)
        }

        lockModel(keyword, onSuccess = null) {
            const config = this.getModelSwitcherConfig(keyword);
            if (!config) return;

            const { targetModelKeyword, selectorButtonSelectors, menuItemSelector, checkInterval = 1500, maxAttempts = 20, menuRenderDelay = 500 } = config;

            let attempts = 0;
            let isSelecting = false;
            // 辅助函数：标准化文本（小写 + 去空）
            const normalize = (str) => (str || '').toLowerCase().trim();
            const target = normalize(targetModelKeyword);

            const timer = setInterval(() => {
                attempts++;
                if (attempts > maxAttempts) {
                    console.warn(`Gemini Helper: Model lock timed out for "${targetModelKeyword}"`);
                    clearInterval(timer);
                    return;
                }

                if (isSelecting) return;

                // 1. 查找模型选择器按钮
                const selectorBtn = this.findElementBySelectors(selectorButtonSelectors);
                if (!selectorBtn) return;

                // 2. 检查当前是否已经是目标模型（不区分大小写）
                const currentText = selectorBtn.textContent || selectorBtn.innerText || '';
                if (normalize(currentText).includes(target)) {
                    console.log(`Gemini Helper: Model is already locked to "${targetModelKeyword}"`);
                    clearInterval(timer);
                    if (onSuccess) onSuccess();
                    return;
                }

                // 3. 标记正在选择
                isSelecting = true;

                // 4. 点击展开菜单
                selectorBtn.click();

                // 5. 等待菜单渲染后查找并点击目标项
                setTimeout(() => {
                    const menuItems = this.findAllElementsBySelector(menuItemSelector);

                    // 如果找到了菜单项，说明菜单已渲染
                    if (menuItems.length > 0) {
                        let found = false;

                        for (const item of menuItems) {
                            const itemText = item.textContent || item.innerText || '';
                            // 不区分大小写匹配
                            if (normalize(itemText).includes(target)) {
                                item.click();
                                found = true;
                                clearInterval(timer);
                                console.log(`Gemini Helper: Switched to model "${targetModelKeyword}"`);
                                // 延迟关闭菜单面板
                                setTimeout(() => {
                                    document.body.click();
                                    if (onSuccess) onSuccess();
                                }, 100);
                                break;
                            }
                        }

                        if (!found) {
                            // 菜单已打开但没有找到目标模型，停止重试以避免死循环闪烁
                            console.warn(`Gemini Helper: Target model "${targetModelKeyword}" not found in menu. Aborting.`);
                            clearInterval(timer); // 关键：停止定时器
                            document.body.click(); // 关闭菜单
                            isSelecting = false;
                        }
                    } else {
                        // 菜单可能未渲染或选择器不匹配，允许重试（直到超时）
                        isSelecting = false;
                        document.body.click(); // 尝试关闭以重置状态
                    }
                }, menuRenderDelay);
            }, checkInterval);
        }

        /**
         * 通过选择器列表查找单个元素（支持 Shadow DOM）
         * @param {string[]} selectors
         * @returns {Element|null}
         */
        findElementBySelectors(selectors) {
            // 使用 DOMToolkit 进行 Shadow DOM 穿透查找
            return DOMToolkit.query(selectors, { shadow: true });
        }

        /**
         * 通过选择器查找所有元素（支持 Shadow DOM）
         * @param {string} selector
         * @returns {Element[]}
         */
        findAllElementsBySelector(selector) {
            // 使用 DOMToolkit 进行 Shadow DOM 穿透查找（返回所有匹配）
            return DOMToolkit.query(selector, { all: true, shadow: true });
        }
    }

    /**
     * Gemini 适配器（gemini.google.com）
     */
    class GeminiAdapter extends SiteAdapter {
        match() {
            return window.location.hostname.includes('gemini.google') && !window.location.hostname.includes('business.gemini.google');
        }

        getSiteId() {
            return 'gemini';
        }

        getName() {
            return 'Gemini';
        }

        getThemeColors() {
            return { primary: '#4285f4', secondary: '#34a853' };
        }

        getNewTabUrl() {
            return 'https://gemini.google.com/app';
        }

        isNewConversation() {
            const path = window.location.pathname;
            return path === '/app' || path === '/app/';
        }

        /**
         * 从侧边栏提取会话列表
         * @returns {Array<{id: string, title: string, url: string, isActive: boolean}>}
         */
        getConversationList() {
            const items = DOMToolkit.query('.conversation', { all: true }) || [];
            return Array.from(items)
                .map((el) => {
                    // 从 jslog 属性中提取会话 ID (Use safer regex that allows dashes/underscores)
                    const jslog = el.getAttribute('jslog') || '';
                    const idMatch = jslog.match(/\["c_([^"]+)"/);
                    const id = idMatch ? idMatch[1] : '';
                    const title = el.textContent?.trim() || '';

                    return {
                        id: id,
                        title: title,
                        url: id ? `https://gemini.google.com/app/${id}` : '',
                        isActive: el.classList.contains('selected'),
                    };
                })
                .filter((c) => c.id); // 过滤掉没有 ID 的项
        }

        /**
         * 获取侧边栏可滚动容器
         * @returns {Element|null}
         */
        getSidebarScrollContainer() {
            return DOMToolkit.query('infinite-scroller[scrollable="true"]') || DOMToolkit.query('infinite-scroller');
        }

        /**
         * 获取会话观察器配置（用于侧边栏实时监听）
         */
        getConversationObserverConfig() {
            return {
                selector: '.conversation',
                shadow: false,
                extractInfo: (el) => {
                    const jslog = el.getAttribute('jslog') || '';
                    const idMatch = jslog.match(/\["c_([^"]+)"/);
                    const id = idMatch ? idMatch[1] : '';
                    if (!id) return null;
                    return {
                        id,
                        title: el.textContent?.trim() || '',
                        url: `https://gemini.google.com/app/${id}`,
                    };
                },
                getTitleElement: (el) => el,
            };
        }

        getSessionName() {
            // 从侧边栏活动对话标题获取
            const titleEl = document.querySelector('.conversation-title');
            if (titleEl) {
                const name = titleEl.textContent?.trim();
                if (name) return name;
            }
            // 回退到基类默认实现（从 document.title 提取）
            return super.getSessionName();
        }

        getNewChatButtonSelectors() {
            return [
                '.new-chat-button',
                '.chat-history-new-chat-button',
                '[aria-label="New chat"]',
                '[aria-label="新对话"]',
                '[aria-label="发起新对话"]',
                '[data-testid="new-chat-button"]',
                '[data-test-id="new-chat-button"]',
                '[data-test-id="expanded-button"]',
                // 临时对话按钮
                '[data-test-id="temp-chat-button"]',
                'button[aria-label="临时对话"]',
            ];
        }

        getWidthSelectors() {
            return [
                { selector: '.conversation-container', property: 'max-width' },
                { selector: '.input-area-container', property: 'max-width' },
                // 用户消息右对齐
                {
                    selector: 'user-query',
                    property: 'max-width',
                    value: '100%',
                    noCenter: true,
                    extraCss: 'display: flex !important; justify-content: flex-end !important;',
                },
                {
                    selector: '.user-query-container',
                    property: 'max-width',
                    value: '100%',
                    noCenter: true,
                    extraCss: 'justify-content: flex-end !important;',
                },
            ];
        }

        getTextareaSelectors() {
            return ['div[contenteditable="true"].ql-editor', 'div[contenteditable="true"]', '[role="textbox"]', '[aria-label*="Enter a prompt"]'];
        }

        getSubmitButtonSelectors() {
            return ['button[aria-label*="Send"]', 'button[aria-label*="发送"]', '.send-button', '[data-testid*="send"]'];
        }

        isValidTextarea(element) {
            // 必须是可见的 contenteditable 元素
            if (element.offsetParent === null) return false;
            const isContentEditable = element.getAttribute('contenteditable') === 'true';
            const isTextbox = element.getAttribute('role') === 'textbox';
            // 排除脚本自身的 UI
            if (element.closest('#gemini-helper-panel')) return false;

            return isContentEditable || isTextbox || element.classList.contains('ql-editor');
        }

        insertPrompt(content) {
            const editor = this.textarea;
            if (!editor) return false;

            editor.focus();
            try {
                // 先全选
                document.execCommand('selectAll', false, null);
                // 然后插入新内容
                const success = document.execCommand('insertText', false, content);
                if (!success) {
                    throw new Error('execCommand returned false');
                }
            } catch (e) {
                // 降级方案：直接替换内容，不叠加
                editor.textContent = content;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                editor.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
        }

        clearTextarea() {
            if (this.textarea) {
                this.textarea.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
            }
        }

        getResponseContainerSelector() {
            return 'infinite-scroller.chat-history';
        }

        getChatContentSelectors() {
            return ['.model-response-container', 'model-response', '.response-container', '[data-message-id]', 'message-content'];
        }

        extractOutline(maxLevel = 6) {
            const outline = [];
            const container = document.querySelector(this.getResponseContainerSelector());
            if (!container) return outline;

            // Gemini 使用标准的 h1-h6 标签，带有 data-path-to-node 属性
            const headingSelectors = [];
            for (let i = 1; i <= maxLevel; i++) {
                headingSelectors.push(`h${i}`);
            }

            const headings = container.querySelectorAll(headingSelectors.join(', '));
            headings.forEach((heading) => {
                const level = parseInt(heading.tagName.charAt(1), 10);
                if (level <= maxLevel) {
                    outline.push({
                        level,
                        text: heading.textContent.trim(),
                        element: heading,
                    });
                }
            });

            return outline;
        }

        /**
         * 检测 AI 是否正在生成响应
         * Gemini 标准版：检查输入框右下角是否显示停止图标
         * @returns {boolean}
         */
        isGenerating() {
            // 检查是否存在 fonticon="stop" 的 mat-icon（停止按钮）
            const stopIcon = document.querySelector('mat-icon[fonticon="stop"]');
            if (stopIcon && stopIcon.offsetParent !== null) {
                return true;
            }
            return false;
        }

        /**
         * 获取当前使用的模型名称
         * Gemini 标准版：从页面 UI 中提取模型名称
         * @returns {string|null}
         */
        getModelName() {
            // 从 .input-area-switch-label 的第一个 span 获取模型名称
            const switchLabel = document.querySelector('.input-area-switch-label');
            if (switchLabel) {
                const firstSpan = switchLabel.querySelector('span');
                if (firstSpan && firstSpan.textContent) {
                    const text = firstSpan.textContent.trim();
                    if (text.length > 0 && text.length <= 20) {
                        return text;
                    }
                }
            }
            return null;
        }

        // ============= 网络监控配置（用于后台任务完成检测） =============

        /**
         * Gemini 普通版的网络监控配置
         * 由于浏览器对后台标签页的 DOM 渲染节流，需要通过 Hook Fetch 从网络层检测任务完成
         */
        getNetworkMonitorConfig() {
            return {
                // 注意：不要使用 batchexecute，它是通用 RPC 方法，会在后台频繁调用
                urlPatterns: ['BardFrontendService', 'StreamGenerate'],
                silenceThreshold: 3000,
            };
        }

        // ============= 模型锁定配置 =============
        getDefaultLockSettings() {
            return { enabled: false, keyword: '' };
        }

        getModelSwitcherConfig(keyword) {
            return {
                targetModelKeyword: keyword,
                // 尝试匹配 Gemini 普通版的模型选择器
                selectorButtonSelectors: ['.input-area-switch-label', '.model-selector', '[data-test-id="model-selector"]', '[aria-label*="model"]', 'button[aria-haspopup="menu"]'],
                menuItemSelector: '.mode-title, [role="menuitem"], [role="option"]',
                checkInterval: 1000,
                maxAttempts: 15,
                menuRenderDelay: 300,
            };
        }
    }

    /**
     * Gemini Business 适配器（business.gemini.google）
     */
    class GeminiBusinessAdapter extends SiteAdapter {
        match() {
            return window.location.hostname.includes('business.gemini.google');
        }

        getSiteId() {
            return 'gemini-business';
        }

        getName() {
            return 'Enterprise';
        }

        getThemeColors() {
            return { primary: '#4285f4', secondary: '#34a853' };
        }

        getNewTabUrl() {
            return 'https://business.gemini.google';
        }

        supportsTabRename() {
            return true;
        }

        isNewConversation() {
            return !window.location.pathname.includes('/session/');
        }

        /**
         * 获取当前会话名称（用于标签页重命名）
         * 从 Shadow DOM 中的侧边栏获取当前活动会话的标题
         * @returns {string|null}
         */
        getSessionName() {
            // DOMToolkit 在 Shadow DOM 穿透时，复杂后代选择器可能不生效
            // 所以遍历所有会话，找到活动的那个
            const conversations = DOMToolkit.query('.conversation', { all: true, shadow: true });

            for (const conv of conversations) {
                const button = conv.querySelector('button.list-item') || conv.querySelector('button');
                if (!button) continue;

                // 检查是否为活动会话
                const isActive = button.classList.contains('selected') || button.classList.contains('active') || button.getAttribute('aria-selected') === 'true';

                if (isActive) {
                    const titleEl = button.querySelector('.conversation-title');
                    if (titleEl) {
                        const name = titleEl.textContent?.trim();
                        if (name) return name;
                    }
                }
            }

            // 回退到基类默认实现（从 document.title 提取）
            return super.getSessionName();
        }

        /**
         * 获取当前的团队
         */
        getCurrentCid() {
            const currentPath = window.location.pathname;
            const cidMatch = currentPath.match(/\/home\/cid\/([^\/]+)/);
            return cidMatch ? cidMatch[1] : '';
        }

        /**
         * 从侧边栏提取会话列表
         * @returns {Array<{id: string, title: string, url: string, isActive: boolean}>}
         */
        getConversationList() {
            // 1. 获取当前 Team ID (CID)
            let cid = this.getCurrentCid();

            // 2. 查找会话列表
            // 注意：DOMToolkit 在 Shadow DOM 穿透时，后代选择器可能不生效
            // 所以使用简单选择器 + 后续过滤来排除智能体
            const items = DOMToolkit.query('.conversation', { all: true, shadow: true });

            return Array.from(items)
                .map((el) => {
                    // 注意：DOMToolkit.query 使用 parent 参数，不是 root
                    const button = el.querySelector('button.list-item') || el.querySelector('button');
                    if (!button) return null;

                    // 从操作菜单按钮 ID 提取 Session ID
                    // 会话格式: menu-8823153884416423953 (纯数字)
                    // 智能体格式: menu-deep_research (包含字母/下划线)
                    const menuBtn = button.querySelector('.conversation-action-menu-button');
                    let id = '';
                    if (menuBtn && menuBtn.id && menuBtn.id.startsWith('menu-')) {
                        id = menuBtn.id.replace('menu-', '');
                    }

                    // 关键过滤：真正的会话 ID 是纯数字，智能体 ID 包含字母
                    // 例如：会话 ID = "452535969834780805"，智能体 ID = "deep_research"
                    if (!id || !/^\d+$/.test(id)) return null;

                    // 获取标题
                    const titleEl = button.querySelector('.conversation-title');
                    const title = titleEl ? titleEl.textContent.trim() : '';

                    const isActive = button.classList.contains('selected') || button.classList.contains('active') || button.getAttribute('aria-selected') === 'true';

                    // 构建完整 URL
                    // 格式: https://business.gemini.google/home/cid/{cid}/r/session/{id}
                    let url = `https://business.gemini.google/session/${id}`; // 默认(如果没 cid)
                    if (cid) {
                        url = `https://business.gemini.google/home/cid/${cid}/r/session/${id}`;
                    }

                    return {
                        id: id,
                        title: title,
                        url: url,
                        isActive: isActive,
                        cid: cid,
                    };
                })
                .filter((c) => c); // 过滤掉 null
        }

        /**
         * 获取侧边栏可滚动容器
         * @returns {Element|null}
         */
        getSidebarScrollContainer() {
            return DOMToolkit.query('.conversation-list', { shadow: true }) || DOMToolkit.query('mat-sidenav', { shadow: true });
        }

        /**
         * 获取会话观察器配置（用于侧边栏实时监听）
         */
        getConversationObserverConfig() {
            const self = this;
            return {
                selector: '.conversation',
                shadow: true,
                extractInfo: (el) => {
                    const button = el.querySelector('button.list-item') || el.querySelector('button');
                    if (!button) return null;

                    const menuBtn = button.querySelector('.conversation-action-menu-button');
                    if (!menuBtn || !menuBtn.id?.startsWith('menu-')) return null;

                    const id = menuBtn.id.replace('menu-', '');
                    if (!/^\d+$/.test(id)) return null; // 排除智能体

                    const titleEl = button.querySelector('.conversation-title');
                    const title = titleEl?.textContent?.trim() || '';

                    const cid = self.getCurrentCid();
                    let url = `https://business.gemini.google/home/cid/${cid}/r/session/${id}`;

                    return { id, title, url, cid };
                },
                getTitleElement: (el) => {
                    const button = el.querySelector('button.list-item') || el.querySelector('button');
                    return button?.querySelector('.conversation-title') || el;
                },
            };
        }

        /**
         * 加载所有会话
         * 通过点击"展开"按钮来加载更多会话，而不是滚动
         * @returns {Promise<void>}
         */
        async loadAllConversations() {
            let expandedCount = 0;
            const maxIterations = 20; // 防止无限循环

            for (let i = 0; i < maxIterations; i++) {
                // 查找所有按钮（穿透 Shadow DOM）
                const allBtns = DOMToolkit.query('button.show-more', { all: true, shadow: true }) || [];

                // 过滤出未展开的按钮（icon 没有 more-visible class）
                const expandBtns = allBtns.filter((btn) => {
                    const icon = btn.querySelector('.show-more-icon');
                    // 已展开的按钮 icon 有 more-visible class
                    return icon && !icon.classList.contains('more-visible');
                });

                if (expandBtns.length === 0) {
                    break; // 没有更多需要展开的按钮
                }

                // 点击所有展开按钮
                for (const btn of expandBtns) {
                    btn.click();
                    expandedCount++;
                }

                // 等待会话加载
                await new Promise((r) => setTimeout(r, 300));
            }

            if (expandedCount > 0) {
                console.log(`[GeminiBusinessAdapter] 展开了 ${expandedCount} 个会话分组`);
            }
        }

        // 排除侧边栏 (mat-sidenav, mat-drawer) 中的 Shadow DOM
        shouldInjectIntoShadow(host) {
            if (host.closest('mat-sidenav') || host.closest('mat-drawer') || host.closest('[class*="bg-sidebar"]')) return false;
            return true;
        }

        getNewChatButtonSelectors() {
            return ['.chat-button.list-item', 'button[aria-label="New chat"]', 'button[aria-label="新对话"]'];
        }

        getWidthSelectors() {
            // 辅助函数：生成带 scoped globalSelector 的配置
            // noCenter: 不添加 margin-left/right: auto（用于容器类元素）
            const config = (selector, value, extraCss, noCenter = false) => ({
                selector,
                globalSelector: `mat-sidenav-content ${selector}`, // 全局样式只针对主内容区
                property: 'max-width',
                value,
                extraCss,
                noCenter,
            });

            return [
                // 容器强制 100%，不需要居中（它们应该填充可用空间）
                config('mat-sidenav-content', '100%', undefined, true),
                config('.main.chat-mode', '100%', undefined, true),

                // 内容区域跟随配置（需要居中）
                config('ucs-summary'),
                config('ucs-conversation'),
                config('ucs-search-bar'),
                config('.summary-container.expanded'),
                config('.conversation-container'),

                // 输入框容器：不居中，使用 left/right 定位
                config('.input-area-container', undefined, 'left: 0 !important; right: 0 !important;', true),
            ];
        }

        getTextareaSelectors() {
            return ['div.ProseMirror', '.ProseMirror', '[contenteditable="true"]:not([type="search"])', '[role="textbox"]', 'textarea:not([type="search"])'];
        }

        getSubmitButtonSelectors() {
            return ['button[aria-label*="Submit"]', 'button[aria-label*="提交"]', '.send-button', '[data-testid*="send"]'];
        }

        isValidTextarea(element) {
            // 排除搜索框
            if (element.type === 'search') return false;
            if (element.classList.contains('main-input')) return false;
            if (element.getAttribute('aria-label')?.includes('搜索')) return false;
            if (element.placeholder?.includes('搜索')) return false;
            // 排除脚本自己的 UI
            if (element.classList.contains('prompt-search-input')) return false;
            if (element.id === 'prompt-search') return false;
            if (element.closest('#gemini-helper-panel')) return false;

            // 必须是 contenteditable 或者 ProseMirror
            const isVisible = element.offsetParent !== null;
            const isContentEditable = element.getAttribute('contenteditable') === 'true';
            const isProseMirror = element.classList.contains('ProseMirror');
            return isVisible && (isContentEditable || isProseMirror || element.tagName === 'TEXTAREA');
        }

        findTextarea() {
            // 使用 DOMToolkit.query + filter 在 Shadow DOM 中查找
            // filter 参数实现了 isValidTextarea 的验证逻辑
            const element = DOMToolkit.query(this.getTextareaSelectors(), {
                shadow: true,
                filter: (el) => this.isValidTextarea(el),
            });

            if (element) {
                this.textarea = element;
                return element;
            }
            return super.findTextarea();
        }

        insertPrompt(content) {
            return new Promise((resolve) => {
                const tryInsert = () => {
                    // 重新获取一下，以防切页面后元素失效
                    const editor = this.textarea || this.findTextarea();

                    if (!editor) {
                        console.warn('GeminiBusinessAdapter: Editor not found during insert.');
                        resolve(false);
                        return;
                    }

                    this.textarea = editor; // 更新引用
                    editor.click();
                    editor.focus();

                    // 等待一小段时间后尝试插入
                    setTimeout(() => {
                        try {
                            // 先全选
                            document.execCommand('selectAll', false, null);
                            // 插入新内容
                            const success = document.execCommand('insertText', false, content);
                            if (!success) throw new Error('execCommand returned false');
                            resolve(true);
                        } catch (e) {
                            // 方法2: 直接操作 DOM (降级方案)
                            let p = editor.querySelector('p');
                            if (!p) {
                                p = document.createElement('p');
                                editor.appendChild(p);
                            }

                            p.textContent = content;

                            // 触发各种事件以通知 ProseMirror 更新
                            const inputEvent = new InputEvent('input', {
                                bubbles: true,
                                cancelable: true,
                                inputType: 'insertText',
                                data: content,
                            });
                            editor.dispatchEvent(inputEvent);
                            editor.dispatchEvent(new Event('change', { bubbles: true }));

                            // 尝试触发 keyup 事件
                            editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                            resolve(true);
                        }
                    }, 100);
                };

                if (this.textarea && document.body.contains(this.textarea)) {
                    tryInsert();
                } else {
                    // 轮询等待元素出现
                    let attempts = 0;
                    const maxAttempts = 15;
                    const checkInterval = setInterval(() => {
                        attempts++;
                        if (this.findTextarea()) {
                            clearInterval(checkInterval);
                            tryInsert();
                        } else if (attempts >= maxAttempts) {
                            clearInterval(checkInterval);
                            resolve(false);
                        }
                    }, 500);
                }
            });
        }

        clearTextarea() {
            if (this.textarea) {
                this.textarea.focus();
                document.execCommand('selectAll', false, null);
                // 插入零宽空格替换旧内容（修复中文输入首字母问题）
                document.execCommand('insertText', false, '\u200B');
            }
        }

        // 普通清空（不插入零宽字符）
        clearTextareaNormal() {
            if (this.textarea) {
                this.textarea.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
            }
        }

        afterPropertiesSet(options = {}) {
            // 保存配置状态供其他方法使用
            this.clearOnInit = options.clearOnInit;

            // 1. 调用基类通用逻辑（处理模型锁定）
            super.afterPropertiesSet(options);

            // 2. 处理企业版特有的初始化清除（如果未启用模型锁定或模型已锁定，这里先执行一次以防万一）
            // 注意：如果 trigger 了 lockModel，lockModel 回调里会再次执行。
            if (this.clearOnInit) {
                this.clearTextarea();
            }
        }

        // 覆盖 lockModel 以处理锁定后的清理
        lockModel(keyword, onSuccess = null) {
            super.lockModel(keyword, () => {
                // 执行传入的回调
                if (onSuccess) onSuccess();

                // 执行企业版特定的清理：锁定模型后，重新插入零宽字符修复中文输入
                // 这里的延迟是为了等待 UI 刷新（切换模型会导致输入框重建或重置）
                if (this.clearOnInit) {
                    setTimeout(() => this.clearTextarea(), 300);
                }
            });
        }

        /**
         * 检测 AI 是否正在生成响应
         * Gemini Business：检查 Shadow DOM 中的 "Stop" 按钮或 loading 指示器
         * @returns {boolean}
         */
        isGenerating() {
            // 递归在 Shadow DOM 中搜索
            const findInShadow = (root, depth = 0) => {
                if (depth > 10) return false;

                // 检查当前层级
                const stopButton = root.querySelector('button[aria-label*="Stop"], button[aria-label*="停止"], ' + '[data-test-id="stop-button"], .stop-button, md-icon-button[aria-label*="Stop"]');
                if (stopButton && stopButton.offsetParent !== null) {
                    return true;
                }

                const spinner = root.querySelector('mat-spinner, md-spinner, .loading-spinner, [role="progressbar"], ' + '.generating-indicator, .response-loading');
                if (spinner && spinner.offsetParent !== null) {
                    return true;
                }

                // 递归搜索 Shadow DOM
                const elements = root.querySelectorAll('*');
                for (const el of elements) {
                    if (el.shadowRoot) {
                        if (findInShadow(el.shadowRoot, depth + 1)) {
                            return true;
                        }
                    }
                }
                return false;
            };

            return findInShadow(document);
        }

        /**
         * 获取当前使用的模型名称
         * Gemini Business：从 Shadow DOM 中提取模型名称
         * @returns {string|null}
         */
        getModelName() {
            // 递归在 Shadow DOM 中搜索模型选择器
            const findInShadow = (root, depth = 0) => {
                if (depth > 10) return null;

                // 检查模型选择器
                const modelSelectors = ['#model-selector-menu-anchor', '.action-model-selector', '.model-selector', '[data-test-id="model-selector"]', '.current-model'];

                for (const selector of modelSelectors) {
                    const el = root.querySelector(selector);
                    if (el && el.textContent) {
                        const text = el.textContent.trim();
                        // 提取模型关键字（支持带版本号的如"2.5 Pro"，也支持不带版本号的如"自动"）
                        const modelMatch = text.match(/(\d+\.?\d*\s*)?(Pro|Flash|Ultra|Nano|Gemini|auto|自动)/i);
                        if (modelMatch) {
                            return modelMatch[0].trim();
                        }
                        if (text.length <= 20 && text.length > 0) {
                            return text;
                        }
                    }
                }

                // 递归搜索 Shadow DOM
                const elements = root.querySelectorAll('*');
                for (const el of elements) {
                    if (el.shadowRoot) {
                        const result = findInShadow(el.shadowRoot, depth + 1);
                        if (result) return result;
                    }
                }
                return null;
            };

            return findInShadow(document);
        }

        // ============= 模型锁定配置 =============

        getDefaultLockSettings() {
            return { enabled: true, keyword: '3 Pro' };
        }

        getModelSwitcherConfig(keyword) {
            return {
                targetModelKeyword: keyword || '3 Pro',
                selectorButtonSelectors: ['#model-selector-menu-anchor', '.action-model-selector'],
                menuItemSelector: 'md-menu-item',
                checkInterval: 1500,
                maxAttempts: 20,
                menuRenderDelay: 500,
            };
        }

        getResponseContainerSelector() {
            // Gemini Business 使用 Shadow DOM，返回空字符串表示需要特殊处理
            return '';
        }

        getChatContentSelectors() {
            return [
                '.model-response-container',
                '.message-content',
                '[data-message-id]', // 常见消息标识
                'ucs-conversation-message', // 企业版特定
                '.conversation-message',
            ];
        }

        extractOutline(maxLevel = 6) {
            const outline = [];
            // 在 Shadow DOM 中递归查找所有标题
            this.findHeadingsInShadowDOM(document, outline, maxLevel, 0);
            return outline;
        }

        // 在 Shadow DOM 中递归查找标题
        findHeadingsInShadowDOM(root, outline, maxLevel, depth) {
            if (depth > 15) return;

            // 在当前层级查找标题（h1-h6）
            if (root !== document) {
                const headingSelector = Array.from({ length: maxLevel }, (_, i) => `h${i + 1}`).join(', ');
                try {
                    const headings = root.querySelectorAll(headingSelector);
                    headings.forEach((heading) => {
                        // 只匹配包含 data-markdown-start-index 的标题（排除 logo 等非 AI 回复内容）
                        // 标题内可能包含多个 span，需要遍历所有 span 并拼接文本
                        const spans = heading.querySelectorAll('span[data-markdown-start-index]');
                        if (spans.length > 0) {
                            const level = parseInt(heading.tagName[1], 10);
                            const text = Array.from(spans)
                                .map((s) => s.textContent.trim())
                                .join('');
                            if (text) {
                                outline.push({ level, text, element: heading });
                            }
                        }
                    });
                } catch (e) {
                    // 忽略选择器错误
                }
            }

            // 递归查找 Shadow DOM
            const allElements = root.querySelectorAll('*');
            for (const el of allElements) {
                if (el.shadowRoot) {
                    this.findHeadingsInShadowDOM(el.shadowRoot, outline, maxLevel, depth + 1);
                }
            }
        }

        /**
         * 模拟点击原生设置切换主题 (针对 Gemini Business)
         * @param {'light'|'dark'} targetMode
         */
        async toggleTheme(targetMode) {
            console.log(`[GeminiBusinessAdapter] Attempting to switch theme to: ${targetMode}`);

            // 1. 启动暴力隐身模式 (JS 每一帧强制隐藏)
            // CSS 注入可能因优先级或 Shadow DOM 隔离失效，JS 强制修改内联样式是最稳妥的
            let stopSuppression = false;
            const suppressMenu = () => {
                if (stopSuppression) return;

                // 查找所有可能的菜单容器
                try {
                    const menus = DOMToolkit.query('.menu[popover], md-menu-surface, .mat-menu-panel, [role="menu"]', { all: true, shadow: true });
                    menus.forEach((el) => {
                        // 强制隐藏，不留余地
                        if (el.style.opacity !== '0') {
                            el.style.setProperty('opacity', '0', 'important');
                            el.style.setProperty('visibility', 'hidden', 'important');
                            el.style.setProperty('pointer-events', 'none', 'important');
                        }
                    });
                } catch (e) {
                    // Ignore errors during suppression
                }

                requestAnimationFrame(suppressMenu);
            };
            suppressMenu();

            // 全局也加一个保险
            document.body.classList.add('gh-stealth-mode');

            try {
                // 2. 找到并点击设置按钮
                const settingsBtn = DOMToolkit.query('#settings-menu-anchor', { shadow: true });

                if (!settingsBtn) {
                    console.error('[GeminiBusinessAdapter] Settings button not found (#settings-menu-anchor)');
                    const fallbackBtn = DOMToolkit.query('.setting-btn', { shadow: true });
                    if (fallbackBtn) {
                        if (typeof fallbackBtn.click === 'function') fallbackBtn.click();
                        else fallbackBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    } else {
                        return false;
                    }
                } else {
                    if (typeof settingsBtn.click === 'function') {
                        settingsBtn.click();
                    } else {
                        settingsBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    }
                }

                // 3. 等待菜单弹出并点击目标
                let attempts = 0;
                const findAndClickOption = () => {
                    const targetIcon = targetMode === 'dark' ? 'dark_mode' : 'light_mode';

                    // Query all md-primary-tab in the document
                    const tabs = DOMToolkit.query('md-primary-tab', { all: true, shadow: true });

                    for (const tab of tabs) {
                        const icon = tab.querySelector('md-icon') || DOMToolkit.query('md-icon', { root: tab, shadow: true });
                        if (icon && icon.textContent.trim() === targetIcon) {
                            console.log(`[GeminiBusinessAdapter] Found target option: ${targetIcon}`);
                            tab.click();
                            return true;
                        }
                    }
                    return false;
                };

                return await new Promise((resolve) => {
                    const interval = setInterval(() => {
                        attempts++;
                        if (findAndClickOption()) {
                            clearInterval(interval);
                            resolve(true);
                        } else if (attempts > 20) {
                            // Timeout 2s
                            clearInterval(interval);
                            console.error('[GeminiBusinessAdapter] Target theme option not found');
                            resolve(false);
                            // Try clicking settings again to close if failed
                            if (settingsBtn && typeof settingsBtn.click === 'function') settingsBtn.click();
                        }
                    }, 100);
                });
            } finally {
                // 停止暴力抑制
                stopSuppression = true;
                // 延迟移除隐身模式
                setTimeout(() => {
                    document.body.classList.remove('gh-stealth-mode');
                }, 200);
            }
        }
    }

    /**
     * 标签页重命名管理器
     * 根据当前对话名称自动更新浏览器标签页标题
     */
    class TabRenameManager {
        constructor(adapter, settings, i18nFunc = null) {
            this.adapter = adapter;
            this.settings = settings;
            this.t = i18nFunc || ((key) => key);
            this.lastSessionName = null;
            this.intervalId = null;
            this.networkMonitor = null;
            this.isRunning = false;

            // AI 生成状态（简化的状态机）
            // 'idle' | 'generating' | 'completed'
            this._aiState = 'idle';
            this._lastAiState = 'idle';
        }

        /**
         * 启动自动重命名
         */
        start() {
            if (this.isRunning) return;
            if (!this.adapter.supportsTabRename()) return;

            this.isRunning = true;
            this.updateTabName();

            // 启动网络监控（用于后台检测）
            this._networkConfig = this.adapter.getNetworkMonitorConfig?.();
            if (typeof NetworkMonitor !== 'undefined' && this._networkConfig) {
                this._initNetworkMonitor();
            }

            // 定时更新标签页标题
            const intervalMs = (this.settings.tabSettings?.renameInterval || 5) * 1000;
            this.intervalId = setInterval(() => this.updateTabName(), intervalMs);
        }

        /**
         * 初始化网络监控
         */
        _initNetworkMonitor() {
            if (this.networkMonitor || !this._networkConfig) return;

            this.networkMonitor = new NetworkMonitor({
                urlPatterns: this._networkConfig.urlPatterns,
                silenceThreshold: this._networkConfig.silenceThreshold || 3000,
                onStart: () => this._setAiState('generating'),
                onComplete: () => this._onAiComplete(),
            });
            this.networkMonitor.start();
        }

        /**
         * 设置 AI 状态
         */
        _setAiState(state) {
            this._lastAiState = this._aiState;
            this._aiState = state;
        }

        /**
         * AI 任务完成处理（由 NetworkMonitor 触发）
         */
        _onAiComplete() {
            const wasGenerating = this._aiState === 'generating';
            this._setAiState('completed');

            // 只在后台且之前正在生成时触发通知
            if (wasGenerating && document.hidden) {
                this._sendCompletionNotification();
            }

            // 强制更新标签页标题
            this.updateTabName(true);
        }

        /**
         * 发送完成通知
         */
        _sendCompletionNotification() {
            const tabSettings = this.settings.tabSettings || {};

            if (tabSettings.showNotification && typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: this.t('notificationTitle').replace('{site}', this.adapter.getName()),
                    text: this.lastSessionName || this.t('notificationBody'),
                    timeout: 5000,
                    onclick: () => window.focus(),
                });
            }

            if (tabSettings.autoFocus) {
                window.focus();
            }
        }

        /**
         * 获取当前是否正在生成
         */
        _isGenerating() {
            // 如果已确认完成，返回 false
            if (this._aiState === 'completed') return false;
            // 否则结合网络状态和 DOM 检测
            return this._aiState === 'generating' || this.adapter.isGenerating();
        }

        /**
         * 停止网络监控
         */
        _stopNetworkMonitor() {
            if (this.networkMonitor) {
                this.networkMonitor.stop();
                this.networkMonitor = null;
            }
        }

        /**
         * 停止自动重命名
         */
        stop() {
            if (!this.isRunning) return;

            this.isRunning = false;

            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }

            this._stopNetworkMonitor();
        }

        /**
         * 更新检测频率
         */
        setInterval(intervalSeconds) {
            if (!this.isRunning) return;

            const intervalMs = intervalSeconds * 1000;
            if (this.intervalId) {
                clearInterval(this.intervalId);
            }
            this.intervalId = setInterval(() => this.updateTabName(), intervalMs);
        }

        /**
         * 切换隐私模式
         */
        togglePrivacyMode() {
            const tabSettings = this.settings.tabSettings || {};
            tabSettings.privacyMode = !tabSettings.privacyMode;
            this.settings.tabSettings = tabSettings;
            this.updateTabName(true);
            return tabSettings.privacyMode;
        }

        /**
         * 更新标签页名称
         */
        updateTabName(force = false) {
            if (!this.adapter.supportsTabRename()) return;

            const tabSettings = this.settings.tabSettings || {};

            // 隐私模式
            if (tabSettings.privacyMode) {
                document.title = tabSettings.privacyTitle || 'Google';
                return;
            }

            // 获取会话名称（防止读取被污染的 title）
            const sessionName = this._getCleanSessionName(tabSettings);

            // 检查生成状态
            const isGenerating = this._isGenerating();

            // DOM 检测的状态变更通知（仅用于没有网络监控的站点）
            if (this._lastAiState === 'generating' && !isGenerating && document.hidden && this._aiState !== 'completed') {
                this._sendCompletionNotification();
            }
            this._lastAiState = isGenerating ? 'generating' : 'idle';

            // 构建标题
            const statusPrefix = tabSettings.showStatus !== false ? (isGenerating ? '⏳ ' : '✅ ') : '';

            const format = tabSettings.titleFormat || '{status}{title}';
            const modelName = format.includes('{model}') ? this.adapter.getModelName() || '' : '';

            let finalTitle = format
                .replace('{status}', statusPrefix)
                .replace('{title}', sessionName || this.adapter.getName())
                .replace('{model}', modelName ? `[${modelName}] ` : '')
                .replace(/\s+/g, ' ')
                .trim();

            if (finalTitle && (force || finalTitle !== document.title)) {
                document.title = finalTitle;
            }
        }

        /**
         * 获取干净的会话名称（过滤被污染的标题）
         */
        _getCleanSessionName(tabSettings) {
            // 新对话页面：清除旧会话标题，避免使用之前的标题
            if (this.adapter.isNewConversation()) {
                this.lastSessionName = null;
                return null;
            }

            let sessionName = this.adapter.getSessionName();

            // 检测污染
            const isPolluted = (name) => {
                if (!name) return false;
                if (/^[⏳✅]/.test(name)) return true;
                if (/\[[\w\s.]+\]/.test(name)) return true;
                if (name === (tabSettings.privacyTitle || 'Google')) return true;
                return false;
            };

            // 如果获取到有效且非污染的标题，更新缓存并返回
            if (sessionName && !isPolluted(sessionName)) {
                this.lastSessionName = sessionName;
                return sessionName;
            }

            // 否则返回缓存的标题（可能为 null）
            return this.lastSessionName;
        }

        /**
         * 获取当前状态
         */
        isActive() {
            return this.isRunning;
        }
    }

    /**
     * 站点注册表
     * 管理所有站点适配器，提供统一的访问接口
     */
    class SiteRegistry {
        constructor() {
            this.adapters = [];
            this.currentAdapter = null;
        }

        // 注册适配器
        register(adapter) {
            this.adapters.push(adapter);
        }

        // 检测并返回匹配的适配器
        detect() {
            for (const adapter of this.adapters) {
                if (adapter.match()) {
                    this.currentAdapter = adapter;
                    return adapter;
                }
            }
            return null;
        }

        // 获取当前适配器
        getCurrent() {
            return this.currentAdapter;
        }
    }

    // ==================== 核心逻辑 ====================

    // HTML 创建函数 (使用 DOMToolkit)
    function createElement(tag, properties = {}, textContent = '') {
        return DOMToolkit.create(tag, properties, textContent);
    }

    // 清空元素内容 (使用 DOMToolkit)
    function clearElement(element) {
        DOMToolkit.clear(element);
    }

    /**
     * 全局 Toast 提示函数
     * @param {string} message 提示信息
     * @param {number} duration 显示时长 (ms)
     */
    function showToast(message, duration = 2000) {
        const existing = document.querySelector('.gemini-toast');
        if (existing) existing.remove();
        const toast = createElement('div', { className: 'gemini-toast' }, message);
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * 页面宽度样式管理器
     * 负责动态注入和移除页面宽度样式
     */
    /**
     * 页面宽度样式管理器
     * 负责动态注入和移除页面宽度样式，支持 Shadow DOM
     */
    class WidthStyleManager {
        constructor(siteAdapter, widthConfig) {
            this.siteAdapter = siteAdapter;
            this.widthConfig = widthConfig;
            this.styleElement = null;
            this.processedShadowRoots = new WeakSet();
            this.observer = null;
            this.shadowCheckInterval = null;
        }

        apply() {
            // 1. 处理主文档样式
            if (this.styleElement) {
                this.styleElement.remove();
                this.styleElement = null;
            }

            const css = this.generateCSS();

            if (this.widthConfig && this.widthConfig.enabled) {
                this.styleElement = document.createElement('style');
                this.styleElement.id = 'gemini-helper-width-styles';
                this.styleElement.textContent = css;
                document.head.appendChild(this.styleElement);

                // 启动 Shadow DOM 注入逻辑
                this.startShadowInjection(css);
            } else {
                // 如果禁用了，也要清理 Shadow DOM 中的样式
                this.stopShadowInjection();
                this.clearShadowStyles();
            }
        }

        generateCSS() {
            const globalWidth = `${this.widthConfig.value}${this.widthConfig.unit}`;
            const selectors = this.siteAdapter.getWidthSelectors();
            return selectors
                .map((config) => {
                    const { selector, globalSelector, property, value, extraCss, noCenter } = config;
                    const params = {
                        finalWidth: value || globalWidth,
                        targetSelector: globalSelector || selector, // 优先使用全局特定选择器
                        property,
                        extra: extraCss || '',
                        centerCss: noCenter ? '' : 'margin-left: auto !important; margin-right: auto !important;',
                    };
                    return `${params.targetSelector} { ${params.property}: ${params.finalWidth} !important; ${params.centerCss} ${params.extra} }`;
                })
                .join('\n');
        }

        updateConfig(widthConfig) {
            this.widthConfig = widthConfig;
            this.apply();
        }

        // ============= Shadow DOM 支持 =============

        startShadowInjection(css) {
            // Shadow CSS 需要重新生成，因为不能使用带 ancestor 的 globalSelector
            // Shadow DOM 内部必须使用原始 selector，但包含同样的样式规则
            const shadowCss = this.generateShadowCSS();

            // 立即执行一次全量检查
            this.injectToAllShadows(shadowCss);

            // 使用定时器定期检查
            if (this.shadowCheckInterval) clearInterval(this.shadowCheckInterval);
            this.shadowCheckInterval = setInterval(() => {
                this.injectToAllShadows(shadowCss);
            }, 1000);
        }

        generateShadowCSS() {
            const globalWidth = `${this.widthConfig.value}${this.widthConfig.unit}`;
            const selectors = this.siteAdapter.getWidthSelectors();
            return selectors
                .map((config) => {
                    const { selector, property, value, extraCss, noCenter } = config;
                    // Shadow DOM 中只使用原始 selector (不带父级限定)，靠 JS 过滤来保证安全
                    const finalWidth = value || globalWidth;
                    const extra = extraCss || '';
                    const centerCss = noCenter ? '' : 'margin-left: auto !important; margin-right: auto !important;';
                    return `${selector} { ${property}: ${finalWidth} !important; ${centerCss} ${extra} }`;
                })
                .join('\n');
        }

        stopShadowInjection() {
            if (this.shadowCheckInterval) {
                clearInterval(this.shadowCheckInterval);
                this.shadowCheckInterval = null;
            }
        }

        injectToAllShadows(css) {
            if (!document.body) return;

            const siteAdapter = this.siteAdapter;
            const processedShadowRoots = this.processedShadowRoots;

            // 使用 DOMToolkit.walkShadowRoots 遍历所有 Shadow Root
            DOMToolkit.walkShadowRoots((shadowRoot, host) => {
                // 检查是否应该注入到该 Shadow DOM（通过 Adapter 过滤，例如排除侧边栏）
                if (host && !siteAdapter.shouldInjectIntoShadow(host)) {
                    return;
                }

                // 使用 DOMToolkit.cssToShadow 注入样式
                DOMToolkit.cssToShadow(shadowRoot, css, 'gemini-helper-width-shadow-style');
                processedShadowRoots.add(shadowRoot);
            });
        }

        clearShadowStyles() {
            if (!document.body) return;

            const processedShadowRoots = this.processedShadowRoots;

            // 使用 DOMToolkit.walkShadowRoots 遍历所有 Shadow Root
            DOMToolkit.walkShadowRoots((shadowRoot) => {
                const style = shadowRoot.getElementById('gemini-helper-width-shadow-style');
                if (style) style.remove();
                processedShadowRoots.delete(shadowRoot);
            });
        }
    }

    // ==================== 滚动锁定管理器 ====================
    /**
     * 滚动锁定管理器
     * 通过劫持原生滚动 API 和 MutationObserver 修正来实现防自动滚动
     */
    class ScrollLockManager {
        constructor(siteAdapter) {
            this.siteAdapter = siteAdapter;
            this.enabled = false;
            this.originalApis = null;
            this.observer = null;
            this.cleanupInterval = null;
            this.lastScrollY = window.scrollY;
        }

        setEnabled(enabled) {
            if (this.enabled === enabled) return;
            this.enabled = enabled;

            if (enabled) {
                this.enable();
            } else {
                this.disable();
            }
        }

        enable() {
            console.log('Gemini Helper: Enabling Scroll Lock System');
            this.hijackApis();
            this.startObserver();
            this.startScrollListener();
        }

        disable() {
            console.log('Gemini Helper: Disabling Scroll Lock System');
            this.restoreApis();
            this.stopObserver();
            this.stopScrollListener();
        }

        hijackApis() {
            if (this.originalApis) return; // 已经劫持

            // 保存原始 API
            this.originalApis = {
                scrollIntoView: Element.prototype.scrollIntoView,
                scrollTo: window.scrollTo,
                // 保存属性描述符以便恢复
                scrollTopDescriptor: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop') || Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop'),
            };

            const self = this;

            // 1. 劫持 Element.prototype.scrollIntoView
            Element.prototype.scrollIntoView = function (options) {
                // 检查是否包含绕过锁定的标志 (即使是 boolean or object)
                const shouldBypass = options && typeof options === 'object' && options.__bypassLock;

                if (self.enabled && self.shouldBlockScroll() && !shouldBypass) {
                    // console.log('Gemini Helper: Blocked scrollIntoView');
                    return;
                }
                // 移除自定义属性以防传给原生 API 报错（虽然通常不会）
                if (shouldBypass) {
                    // 克隆 options 以免修改原对象，或者直接删除 key
                    // 原生 scrollIntoView 会忽略未知属性
                }
                return self.originalApis.scrollIntoView.call(this, options);
            };

            // 2. 劫持 window.scrollTo
            window.scrollTo = function (x, y) {
                // 有时 y 可能是 options 对象
                let targetY = y;
                if (typeof x === 'object' && x !== null) {
                    targetY = x.top;
                }

                // 只有当向下大幅滚动时才拦截 (防止系统自动拉到底)
                // 阈值设为 50px，避免误杀微小调整
                if (self.enabled && self.shouldBlockScroll() && typeof targetY === 'number' && targetY > window.scrollY + 50) {
                    // console.log('Gemini Helper: Blocked window.scrollTo (Auto-scroll attempt)');
                    return;
                }
                return self.originalApis.scrollTo.apply(this, arguments);
            };

            // 3. 劫持 scrollTop setter (许多框架通过设置 scrollTop 来滚动)
            if (this.originalApis.scrollTopDescriptor) {
                Object.defineProperty(Element.prototype, 'scrollTop', {
                    get: function () {
                        return self.originalApis.scrollTopDescriptor.get ? self.originalApis.scrollTopDescriptor.get.call(this) : this.files; // fallback (impossible normally)
                    },
                    set: function (value) {
                        if (self.enabled && self.shouldBlockScroll() && value > this.scrollTop + 50) {
                            // console.log('Gemini Helper: Blocked scrollTop setter');
                            return;
                        }
                        if (self.originalApis.scrollTopDescriptor.set) {
                            self.originalApis.scrollTopDescriptor.set.call(this, value);
                        }
                    },
                    configurable: true,
                });
            }
        }

        restoreApis() {
            if (!this.originalApis) return;

            Element.prototype.scrollIntoView = this.originalApis.scrollIntoView;
            window.scrollTo = this.originalApis.scrollTo;

            if (this.originalApis.scrollTopDescriptor) {
                Object.defineProperty(Element.prototype, 'scrollTop', this.originalApis.scrollTopDescriptor);
            }

            this.originalApis = null;
        }

        // 判断是否应该阻止滚动
        // 核心逻辑：虽然功能开启，但如果用户已经滚到底部了，我们其实应该允许跟随（就像终端一样）
        // 不过根据用户需求，既然叫 "防止自动滚动"，还是激进一点：只要开启就尽量阻止非用户触发的大幅向下滚动
        shouldBlockScroll() {
            // 只有当我们不在底部时，才强力阻止？或者一直阻止？
            // 为了最好的体验：如果用户已经在底部，应该允许新内容把页面撑长，但不应该发生"跳跃"
            // 用户的脚本逻辑很简单：开启就阻止。我们保持一致。
            return true;
        }

        startScrollListener() {
            // 记录用户最后滚动位置，用于自动修正
            const onScroll = () => {
                // 如果是用户手动滚动（或者未被劫持的滚动），更新位置
                // 这里很难区分，但我们主要通过 MutationObserver 来回滚异常位置
                if (this.enabled) {
                    // 只有在未被拦截的情况下，我们才认为这是"合法"的位置更新
                    // 在 scroll 事件中很难拦截，只能事后修正
                    // 这里我们只更新 lastScrollY，具体修正在 Observer 中
                    this.lastScrollY = window.scrollY;
                }
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            this.onScrollHandler = onScroll;
        }

        stopScrollListener() {
            if (this.onScrollHandler) {
                window.removeEventListener('scroll', this.onScrollHandler);
                this.onScrollHandler = null;
            }
        }

        startObserver() {
            // 监听 DOM 变化，如果发现非用户意图的滚动跳变，强制回滚
            this.observer = new MutationObserver((mutations) => {
                if (!this.enabled) return;

                let hasNewContent = false;
                const contentSelectors = this.siteAdapter.getChatContentSelectors();
                if (contentSelectors.length === 0) return;

                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // 检查是否有新消息节点
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1) {
                                // Element
                                // 使用适配器提供的选择器判断
                                for (const sel of contentSelectors) {
                                    if ((node.matches && node.matches(sel)) || (node.querySelector && node.querySelector(sel))) {
                                        hasNewContent = true;
                                        break;
                                    }
                                }
                            }
                            if (hasNewContent) break;
                        }
                    }
                });

                if (hasNewContent) {
                    // 如果有新内容插入，立刻检查滚动位置是否发生了非预期的改变
                    // 这里的逻辑是：如果当前位置比记录的 lastScrollY 大了很多，说明发生了自动滚动
                    // 我们强制滚回去
                    const currentScroll = window.scrollY;
                    // 阈值 100px
                    if (currentScroll > this.lastScrollY + 100) {
                        // console.log('Gemini Helper: Detected unblocked auto-scroll, changing back.');
                        window.scrollTo(this.lastScrollY, 0); // 使用原始 API 已经被劫持，这里需要 bypass 吗？
                        // 实际上我们的劫持逻辑里 window.scrollTo 会调用 apply(this, arguments)，
                        // 但我们的劫持逻辑是阻止"向下"滚动。如果是"向上"回滚 (current > last, so set to last is moving up)，是被允许的。
                        // 稍微解释：lastScrollY 是 1000，current 是 2000。window.scrollTo(1000) 是向上，允许。
                        // 所以直接调用 window.scrollTo 即可。
                    }
                }
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });

            // 定时器保底
            this.cleanupInterval = setInterval(() => {
                if (this.enabled) {
                    const current = window.scrollY;
                    if (current > this.lastScrollY + 200) {
                        // 大幅跳变，回滚
                        window.scrollTo(this.lastScrollY, 0);
                    } else {
                        // 小幅变动，认为是合法阅读，更新基准（防止页面慢慢变长后滚不下去）
                        this.lastScrollY = current;
                    }
                }
            }, 500);
        }

        stopObserver() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }
        }
    }

    // ==================== 核心管理类 ====================

    /**
     * 滚动管理器
     * 抽象不同站点的滚动容器差异
     */
    class ScrollManager {
        constructor(siteAdapter) {
            this.siteAdapter = siteAdapter;
        }

        get container() {
            // 确保获取的是最新的容器实例
            return this.siteAdapter.getScrollContainer();
        }

        get scrollTop() {
            return this.container ? this.container.scrollTop : 0;
        }

        set scrollTop(val) {
            if (this.container) this.container.scrollTop = val;
        }

        get scrollHeight() {
            return this.container ? this.container.scrollHeight : 0;
        }

        get clientHeight() {
            return this.container ? this.container.clientHeight : 0;
        }

        scrollTo(options) {
            if (this.container) {
                try {
                    this.container.scrollTo(options);
                } catch (e) {
                    // 兼容部分旧浏览器不支持 options 对象
                    if (options.top !== undefined) {
                        this.container.scrollTop = options.top;
                    }
                }
            }
        }

        // 检查是否在底部区域
        isAtBottom(threshold = 100) {
            const c = this.container;
            if (!c) return false;
            return c.scrollHeight - c.scrollTop - c.clientHeight <= threshold;
        }
    }

    /**
     * 阅读进度管理器 (Auto-Resume)
     * 负责自动保存和恢复阅读位置
     */
    class ReadingProgressManager {
        constructor(settings, scrollManager, i18nFunc) {
            this.settings = settings; // 引用传递，保持最新
            this.scrollManager = scrollManager;
            this.t = i18nFunc;
            this.lastSaveTime = 0;
            this.isRecording = false; // 默认为 false，通过 startRecording 开启
        }

        startRecording() {
            if (this.isRecording) return;
            this.isRecording = true;

            this.scrollHandler = () => this.handleScroll();

            // 监听真正的滚动容器（各站点通过 SiteAdapter 适配）
            const container = this.scrollManager.container;
            if (container) {
                container.addEventListener('scroll', this.scrollHandler, { passive: true });
                this.listeningContainer = container; // 保存引用以便移除
            }
            // 同时保留 window 监听作为兜底（某些站点可能用 window 滚动）
            window.addEventListener('scroll', this.scrollHandler, { capture: true, passive: true });
        }

        stopRecording() {
            if (!this.isRecording) return;
            this.isRecording = false;
            if (this.scrollHandler) {
                // 移除容器监听
                if (this.listeningContainer) {
                    this.listeningContainer.removeEventListener('scroll', this.scrollHandler);
                    this.listeningContainer = null;
                }
                // 移除 window 监听
                window.removeEventListener('scroll', this.scrollHandler, { capture: true });
                this.scrollHandler = null;
            }
        }

        handleScroll() {
            if (!this.settings || !this.settings.readingHistory || !this.settings.readingHistory.persistence) return;

            const now = Date.now();
            if (now - this.lastSaveTime > 1000) {
                this.saveProgress();
                this.lastSaveTime = now;
            }
        }

        getKey() {
            // 使用 siteAdapter 提供的统一 Session ID，保持 Key 简洁且与其他功能逻辑一致
            const sessionId = this.scrollManager.siteAdapter.getSessionId();
            const siteId = this.scrollManager.siteAdapter.getSiteId();
            return `${siteId}:${sessionId}`;
        }

        saveProgress() {
            if (!this.isRecording) return;
            // 新对话页面不记录阅读历史
            if (this.scrollManager.siteAdapter.isNewConversation()) return;

            const scrollTop = this.scrollManager.scrollTop;
            if (scrollTop < 0) return;

            const key = this.getKey();

            // 获取基于内容的锚点信息 (增强准确性)
            let anchorInfo = {};
            try {
                if (this.scrollManager.siteAdapter.getVisibleAnchorElement) {
                    anchorInfo = this.scrollManager.siteAdapter.getVisibleAnchorElement();
                }
            } catch (err) {
                // console.error('Error getting visible anchor element:', err);
            }

            const data = {
                top: scrollTop,
                ts: Date.now(),
                ...(anchorInfo ? anchorInfo : {}),
            };

            const allData = GM_getValue('gemini_reading_progress', {});
            allData[key] = data;
            GM_setValue('gemini_reading_progress', allData);
        }

        /**
         * 恢复阅读进度 (包含智能回溯逻辑)
         * @param {Function} showToastFunc - 用于显示进度提示的回调
         * @returns {Promise<boolean>} 是否恢复成功
         */
        async restoreProgress(showToastFunc) {
            if (!this.settings.readingHistory.autoRestore) return false;

            const key = this.getKey();
            const allData = GM_getValue('gemini_reading_progress', {});
            const data = allData[key];

            if (!data) return false;

            // scrollManager.container 是 getter，每次访问自动获取最新容器
            const scrollContainer = this.scrollManager.container;
            if (!scrollContainer) return false;

            // 智能回溯恢复逻辑
            return new Promise((resolve) => {
                let historyLoadAttempts = 0;
                const maxHistoryLoadAttempts = 5;
                let lastScrollHeight = 0; // 用于检测历史是否加载成功

                const tryScroll = (attempts = 0) => {
                    if (attempts > 30) {
                        // 超过最大尝试次数，使用像素位置作为最终降级
                        if (data.top !== undefined && scrollContainer.scrollHeight >= data.top) {
                            this.scrollManager.scrollTo({ top: data.top, behavior: 'instant' });
                            this.restoredTop = data.top;
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                        return;
                    }

                    // 1. 尝试基于内容的精准恢复
                    let contentRestored = false;
                    try {
                        if (data.type && this.scrollManager.siteAdapter.restoreScroll) {
                            contentRestored = this.scrollManager.siteAdapter.restoreScroll(data);
                        }
                    } catch (err) {
                        console.error('Error restoring content anchor:', err);
                    }

                    if (contentRestored) {
                        // 内容恢复成功
                        this.restoredTop = scrollContainer.scrollTop;
                        resolve(true);
                        return;
                    }

                    // 2. 内容恢复失败，需要尝试加载更多历史
                    const currentScrollHeight = scrollContainer.scrollHeight;
                    const heightChanged = currentScrollHeight !== lastScrollHeight;
                    lastScrollHeight = currentScrollHeight;

                    // 判断是否需要/可以继续加载历史
                    const hasContentAnchor = data.type && (data.textSignature || data.selector);
                    const needsMoreHistory = hasContentAnchor || (data.top !== undefined && currentScrollHeight < data.top);
                    const canLoadMore = historyLoadAttempts < maxHistoryLoadAttempts;

                    if (needsMoreHistory && canLoadMore) {
                        // 触发历史加载
                        if (showToastFunc) showToastFunc(`正在加载历史会话 (${historyLoadAttempts + 1}/${maxHistoryLoadAttempts})...`);

                        // 滚动到顶部触发懒加载
                        this.scrollManager.scrollTo({ top: 0, behavior: 'instant' });

                        historyLoadAttempts++;
                        // 等待页面加载新内容
                        setTimeout(() => tryScroll(attempts + 1), 2000);
                    } else if (data.top !== undefined && currentScrollHeight >= data.top) {
                        // 没有内容锚点或已用尽回溯机会，但像素位置可用
                        this.scrollManager.scrollTo({ top: data.top, behavior: 'instant' });
                        this.restoredTop = data.top;
                        resolve(true);
                    } else if (!canLoadMore && hasContentAnchor) {
                        // 回溯机会用尽但仍有内容锚点，尝试最后一次快速重试
                        setTimeout(() => tryScroll(attempts + 1), 500);
                    } else {
                        // 无法恢复
                        resolve(false);
                    }
                };

                tryScroll();
            });
        }

        // 清理逻辑
        cleanup() {
            const lastRun = GM_getValue('gemini_progress_cleanup_last_run', 0);
            const now = Date.now();
            if (now - lastRun < 24 * 60 * 60 * 1000) return; // 每天一次

            const days = this.settings.readingHistory.cleanupDays || 7;
            if (days === -1) return;

            const expireTime = days * 24 * 60 * 60 * 1000;
            const allData = GM_getValue('gemini_reading_progress', {});
            let changed = false;

            Object.keys(allData).forEach((k) => {
                if (now - allData[k].ts > expireTime) {
                    delete allData[k];
                    changed = true;
                }
            });

            if (changed) GM_setValue('gemini_reading_progress', allData);
            GM_setValue('gemini_progress_cleanup_last_run', now);
        }
    }

    /**
     * 智能锚点管理器 (Smart Session Anchor)
     * 负责会话内的临时跳转锚点
     */
    /**
     * 智能锚点管理器 (Smart Session Anchor)
     * 负责会话内的临时跳转锚点
     */
    class AnchorManager {
        constructor(scrollManager, i18nFunc) {
            this.scrollManager = scrollManager;
            this.t = i18nFunc;
            // 双位置交换：类似 git switch -
            this.previousAnchor = null; // 上一个位置（跳转前）
            this.currentAnchor = null; // 当前锚点（跳转目标）
            this.onAnchorChange = null; // UI 更新回调
        }

        // 设置回调
        bindUI(callback) {
            this.onAnchorChange = callback;
        }

        // 获取当前位置的完整锚点信息
        _captureCurrentPosition() {
            let anchorInfo = {};
            try {
                if (this.scrollManager.siteAdapter.getVisibleAnchorElement) {
                    anchorInfo = this.scrollManager.siteAdapter.getVisibleAnchorElement();
                }
            } catch (err) {}

            return {
                top: this.scrollManager.scrollTop,
                ts: Date.now(),
                ...anchorInfo,
            };
        }

        // 记录锚点 (跳转前调用，保存当前位置)
        setAnchor(top) {
            let anchorInfo = {};
            try {
                if (this.scrollManager.siteAdapter.getVisibleAnchorElement) {
                    anchorInfo = this.scrollManager.siteAdapter.getVisibleAnchorElement();
                }
            } catch (err) {}

            // 保存当前位置为"上一个锚点"
            this.previousAnchor = {
                top: top,
                ts: Date.now(),
                ...anchorInfo,
            };

            if (this.onAnchorChange) this.onAnchorChange(true);
        }

        // 跳转到锚点（同时实现位置交换，支持来回跳转）
        backToAnchor() {
            if (!this.previousAnchor) return false;

            const scrollContainer = this.scrollManager.container;
            if (!scrollContainer) return false;

            // 1. 先保存当前位置（跳转后可以再跳回来）
            const currentPos = this._captureCurrentPosition();

            // 2. 尝试跳转到 previousAnchor
            let jumped = false;

            // 2.1 尝试基于内容的精准恢复
            try {
                if (this.previousAnchor.type && this.scrollManager.siteAdapter.restoreScroll) {
                    jumped = this.scrollManager.siteAdapter.restoreScroll(this.previousAnchor);
                }
            } catch (err) {
                console.error('Error restoring anchor:', err);
            }

            // 2.2 降级：像素位置
            if (!jumped && this.previousAnchor.top !== undefined) {
                this.scrollManager.scrollTo({ top: this.previousAnchor.top, behavior: 'smooth' });
                jumped = true;
            }

            if (jumped) {
                // 3. 交换位置：实现来回跳转
                // 原来的 previousAnchor 变成 currentAnchor（备用）
                // 刚才的位置变成新的 previousAnchor（下次跳回去）
                this.currentAnchor = this.previousAnchor;
                this.previousAnchor = currentPos;
            }

            return jumped;
        }

        // 检查是否有锚点
        hasAnchor() {
            return this.previousAnchor !== null;
        }

        // 重置锚点（用于会话切换）
        reset() {
            this.previousAnchor = null;
            this.currentAnchor = null;
            if (this.onAnchorChange) this.onAnchorChange(false);
        }
    }

    /**
     * 通用会话管理器
     * 负责会话列表的 UI 渲染、文件夹管理和交互
     * Phase 1: 骨架版本，仅显示占位内容
     */
    class ConversationManager {
        constructor(config) {
            this.container = config.container;
            this.settings = config.settings;
            this.siteAdapter = config.siteAdapter;
            this.t = config.i18n || ((k) => k);
            this.isActive = false;
            this.data = null; // 会话数据
            this.expandedFolderId = null; // 记忆当前展开的文件夹（手风琴模式，只展开一个）
            this.selectedIds = new Set(); // 批量选中的会话 ID
            this.batchMode = false; // 批量模式开关
            this.searchQuery = ''; // 搜索关键词
            this.searchResult = null; // 搜索结果 { folderMatches, conversationMatches, totalCount }

            this.init();
        }

        init() {
            this.loadData();
            this.createUI();
            this.startSidebarObserver();
        }

        /**
         * 启动侧边栏实时监听
         * 使用 DOMToolkit.each 监听新会话添加
         */
        startSidebarObserver() {
            if (this.sidebarObserverStop) return; // 已经在监听

            // 获取适配器提供的配置
            const config = this.siteAdapter.getConversationObserverConfig();
            if (!config) return; // 站点不支持侧边栏监听

            // 保存配置供其他方法使用
            this.observerConfig = config;

            // 延迟启动函数（等待侧边栏 DOM 加载完成）
            const startObserver = (retryCount = 0) => {
                const maxRetries = 5; // 最多重试5次
                const retryDelay = 1000; // 每次重试间隔1秒

                // 确定监听起点：始终使用最精确的容器，让 Observer 能监听 Shadow DOM 内部的变化
                const sidebarContainer = this.siteAdapter.getSidebarScrollContainer() || document;

                // 对于需要 Shadow DOM 穿透的站点，检查侧边栏容器是否已加载
                // 如果返回的是 document，说明没找到特定容器，可能还要等待 (除非原本就是 document)
                if (config.shadow && retryCount < maxRetries) {
                    const foundContainer = this.siteAdapter.getSidebarScrollContainer();
                    if (!foundContainer) {
                        // 侧边栏还未加载，延迟重试
                        setTimeout(() => startObserver(retryCount + 1), retryDelay);
                        return;
                    }
                }

                // 保存当前从属的容器，用于后续存活检测 (Zombie Check)
                this.observerContainer = sidebarContainer;

                // 侧边栏已加载或达到最大重试次数，开始监听
                this.sidebarObserverStop = DOMToolkit.each(
                    config.selector,
                    (el, isNew) => {
                        // 尝试提取 ID，如果失败则重试（因为新会话可能属性延迟生成）
                        const tryAdd = (retries = 5) => {
                            const info = config.extractInfo(el);

                            if (info?.id) {
                                // 仅对新发现的元素尝试添加到数据（如果是全新的会话）
                                if (isNew && !this.data.conversations[info.id]) {
                                    // 自动添加新会话到当前选中文件夹
                                    const folderId = this.data.lastUsedFolderId || 'inbox';
                                    this.data.conversations[info.id] = {
                                        id: info.id,
                                        siteId: this.siteAdapter.getSiteId(),
                                        cid: info.cid || null,
                                        title: info.title || 'New Conversation',
                                        url: info.url,
                                        folderId: folderId,
                                        createdAt: Date.now(),
                                        updatedAt: Date.now(),
                                    };
                                    this.saveData();
                                    // 轻量级更新计数（避免重建整个 UI 丢失展开状态）
                                    this.updateFolderCount(folderId);
                                }

                                // 对所有会话（无论新旧）启动标题变更监听
                                this.monitorConversationTitle(el, info.id);
                            } else if (retries > 0) {
                                setTimeout(() => tryAdd(retries - 1), 500);
                            }
                        };

                        tryAdd();
                    },
                    { parent: sidebarContainer, shadow: config.shadow },
                );
            };

            // 启动观察器
            startObserver();

            // 补充：仅对 Shadow DOM 站点启用轮询（Observer 可能因 DOM 复用/替换而失效）
            // 普通站点的 Observer 工作正常，无需轮询
            if (config.shadow) {
                this.pollNewConversations();
            }
        }

        /**
         * 检查侧边栏监听器是否仍然有效 (Zombie Check)
         * 如果容器被销毁（Detached），则重启监听器
         */
        checkObserverStatus() {
            // 如果监听器已停止，不需要检查
            if (!this.sidebarObserverStop) return;

            // 如果容器存在但已失去连接 (isConnected === false)，说明变成了僵尸监听器
            if (this.observerContainer && !this.observerContainer.isConnected) {
                console.log('Gemini Helper: Sidebar container detached. Restarting observer...');
                this.stopSidebarObserver();
                // 给予一点延迟等待新容器就绪
                setTimeout(() => this.startSidebarObserver(), 500);
            }
        }

        /**
         * 轮询检测新会话
         * 作为 MutationObserver 的补充机制
         */
        pollNewConversations() {
            if (this.pollInterval) return; // 已在轮询

            this.pollInterval = setInterval(() => {
                if (!this.observerConfig) return;

                const config = this.observerConfig;
                const elements = DOMToolkit.query(config.selector, { all: true, shadow: config.shadow });

                elements.forEach((el) => {
                    const info = config.extractInfo(el);
                    if (info?.id && !this.data.conversations[info.id]) {
                        // 发现未记录的会话
                        const folderId = this.data.lastUsedFolderId || 'inbox';
                        this.data.conversations[info.id] = {
                            id: info.id,
                            siteId: this.siteAdapter.getSiteId(),
                            cid: info.cid || null,
                            title: info.title || 'New Conversation',
                            url: info.url,
                            folderId: folderId,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };
                        this.saveData();
                        this.updateFolderCount(folderId);
                        // 启动标题监听
                        this.monitorConversationTitle(el, info.id);
                    }
                });
            }, 3000);
        }

        /**
         * 停止轮询
         */
        stopPolling() {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        }

        /**
         * 监听会话标题变化
         * 使用共享的 watchMultiple 减少 Observer 数量
         * @param {HTMLElement} el 会话元素
         * @param {string} id 会话ID
         */
        monitorConversationTitle(el, id) {
            // 防止重复监听
            if (el.dataset.ghTitleObserver) return;
            el.dataset.ghTitleObserver = 'true';

            // 使用配置获取正确的标题元素
            const titleEl = this.observerConfig?.getTitleElement?.(el) || el;

            // 确保共享 watcher 已初始化
            if (!this.titleWatcher) {
                const container = this.siteAdapter.getSidebarScrollContainer() || document.body;
                this.titleWatcher = DOMToolkit.watchMultiple(container, { debounce: 500 });
            }

            // 添加到共享监听器
            this.titleWatcher.add(titleEl, () => {
                // 每次回调时重新从元素提取 ID，确保 ID 匹配
                const currentInfo = this.observerConfig?.extractInfo?.(el);
                const currentId = currentInfo?.id;

                if (!currentId || currentId !== id) {
                    // ID 不匹配则跳过（防止元素被复用时错误更新）
                    return;
                }

                const currentTitle = titleEl.textContent?.trim();
                const stored = this.data.conversations[currentId];

                if (currentTitle && stored && stored.title !== currentTitle) {
                    console.log(`[Gemini Helper] Title changed for ${currentId}: "${stored.title}" -> "${currentTitle}". Updating local copy.`);

                    // 更新本地数据的标题
                    stored.title = currentTitle;
                    stored.updatedAt = Date.now();
                    this.saveData();

                    // 刷新 UI (更新显示)
                    this.createUI();
                }
            });
        }

        /**
         * 停止侧边栏监听
         */
        stopSidebarObserver() {
            if (this.sidebarObserverStop) {
                this.sidebarObserverStop();
                this.sidebarObserverStop = null;
            }
            // 清理容器引用
            this.observerContainer = null;

            // 清理共享的标题监听器
            if (this.titleWatcher) {
                this.titleWatcher.stop();
                this.titleWatcher = null;
            }
            // 清理轮询
            this.stopPolling();
        }

        /**
         * 轻量级更新文件夹计数（不重建 UI）
         * 同时刷新已展开文件夹的会话列表
         */
        updateFolderCount(folderId) {
            const folderItem = this.container?.querySelector(`.conversations-folder-item[data-folder-id="${folderId}"]`);
            if (folderItem) {
                // 获取当前 CID（仅 Gemini Business 有效）
                const currentCid = this.siteAdapter.getCurrentCid ? this.siteAdapter.getCurrentCid() : null;
                const count = Object.values(this.data.conversations).filter((c) => c.folderId === folderId && this.matchesCid(c, currentCid)).length;
                const countSpan = folderItem.querySelector('.conversations-folder-count');
                if (countSpan) countSpan.textContent = `(${count})`;

                // 如果该文件夹已展开，同时刷新会话列表
                if (folderItem.classList.contains('expanded')) {
                    const conversationList = this.container?.querySelector(`.conversations-list[data-folder-id="${folderId}"]`);
                    if (conversationList) {
                        this.renderConversationList(folderId, conversationList);
                    }
                }
            }
        }

        /**
         * 激活会话 Tab 时调用
         */
        activate() {
            this.isActive = true;
            this.syncConversations(null, true); // 切换进来时静默同步一次
            this.createUI();
        }

        /**
         * 停用会话 Tab 时调用
         */
        deactivate() {
            this.isActive = false;
        }

        /**
         * 获取全局存储键
         * 注意：文件夹和标签全局共用，会话通过 cid 字段区分不同团队
         */
        getStorageKey() {
            return SETTING_KEYS.CONVERSATIONS;
        }

        /**
         * 加载会话数据
         */
        loadData() {
            const key = this.getStorageKey();
            const saved = GM_getValue(key, null);
            if (saved) {
                this.data = { ...DEFAULT_CONVERSATION_DATA, ...saved };
            } else {
                this.data = JSON.parse(JSON.stringify(DEFAULT_CONVERSATION_DATA));
            }
        }

        /**
         * 保存会话数据
         */
        saveData() {
            const key = this.getStorageKey();
            GM_setValue(key, this.data);
        }

        /**
         * 上移文件夹
         * @param {string} folderId 文件夹 ID
         */
        moveFolderUp(folderId) {
            const index = this.data.folders.findIndex((f) => f.id === folderId);
            // index 0 是收件箱（固定），index 1 是第一个可移动的
            if (index <= 1) return;
            // 与上一个交换位置
            [this.data.folders[index - 1], this.data.folders[index]] = [this.data.folders[index], this.data.folders[index - 1]];
            this.saveData();
            this.createUI();
        }

        /**
         * 下移文件夹
         * @param {string} folderId 文件夹 ID
         */
        moveFolderDown(folderId) {
            const index = this.data.folders.findIndex((f) => f.id === folderId);
            if (index <= 0 || index >= this.data.folders.length - 1) return;
            // 与下一个交换位置
            [this.data.folders[index], this.data.folders[index + 1]] = [this.data.folders[index + 1], this.data.folders[index]];
            this.saveData();
            this.createUI();
        }

        /**
         * 创建文件夹
         * @param {string} name 文件夹名称
         * @param {string} icon 图标 emoji
         * @returns {object} 新创建的文件夹
         */
        createFolder(name, icon = '📁') {
            const folder = {
                id: 'folder_' + Date.now(),
                name: `${icon} ${name}`,
                icon: icon,
                isDefault: false,
            };
            this.data.folders.push(folder);
            this.saveData();
            return folder;
        }

        /**
         * 重命名文件夹
         * @param {string} folderId 文件夹 ID
         * @param {string} newName 新名称
         * @param {string} newIcon 新图标
         */
        renameFolder(folderId, newName, newIcon = null) {
            const folder = this.data.folders.find((f) => f.id === folderId);
            if (folder && !folder.isDefault) {
                folder.name = newIcon ? `${newIcon} ${newName}` : newName;
                if (newIcon) folder.icon = newIcon;
                this.saveData();
                return true;
            }
            return false;
        }

        /**
         * 删除文件夹
         * @param {string} folderId 文件夹 ID
         * @returns {boolean} 是否删除成功
         */
        deleteFolder(folderId) {
            const folder = this.data.folders.find((f) => f.id === folderId);
            if (!folder || folder.isDefault) {
                showToast(this.t('conversationsCannotDeleteDefault') || '无法删除默认文件夹');
                return false;
            }
            // 将文件夹内的会话移到收件箱
            Object.values(this.data.conversations).forEach((conv) => {
                if (conv.folderId === folderId) {
                    conv.folderId = 'inbox';
                }
            });
            this.data.folders = this.data.folders.filter((f) => f.id !== folderId);
            this.saveData();
            return true;
        }

        /**
         * 从侧边栏同步会话（增量）
         * @param {string} targetFolderId 可选，指定目标文件夹
         * @param {boolean} silent 是否静默同步（不显示 Toast）
         * @param {boolean} checkForDeletions 是否检查并删除失效会话（仅全量同步时启用）
         */
        syncConversations(targetFolderId = null, silent = false, checkForDeletions = false) {
            const sidebarItems = this.siteAdapter.getConversationList();

            if (!sidebarItems || sidebarItems.length === 0) {
                if (!silent) showToast(this.t('conversationsSyncEmpty') || '未找到会话');
                return;
            }

            // 获取当前 CID（仅 Gemini Business 有效）
            const currentCid = sidebarItems[0]?.cid || null;

            // 检查是否有已保存的会话（初次同步判断）
            // 注意：需要按当前 CID 过滤，避免其他团队的数据干扰判断
            const existingConvCount = Object.values(this.data.conversations).filter((c) => this.matchesCid(c, currentCid)).length;
            const isFirstSync = existingConvCount === 0;

            // 初次同步且未指定目标文件夹：弹窗让用户选择
            if (isFirstSync && !targetFolderId) {
                if (!silent) {
                    this.showFolderSelectDialog((selectedFolderId) => {
                        this.syncConversations(selectedFolderId, false);
                    });
                }
                return;
            }

            let newCount = 0;
            let updatedCount = 0;
            const now = Date.now();
            const folderId = targetFolderId || this.data.lastUsedFolderId || 'inbox';

            sidebarItems.forEach((item) => {
                // Key 始终用 sessionId（cid 和 siteId 存储在对象属性中）
                const storageKey = item.id;

                const existing = this.data.conversations[storageKey];
                if (existing) {
                    // 更新已有会话的标题（可能被用户修改）
                    if (existing.title !== item.title) {
                        existing.title = item.title;
                        existing.updatedAt = now;
                        updatedCount++;
                    }
                    // 确保 siteId 和 cid 是最新的
                    if (!existing.siteId) existing.siteId = this.siteAdapter.getSiteId();
                    if (item.cid && !existing.cid) existing.cid = item.cid;
                } else {
                    // 新会话：添加到指定文件夹
                    this.data.conversations[storageKey] = {
                        id: item.id,
                        siteId: this.siteAdapter.getSiteId(), // 记录所属站点
                        cid: item.cid || null, // 记录所属团队（Gemini Business）
                        title: item.title,
                        url: item.url,
                        folderId: folderId,
                        createdAt: now,
                        updatedAt: now,
                    };
                    newCount++;
                }
            });

            // 记住用户选择
            if (targetFolderId) {
                this.data.lastUsedFolderId = targetFolderId;
            }

            // 有变更才保存和刷新
            if (newCount > 0 || updatedCount > 0) {
                this.saveData();
                this.createUI();
            }

            // 检查已删除的会话（仅检查当前站点+CID 下的会话）
            if (checkForDeletions) {
                // 远程会话的 ID 集合
                const remoteIds = new Set(sidebarItems.map((item) => item.id));

                // 本地当前站点+CID 的会话 ID（通过对象属性过滤）
                const localIdsForCurrentContext = Object.entries(this.data.conversations)
                    .filter(([, conv]) => this.matchesCid(conv, currentCid))
                    .map(([key]) => key);

                // 找出本地有但远程没有的（当前站点+CID 范围内）
                const missingIds = localIdsForCurrentContext.filter((id) => !remoteIds.has(id));

                if (missingIds.length > 0) {
                    const msg = (this.t('conversationsSyncDeleteMsg') || '检测到 {count} 个会话已在云端删除，是否同步删除本地记录？').replace('{count}', missingIds.length);
                    this.showConfirmDialog(this.t('conversationsSyncDeleteTitle') || '同步删除', msg, () => {
                        missingIds.forEach((id) => delete this.data.conversations[id]);
                        this.saveData();
                        this.createUI();
                        showToast(`${this.t('conversationsDeleted') || '已移除'} ${missingIds.length}`);
                    });
                }
            }

            if (!silent) {
                if (newCount > 0 || updatedCount > 0) {
                    showToast(`${this.t('conversationsSynced') || '同步完成'}：+${newCount} ↻${updatedCount}`);
                } else {
                    showToast(this.t('conversationsSyncNoChange') || '无新会话');
                }
            }
        }

        /**
         * 检查会话是否属于当前站点和团队
         * @param {Object} conv 会话对象
         * @param {string|null} currentCid 当前团队 ID (Gemini Business)
         * @returns {boolean}
         */
        matchesCid(conv, currentCid) {
            // 1. 首先检查站点匹配
            const currentSiteId = this.siteAdapter.getSiteId();
            // 如果会话有 siteId 且不匹配当前站点，排除
            if (conv.siteId && conv.siteId !== currentSiteId) {
                return false;
            }

            // 2. 检查 CID 匹配
            // 如果当前无 CID（非 Gemini Business 或无团队），显示无 CID 的会话和旧数据
            if (!currentCid) return !conv.cid;
            // 如果会话没有 cid（旧数据），显示它
            if (!conv.cid) return true;
            // 否则严格匹配 CID
            return conv.cid === currentCid;
        }

        /**
         * 显示文件夹选择对话框
         */
        showFolderSelectDialog(onSelect) {
            const overlay = createElement('div', { className: 'conversations-dialog-overlay' });

            const dialog = createElement('div', { className: 'conversations-dialog' });
            dialog.appendChild(createElement('div', { className: 'conversations-dialog-title' }, this.t('conversationsSelectFolder') || '选择同步目标文件夹'));

            // 文件夹列表
            const list = createElement('div', { className: 'conversations-folder-select-list' });
            this.data.folders.forEach((folder) => {
                const item = createElement(
                    'div',
                    {
                        className: 'conversations-folder-select-item',
                        'data-folder-id': folder.id,
                    },
                    `${folder.icon} ${folder.name}`,
                );
                item.addEventListener('click', () => {
                    overlay.remove();
                    onSelect(folder.id);
                });
                list.appendChild(item);
            });
            dialog.appendChild(list);

            // 取消按钮
            const btns = createElement('div', { className: 'conversations-dialog-buttons' });
            const cancelBtn = createElement('button', { className: 'conversations-dialog-btn cancel' }, this.t('cancel') || '取消');
            cancelBtn.addEventListener('click', () => overlay.remove());
            btns.appendChild(cancelBtn);
            dialog.appendChild(btns);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        }

        /**
         * 显示确认对话框
         */
        showConfirmDialog(title, message, onConfirm) {
            const overlay = createElement('div', { className: 'conversations-dialog-overlay' });

            const dialog = createElement('div', { className: 'conversations-dialog' });
            dialog.appendChild(createElement('div', { className: 'conversations-dialog-title' }, title));

            const msgDiv = createElement('div', { className: 'conversations-dialog-message' }, message);
            dialog.appendChild(msgDiv);

            // 按钮
            const btns = createElement('div', { className: 'conversations-dialog-buttons' });

            const cancelBtn = createElement('button', { className: 'conversations-dialog-btn cancel' }, this.t('cancel') || '取消');
            cancelBtn.addEventListener('click', () => overlay.remove());
            btns.appendChild(cancelBtn);

            const confirmBtn = createElement('button', { className: 'conversations-dialog-btn confirm' }, this.t('confirm') || '确定');
            confirmBtn.addEventListener('click', () => {
                overlay.remove();
                onConfirm();
            });
            btns.appendChild(confirmBtn);

            dialog.appendChild(btns);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        }

        /**
         * 创建会话面板 UI
         */
        createUI() {
            const container = this.container;
            clearElement(container);

            const content = createElement('div', { className: 'conversations-content' });

            // 工具栏
            const toolbar = createElement('div', { className: 'conversations-toolbar' });

            // 1. 同步目标选择 (左侧)
            const folderSelect = createElement('select', {
                className: 'conversations-folder-select',
                id: 'conversations-folder-select',
                title: this.t('conversationsSelectFolder') || 'Select folder',
            });
            this.data.folders.forEach((folder) => {
                // 截断过长的文件夹名称，避免下拉菜单溢出
                const truncatedName = folder.name.length > 20 ? folder.name.slice(0, 20) + '...' : folder.name;
                const option = createElement('option', { value: folder.id, title: folder.name }, truncatedName);
                if (folder.id === (this.data.lastUsedFolderId || 'inbox')) {
                    option.selected = true;
                }
                folderSelect.appendChild(option);
            });
            folderSelect.addEventListener('change', () => {
                this.data.lastUsedFolderId = folderSelect.value;
                this.saveData();
            });
            toolbar.appendChild(folderSelect);

            // 定义局部 helper 创建 SVG
            const createSVG = (pathData) => {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.setAttribute('fill', 'currentColor');
                svg.setAttribute('width', '18');
                svg.setAttribute('height', '18');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                svg.appendChild(path);
                return svg;
            };

            const SYNC_PATH =
                'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z';
            const HOURGLASS_PATH = 'M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z';
            const CHECK_BOX_PATH = 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';

            // 2. 同步按钮 (紧跟下拉框)
            const syncBtn = createElement('button', {
                className: 'conversations-toolbar-btn sync',
                id: 'conversations-sync-btn',
                title: this.t('conversationsSync'),
                style: 'display: flex; align-items: center; justify-content: center;',
            });
            syncBtn.appendChild(createSVG(SYNC_PATH));
            syncBtn.addEventListener('click', async () => {
                syncBtn.disabled = true;
                clearElement(syncBtn);
                syncBtn.appendChild(createSVG(HOURGLASS_PATH));

                await this.siteAdapter.loadAllConversations();
                this.syncConversations(folderSelect.value, false, true);

                syncBtn.disabled = false;
                clearElement(syncBtn);
                syncBtn.appendChild(createSVG(SYNC_PATH));
            });
            toolbar.appendChild(syncBtn);

            // 3. 新建文件夹按钮 (右侧，仅图标)
            const addFolderBtn = createElement('button', {
                className: 'conversations-toolbar-btn add-folder',
                title: this.t('conversationsAddFolder') || 'New Folder',
                style: 'display: flex; align-items: center; justify-content: center;',
            });
            addFolderBtn.appendChild(createSVG('M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z'));
            addFolderBtn.addEventListener('click', () => this.showCreateFolderDialog());
            toolbar.appendChild(addFolderBtn);

            // 4. 批量模式按钮
            const batchModeBtn = createElement('button', {
                className: 'conversations-toolbar-btn batch-mode' + (this.batchMode ? ' active' : ''),
                title: this.t('conversationsBatchMode') || '批量操作',
                id: 'conversations-batch-mode-btn',
                style: 'display: flex; align-items: center; justify-content: center;',
            });
            batchModeBtn.appendChild(createSVG(CHECK_BOX_PATH));
            batchModeBtn.addEventListener('click', () => this.toggleBatchMode());
            toolbar.appendChild(batchModeBtn);

            content.appendChild(toolbar);

            // 搜索栏
            const searchBar = createElement('div', { className: 'conversations-search-bar' });
            const searchWrapper = createElement('div', { className: 'conversations-search-wrapper' });

            const searchInput = createElement('input', {
                type: 'text',
                className: 'conversations-search-input',
                id: 'conversations-search-input',
                placeholder: this.t('conversationsSearchPlaceholder') || '搜索会话...',
                value: this.searchQuery || '',
            });

            // 注入 placeholder 防选中样式
            const placeholderStyle = document.createElement('style');
            placeholderStyle.textContent = `
                .conversations-search-input::-webkit-input-placeholder { user-select: none; }
                .conversations-search-input::placeholder { user-select: none; }
            `;
            searchWrapper.appendChild(placeholderStyle);

            // 搜索输入防抖处理
            let searchTimeout = null;
            searchInput.addEventListener('input', () => {
                updateClearBtn();
                if (searchTimeout) clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(searchInput.value.trim());
                }, 150);
            });

            // Input Group (Input Only)
            const inputGroup = createElement('div', { className: 'conversations-search-input-group' });
            inputGroup.appendChild(searchInput);
            searchWrapper.appendChild(inputGroup);

            // 置顶筛选按钮
            const pinFilterBtn = createElement(
                'div',
                {
                    className: 'conversations-pin-filter-btn' + (this.filterPinned ? ' active' : ''),
                    title: this.t('conversationsFilterPinned') || '筛选置顶',
                    style: 'user-select: none;',
                },
                '📌',
            );
            pinFilterBtn.addEventListener('click', () => {
                this.filterPinned = !this.filterPinned;
                pinFilterBtn.classList.toggle('active', this.filterPinned);
                this.handleSearch(this.searchQuery || '');
                updateClearBtn();
            });
            searchWrapper.appendChild(pinFilterBtn);

            // 标签筛选按钮
            const isTagFiltering = this.filterTagIds && this.filterTagIds.size > 0;
            const tagFilterBtn = createElement(
                'div',
                {
                    className: 'conversations-tag-search-btn' + (this.data.tags && this.data.tags.length > 0 ? '' : ' empty') + (isTagFiltering ? ' active' : ''),
                    title: this.t('conversationsFilterByTags') || '按标签筛选',
                    style: 'user-select: none;',
                },
                '🏷️',
            );

            // ... tag filter event listener ...

            tagFilterBtn.addEventListener('click', (e) => {
                // ... existing implementation ...
                e.stopPropagation();

                const existingMenu = document.querySelector('.conversations-tag-filter-menu');
                if (existingMenu) {
                    existingMenu.remove();
                    return;
                }

                const menu = createElement('div', { className: 'conversations-tag-filter-menu', 'data-trigger': 'search-filter' });
                const list = createElement('div', { className: 'conversations-tag-filter-list' }); // Scrollable area

                // 清除选项
                if (this.filterTagIds && this.filterTagIds.size > 0) {
                    const clearItem = createElement('div', { className: 'conversations-tag-filter-item' });
                    clearItem.textContent = this.t('conversationsClearTags') || '清除筛选';
                    clearItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.filterTagIds.clear();
                        tagFilterBtn.classList.remove('active');
                        menu.remove();
                        this.handleSearch(this.searchQuery);
                        updateClearBtn();
                    });
                    list.appendChild(clearItem);
                }

                if (this.data.tags) {
                    this.data.tags.forEach((tag) => {
                        const item = createElement('div', { className: 'conversations-tag-filter-item' });
                        if (this.filterTagIds && this.filterTagIds.has(tag.id)) {
                            item.classList.add('selected');
                        }

                        const dot = createElement('span', { className: 'conversations-tag-dot', style: `background-color: ${tag.color}` });
                        item.appendChild(dot);

                        // Tag Name Span
                        const nameSpan = createElement('span');
                        nameSpan.textContent = tag.name;
                        item.appendChild(nameSpan);

                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (!this.filterTagIds) this.filterTagIds = new Set();

                            if (this.filterTagIds.has(tag.id)) {
                                this.filterTagIds.delete(tag.id);
                                item.classList.remove('selected');
                            } else {
                                this.filterTagIds.add(tag.id);
                                item.classList.add('selected');
                            }

                            if (this.filterTagIds.size > 0) tagFilterBtn.classList.add('active');
                            else tagFilterBtn.classList.remove('active');

                            this.handleSearch(this.searchQuery);
                            updateClearBtn();
                        });
                        list.appendChild(item);
                    });
                } else {
                    const emptyItem = createElement('div', { className: 'conversations-tag-filter-item', style: 'color:#9ca3af; cursor:default;' });
                    emptyItem.textContent = this.t('conversationsNoTags') || '暂无标签';
                    list.appendChild(emptyItem);
                }

                menu.appendChild(list);

                // Footer Area
                const footer = createElement('div', { className: 'conversations-tag-filter-footer' });

                const manageItem = createElement('div', { className: 'conversations-tag-filter-item conversations-tag-filter-action' });
                manageItem.textContent = this.t('conversationsManageTags') || '管理标签';
                manageItem.addEventListener('click', () => {
                    menu.remove();
                    this.showTagManagerDialog();
                });
                footer.appendChild(manageItem);
                menu.appendChild(footer);

                // IMPORTANT: Append to wrapper for relative positioning
                searchWrapper.appendChild(menu);

                // Click outside to close
                const closeMenu = (e) => {
                    if (!menu.contains(e.target) && e.target !== tagFilterBtn) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeMenu), 0);
            });
            searchWrapper.appendChild(tagFilterBtn);

            // 清空按钮 (Global Clear) - Moved to far right
            // Re-use clearBtn but change its element type/class logic
            const clearBtn = createElement(
                'div',
                {
                    className: 'conversations-search-clear', // Style updated in CSS
                    id: 'conversations-search-clear',
                    title: this.t('conversationsClearAll') || '清除所有筛选',
                },
                '×',
            );

            clearBtn.addEventListener('click', () => {
                if (clearBtn.classList.contains('disabled')) return;
                searchInput.value = '';
                if (this.filterTagIds) this.filterTagIds.clear();
                this.filterPinned = false;
                tagFilterBtn.classList.remove('active');
                pinFilterBtn.classList.remove('active');
                this.handleSearch('');
                updateClearBtn();
            });
            searchWrapper.appendChild(clearBtn);

            // Update clear button visibility helper
            const updateClearBtn = () => {
                const hasText = searchInput.value.length > 0;
                const hasTags = this.filterTagIds && this.filterTagIds.size > 0;
                const hasPinFilter = this.filterPinned;
                const hasFilter = hasText || hasTags || hasPinFilter;

                // Always visible but disabled if no filter
                clearBtn.classList.toggle('disabled', !hasFilter);
            };
            // Check initial state
            updateClearBtn();

            searchBar.appendChild(searchWrapper);

            // 搜索结果计数条
            const resultBar = createElement('div', {
                className: 'conversations-result-bar',
                id: 'conversations-result-bar',
            });
            if (this.searchQuery && this.searchResult) {
                resultBar.textContent = `${this.searchResult.totalCount} ${this.t('conversationsSearchResult') || '个结果'}`;
                resultBar.classList.add('visible');
            }
            searchBar.appendChild(resultBar);

            content.appendChild(searchBar);

            // 文件夹列表
            const folderList = this.createFolderListUI();
            content.appendChild(folderList);

            // 底部批量操作栏（仅批量模式下显示）
            if (this.batchMode) {
                const batchBar = createElement('div', { className: 'conversations-batch-bar', id: 'conversations-batch-bar' });
                // 根据选中数量决定是否显示
                batchBar.style.display = this.selectedIds.size > 0 ? 'flex' : 'none';

                const batchInfo = createElement(
                    'span',
                    { className: 'conversations-batch-info', id: 'conversations-batch-info' },
                    (this.t('batchSelected') || '已选 {n} 个').replace('{n}', this.selectedIds.size),
                );
                batchBar.appendChild(batchInfo);

                const batchBtns = createElement('div', { className: 'conversations-batch-btns' });

                const batchMoveBtn = createElement('button', { className: 'conversations-batch-btn' }, '📂 ' + (this.t('batchMove') || '移动'));
                batchMoveBtn.addEventListener('click', () => this.batchMove());
                batchBtns.appendChild(batchMoveBtn);

                const batchDeleteBtn = createElement('button', { className: 'conversations-batch-btn danger' }, '🗑️ ' + (this.t('batchDelete') || '删除'));
                batchDeleteBtn.addEventListener('click', () => this.batchDelete());
                batchBtns.appendChild(batchDeleteBtn);

                const batchCancelBtn = createElement('button', { className: 'conversations-batch-btn cancel' }, this.t('batchExit') || '退出');
                batchCancelBtn.addEventListener('click', () => this.clearSelection());
                batchBtns.appendChild(batchCancelBtn);

                batchBar.appendChild(batchBtns);
                content.appendChild(batchBar);
            }

            container.appendChild(content);
        }

        /**
         * 创建文件夹列表 UI
         */
        createFolderListUI() {
            const container = createElement('div', { className: 'conversations-folder-list' });

            if (!this.data || !this.data.folders || this.data.folders.length === 0) {
                const empty = createElement('div', { className: 'conversations-empty' }, this.t('conversationsEmpty'));
                container.appendChild(empty);
                return container;
            }

            // 搜索模式下的过滤逻辑
            const isSearching = !!this.searchResult;
            const { folderMatches, conversationMatches, conversationFolderMap } = this.searchResult || {};

            // 计算搜索时哪些文件夹有匹配的会话（需要展开父级）
            const foldersWithMatchedConversations = new Set();
            if (isSearching && conversationFolderMap) {
                conversationFolderMap.forEach((folderId) => {
                    foldersWithMatchedConversations.add(folderId);
                });
            }

            let hasVisibleItems = false;

            this.data.folders.forEach((folder, index) => {
                // 搜索过滤：判断文件夹是否应该显示
                if (isSearching) {
                    const folderDirectMatch = folderMatches?.has(folder.id);
                    const hasMatchedChildren = foldersWithMatchedConversations.has(folder.id);
                    if (!folderDirectMatch && !hasMatchedChildren) {
                        return; // 跳过不匹配的文件夹
                    }
                }

                hasVisibleItems = true;

                // 文件夹项
                const folderItem = this.createFolderItem(folder, index);
                container.appendChild(folderItem);

                // 搜索时：如果有匹配的会话则自动展开，否则只显示文件夹
                const hasMatchedConvs = isSearching && foldersWithMatchedConversations.has(folder.id);
                const shouldExpand = isSearching ? hasMatchedConvs : this.expandedFolderId === folder.id;

                // 会话列表容器
                const conversationList = createElement('div', {
                    className: 'conversations-list',
                    'data-folder-id': folder.id,
                    style: shouldExpand ? 'display: block;' : 'display: none;',
                });
                container.appendChild(conversationList);

                // 如果需要展开，渲染会话列表
                if (shouldExpand) {
                    folderItem.classList.add('expanded');
                    this.renderConversationList(folder.id, conversationList);
                }

                // 绑定展开逻辑（非搜索模式下或搜索结果中点击可切换）
                folderItem.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return; // 避免点击按钮触发

                    // 折叠其他文件夹，并更新记忆
                    container.querySelectorAll('.conversations-folder-item.expanded').forEach((el) => {
                        if (el !== folderItem) {
                            el.classList.remove('expanded');
                            const otherList = container.querySelector(`.conversations-list[data-folder-id="${el.dataset.folderId}"]`);
                            if (otherList) otherList.style.display = 'none';
                        }
                    });

                    const isExpanded = folderItem.classList.toggle('expanded');
                    // 记忆展开状态
                    this.expandedFolderId = isExpanded ? folder.id : null;

                    if (isExpanded) {
                        // 刷新计数（确保与实际会话数一致，按站点+CID 过滤）
                        const currentCid = this.siteAdapter.getCurrentCid ? this.siteAdapter.getCurrentCid() : null;
                        const count = Object.values(this.data.conversations).filter((c) => c.folderId === folder.id && this.matchesCid(c, currentCid)).length;
                        const countSpan = folderItem.querySelector('.conversations-folder-count');
                        if (countSpan) countSpan.textContent = `(${count})`;

                        this.renderConversationList(folder.id, conversationList);
                        conversationList.style.display = 'block';
                    } else {
                        conversationList.style.display = 'none';
                    }
                });
            });

            // 搜索无结果显示
            if (isSearching && !hasVisibleItems) {
                const noResult = createElement('div', { className: 'conversations-empty' }, this.t('conversationsNoSearchResult') || '未找到匹配结果');
                container.appendChild(noResult);
            }

            return container;
        }

        /**
         * 创建单个文件夹项
         * @param {number} index 文件夹在数组中的索引
         */
        createFolderItem(folder, index) {
            // 使用 CSS 变量以支持暗色模式
            const bgVar = folder.isDefault ? 'var(--gh-folder-bg-default)' : `var(--gh-folder-bg-${index % 8})`;

            const item = createElement('div', {
                className: 'conversations-folder-item' + (folder.isDefault ? ' default' : ''),
                'data-folder-id': folder.id,
                style: `background: ${bgVar};`,
            });

            // 文件夹信息（图标 + 名称）
            const folderName = folder.name.replace(folder.icon, '').trim();
            const info = createElement('div', { className: 'conversations-folder-info' });

            // 全选复选框（仅批量模式下显示）
            if (this.batchMode) {
                // 获取当前 CID（仅 Gemini Business 有效）
                const currentCid = this.siteAdapter.getCurrentCid ? this.siteAdapter.getCurrentCid() : null;
                // 搜索模式下只处理匹配的会话（同时按 CID 过滤）
                let conversationsInFolder = Object.values(this.data.conversations).filter((c) => c.folderId === folder.id && this.matchesCid(c, currentCid));
                if (this.searchResult) {
                    conversationsInFolder = conversationsInFolder.filter((c) => this.searchResult.conversationMatches?.has(c.id));
                }

                const allSelected = conversationsInFolder.length > 0 && conversationsInFolder.every((c) => this.selectedIds.has(c.id));
                const someSelected = !allSelected && conversationsInFolder.some((c) => this.selectedIds.has(c.id));

                const checkbox = createElement('input', {
                    type: 'checkbox',
                    className: 'conversations-folder-checkbox',
                });
                checkbox.checked = allSelected;
                if (someSelected) checkbox.indeterminate = true;

                checkbox.addEventListener('click', (e) => e.stopPropagation());
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        // 全选（仅匹配项）
                        conversationsInFolder.forEach((c) => this.selectedIds.add(c.id));
                    } else {
                        // 全不选（仅匹配项）
                        conversationsInFolder.forEach((c) => this.selectedIds.delete(c.id));
                    }
                    this.createUI(); // 使用 createUI 重绘以更新状态
                });
                info.appendChild(checkbox);
            }

            info.appendChild(createElement('span', { className: 'conversations-folder-icon', style: 'user-select: none;' }, folder.icon));

            // 文件夹名称（支持搜索高亮）
            const nameSpan = createElement('span', {
                className: 'conversations-folder-name',
                title: folderName,
            });
            if (this.searchQuery && this.searchResult?.folderMatches?.has(folder.id)) {
                nameSpan.appendChild(this.highlightText(folderName, this.searchQuery));
            } else {
                nameSpan.textContent = folderName;
            }
            info.appendChild(nameSpan);

            // 上下排序按钮（悬浮时在名称区域右侧显示，不占空间）
            if (!folder.isDefault) {
                const orderBtns = createElement('div', { className: 'conversations-folder-order-btns', style: 'user-select: none;' });

                const upBtn = createElement(
                    'button',
                    {
                        className: 'conversations-folder-order-btn',
                        title: this.t('moveUp') || '上移',
                    },
                    '↑',
                );
                if (index <= 1) upBtn.disabled = true;
                upBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!upBtn.disabled) this.moveFolderUp(folder.id);
                });

                const downBtn = createElement(
                    'button',
                    {
                        className: 'conversations-folder-order-btn',
                        title: this.t('moveDown') || '下移',
                    },
                    '↓',
                );
                if (index >= this.data.folders.length - 1) downBtn.disabled = true;
                downBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!downBtn.disabled) this.moveFolderDown(folder.id);
                });

                orderBtns.appendChild(upBtn);
                orderBtns.appendChild(downBtn);
                info.appendChild(orderBtns);
            }

            item.appendChild(info);

            // 右侧控制区域（计数 + 菜单按钮）
            const controls = createElement('div', { className: 'conversations-folder-controls' });

            // 获取当前 CID（仅 Gemini Business 有效）- 复用上面的变量或重新获取
            const cidForCount = this.siteAdapter.getCurrentCid ? this.siteAdapter.getCurrentCid() : null;
            // 会话计数（搜索模式下显示匹配数量，同时按 CID 过滤）
            let count = Object.values(this.data.conversations).filter((c) => c.folderId === folder.id && this.matchesCid(c, cidForCount)).length;
            if (this.searchResult) {
                count = Object.values(this.data.conversations).filter((c) => c.folderId === folder.id && this.matchesCid(c, cidForCount) && this.searchResult.conversationMatches?.has(c.id)).length;
            }
            controls.appendChild(createElement('span', { className: 'conversations-folder-count' }, `(${count})`));

            // 操作菜单按钮（始终渲染以保持对齐，默认文件夹隐藏）
            const menuBtn = createElement('button', { className: 'conversations-folder-menu-btn', style: 'user-select: none;' }, '⋯');
            if (folder.isDefault) {
                menuBtn.style.visibility = 'hidden';
                menuBtn.style.pointerEvents = 'none'; // 避免阻挡点击
            } else {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFolderMenu(folder, menuBtn);
                });
            }
            controls.appendChild(menuBtn);

            item.appendChild(controls);

            return item;
        }

        /**
         * 获取侧边栏会话顺序
         * @returns {Array<string>} 会话 ID 数组，按侧边栏 DOM 顺序排列
         */
        getSidebarConversationOrder() {
            const config = this.siteAdapter.getConversationObserverConfig?.();
            if (!config) return [];

            const elements = DOMToolkit.query(config.selector, { all: true, shadow: config.shadow });
            return Array.from(elements)
                .map((el) => config.extractInfo?.(el)?.id)
                .filter(Boolean);
        }

        /**
         * 渲染文件夹下的会话列表
         */
        renderConversationList(folderId, container) {
            clearElement(container);

            // 获取当前 CID（仅 Gemini Business 有效）
            const currentCid = this.siteAdapter.getCurrentCid ? this.siteAdapter.getCurrentCid() : null;

            // 获取该文件夹下的会话（按 CID 过滤）
            let conversations = Object.values(this.data.conversations).filter((c) => c.folderId === folderId && this.matchesCid(c, currentCid));

            // 搜索模式下过滤不匹配的会话
            const isSearching = !!this.searchResult;
            if (isSearching) {
                const { conversationMatches } = this.searchResult;
                conversations = conversations.filter((c) => conversationMatches?.has(c.id));
            }

            if (conversations.length === 0) {
                const empty = createElement('div', { className: 'conversations-list-empty' }, this.t('conversationsEmpty') || '暂无会话');
                container.appendChild(empty);
                return;
            }

            // 获取侧边栏顺序
            const sidebarOrder = this.getSidebarConversationOrder();

            // 排序：置顶优先，其余按侧边栏顺序
            conversations.sort((a, b) => {
                // 置顶优先
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;

                // 按侧边栏顺序
                const indexA = sidebarOrder.indexOf(a.id);
                const indexB = sidebarOrder.indexOf(b.id);
                // 不在侧边栏的放到最后
                if (indexA === -1 && indexB === -1) return (b.updatedAt || 0) - (a.updatedAt || 0);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });

            conversations.forEach((conv) => {
                const item = this.createConversationItem(conv);
                container.appendChild(item);
            });
        }

        /**
         * 创建单个会话项
         */
        createConversationItem(conv) {
            const item = createElement('div', { className: 'conversations-item', 'data-id': conv.id });
            // New Layout: Flex Column
            // Row 1: Content (Title + Checkbox) ----- Actions (Time + Menu)
            // Row 2: Tags

            // Container for Row 1

            // Checkbox
            if (this.batchMode) {
                const checkbox = createElement('input', {
                    type: 'checkbox',
                    className: 'conversations-item-checkbox',
                });
                checkbox.checked = this.selectedIds.has(conv.id);
                checkbox.addEventListener('click', (e) => e.stopPropagation());
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) this.selectedIds.add(conv.id);
                    else this.selectedIds.delete(conv.id);
                    this.updateBatchActionBar();
                });
                item.appendChild(checkbox);
            }

            // Title
            const title = createElement('span', {
                className: 'conversations-item-title',
                title: conv.title,
                style: 'user-select: none;',
            });
            // 置顶标识
            const displayTitle = conv.pinned ? `📌 ${conv.title || '无标题'}` : conv.title || '无标题';
            if (this.searchQuery && this.searchResult?.conversationMatches?.has(conv.id)) {
                if (conv.pinned) title.appendChild(document.createTextNode('📌 '));
                title.appendChild(this.highlightText(conv.title || '无标题', this.searchQuery));
            } else {
                title.textContent = displayTitle;
            }
            title.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.batchMode) {
                    const checkbox = item.querySelector('.conversations-item-checkbox');
                    if (checkbox) {
                        checkbox.click();
                    }
                    return;
                }
                // 尝试在侧边栏中查找并点击（支持 Shadow DOM 穿透）
                // 方法1: 通过 jslog 属性查找（Gemini 标准版）
                let sidebarItem = DOMToolkit.query(`.conversation[jslog*="${conv.id}"]`, { shadow: true });
                // 方法2: 遍历所有会话元素，通过菜单按钮 ID 匹配（Gemini Business）
                // 注意：closest() 在 Shadow DOM 中可能失效，所以需要遍历
                if (!sidebarItem) {
                    const conversations = DOMToolkit.query('.conversation', { all: true, shadow: true });
                    for (const convEl of conversations) {
                        const menuBtn = convEl.querySelector(`#menu-${conv.id}`) || convEl.querySelector(`.conversation-action-menu-button[id="menu-${conv.id}"]`);
                        if (menuBtn) {
                            sidebarItem = convEl;
                            break;
                        }
                    }
                }
                if (sidebarItem) {
                    const btn = sidebarItem.querySelector('button.list-item') || sidebarItem.querySelector('button');
                    if (btn) btn.click();
                    else sidebarItem.click();
                } else if (conv.url) {
                    window.location.href = conv.url;
                }
            });
            item.appendChild(title);

            // Tags (Insert after title)
            if (conv.tagIds && conv.tagIds.length > 0 && this.data.tags) {
                const tagList = createElement('div', { className: 'conversations-tag-list', style: 'user-select: none;' });
                conv.tagIds.forEach((tagId) => {
                    const tagDef = this.data.tags.find((t) => t.id === tagId);
                    if (tagDef) {
                        const tagEl = createElement(
                            'span',
                            {
                                className: 'conversations-tag',
                                style: `background-color: ${tagDef.color || '#9ca3af'}`,
                            },
                            tagDef.name,
                        );
                        tagList.appendChild(tagEl);
                    }
                });
                if (tagList.children.length > 0) {
                    item.appendChild(tagList);
                }
            }

            // Right side of Top Row: Time + Menu
            const metaContainer = createElement('div', { className: 'conversations-item-meta' });

            const time = createElement('span', { className: 'conversations-item-time' }, this.formatTime(conv.updatedAt));
            metaContainer.appendChild(time);

            const menuBtn = createElement('button', { className: 'conversations-item-menu-btn', style: 'user-select: none;' }, '⋯');
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showConversationMenu(conv, menuBtn);
            });
            metaContainer.appendChild(menuBtn);
            item.appendChild(metaContainer);

            return item;
        }

        /**
         * 显示会话操作菜单
         */
        showConversationMenu(conv, anchorEl) {
            // 移除已有菜单
            document.querySelectorAll('.conversations-item-menu').forEach((m) => m.remove());

            const menu = createElement('div', { className: 'conversations-item-menu' });

            // 重命名
            const renameBtn = createElement('button', {}, this.t('conversationsRename') || '重命名');
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                this.showRenameConversationDialog(conv);
            });
            menu.appendChild(renameBtn);

            // 置顶/取消置顶
            const pinText = conv.pinned ? this.t('conversationsUnpin') || '取消置顶' : this.t('conversationsPin') || '📌 置顶';
            const pinBtn = createElement('button', {}, pinText);
            pinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                this.toggleConversationPin(conv);
            });
            menu.appendChild(pinBtn);

            // 设置标签
            const tagBtn = createElement('button', {}, this.t('conversationsSetTags') || '设置标签');
            tagBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                this.showTagManagerDialog(conv);
            });
            menu.appendChild(tagBtn);

            // 移动到...
            const moveBtn = createElement('button', {}, this.t('conversationsMoveTo') || '移动到...');
            moveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                this.showMoveToFolderDialog(conv);
            });
            menu.appendChild(moveBtn);

            // 删除
            const deleteBtn = createElement('button', { className: 'danger' }, this.t('conversationsDelete') || '删除');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                this.confirmDeleteConversation(conv);
            });
            menu.appendChild(deleteBtn);

            // 定位菜单
            const rect = anchorEl.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.top = `${rect.bottom + 4}px`;
            menu.style.right = `${window.innerWidth - rect.right}px`;

            document.body.appendChild(menu);

            // 点击外部关闭
            const closeHandler = (e) => {
                if (!menu.contains(e.target) && e.target !== anchorEl) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 0);
        }

        /**
         * 切换会话置顶状态
         */
        toggleConversationPin(conv) {
            const stored = this.data.conversations[conv.id];
            if (!stored) return;

            stored.pinned = !stored.pinned;
            stored.updatedAt = Date.now();
            this.saveData();

            // 刷新 UI
            this.createUI();

            // 显示提示
            const message = stored.pinned ? this.t('conversationsPinned') || '已置顶' : this.t('conversationsUnpinned') || '已取消置顶';
            showToast(message);
        }

        /**
         * 显示重命名会话对话框
         */
        showRenameConversationDialog(conv) {
            const overlay = createElement('div', { className: 'conversations-dialog-overlay' });
            const dialog = createElement('div', { className: 'conversations-dialog' });

            // 标题
            dialog.appendChild(createElement('div', { className: 'conversations-dialog-title' }, this.t('conversationsRename') || '重命名'));

            // 输入框区域
            const inputSection = createElement('div', { className: 'conversations-dialog-section' });
            inputSection.appendChild(createElement('label', {}, this.t('conversationsFolderName') || '名称'));
            const nameInput = createElement('input', {
                type: 'text',
                className: 'conversations-dialog-input',
                value: conv.title || '',
                placeholder: this.t('conversationsFolderNamePlaceholder') || '输入会话标题',
            });
            inputSection.appendChild(nameInput);
            dialog.appendChild(inputSection);

            // 按钮
            const buttons = createElement('div', { className: 'conversations-dialog-buttons' });
            const cancelBtn = createElement('button', { className: 'conversations-dialog-btn cancel' }, this.t('cancel') || '取消');
            cancelBtn.addEventListener('click', () => overlay.remove());

            const confirmBtn = createElement('button', { className: 'conversations-dialog-btn confirm' }, this.t('confirm') || '确定');
            confirmBtn.addEventListener('click', () => {
                const newTitle = nameInput.value.trim();
                if (newTitle && newTitle !== conv.title) {
                    this.renameConversation(conv.id, newTitle);
                }
                overlay.remove();
            });

            buttons.appendChild(cancelBtn);
            buttons.appendChild(confirmBtn);
            dialog.appendChild(buttons);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // 聚焦并全选
            nameInput.focus();
            nameInput.select();

            // ESC 关闭
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') overlay.remove();
                if (e.key === 'Enter') confirmBtn.click();
            });
        }

        /**
         * 重命名会话
         */
        renameConversation(convId, newTitle) {
            const conv = this.data.conversations[convId];
            if (!conv) return;

            const oldTitle = conv.title;
            conv.title = newTitle;
            conv.updatedAt = Date.now();
            this.saveData();
            this.createUI();
            showToast(this.t('conversationsFolderRenamed') || '已重命名');

            // 根据设置决定是否同步云端
            if (this.settings?.conversations?.syncRenameToCloud) {
                this.syncRenameToCloud(convId, newTitle, oldTitle);
            }
        }

        /**
         * 同步重命名到云端（侧边栏）
         */
        syncRenameToCloud(convId, newTitle, oldTitle) {
            // 尝试在侧边栏找到对应会话并触发重命名
            const sidebarItem = DOMToolkit.query(`.conversation[jslog*="${convId}"]`);
            if (sidebarItem) {
                // 尝试模拟右键菜单或编辑操作
                // 由于侧边栏结构复杂，这里暂时只打印提示
                console.log(`[ConversationManager] 云端同步重命名：${oldTitle} -> ${newTitle}`);
                // TODO: 实现实际的侧边栏重命名操作
            }
        }

        /**
         * 确认删除会话
         */
        confirmDeleteConversation(conv) {
            this.showConfirmDialog(this.t('conversationsDelete') || '删除', `确定删除会话 "${conv.title}" 吗？`, () => this.deleteConversation(conv.id));
        }

        /**
         * 删除会话
         */
        deleteConversation(convId) {
            const conv = this.data.conversations[convId];
            if (!conv) return;

            delete this.data.conversations[convId];
            this.saveData();
            this.createUI();
            showToast(this.t('conversationsDeleted') || '已删除');

            // 根据设置决定是否同步云端删除
            if (this.settings?.conversations?.syncDeleteToCloud) {
                this.syncDeleteToCloud(convId);
            }
        }

        /**
         * 同步删除到云端（侧边栏）
         */
        syncDeleteToCloud(convId) {
            // 尝试在侧边栏找到对应会话并触发删除
            const sidebarItem = DOMToolkit.query(`.conversation[jslog*="${convId}"]`);
            if (sidebarItem) {
                console.log(`[ConversationManager] 云端同步删除会话：${convId}`);
                // TODO: 实现实际的侧边栏删除操作
            }
        }

        /**
         * 更新底部批量操作栏状态
         */
        updateBatchActionBar() {
            const batchBar = document.getElementById('conversations-batch-bar');
            const batchInfo = document.getElementById('conversations-batch-info');
            if (!batchBar || !batchInfo) return;

            const count = this.selectedIds.size;
            if (count > 0) {
                batchBar.style.display = 'flex';
                batchInfo.textContent = (this.t('batchSelected') || '已选 {n} 个').replace('{n}', count);
            } else {
                batchBar.style.display = 'none';
            }
        }

        /**
         * 切换批量模式
         */
        toggleBatchMode() {
            this.batchMode = !this.batchMode;
            if (!this.batchMode) {
                this.selectedIds.clear();
            }
            this.createUI();
            // 恢复之前展开的文件夹
            if (this.expandedFolderId) {
                const folderHeader = this.container.querySelector(`.conversations-folder-header[data-folder-id="${this.expandedFolderId}"]`);
                if (folderHeader) folderHeader.click();
            }
        }

        /**
         * 清除选中状态并退出批量模式
         */
        clearSelection() {
            this.selectedIds.clear();
            this.batchMode = false;
            this.createUI();
            // 恢复之前展开的文件夹
            if (this.expandedFolderId) {
                const folderHeader = this.container.querySelector(`.conversations-folder-header[data-folder-id="${this.expandedFolderId}"]`);
                if (folderHeader) folderHeader.click();
            }
        }

        /**
         * 批量移动会话
         */
        batchMove() {
            if (this.selectedIds.size === 0) return;

            const overlay = createElement('div', { className: 'conversations-dialog-overlay' });
            const dialog = createElement('div', { className: 'conversations-dialog' });
            dialog.appendChild(createElement('div', { className: 'conversations-dialog-title' }, `移动 ${this.selectedIds.size} 个会话到...`));

            // 搜索框 + 新建文件夹按钮
            const searchRow = createElement('div', {
                style: 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;',
            });
            const searchInput = createElement('input', {
                type: 'text',
                className: 'conversations-dialog-search',
                placeholder: '搜索文件夹...',
                style: 'flex: 1; padding: 8px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 4px; box-sizing: border-box; font-size: 13px;',
            });
            const addFolderBtn = createElement('button', {
                className: 'conversations-dialog-add-folder-btn',
                title: this.t('conversationsAddFolder') || '新建文件夹',
                style: 'width: 36px; height: 36px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 4px; background: var(--gh-bg, white); cursor: pointer; display: flex; align-items: center; justify-content: center;',
            });
            const addSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            addSvg.setAttribute('viewBox', '0 0 24 24');
            addSvg.setAttribute('fill', 'var(--gh-text-secondary, #6b7280)');
            addSvg.setAttribute('width', '18');
            addSvg.setAttribute('height', '18');
            const addPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            addPath.setAttribute('d', 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z');
            addSvg.appendChild(addPath);
            addFolderBtn.appendChild(addSvg);
            addFolderBtn.addEventListener('click', () => {
                overlay.remove();
                this.showCreateFolderDialog();
            });
            searchRow.appendChild(searchInput);
            searchRow.appendChild(addFolderBtn);
            dialog.appendChild(searchRow);

            // 文件夹列表容器
            const list = createElement('div', { className: 'conversations-folder-select-list' });

            // 渲染列表函数
            const renderList = (filter = '') => {
                clearElement(list);
                this.data.folders.forEach((folder) => {
                    const folderName = folder.name.replace(folder.icon, '').trim();
                    if (filter && !folderName.toLowerCase().includes(filter.toLowerCase())) return;

                    const item = createElement('div', { className: 'conversations-folder-select-item' }, `${folder.icon} ${folderName}`);
                    item.addEventListener('click', () => {
                        // 批量移动
                        this.selectedIds.forEach((convId) => {
                            if (this.data.conversations[convId]) {
                                this.data.conversations[convId].folderId = folder.id;
                                this.data.conversations[convId].updatedAt = Date.now();
                            }
                        });
                        this.saveData();
                        overlay.remove();
                        showToast(`已移动 ${this.selectedIds.size} 个会话到 ${folder.name}`);
                        this.clearSelection();
                        this.createUI();
                    });
                    list.appendChild(item);
                });
            };

            // 初始渲染
            renderList();

            // 搜索事件
            searchInput.addEventListener('input', (e) => {
                renderList(e.target.value);
            });

            dialog.appendChild(list);

            // 取消按钮
            const btns = createElement('div', { className: 'conversations-dialog-buttons' });
            const cancelBtn = createElement('button', { className: 'conversations-dialog-btn cancel' }, this.t('cancel') || '取消');
            cancelBtn.addEventListener('click', () => overlay.remove());
            btns.appendChild(cancelBtn);
            dialog.appendChild(btns);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            searchInput.focus();
        }

        /**
         * 批量删除会话
         */
        batchDelete() {
            if (this.selectedIds.size === 0) return;

            this.showConfirmDialog('批量删除', `确定删除选中的 ${this.selectedIds.size} 个会话吗？`, () => {
                const count = this.selectedIds.size;
                this.selectedIds.forEach((convId) => {
                    delete this.data.conversations[convId];
                });
                this.saveData();
                showToast(`已删除 ${count} 个会话`);
                this.clearSelection();
                this.createUI();
            });
        }

        /**
         * 创建标签
         * @param {string} name 标签名称
         * @param {string} color 标签颜色
         */
        createTag(name, color) {
            if (!this.data.tags) this.data.tags = [];

            // Check duplicate
            const exists = this.data.tags.some((t) => t.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                showToast(this.t('conversationsTagExists') || '标签名称已存在');
                return null;
            }

            const tag = {
                id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name,
                color,
            };
            this.data.tags.push(tag);
            this.saveData();
            return tag;
        }

        /**
         * 更新标签
         * @param {string} tagId 标签ID
         * @param {string} name 标签名称
         * @param {string} color 标签颜色
         */
        updateTag(tagId, name, color) {
            if (!this.data.tags) return null;

            // Check duplicate (exclude self)
            const exists = this.data.tags.some((t) => t.id !== tagId && t.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                showToast(this.t('conversationsTagExists') || '标签名称已存在');
                return null;
            }

            const tag = this.data.tags.find((t) => t.id === tagId);
            if (tag) {
                tag.name = name;
                tag.color = color;
                this.saveData();
            }
            return tag;
        }

        /**
         * 删除标签
         * @param {string} tagId 标签ID
         */
        deleteTag(tagId) {
            if (!this.data.tags) return;
            // 1. 删除标签定义
            this.data.tags = this.data.tags.filter((t) => t.id !== tagId);

            // 2. 从所有会话中移除该标签引用
            Object.values(this.data.conversations).forEach((conv) => {
                if (conv.tagIds) {
                    conv.tagIds = conv.tagIds.filter((id) => id !== tagId);
                    if (conv.tagIds.length === 0) delete conv.tagIds;
                }
            });

            this.saveData();
        }

        /**
         * 设置会话标签
         * @param {string} convId 会话ID
         * @param {Array<string>} tagIds 标签ID数组
         */
        setConversationTags(convId, tagIds) {
            if (this.data.conversations[convId]) {
                if (tagIds && tagIds.length > 0) {
                    this.data.conversations[convId].tagIds = tagIds;
                } else {
                    delete this.data.conversations[convId].tagIds;
                }
                this.saveData();
            }
        }

        /**
         * 显示移动到文件夹对话框
         */
        showMoveToFolderDialog(conv) {
            const overlay = createElement('div', { className: 'conversations-dialog-overlay' });

            const dialog = createElement('div', { className: 'conversations-dialog' });
            dialog.appendChild(createElement('div', { className: 'conversations-dialog-title' }, this.t('conversationsMoveTo') || '移动到...'));

            // 搜索框 + 新建文件夹按钮
            const searchRow = createElement('div', {
                style: 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;',
            });
            const searchInput = createElement('input', {
                type: 'text',
                className: 'conversations-dialog-search',
                placeholder: '搜索文件夹...',
                style: 'flex: 1; padding: 8px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 4px; box-sizing: border-box; font-size: 13px;',
            });
            const addFolderBtn = createElement('button', {
                className: 'conversations-dialog-add-folder-btn',
                title: this.t('conversationsAddFolder') || '新建文件夹',
                style: 'width: 36px; height: 36px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 4px; background: var(--gh-bg, white); cursor: pointer; display: flex; align-items: center; justify-content: center;',
            });
            const addSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            addSvg.setAttribute('viewBox', '0 0 24 24');
            addSvg.setAttribute('fill', 'var(--gh-text-secondary, #6b7280)');
            addSvg.setAttribute('width', '18');
            addSvg.setAttribute('height', '18');
            const addPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            addPath.setAttribute('d', 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z');
            addSvg.appendChild(addPath);
            addFolderBtn.appendChild(addSvg);
            addFolderBtn.addEventListener('click', () => {
                overlay.remove();
                this.showCreateFolderDialog();
            });
            searchRow.appendChild(searchInput);
            searchRow.appendChild(addFolderBtn);
            dialog.appendChild(searchRow);

            // 文件夹列表
            const list = createElement('div', { className: 'conversations-folder-select-list' });

            // 渲染列表函数
            const renderList = (filter = '') => {
                clearElement(list);
                this.data.folders.forEach((folder) => {
                    // 排除当前所在文件夹
                    if (folder.id === conv.folderId) return;

                    const folderName = folder.name.replace(folder.icon, '').trim();
                    if (filter && !folderName.toLowerCase().includes(filter.toLowerCase())) return;

                    const item = createElement(
                        'div',
                        {
                            className: 'conversations-folder-select-item',
                            'data-folder-id': folder.id,
                        },
                        `${folder.icon} ${folderName}`,
                    );
                    item.addEventListener('click', () => {
                        // 移动会话
                        this.data.conversations[conv.id].folderId = folder.id;
                        this.data.conversations[conv.id].updatedAt = Date.now();
                        this.saveData();
                        this.createUI();
                        overlay.remove();
                        showToast((this.t('conversationsMoved') || '已移动到') + ` ${folder.name}`);
                    });
                    list.appendChild(item);
                });
            };

            // 初始渲染
            renderList();

            // 搜索事件
            searchInput.addEventListener('input', (e) => {
                renderList(e.target.value);
            });

            dialog.appendChild(list);

            // 取消按钮
            const btns = createElement('div', { className: 'conversations-dialog-buttons' });
            const cancelBtn = createElement('button', { className: 'conversations-dialog-btn cancel' }, this.t('cancel') || '取消');
            cancelBtn.addEventListener('click', () => overlay.remove());
            btns.appendChild(cancelBtn);
            dialog.appendChild(btns);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            searchInput.focus();
        }

        /**
         * 格式化时间显示
         */
        formatTime(timestamp) {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;

            if (diff < 60000) return this.t('justNow') || '刚刚';
            if (diff < 3600000) return Math.floor(diff / 60000) + (this.t('minutesAgo') || '分钟前');
            if (diff < 86400000) return Math.floor(diff / 3600000) + (this.t('hoursAgo') || '小时前');
            if (diff < 604800000) return Math.floor(diff / 86400000) + (this.t('daysAgo') || '天前');

            return date.toLocaleDateString();
        }

        /**
         * 显示文件夹操作菜单
         */
        showFolderMenu(folder, anchorEl) {
            // 移除已有菜单
            document.querySelectorAll('.conversations-folder-menu').forEach((m) => m.remove());

            const menu = createElement('div', { className: 'conversations-folder-menu' });

            const renameBtn = createElement('button', {}, this.t('conversationsRename') || '重命名');
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                this.showRenameFolderDialog(folder);
            });

            const deleteBtn = createElement('button', { style: 'color: #ef4444;' }, this.t('conversationsDelete') || '删除');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                this.confirmDeleteFolder(folder);
            });

            menu.appendChild(renameBtn);
            menu.appendChild(deleteBtn);

            // 定位菜单
            const rect = anchorEl.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.top = `${rect.bottom + 4}px`;
            menu.style.left = `${rect.left}px`;

            document.body.appendChild(menu);

            // 点击外部关闭
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 0);
        }

        /**
         * 显示新建文件夹对话框
         */
        showCreateFolderDialog() {
            this.showFolderDialog({
                title: this.t('conversationsAddFolder') || '新建文件夹',
                icon: '📁',
                name: '',
                onConfirm: (name, icon) => {
                    if (name.trim()) {
                        this.createFolder(name.trim(), icon);
                        this.createUI(); // 刷新 UI
                        showToast(this.t('conversationsFolderCreated') || '文件夹已创建');
                    }
                },
            });
        }

        /**
         * 显示重命名文件夹对话框
         */
        showRenameFolderDialog(folder) {
            const currentName = folder.name.replace(folder.icon, '').trim();
            this.showFolderDialog({
                title: this.t('conversationsRename') || '重命名文件夹',
                icon: folder.icon,
                name: currentName,
                onConfirm: (name, icon) => {
                    if (name.trim()) {
                        this.renameFolder(folder.id, name.trim(), icon);
                        this.createUI(); // 刷新 UI
                        showToast(this.t('conversationsFolderRenamed') || '文件夹已重命名');
                    }
                },
            });
        }

        /**
         * 确认删除文件夹
         */
        confirmDeleteFolder(folder) {
            this.showConfirmDialog(this.t('conversationsDelete') || '删除', this.t('conversationsDeleteConfirm') || `确定删除文件夹 "${folder.name}" 吗？其中的会话将移到收件箱。`, () => {
                if (this.deleteFolder(folder.id)) {
                    this.createUI(); // 刷新 UI
                    showToast(this.t('conversationsFolderDeleted') || '文件夹已删除');
                }
            });
        }

        /**
         * 通用文件夹对话框（新建/重命名复用）
         */
        showFolderDialog({ title, icon, name, onConfirm }) {
            const overlay = createElement('div', { className: 'conversations-dialog-overlay' });
            const dialog = createElement('div', { className: 'conversations-dialog' });

            // 标题
            dialog.appendChild(createElement('div', { className: 'conversations-dialog-title' }, title));

            // Emoji 选择器
            const emojiSection = createElement('div', { className: 'conversations-dialog-section' });
            emojiSection.appendChild(createElement('label', {}, this.t('conversationsIcon') || '图标'));
            const emojiPicker = this.createEmojiPicker(icon);
            emojiSection.appendChild(emojiPicker);
            dialog.appendChild(emojiSection);

            // 名称输入
            const nameSection = createElement('div', { className: 'conversations-dialog-section' });
            nameSection.appendChild(createElement('label', {}, this.t('conversationsFolderName') || '名称'));
            const nameInput = createElement('input', {
                type: 'text',
                className: 'conversations-dialog-input',
                value: name,
                placeholder: this.t('conversationsFolderNamePlaceholder') || '输入文件夹名称',
            });
            nameSection.appendChild(nameInput);
            dialog.appendChild(nameSection);

            // 按钮
            const buttons = createElement('div', { className: 'conversations-dialog-buttons' });
            const cancelBtn = createElement('button', { className: 'conversations-dialog-btn cancel' }, this.t('cancel') || '取消');
            const confirmBtn = createElement('button', { className: 'conversations-dialog-btn confirm' }, this.t('confirm') || '确定');

            cancelBtn.addEventListener('click', () => overlay.remove());
            confirmBtn.addEventListener('click', () => {
                const customInput = emojiPicker.querySelector('input');
                const selectedIcon = customInput ? customInput.value : emojiPicker.querySelector('.selected')?.textContent || icon;
                onConfirm(nameInput.value, selectedIcon);
                overlay.remove();
            });

            buttons.appendChild(cancelBtn);
            buttons.appendChild(confirmBtn);
            dialog.appendChild(buttons);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // 聚焦输入框
            nameInput.focus();

            // 点击遮罩关闭 (智能行为：有输入则保存，无输入则关闭)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const name = nameInput.value.trim();
                    // 这里我们复用 confirmBtn 的逻辑，因为 confirmBtn 里也只是调用 onConfirm
                    // 但我们需要判断是否有效。
                    // 用户的要求：输入了->新建/编辑；没有输入->关闭
                    if (name) {
                        confirmBtn.click();
                    } else {
                        overlay.remove();
                    }
                }
            });

            // ESC 关闭，Enter 确定
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') overlay.remove();
                if (e.key === 'Enter') confirmBtn.click();
            });
        }

        /**
         * 创建 Emoji 选择器 (增强版)
         */
        createEmojiPicker(selectedEmoji = '📁') {
            const container = createElement('div', {
                className: 'conversations-emoji-picker',
                style: 'display: flex; flex-direction: column; gap: 8px;',
            });

            // 1. 自定义输入区域
            const customRow = createElement('div', {
                className: 'conversations-emoji-custom-row',
                style: 'display: flex; align-items: center; gap: 8px; padding: 4px; background: var(--gh-bg-secondary, #f9fafb); border-radius: 4px; border: 1px solid var(--gh-border, #e5e7eb);',
            });

            const customLabel = createElement('span', { style: 'font-size: 12px; color: var(--gh-text-secondary, #6b7280); flex-shrink: 0;' }, this.t('conversationsCustomIcon') || '自定义:');

            const customInput = createElement('input', {
                type: 'text',
                className: 'conversations-emoji-custom-input',
                value: selectedEmoji,
                maxLength: 4, // 稍微放宽长度
                placeholder: '☺',
                style: 'width: 60px; text-align: center; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 4px; padding: 2px; font-size: 16px; background: var(--gh-input-bg, #ffffff); color: var(--gh-text, #1f2937);',
            });

            customRow.appendChild(customLabel);
            customRow.appendChild(customInput);
            container.appendChild(customRow);

            // 2. 预设列表区域
            const listContainer = createElement('div', {
                className: 'conversations-emoji-list',
                style: 'display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; max-height: 120px; overflow-y: auto; padding: 2px; scrollbar-width: none; -ms-overflow-style: none;',
            });
            // Hide scrollbar style
            const hideScrollStyle = document.createElement('style');
            hideScrollStyle.textContent = `.conversations-emoji-list::-webkit-scrollbar { display: none; }`;
            listContainer.appendChild(hideScrollStyle);

            // 扩充的预设 Emoji 库 (64个)
            const presetEmojis = [
                // 📂 基础文件夹
                '📁',
                '📂',
                '📥',
                '🗂️',
                '📊',
                '📈',
                '📉',
                '📋',
                // 💼 办公/工作
                '💼',
                '📅',
                '📌',
                '📎',
                '📝',
                '✒️',
                '🔍',
                '💡',
                // 💻 编程/技术
                '💻',
                '⌨️',
                '🖥️',
                '🖱️',
                '🐛',
                '🔧',
                '🔨',
                '⚙️',
                // 🤖 AI/机器人
                '🤖',
                '👾',
                '🧠',
                '⚡',
                '🔥',
                '✨',
                '🎓',
                '📚',
                // 🎨 创意/艺术
                '🎨',
                '🎭',
                '🎬',
                '🎹',
                '🎵',
                '📷',
                '🖌️',
                '🖍️',
                // 🏠 生活/日常
                '🏠',
                '🛒',
                '✈️',
                '🎮',
                '⚽',
                '🍔',
                '☕',
                '❤️',
                // 🌈 颜色/标记
                '🔴',
                '🟠',
                '🟡',
                '🟢',
                '🔵',
                '🟣',
                '⚫',
                '⚪',
                // ⭐ 其他
                '⭐',
                '🌟',
                '🎉',
                '🔒',
                '🔑',
                '🚫',
                '✅',
                '❓',
            ];

            // 选中状态管理
            let currentSelectedBtn = null;

            presetEmojis.forEach((emoji) => {
                const btn = createElement(
                    'button',
                    {
                        className: 'conversations-emoji-btn' + (emoji === selectedEmoji ? ' selected' : ''),
                        style: 'width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; border-radius: 4px; font-size: 16px;',
                    },
                    emoji,
                );

                if (emoji === selectedEmoji) currentSelectedBtn = btn;

                btn.addEventListener('click', (e) => {
                    e.preventDefault(); // 防止触发表单提交等意外行为

                    // 更新按钮选中状态
                    if (currentSelectedBtn) {
                        currentSelectedBtn.classList.remove('selected');
                        currentSelectedBtn.style.backgroundColor = 'transparent';
                    }
                    btn.classList.add('selected');
                    btn.style.backgroundColor = '#dbeafe'; // 浅蓝背景表示选中
                    currentSelectedBtn = btn;

                    // 同步到自定义输入框
                    customInput.value = emoji;
                    // 标记为用户手动选择的 (通过 class，供外部获取值时优先使用输入框的值)
                    customInput.classList.add('selected');
                });

                // Hover 效果
                btn.onmouseenter = () => {
                    if (!btn.classList.contains('selected')) btn.style.backgroundColor = 'var(--gh-hover, #f3f4f6)';
                };
                btn.onmouseleave = () => {
                    if (!btn.classList.contains('selected')) btn.style.backgroundColor = 'transparent';
                };

                listContainer.appendChild(btn);
            });

            container.appendChild(listContainer);

            // 自定义输入监听
            customInput.addEventListener('input', (e) => {
                let val = e.target.value;

                // 简单的 Emoji 校验：利用 Unicode 属性 \p{Extended_Pictographic}
                const emojiRegex = /[^\p{Extended_Pictographic}\u200d\ufe0f]/gu;
                if (val && emojiRegex.test(val)) {
                    val = val.replace(emojiRegex, '');
                    e.target.value = val;
                }

                // 清除按钮选中状态，因为现在是自定义的
                if (currentSelectedBtn) {
                    currentSelectedBtn.classList.remove('selected');
                    currentSelectedBtn.style.backgroundColor = 'transparent';
                    currentSelectedBtn = null;
                }

                // 尝试反向匹配：如果输入的内容刚好在预设里，把那个按钮高亮
                const matchBtn = Array.from(listContainer.children).find((b) => b.textContent === val);
                if (matchBtn) {
                    matchBtn.classList.add('selected');
                    matchBtn.style.backgroundColor = '#dbeafe';
                    currentSelectedBtn = matchBtn;
                }

                // 给 input 加个标记类
                customInput.classList.add('selected');
            });

            // 初始高亮颜色
            if (currentSelectedBtn) {
                currentSelectedBtn.style.backgroundColor = '#dbeafe';
            }

            return container;
        }

        /**
         * 设置激活状态
         * 激活时刷新所有文件夹计数和展开的文件夹
         */
        setActive(active) {
            const wasActive = this.isActive;
            this.isActive = active;

            // 从非激活变为激活时，刷新所有文件夹计数和展开的文件夹
            if (!wasActive && active) {
                this.refreshAllFolderCounts();
            }
        }

        /**
         * 刷新所有文件夹的计数和展开的文件夹会话列表
         */
        refreshAllFolderCounts() {
            if (!this.data || !this.data.folders) return;

            this.data.folders.forEach((folder) => {
                this.updateFolderCount(folder.id);
            });
        }

        /**
         * 刷新会话列表
         */
        refresh() {
            this.loadData();
            this.createUI();
        }

        /**
         * 处理搜索输入
         * @param {string} query 搜索关键词
         */
        handleSearch(query) {
            this.searchQuery = query;
            if (!query && (!this.filterTagIds || this.filterTagIds.size === 0) && !this.filterPinned) {
                // 清空搜索时重置（无关键词、无标签筛选、无置顶筛选）
                this.searchResult = null;
                this.refreshAfterSearch();
                return;
            }

            // 执行搜索
            this.searchResult = this.performSearch(query);
            this.refreshAfterSearch();
        }

        /**
         * 执行搜索
         * @param {string} query 搜索关键词
         * @returns {{ folderMatches: Set, conversationMatches: Set, conversationFolderMap: Map, totalCount: number }}
         */
        performSearch(query) {
            const lowerQuery = query.toLowerCase();
            const folderMatches = new Set(); // 直接匹配的文件夹 ID
            const conversationMatches = new Set(); // 匹配的会话 ID
            const conversationFolderMap = new Map(); // 会话 ID -> 所属文件夹 ID（用于展开父级）

            // 获取当前 CID（仅 Gemini Business 有效）
            const currentCid = this.siteAdapter.getCurrentCid ? this.siteAdapter.getCurrentCid() : null;

            // 1. 遍历文件夹，匹配名称
            if (this.data && this.data.folders && lowerQuery) {
                this.data.folders.forEach((folder) => {
                    if (folder.name.toLowerCase().includes(lowerQuery)) {
                        folderMatches.add(folder.id);
                    }
                });
            }

            // 2. 遍历会话，匹配标题（按 CID 过滤）
            if (this.data && this.data.conversations) {
                Object.values(this.data.conversations).forEach((conv) => {
                    // 先按 CID 过滤
                    if (!this.matchesCid(conv, currentCid)) return;

                    // 逻辑整合：关键词 AND 标签 AND 置顶
                    const matchQuery = !lowerQuery || (conv.title && conv.title.toLowerCase().includes(lowerQuery));
                    const matchTags = !this.filterTagIds || this.filterTagIds.size === 0 || (conv.tagIds && conv.tagIds.some((id) => this.filterTagIds.has(id)));
                    const matchPinned = !this.filterPinned || conv.pinned;

                    if (matchQuery && matchTags && matchPinned) {
                        conversationMatches.add(conv.id);
                        conversationFolderMap.set(conv.id, conv.folderId);
                    }
                });
            }

            return {
                folderMatches,
                conversationMatches,
                conversationFolderMap,
                totalCount: folderMatches.size + conversationMatches.size,
            };
        }

        /**
         * 搜索后刷新 UI（不重建整个面板，只更新列表和结果条）
         */
        refreshAfterSearch() {
            // 更新结果条
            const resultBar = document.getElementById('conversations-result-bar');
            if (resultBar) {
                if (this.searchResult) {
                    resultBar.textContent = `${this.searchResult.totalCount} ${this.t('conversationsSearchResult') || '个结果'}`;
                    resultBar.classList.add('visible');
                } else {
                    resultBar.textContent = '';
                    resultBar.classList.remove('visible');
                }
            }

            // 重建文件夹列表（带搜索过滤）
            const container = this.container?.querySelector('.conversations-content');
            const oldFolderList = container?.querySelector('.conversations-folder-list');
            if (container && oldFolderList) {
                const newFolderList = this.createFolderListUI();
                container.replaceChild(newFolderList, oldFolderList);
            }
        }

        /**
         * 高亮文本中的关键词
         * @param {string} text 原始文本
         * @param {string} query 搜索关键词
         * @returns {DocumentFragment} 带高亮的文档片段
         */
        highlightText(text, query) {
            const fragment = document.createDocumentFragment();
            if (!query) {
                fragment.appendChild(document.createTextNode(text));
                return fragment;
            }

            try {
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedQuery})`, 'gi');
                const parts = text.split(regex);

                parts.forEach((part) => {
                    if (part.toLowerCase() === query.toLowerCase()) {
                        const mark = document.createElement('mark');
                        mark.textContent = part;
                        mark.style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
                        mark.style.color = 'inherit';
                        mark.style.padding = '0 2px';
                        mark.style.borderRadius = '2px';
                        fragment.appendChild(mark);
                    } else {
                        fragment.appendChild(document.createTextNode(part));
                    }
                });
            } catch (e) {
                fragment.appendChild(document.createTextNode(text));
            }
            return fragment;
        }
        /**
         * 显示标签管理对话框
         */
        showTagManagerDialog(conv = null) {
            const overlay = createElement('div', { className: 'conversations-dialog-overlay' });
            const dialog = createElement('div', { className: 'conversations-dialog conversations-dialog-tag-manager' });

            // 标题
            // 标题栏 (含关闭按钮)
            const titleRow = createElement('div', { className: 'conversations-dialog-title', style: 'display:flex; justify-content:space-between; align-items:center;' });
            titleRow.textContent = this.t('conversationsManageTags') || '管理标签';

            const closeIcon = createElement(
                'span',
                {
                    className: 'conversations-close-icon',
                    style: 'cursor:pointer; padding:4px; font-size:20px; color:#9ca3af; line-height:1; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:4px;',
                    title: this.t('close') || '关闭',
                },
                '×',
            );
            closeIcon.addEventListener('click', () => overlay.remove());
            closeIcon.addEventListener('mouseenter', () => (closeIcon.style.backgroundColor = 'var(--gh-hover, #f3f4f6)'));
            closeIcon.addEventListener('mouseleave', () => (closeIcon.style.backgroundColor = 'transparent'));

            titleRow.appendChild(closeIcon);
            dialog.appendChild(titleRow);

            const content = createElement('div', { className: 'conversations-dialog-content' });

            // 标签列表容器 (隐藏滚动条)
            const listContainer = createElement('div', {
                className: 'conversations-tag-manager-list',
                style: 'scrollbar-width: none; -ms-overflow-style: none;', // Firefox, IE
            });
            // 注入隐藏 scrollbar 的样式 (Chrome/Safari)
            const hideScrollStyle = document.createElement('style');
            hideScrollStyle.textContent = `.conversations-tag-manager-list::-webkit-scrollbar { display: none; }`;
            listContainer.appendChild(hideScrollStyle);

            const renderList = () => {
                clearElement(listContainer);
                if (!this.data.tags || this.data.tags.length === 0) {
                    listContainer.appendChild(createElement('div', { className: 'conversations-empty' }, this.t('conversationsNoTags') || '暂无标签'));
                    return;
                }

                this.data.tags.forEach((tag) => {
                    const item = createElement('div', { className: 'conversations-tag-manager-item' });

                    // 左侧：勾选框（如果有会话上下文）+ 预览
                    const left = createElement('div', { style: 'display:flex; align-items:center; gap:8px;' });

                    let checkbox = null;
                    if (conv) {
                        checkbox = createElement('input', { type: 'checkbox' });
                        checkbox.checked = conv.tagIds && conv.tagIds.includes(tag.id);
                        checkbox.addEventListener('change', () => {
                            let newTags = conv.tagIds || [];
                            if (checkbox.checked) {
                                if (!newTags.includes(tag.id)) newTags.push(tag.id);
                            } else {
                                newTags = newTags.filter((id) => id !== tag.id);
                            }
                            this.setConversationTags(conv.id, newTags);
                            this.saveData();
                            const list = this.container.querySelector(`.conversations-list[data-folder-id="${conv.folderId}"]`);
                            if (list) this.renderConversationList(conv.folderId, list);
                        });
                        checkbox.addEventListener('click', (e) => e.stopPropagation()); // 防止点击 checkbox 触发行点击
                        left.appendChild(checkbox);
                    }

                    const preview = createElement(
                        'span',
                        {
                            className: 'conversations-tag-preview',
                            style: `background-color: ${tag.color}`,
                        },
                        tag.name,
                    );
                    left.appendChild(preview);
                    item.appendChild(left);

                    // 右侧：编辑/删除按钮
                    const actions = createElement('div', { className: 'conversations-tag-actions' });

                    // 编辑逻辑简化：点击填充到底部输入框，暂不实现行内编辑
                    const editBtn = createElement(
                        'button',
                        {
                            className: 'conversations-tag-btn edit',
                            title: this.t('edit'),
                        },
                        '✎',
                    );
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // 防止触发行点击
                        nameInput.value = tag.name;
                        updateColorSelection(tag.color);
                        editingId = tag.id;
                        addBtn.textContent = this.t('conversationsUpdateTag') || '更新标签';
                    });
                    actions.appendChild(editBtn);

                    const delBtn = createElement(
                        'button',
                        {
                            className: 'conversations-tag-btn delete',
                            title: this.t('delete'),
                        },
                        '×',
                    );
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // 防止触发行点击
                        if (confirm(this.t('confirmDelete') || '确定删除?')) {
                            this.deleteTag(tag.id);
                            renderList();
                            // 刷新所有可见的会话列表
                            this.container.querySelectorAll('.conversations-list').forEach((list) => {
                                const fid = list.dataset.folderId;
                                if (fid) this.renderConversationList(fid, list);
                            });
                        }
                    });
                    actions.appendChild(delBtn);

                    item.appendChild(actions);

                    // 整行点击切换 checkbox（仅在有会话上下文时）
                    if (conv && checkbox) {
                        item.style.cursor = 'pointer';
                        item.addEventListener('click', () => {
                            checkbox.checked = !checkbox.checked;
                            checkbox.dispatchEvent(new Event('change')); // 触发 change 事件更新数据
                        });
                    }

                    listContainer.appendChild(item);
                });
            };

            content.appendChild(listContainer);

            // 新建/编辑区域
            const formSection = createElement('div', { className: 'conversations-dialog-section', style: 'border-top:1px solid #eee; padding-top:10px;' });

            let editingId = null;

            const nameInput = createElement('input', {
                type: 'text',
                className: 'conversations-dialog-input',
                placeholder: this.t('conversationsTagName') || '标签名称',
                style: 'flex:1; margin-bottom: 8px;',
            });
            // Enter 提交
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') addBtn.click();
            });
            formSection.appendChild(nameInput);

            const colorPicker = createElement('div', { className: 'conversations-color-picker' });
            let selectedColor = TAG_COLORS[0];

            // 1. 渲染 30 色预设网格
            const updateColorSelection = (color, source = 'click') => {
                if (!color.startsWith('#')) color = '#' + color;
                selectedColor = color;

                // 更新 Hex 输入框
                if (source !== 'input') {
                    hexInput.value = color;
                    hexInput.style.borderColor = '#ddd'; // Reset error state
                }

                // 更新选中状态
                // 检查是否在预设中
                const presetMatch = Array.from(colorPicker.children).find((c) => c.dataset.color && c.dataset.color.toLowerCase() === color.toLowerCase());

                Array.from(colorPicker.children).forEach((c) => c.classList.remove('selected'));

                if (presetMatch) {
                    presetMatch.classList.add('selected');
                    // 重置自定义按钮
                    customBtnInner.style.background = 'conic-gradient(from 180deg, red, yellow, lime, aqua, blue, magenta, red)';
                    customBtn.classList.remove('active-custom');
                } else {
                    // 自定义颜色选中
                    customBtnInner.style.background = color;
                    customBtn.classList.add('active-custom');
                }
            };

            TAG_COLORS.forEach((color) => {
                const colorItem = createElement('div', {
                    className: 'conversations-color-item',
                    style: `background-color: ${color}`,
                    'data-color': color,
                });
                if (color === selectedColor) colorItem.classList.add('selected');
                colorItem.addEventListener('click', () => updateColorSelection(color));
                colorPicker.appendChild(colorItem);
            });
            formSection.appendChild(colorPicker);

            // 2. 自定义颜色行 (彩虹按钮 + Hex 输入框)
            const customRow = createElement('div', {
                style: 'display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 0 4px;',
            });

            // 彩虹按钮容器
            const customBtn = createElement('div', {
                className: 'conversations-color-item custom-btn-wrapper',
                title: '自定义颜色',
                style: 'position: relative; cursor: pointer; border: 2px solid transparent; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
            });
            // 选中样式 CSS (通过 class 控制 border)
            const customBtnStyle = document.createElement('style');
            customBtnStyle.textContent = `
                .active-custom { border-color: #666 !important; transform: scale(1.1); }
            `;
            customRow.appendChild(customBtnStyle);

            const customBtnInner = createElement('div', {
                style: 'width: 100%; height: 100%; background: conic-gradient(from 180deg, red, yellow, lime, aqua, blue, magenta, red);',
            });

            const nativePicker = createElement('input', {
                type: 'color',
                style: 'position: absolute; left: -50%; top: -50%; width: 200%; height: 200%; opacity: 0; cursor: pointer;',
            });
            nativePicker.addEventListener('input', (e) => updateColorSelection(e.target.value, 'picker'));

            customBtn.appendChild(customBtnInner);
            customBtn.appendChild(nativePicker);
            customRow.appendChild(customBtn);

            // Hex 输入区域
            const hexWrapper = createElement('div', {
                style: 'display: flex; align-items: center; gap: 8px; flex: 1;',
            });
            hexWrapper.appendChild(createElement('span', { style: 'font-size: 13px; color: #666;' }, 'HEX:'));

            const hexInput = createElement('input', {
                type: 'text',
                className: 'conversations-dialog-input',
                value: selectedColor,
                placeholder: '#RRGGBB',
                style: 'flex: 1; font-family: monospace; text-transform: uppercase;',
            });

            hexInput.addEventListener('input', (e) => {
                const val = e.target.value;
                // 正则校验: #后面跟3或6位16进制字符
                const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
                if (hexRegex.test(val)) {
                    hexInput.style.borderColor = '#ddd'; // Valid
                    // 补全3位到6位
                    let expandVal = val;
                    if (val.length === 4) {
                        expandVal = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
                    }
                    updateColorSelection(expandVal, 'input');
                } else {
                    hexInput.style.borderColor = '#ef4444'; // Invalid
                }
            });

            // 失去焦点时如果无效则恢复
            hexInput.addEventListener('blur', () => {
                if (hexInput.style.borderColor === 'rgb(239, 68, 68)' || hexInput.style.borderColor === '#ef4444') {
                    hexInput.value = selectedColor;
                    hexInput.style.borderColor = '#ddd';
                }
            });

            hexWrapper.appendChild(hexInput);
            customRow.appendChild(hexWrapper);

            formSection.appendChild(customRow);

            // 初始化颜色选择状态
            updateColorSelection(selectedColor, 'init');

            const addBtn = createElement(
                'button',
                {
                    className: 'conversations-dialog-btn confirm',
                    style: 'width:100%; margin-top:8px;',
                },
                this.t('conversationsNewTag') || '新建标签',
            );

            addBtn.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (!name) return;

                let result;
                if (editingId) {
                    result = this.updateTag(editingId, name, selectedColor);
                } else {
                    result = this.createTag(name, selectedColor);
                }

                if (result) {
                    // Success
                    if (editingId) {
                        editingId = null;
                        addBtn.textContent = this.t('conversationsNewTag') || '新建标签';
                    }
                    nameInput.value = '';
                    // Reset color selection? Maybe keep it.
                    renderList();

                    // 刷新所有可见的会话列表 (因为标签修改会影响所有使用了该标签的会话)
                    this.container.querySelectorAll('.conversations-list').forEach((list) => {
                        const fid = list.dataset.folderId;
                        if (fid) this.renderConversationList(fid, list);
                    });
                }
                // If result is null, validation failed (toast already shown), keep input for user to fix
            });

            formSection.appendChild(addBtn);
            content.appendChild(formSection);
            dialog.appendChild(content);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // 渲染列表
            renderList();

            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });

            // ESC 关闭
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') overlay.remove();
            });

            // Focus input
            nameInput.focus();
        }
    }

    /**
     * 通用大纲管理器
     * 负责大纲的 UI 渲染、交互和状态管理
     * 数据源由外部适配器提供
     */
    class OutlineManager {
        constructor(config) {
            this.container = config.container;
            this.settings = config.settings;
            this.onSettingsChange = config.onSettingsChange;
            this.onJumpBefore = config.onJumpBefore; // 跳转前回调，用于保存锚点
            this.t = config.i18n || ((k) => k);

            this.state = {
                tree: null,
                treeKey: '',
                minLevel: 1,
                expandLevel: this.settings.outline?.maxLevel || 6,
                levelCounts: {},
                isAllExpanded: false,
                rawOutline: [],
                // 搜索相关状态
                searchQuery: '',
                searchLevelManual: false, // 标记用户是否在搜索时手动调整了层级
                searchResults: null, // 存储搜索匹配信息 { matchedIds: Set, relevantIds: Set }
                preSearchState: null, // 搜索前的状态快照
            };

            // 自动更新相关
            this.observer = null;
            this.updateDebounceTimer = null;
            this.isActive = false; // 标记 Tab 是否激活

            this.init();
        }

        init() {
            this.createUI();
            this.updateAutoUpdateState();
        }

        setActive(active) {
            this.isActive = active;
            this.updateAutoUpdateState();
        }

        updateAutoUpdateState() {
            // 只有当：大纲功能开启 AND 自动更新开启 AND Tab处于激活状态 时才启用 Observer
            const shouldEnable = this.settings.outline?.enabled && this.settings.outline?.autoUpdate && this.isActive;

            if (shouldEnable) {
                this.startObserver();
            } else {
                this.stopObserver();
            }
        }

        startObserver() {
            if (this.observer) return;

            // 找到聊天记录容器作为观察目标
            // 既然我们增加了 getChatContentSelectors，也许可以用那个？
            // 但对于大纲来说，只要 DOM 变了就可能产生新标题。观察 body 可能最稳妥但性能最差。
            // 观察聊天容器是折中方案。
            // 复用 SiteAdapter 的 getScrollContainer 得到的通常是主滚动容器，
            // 或者用 getResponseContainerSelector
            // 鉴于 Gemini Business 返回空，我们尝试观察 document.body，加上防抖，性能应该可控。

            this.observer = new MutationObserver(() => {
                this.triggerAutoUpdate();
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true, // 标题文字变化也要检测
            });
            console.log('Gemini Helper: Outline Auto-Update Started');
        }

        stopObserver() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
                console.log('Gemini Helper: Outline Auto-Update Stopped');
            }
            if (this.updateDebounceTimer) {
                clearTimeout(this.updateDebounceTimer);
                this.updateDebounceTimer = null;
            }
        }

        triggerAutoUpdate() {
            const interval = (this.settings.outline?.updateInterval || 5) * 1000;

            // 如果已经在等待更新，不需要重置定时器（这是 throttle/debounce 的关键区别）
            // 我们希望：只要有请求，就确保在未来某个时刻执行，但不要频繁执行
            // 策略：如果 timer 存在，说明已经安排了更新，什么都不做（让它在原定时间触发）
            // 只有 timer 不存在时，才设置一个新的
            if (!this.updateDebounceTimer) {
                this.updateDebounceTimer = setTimeout(() => {
                    this.executeAutoUpdate();
                }, interval);
            }
        }

        executeAutoUpdate() {
            if (this.updateDebounceTimer) {
                clearTimeout(this.updateDebounceTimer);
                this.updateDebounceTimer = null;
            }

            // 触发更新回调（在 GeminiHelper 中定义，实际调用 refreshOutline）
            if (this.config && this.config.onAutoUpdate) {
                this.config.onAutoUpdate();
            }

            // 发送自定义事件通知外部刷新
            window.dispatchEvent(new CustomEvent('gemini-helper-outline-auto-refresh'));
        }

        createUI() {
            const container = this.container;
            clearElement(container);

            const content = createElement('div', { className: 'outline-content' });

            // 固定工具栏
            const toolbar = createElement('div', { className: 'outline-fixed-toolbar' });

            // 第一行：按钮和搜索占位
            const row1 = createElement('div', { className: 'outline-toolbar-row' });

            // 滚动按钮
            const scrollBtn = createElement(
                'button',
                {
                    className: 'outline-toolbar-btn',
                    id: 'outline-scroll-btn',
                    title: this.t('outlineScrollBottom'),
                },
                '⬇',
            );
            scrollBtn.addEventListener('click', () => this.scrollList());
            row1.appendChild(scrollBtn);

            // 展开/折叠按钮
            const expandBtn = createElement(
                'button',
                {
                    className: 'outline-toolbar-btn',
                    id: 'outline-expand-btn',
                    title: this.t('outlineExpandAll'),
                },
                '⊕',
            );
            expandBtn.addEventListener('click', () => this.toggleExpandAll());
            row1.appendChild(expandBtn);

            // 搜索框区域
            const searchWrapper = createElement('div', { className: 'outline-search-wrapper' });

            const searchInput = createElement('input', {
                type: 'text',
                className: 'outline-search-input',
                placeholder: this.t('outlineSearch'),
                value: this.state.searchQuery,
            });

            const clearBtn = createElement(
                'button',
                {
                    className: 'outline-search-clear hidden',
                    title: this.t('clear'),
                },
                '×',
            );

            // 搜索事件处理
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value;
                clearBtn.classList.toggle('hidden', !val);

                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.handleSearch(val.trim());
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    clearBtn.classList.add('hidden');
                    this.handleSearch('');
                    searchInput.blur();
                }
            });

            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('hidden');
                this.handleSearch('');
                searchInput.focus();
            });

            searchWrapper.appendChild(searchInput);
            searchWrapper.appendChild(clearBtn);
            row1.appendChild(searchWrapper);

            toolbar.appendChild(row1);

            // 第二行：层级滑块
            const row2 = createElement('div', { className: 'outline-toolbar-row' });
            const sliderContainer = createElement('div', { className: 'outline-level-slider-container' });

            // 层级节点
            const dotsContainer = createElement('div', { className: 'outline-level-dots', id: 'outline-level-dots' });
            const levelLine = createElement('div', { className: 'outline-level-line' });
            const levelProgress = createElement('div', {
                className: 'outline-level-progress',
                id: 'outline-level-progress',
            });
            levelLine.appendChild(levelProgress);
            dotsContainer.appendChild(levelLine);

            // 创建 6 个层级节点（0 表示不展开，1-6 表示层级）
            for (let i = 0; i <= 6; i++) {
                const dot = createElement('div', {
                    className: `outline-level-dot ${i <= this.state.expandLevel ? 'active' : ''}`,
                    'data-level': i,
                });
                const tooltip = createElement('div', { className: 'outline-level-dot-tooltip' });
                if (i === 0) {
                    tooltip.textContent = '⊖'; // 不展开
                } else {
                    tooltip.textContent = `H${i}: 0`;
                }
                dot.appendChild(tooltip);
                dot.addEventListener('click', () => this.setLevel(i));
                dotsContainer.appendChild(dot);
            }

            sliderContainer.appendChild(dotsContainer);
            row2.appendChild(sliderContainer);
            toolbar.appendChild(row2);
            content.appendChild(toolbar);

            // 搜索结果统计条 (插入在工具栏和列表之间)
            const resultBar = createElement('div', {
                className: 'outline-result-bar hidden',
                id: 'outline-result-bar',
            });
            content.appendChild(resultBar);

            // 大纲列表包装器（可滚动）
            const listWrapper = createElement('div', { className: 'outline-list-wrapper', id: 'outline-list-wrapper' });
            const list = createElement('div', { className: 'outline-list', id: 'outline-list' });
            listWrapper.appendChild(list);
            content.appendChild(listWrapper);

            container.appendChild(content);
        }

        // 刷新数据
        update(outlineData) {
            const listContainer = document.getElementById('outline-list');
            if (!listContainer) return;

            clearElement(listContainer);

            if (!outlineData || outlineData.length === 0) {
                listContainer.appendChild(createElement('div', { className: 'outline-empty' }, this.t('outlineEmpty')));
                return;
            }

            // 保存原始大纲
            this.state.rawOutline = outlineData;

            // 统计各层级数量
            this.state.levelCounts = {};
            outlineData.forEach((item) => {
                this.state.levelCounts[item.level] = (this.state.levelCounts[item.level] || 0) + 1;
            });
            this.updateTooltips();

            // 智能缩进：检测最高层级
            const minLevel = Math.min(...outlineData.map((item) => item.level));
            this.state.minLevel = minLevel;

            // 在重构树之前，捕获当前的折叠状态
            const currentStateMap = {};
            if (this.state.tree) {
                this.captureTreeState(this.state.tree, currentStateMap);
            }

            // 构建树形结构
            const outlineKey = outlineData.map((i) => i.text).join('|');
            let isNewTree = false;
            // 只要 key 变了，或者是首次构建，都重新构建树
            // 注意：实时更新时 key 会不断变化，所以必须每次都重建树以包含新节点
            // 但我们需要保持用户的折叠状态
            if (this.state.treeKey !== outlineKey || !this.state.tree) {
                this.state.tree = this.buildTree(outlineData, minLevel);
                this.state.treeKey = outlineKey;
                isNewTree = true;
            }
            const tree = this.state.tree;

            // 恢复折叠状态
            if (Object.keys(currentStateMap).length > 0) {
                this.restoreTreeState(tree, currentStateMap);

                // 对于新增加的节点（在 currentStateMap 中找不到的），应用默认折叠逻辑
                // 这里需要一个递归函数只处理未初始化的节点吗？
                // 实际上 restoreTreeState 只恢复旧的。新节点默认在 buildTree 中可能是 collapsed: false (我们在 buildTree 里初始化为 false)
                // 我们需要根据 expandLevel 来初始化新节点。
                // 简单的做法：先全部应用默认 expandLevel，再用 restore 覆盖旧的？
                // 或者：restore 之后，对剩下的新节点做处理？

                // 改进策略：
                // 1. 先按默认规则初始化所有节点（基于 expandLevel）
                const displayLevel = this.state.expandLevel ?? 6;
                this.initializeCollapsedState(tree, displayLevel < minLevel ? minLevel : displayLevel);

                // 2. 再恢复用户之前的操作（覆盖默认）
                this.restoreTreeState(tree, currentStateMap);
            } else if (isNewTree && !this.state.searchQuery) {
                // 首次加载，无旧状态
                const displayLevel = this.state.expandLevel ?? 6;
                this.initializeCollapsedState(tree, displayLevel < minLevel ? minLevel : displayLevel);
            }

            // 如果在搜索模式，需要重新应用搜索标记
            if (this.state.searchQuery) {
                this.performSearch(this.state.searchQuery, false); // false = 不触发额外刷新
            }

            // 渲染
            this.refreshCurrent();
        }

        // 处理搜索输入
        handleSearch(query) {
            if (!query) {
                // === 结束搜索 ===
                // 1. 清理搜索状态
                this.state.searchQuery = '';
                this.state.searchResults = null;
                this.state.searchLevelManual = false;

                // 2. 隐藏结果条
                const resultBar = document.getElementById('outline-result-bar');
                if (resultBar) resultBar.classList.add('hidden');

                // 3. 恢复折叠状态
                if (this.state.tree) {
                    // 3.1 先重置为全局设定的层级状态（兜底）
                    const displayLevel = this.state.expandLevel ?? 6;
                    this.clearForceExpandedState(this.state.tree, displayLevel);

                    // 3.2 如果有搜索前的状态快照，则恢复它（覆盖默认状态）
                    if (this.state.preSearchState) {
                        this.restoreTreeState(this.state.tree, this.state.preSearchState);
                        this.state.preSearchState = null; // 恢复后清除快照
                    }
                }

                this.refreshCurrent();
                return;
            }

            // === 开始或更新搜索 ===

            // 如果是从无搜索状态进入搜索状态，保存当前快照
            if (!this.state.searchQuery && this.state.tree) {
                this.state.preSearchState = {};
                this.captureTreeState(this.state.tree, this.state.preSearchState);

                // Fix Issue 2: 搜索前重置所有状态（折叠所有 + 清除手动展开标记）
                // 这样搜索结果就只展示匹配的路径，不会受之前手动展开的干扰
                this.clearForceExpandedState(this.state.tree, 0);
            }

            this.state.searchQuery = query;
            this.state.searchLevelManual = false; // 重置手动层级标记
            this.performSearch(query);
            this.refreshCurrent();
        }

        // 执行搜索计算
        performSearch(query, updateUI = true) {
            if (!this.state.tree) return;

            const normalize = (str) => str.toLowerCase();
            const normalizedQuery = normalize(query);
            let matchCount = 0;

            // 递归标记树
            // 返回值: { isMatch: boolean, hasMatchedDescendant: boolean }
            const traverse = (nodes) => {
                let hasAnyMatch = false;
                nodes.forEach((node) => {
                    const isMatch = normalize(node.text).includes(normalizedQuery);
                    if (isMatch) matchCount++;

                    node.isMatch = isMatch;

                    if (node.children && node.children.length > 0) {
                        const childResult = traverse(node.children);
                        node.hasMatchedDescendant = childResult;
                    } else {
                        node.hasMatchedDescendant = false;
                    }

                    // 如果有匹配子项，自动展开
                    if (node.hasMatchedDescendant) {
                        node.collapsed = false;
                        // node.forceExpanded = true; // 可选：是否强制标记为展开? 暂时不需要，只要 collapsed=false 即可
                    }

                    if (isMatch || node.hasMatchedDescendant) {
                        hasAnyMatch = true;
                    }
                });
                return hasAnyMatch;
            };

            traverse(this.state.tree);

            // 更新结果条
            if (updateUI) {
                const resultBar = document.getElementById('outline-result-bar');
                if (resultBar) {
                    resultBar.textContent = `${matchCount} ${this.t('outlineSearchResult')}`;
                    resultBar.classList.remove('hidden');
                }
            }
        }

        // 内部刷新（用于交互更新）
        refreshCurrent() {
            const listContainer = document.getElementById('outline-list');
            if (this.state.tree && listContainer) {
                clearElement(listContainer);

                // 确定当前的显示层级上限
                // 如果在搜索模式且未手动调整，显示所有层级 (Infinity)
                // 否则使用设定的 expandLevel
                let displayLevel;
                if (this.state.searchQuery && !this.state.searchLevelManual) {
                    displayLevel = 100; // 足够大以显示所有
                } else {
                    displayLevel = this.state.expandLevel ?? 6;
                }

                if (displayLevel < this.state.minLevel) {
                    displayLevel = this.state.minLevel;
                }

                this.renderItems(listContainer, this.state.tree, this.state.minLevel, displayLevel);
            }
        }

        // 构建树形结构
        buildTree(outline, minLevel) {
            const tree = [];
            const stack = [];

            outline.forEach((item, index) => {
                const relativeLevel = item.level - minLevel + 1;
                const node = {
                    ...item,
                    relativeLevel,
                    index,
                    children: [],
                    collapsed: false,
                };

                // 找到父节点
                while (stack.length > 0 && stack[stack.length - 1].relativeLevel >= relativeLevel) {
                    stack.pop();
                }

                if (stack.length === 0) {
                    tree.push(node);
                } else {
                    stack[stack.length - 1].children.push(node);
                }

                stack.push(node);
            });

            return tree;
        }

        // 渲染大纲项
        renderItems(container, items, minLevel, displayLevel, parentCollapsed = false, parentForceExpanded = false) {
            items.forEach((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isTopLevel = item.level === minLevel;

                let shouldShow;

                // 计算可见性
                const isLevelAllowed = item.level <= displayLevel || parentForceExpanded;

                if (isTopLevel) {
                    // 顶层节点逻辑
                    if (this.state.searchQuery) {
                        // Fix: 搜索模式下严控顶层显示，无论是否有手动层级操作
                        // 确保 Expand All 不会将不相关的顶层节点展示出来
                        shouldShow = item.isMatch || item.hasMatchedDescendant;
                    } else {
                        // 普通模式：只需存在即可
                        shouldShow = true;
                    }
                } else {
                    // 非顶层节点
                    const isRelevant = !this.state.searchQuery || item.isMatch || item.hasMatchedDescendant || parentForceExpanded;
                    // 注意：parentForceExpanded 意味着父级被手动点开了，此时应该显示子级（即使不匹配）

                    // 综合判断
                    if (this.state.searchQuery && !this.state.searchLevelManual) {
                        // 纯搜索模式：相关即显示，忽略层级
                        // 但如果 parentForceExpanded，也显示
                        shouldShow = isRelevant && !parentCollapsed;
                    } else if (this.state.searchQuery && this.state.searchLevelManual) {
                        // 搜索且有层级限制
                        // 必须相关 AND 层级允许
                        shouldShow = isRelevant && isLevelAllowed && !parentCollapsed;
                    } else {
                        // 普通模式
                        shouldShow = isLevelAllowed && !parentCollapsed;
                    }
                }

                // 最终修正：如果父级折叠了，那肯定看不到
                if (parentCollapsed) shouldShow = false;

                const itemEl = createElement('div', {
                    className: `outline-item outline-level-${item.relativeLevel}`,
                    'data-index': item.index,
                    'data-level': item.relativeLevel,
                });

                const isExpanded = hasChildren && !item.collapsed;
                const toggle = createElement(
                    'span',
                    {
                        className: `outline-item-toggle ${hasChildren ? (isExpanded ? 'expanded' : '') : 'invisible'}`,
                    },
                    '▸',
                );

                if (hasChildren) {
                    toggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        item.collapsed = !item.collapsed;
                        if (!item.collapsed) {
                            item.forceExpanded = true;
                        }
                        toggle.classList.toggle('expanded', !item.collapsed);
                        this.refreshCurrent();
                    });
                }
                itemEl.appendChild(toggle);

                const textEl = createElement('span', { className: 'outline-item-text' });

                // 高亮处理
                if (this.state.searchQuery && item.isMatch) {
                    try {
                        const query = this.state.searchQuery;
                        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(${escapedQuery})`, 'gi');
                        const parts = item.text.split(regex);

                        clearElement(textEl);
                        parts.forEach((part) => {
                            if (part.toLowerCase() === query.toLowerCase()) {
                                const mark = document.createElement('mark');
                                mark.textContent = part;
                                mark.style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
                                mark.style.color = 'inherit';
                                mark.style.padding = '0';
                                mark.style.borderRadius = '2px';
                                textEl.appendChild(mark);
                            } else {
                                textEl.appendChild(document.createTextNode(part));
                            }
                        });
                    } catch (e) {
                        textEl.textContent = item.text;
                    }
                } else {
                    textEl.textContent = item.text;
                }
                itemEl.appendChild(textEl);

                itemEl.addEventListener('click', () => {
                    let targetElement = item.element;

                    // 1. 检查元素是否有效
                    if (!targetElement || !targetElement.isConnected) {
                        // 尝试重新查找
                        // 简单的重新查找策略：在文档中根据文本内容找一个最相似的 H? 标签
                        // 这是一个兜底，Gemini 动态渲染可能会导致元素重建
                        const headings = document.querySelectorAll(`h${item.level}`);
                        for (const h of headings) {
                            if (h.textContent.trim() === item.text) {
                                targetElement = h;
                                break;
                            }
                        }
                    }

                    if (targetElement && targetElement.isConnected) {
                        // 跳转前回调（用于保存当前位置为锚点）
                        if (this.onJumpBefore) {
                            this.onJumpBefore();
                        }
                        // 传入 __bypassLock: true 以绕过 ScrollLockManager 的拦截
                        // 恢复 behavior: 'smooth'，因为我们已经处理了元素重新查找，应该可以兼容
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', __bypassLock: true });
                        targetElement.classList.add('outline-highlight');
                        setTimeout(() => targetElement.classList.remove('outline-highlight'), 2000);
                    } else {
                        console.warn('Gemini Helper: Outline item element lost and not found:', item.text);
                    }
                });

                if (!shouldShow) {
                    itemEl.classList.add('outline-hidden');
                }

                container.appendChild(itemEl);

                if (hasChildren) {
                    const childParentCollapsed = item.collapsed || parentCollapsed;
                    this.renderItems(container, item.children, minLevel, displayLevel, childParentCollapsed, item.forceExpanded || parentForceExpanded);
                }
            });
        }

        // 初始化树的折叠状态
        initializeCollapsedState(items, displayLevel) {
            items.forEach((item) => {
                if (item.children && item.children.length > 0) {
                    const allChildrenHidden = item.children.every((child) => child.level > displayLevel);
                    item.collapsed = allChildrenHidden;
                    this.initializeCollapsedState(item.children, displayLevel);
                } else {
                    item.collapsed = false;
                }
            });
        }

        // 滚动列表
        scrollList() {
            const wrapper = document.getElementById('outline-list-wrapper');
            const btn = document.getElementById('outline-scroll-btn');
            if (!wrapper || !btn) return;

            const isAtBottom = wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 10;
            if (isAtBottom) {
                wrapper.scrollTo({ top: 0, behavior: 'smooth' });
                btn.textContent = '⬇';
                btn.title = this.t('outlineScrollBottom');
            } else {
                wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
                btn.textContent = '⬆';
                btn.title = this.t('outlineScrollTop');
            }
        }

        // 展开/折叠全部
        toggleExpandAll() {
            const btn = document.getElementById('outline-expand-btn');
            if (!btn) return;

            if (this.state.isAllExpanded) {
                const minLevel = this.state.minLevel || 1;
                this.setLevel(minLevel);
            } else {
                const maxActualLevel = Math.max(...Object.keys(this.state.levelCounts).map(Number), 1);
                this.setLevel(maxActualLevel);
            }
        }

        // 设置层级
        setLevel(level) {
            this.state.expandLevel = level;
            // 更新外部设置
            if (this.settings.outline) {
                this.settings.outline.maxLevel = level;
                if (this.onSettingsChange) this.onSettingsChange();
            }

            // 清除强制展开状态
            if (this.state.tree) {
                this.clearForceExpandedState(this.state.tree, level);
            }

            // 更新 UI
            const dots = document.querySelectorAll('.outline-level-dot');
            dots.forEach((dot) => {
                const dotLevel = parseInt(dot.dataset.level, 10);
                dot.classList.toggle('active', dotLevel <= level);
            });

            const progress = document.getElementById('outline-level-progress');
            if (progress) {
                progress.style.width = `${(level / 6) * 100}%`;
            }

            // 如果在搜索状态下调整了 Slider，标记为手动
            if (this.state.searchQuery) {
                this.state.searchLevelManual = true;
                this.refreshCurrent();
            } else {
                // 非搜索状态，这里可能不需要 refreshCurrent，因为 updateTooltips 或其他地方可能触发？
                // 原有逻辑似乎没有显式调用 refreshCurrent，可能是 toggleExpnadAll 调用的？
                // 不，setLevel 是被点击调用的。所以必须刷新。
                this.refreshCurrent();
            }

            const btn = document.getElementById('outline-expand-btn');
            const maxActualLevel = Math.max(...Object.keys(this.state.levelCounts).map(Number), 1);
            if (btn) {
                if (level >= maxActualLevel) {
                    btn.textContent = '⊖';
                    btn.title = this.t('outlineCollapseAll');
                    this.state.isAllExpanded = true;
                } else {
                    btn.textContent = '⊕';
                    btn.title = this.t('outlineExpandAll');
                    this.state.isAllExpanded = false;
                }
            }

            this.refreshCurrent();
        }

        // 清除强制展开状态
        clearForceExpandedState(items, displayLevel) {
            items.forEach((item) => {
                item.forceExpanded = false;
                if (item.children && item.children.length > 0) {
                    const allChildrenHidden = item.children.every((child) => child.level > displayLevel);
                    item.collapsed = allChildrenHidden;
                    this.clearForceExpandedState(item.children, displayLevel);
                } else {
                    item.collapsed = false;
                }
            });
        }

        // 更新提示
        updateTooltips() {
            const dots = document.querySelectorAll('.outline-level-dot');
            dots.forEach((dot) => {
                const level = parseInt(dot.dataset.level, 10);
                const tooltip = dot.querySelector('.outline-level-dot-tooltip');
                if (tooltip && level > 0) {
                    const count = this.state.levelCounts[level] || 0;
                    tooltip.textContent = `H${level}: ${count}`;
                }
            });
        }

        // 捕获树的状态（expanded/collapsed）
        captureTreeState(nodes, stateMap) {
            nodes.forEach((node) => {
                // 使用 level + text 作为 key
                // 注意：如果有完全相同的标题在同一级，可能会冲突，但在当前场景下可以接受
                const key = `${node.level}_${node.text}`;
                stateMap[key] = {
                    collapsed: node.collapsed,
                    forceExpanded: node.forceExpanded,
                };

                if (node.children && node.children.length > 0) {
                    this.captureTreeState(node.children, stateMap);
                }
            });
        }

        // 恢复树的状态
        restoreTreeState(nodes, stateMap) {
            nodes.forEach((node) => {
                const key = `${node.level}_${node.text}`;
                const state = stateMap[key];
                if (state) {
                    node.collapsed = state.collapsed;
                    // 只有当明确标记为 forceExpanded 时才恢复它
                    if (state.forceExpanded !== undefined) {
                        node.forceExpanded = state.forceExpanded;
                    }
                }

                if (node.children && node.children.length > 0) {
                    this.restoreTreeState(node.children, stateMap);
                }
            });
        }
    }

    /**
     * 设置管理器
     * 负责所有设置的加载、保存和默认值合并
     */
    class SettingsManager {
        /**
         * 加载设置
         * @param {SiteRegistry} registry 站点注册表
         * @param {SiteAdapter} currentAdapter 当前适配器
         * @returns {Object} 完整的设置对象
         */
        load(registry, currentAdapter) {
            const widthSettings = GM_getValue(SETTING_KEYS.PAGE_WIDTH, DEFAULT_WIDTH_SETTINGS);
            const outlineSettings = GM_getValue(SETTING_KEYS.OUTLINE, DEFAULT_OUTLINE_SETTINGS);
            const promptsSettings = GM_getValue(SETTING_KEYS.PROMPTS_SETTINGS, DEFAULT_PROMPTS_SETTINGS);
            let tabOrder = GM_getValue(SETTING_KEYS.TAB_ORDER, DEFAULT_TAB_ORDER);

            // 兼容老用户：确保所有默认 Tab 都在 tabOrder 中
            // 如果有新增的 Tab（如 conversations），自动添加到 settings 之前
            const missingTabs = DEFAULT_TAB_ORDER.filter((tab) => !tabOrder.includes(tab));
            if (missingTabs.length > 0) {
                const settingsIndex = tabOrder.indexOf('settings');
                if (settingsIndex !== -1) {
                    // 在 settings 之前插入缺失的 Tab
                    tabOrder = [...tabOrder.slice(0, settingsIndex), ...missingTabs, ...tabOrder.slice(settingsIndex)];
                } else {
                    // 如果没有 settings，直接追加
                    tabOrder = [...tabOrder, ...missingTabs];
                }
                // 保存更新后的 tabOrder
                GM_setValue(SETTING_KEYS.TAB_ORDER, tabOrder);
            }

            // 加载模型锁定设置（按站点隔离，但一次性加载所有站点的配置）
            const savedModelLockSettings = GM_getValue(SETTING_KEYS.MODEL_LOCK, {});
            const mergedModelLockConfig = {};

            // 兼容旧的单一适配器模式（防御性代码）
            const currentSiteId = currentAdapter ? currentAdapter.getSiteId() : 'unknown';

            // 遍历所有注册的适配器，合并默认配置和保存的配置
            if (registry && registry.adapters) {
                registry.adapters.forEach((adapter) => {
                    const siteId = adapter.getSiteId();
                    const defaults = adapter.getDefaultLockSettings();
                    mergedModelLockConfig[siteId] = { ...defaults, ...(savedModelLockSettings[siteId] || {}) };
                });
            } else if (currentAdapter) {
                const defaults = currentAdapter.getDefaultLockSettings();
                mergedModelLockConfig[currentSiteId] = { ...defaults, ...(savedModelLockSettings[currentSiteId] || {}) };
            }

            // 确保大纲设置有默认值 (合并默认配置与保存的配置)
            const mergedOutlineSettings = { ...DEFAULT_OUTLINE_SETTINGS, ...outlineSettings };

            return {
                clearTextareaOnSend: GM_getValue(SETTING_KEYS.CLEAR_TEXTAREA_ON_SEND, false), // 默认关闭
                modelLockConfig: mergedModelLockConfig,
                pageWidth: widthSettings[currentSiteId] || DEFAULT_WIDTH_SETTINGS[currentSiteId],
                outline: mergedOutlineSettings,
                prompts: promptsSettings,
                tabOrder: tabOrder,
                preventAutoScroll: GM_getValue('gemini_prevent_auto_scroll', false),
                collapsedButtonsOrder: GM_getValue(SETTING_KEYS.COLLAPSED_BUTTONS_ORDER, DEFAULT_COLLAPSED_BUTTONS_ORDER),
                tabSettings: { ...DEFAULT_TAB_SETTINGS, ...GM_getValue(SETTING_KEYS.TAB_SETTINGS, {}) },
                readingHistory: { ...DEFAULT_READING_HISTORY_SETTINGS, ...GM_getValue(SETTING_KEYS.READING_HISTORY, {}) },
                conversations: { enabled: true },
                // 默认面板状态
                defaultPanelState: GM_getValue(SETTING_KEYS.DEFAULT_PANEL_STATE, true),
                // 自动隐藏面板
                autoHidePanel: GM_getValue(SETTING_KEYS.AUTO_HIDE_PANEL, false),
                // 主题模式 (null=跟随系统/默认, 'light', 'dark')
                themeMode: GM_getValue(`gemini_theme_mode_${currentAdapter ? currentAdapter.getSiteId() : 'default'}`, null),
            };
        }
        /**
         * 保存设置
         * @param {Object} settings 当前设置对象
         * @param {SiteAdapter} currentAdapter 当前适配器
         */
        save(settings, currentAdapter) {
            GM_setValue(SETTING_KEYS.CLEAR_TEXTAREA_ON_SEND, settings.clearTextareaOnSend);

            // 保存模型锁定设置（保存整个字典）
            GM_setValue(SETTING_KEYS.MODEL_LOCK, settings.modelLockConfig);

            // 保存标签页设置
            GM_setValue(SETTING_KEYS.TAB_SETTINGS, settings.tabSettings);

            // 保存页面宽度设置
            const allWidthSettings = GM_getValue(SETTING_KEYS.PAGE_WIDTH, DEFAULT_WIDTH_SETTINGS);
            if (currentAdapter) {
                allWidthSettings[currentAdapter.getSiteId()] = settings.pageWidth;
            }
            GM_setValue(SETTING_KEYS.PAGE_WIDTH, allWidthSettings);
            // 保存大纲设置
            GM_setValue(SETTING_KEYS.OUTLINE, settings.outline);
            // 保存提示词设置
            GM_setValue(SETTING_KEYS.PROMPTS_SETTINGS, settings.prompts);
            // 保存 Tab 顺序
            GM_setValue(SETTING_KEYS.TAB_ORDER, settings.tabOrder);
            // 保存防滚动设置
            GM_setValue('gemini_prevent_auto_scroll', settings.preventAutoScroll);
            // 保存阅读历史设置
            GM_setValue(SETTING_KEYS.READING_HISTORY, settings.readingHistory);
            // 保存会话设置
            if (settings.conversations) {
                GM_setValue('gemini_conversations_settings', settings.conversations);
            }
            GM_setValue('gemini_default_panel_state', settings.defaultPanelState);
            GM_setValue('gemini_default_auto_hide', settings.autoHidePanel);
            // 保存主题模式 (使用站点特有的 Key)
            if (currentAdapter) {
                GM_setValue(`gemini_theme_mode_${currentAdapter.getSiteId()}`, settings.themeMode);
            } else {
                GM_setValue('gemini_theme_mode_default', settings.themeMode);
            }
            // 保存折叠面板按钮顺序
            GM_setValue(SETTING_KEYS.COLLAPSED_BUTTONS_ORDER, settings.collapsedButtonsOrder);
        }
    }

    /**
     * Gemini 助手核心类
     * 管理提示词、设置和 UI 界面
     */
    class GeminiHelper {
        constructor(siteRegistry) {
            this.prompts = this.loadPrompts();
            this.registry = siteRegistry;
            // 保持 siteAdapter 引用以便兼容旧代码，指向当前匹配的站点
            this.siteAdapter = siteRegistry.getCurrent();
            this.selectedPrompt = null;
            this.isScrolling = false; // 滚动状态锁
            this.anchorScrollTop = null; // 阅读锚点位置
            this.lang = detectLanguage(); // 当前语言
            this.i18n = I18N[this.lang]; // 当前语言文本
            this.settingsManager = new SettingsManager();
            this.settings = this.loadSettings(); // 加载设置

            // Restore saved theme preference if exists
            if (this.settings.themeMode) {
                this.applyTheme(this.settings.themeMode);
            }

            // 根据设置初始化面板折叠状态 (默认显示面板 -> !collapsed)
            this.isCollapsed = !this.settings.defaultPanelState;

            // 初始化当前 Tab：优先使用设置的第一个 Tab
            this.currentTab = this.settings.tabOrder && this.settings.tabOrder.length > 0 ? this.settings.tabOrder[0] : 'prompts';

            // 兜底：如果首个 Tab 被禁用，则回退到 safe tab
            const isOutlineDisabled = this.currentTab === 'outline' && !this.settings.outline?.enabled;
            const isPromptsDisabled = this.currentTab === 'prompts' && !this.settings.prompts?.enabled;

            if (isOutlineDisabled || isPromptsDisabled) {
                // 尝试找一个可用的 tab
                const availableTab = this.settings.tabOrder.find((t) => {
                    if (t === 'outline') return this.settings.outline?.enabled;
                    if (t === 'prompts') return this.settings.prompts?.enabled;
                    return true; // settings always enabled
                });
                this.currentTab = availableTab || 'settings';
            }

            // 初始化核心功能管理器
            this.scrollManager = new ScrollManager(this.siteAdapter);
            this.readingProgressManager = new ReadingProgressManager(this.settings, this.scrollManager, (k) => this.t(k));
            this.anchorManager = new AnchorManager(this.scrollManager, (k) => this.t(k));

            // 绑定锚点状态变化更新 UI
            this.anchorManager.bindUI((hasAnchor) => this.updateAnchorButtonState(hasAnchor));

            // 初始化滚动锁定管理器
            this.scrollLockManager = new ScrollLockManager(this.siteAdapter);
            // 根据设置初始化状态，前提是当前站点支持
            if (this.settings.preventAutoScroll && this.siteAdapter.supportsScrollLock()) {
                this.scrollLockManager.setEnabled(true);
            }

            this.outlineManager = null;
            this.init();
        }

        // 获取翻译文本
        t(key) {
            return this.i18n[key] || key;
        }

        loadPrompts() {
            const saved = GM_getValue('universal_prompts', null);
            if (!saved) {
                GM_setValue('universal_prompts', DEFAULT_PROMPTS);
                return DEFAULT_PROMPTS;
            }
            return saved;
        }

        savePrompts() {
            GM_setValue('universal_prompts', this.prompts);
        }

        // 加载设置
        loadSettings() {
            return this.settingsManager.load(this.registry, this.siteAdapter);
        }

        // 保存设置
        saveSettings() {
            this.settingsManager.save(this.settings, this.siteAdapter);
        }

        addPrompt(prompt) {
            prompt.id = 'custom_' + Date.now();
            this.prompts.push(prompt);
            this.savePrompts();
            this.refreshPromptList();
            this.refreshCategories();
        }

        updatePrompt(id, updatedPrompt) {
            const index = this.prompts.findIndex((p) => p.id === id);
            if (index !== -1) {
                this.prompts[index] = { ...this.prompts[index], ...updatedPrompt };
                this.savePrompts();
                this.refreshPromptList();
                this.refreshCategories();
            }
        }

        deletePrompt(id) {
            this.prompts = this.prompts.filter((p) => p.id !== id);
            this.savePrompts();
            this.refreshPromptList();
            this.refreshCategories();
        }

        getCategories() {
            const categories = new Set();
            this.prompts.forEach((p) => {
                if (p.category) categories.add(p.category);
            });
            return Array.from(categories);
        }

        init() {
            this.createStyles();
            this.createUI();
            this.monitorTheme();
            this.bindEvents();
            // 初始化锚点按钮状态（初始时没有锚点，应置灰）
            this.updateAnchorButtonState(false);
            this.siteAdapter.findTextarea();
            // 对于 Gemini Business，根据设置决定是否在初始化时插入零宽字符
            const currentSiteId = this.siteAdapter.getSiteId();
            const adapterOptions = {
                clearOnInit: this.siteAdapter instanceof GeminiBusinessAdapter ? this.settings.clearTextareaOnSend : false,
                modelLockConfig: this.settings.modelLockConfig[currentSiteId], // 传递当前站点的配置
            };
            // 绑定新对话监听 (点击按钮或快捷键)
            this.siteAdapter.bindNewChatListeners(() => {
                console.log('Gemini Helper: New chat detected, re-initializing...');
                // 使用当前内存中的设置重新应用配置（无需重新加载）
                const currentSiteId = this.siteAdapter.getSiteId();
                const adapterOptions = {
                    clearOnInit: this.siteAdapter instanceof GeminiBusinessAdapter ? this.settings.clearTextareaOnSend : false,
                    modelLockConfig: this.settings.modelLockConfig[currentSiteId],
                };
                this.siteAdapter.afterPropertiesSet(adapterOptions);
                // 重新应用滚动锁定状态
                if (this.scrollLockManager) {
                    this.scrollLockManager.siteAdapter = this.siteAdapter; // 确保适配器更新
                    this.scrollLockManager.setEnabled(this.settings.preventAutoScroll);
                }

                // 重新应用宽度样式 (防止页面重置)
                if (this.widthStyleManager) {
                    this.widthStyleManager.apply();
                }
            });

            this.siteAdapter.afterPropertiesSet(adapterOptions);
            // 初始化时执行锚点恢复和清理
            if (this.settings.readingHistory.persistence) {
                // 延迟触发以确保页面加载完成
                setTimeout(() => {
                    this.restoreReadingProgress();
                    this.cleanupReadingHistory();
                }, 2000);
            }

            // 创建并应用页面宽度样式
            this.widthStyleManager = new WidthStyleManager(this.siteAdapter, this.settings.pageWidth);
            this.widthStyleManager.apply();

            // 初始化标签页重命名管理器
            this.tabRenameManager = new TabRenameManager(this.siteAdapter, this.settings, (key) => this.t(key));
            if (this.settings.tabSettings?.autoRenameTab) {
                this.tabRenameManager.start();
            }

            // 监听自定义大纲自动刷新事件
            window.addEventListener('gemini-helper-outline-auto-refresh', () => {
                this.refreshOutline();
            });

            // 如果初始 Tab 是大纲，立即刷新内容
            if (this.currentTab === 'outline') {
                // 稍微延迟一下，确保 DOM 已经就绪
                setTimeout(() => this.refreshOutline(), 500);
            }
        }

        createStyles() {
            const existingStyle = document.getElementById('gemini-helper-styles');
            if (existingStyle) existingStyle.remove();

            const colors = this.siteAdapter.getThemeColors();
            const gradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;

            const style = document.createElement('style');
            style.id = 'gemini-helper-styles';
            style.textContent = `
                /* CSS Variables Definition (Global Scope) */
                :root {
                    --gh-bg: #ffffff;
                    --gh-bg-secondary: #f9fafb;
                    --gh-text: #1f2937;
                    --gh-text-secondary: #6b7280;
                    --gh-border: #e5e7eb;
                    --gh-hover: #f3f4f6;
                    --gh-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    --gh-input-bg: #ffffff;
                    --gh-input-border: #d1d5db;
                    --gh-active-bg: #e5e7eb;
                    --gh-danger: #ef4444;
                    --gh-gradient: ${gradient};
                    
                    /* Semantic Variables */
                    --gh-header-bg: ${gradient};
                    --gh-folder-bg-default: #e0f2fe;
                    --gh-folder-bg-expanded: #c7d2fe;
                    --gh-border-active: #6366f1;
                    --gh-tag-active-bg: ${colors.primary};
                    
                    /* Folder Preset Colors */
                    --gh-folder-bg-0: #fef9e7;
                    --gh-folder-bg-1: #fdf2f8;
                    --gh-folder-bg-2: #eff6ff;
                    --gh-folder-bg-3: #ecfdf5;
                    --gh-folder-bg-4: #faf5ff;
                    --gh-folder-bg-5: #fefce8;
                    --gh-folder-bg-6: #ecfeff;
                    --gh-folder-bg-7: #fdf4ff;
                }

                body[data-gh-mode="dark"] {
                    --gh-bg: #1e1e1e;
                    --gh-bg-secondary: #0b0b0b;
                    --gh-text: #e3e3e3;
                    --gh-text-secondary: #a0a0a0;
                    --gh-border: #333333;
                    --gh-hover: #262626;
                    --gh-shadow: 0 10px 40px rgba(0,0,0,0.6);
                    --gh-input-bg: #262626;
                    --gh-input-border: #404040;
                    --gh-active-bg: #333333;

                    /* Dark Mode Semantic Overrides */
                    --gh-header-bg: #1e1e1e;
                    --gh-folder-bg-default: rgba(66, 133, 244, 0.15);
                    --gh-folder-bg-expanded: rgba(66, 133, 244, 0.3);
                    --gh-border-active: #818cf8;
                    --gh-tag-active-bg: rgba(66, 133, 244, 0.6);

                    /* Folder Preset Colors (Dark Mode Translucent) */
                    --gh-folder-bg-0: rgba(253, 224, 71, 0.15);
                    --gh-folder-bg-1: rgba(244, 114, 182, 0.15);
                    --gh-folder-bg-2: rgba(96, 165, 250, 0.15);
                    --gh-folder-bg-3: rgba(52, 211, 153, 0.15);
                    --gh-folder-bg-4: rgba(167, 139, 250, 0.15);
                    --gh-folder-bg-5: rgba(253, 224, 71, 0.1);
                    --gh-folder-bg-6: rgba(34, 211, 238, 0.15);
                    --gh-folder-bg-7: rgba(232, 121, 249, 0.15);
                    --gh-folder-bg-6: rgba(34, 211, 238, 0.15);
                    --gh-folder-bg-7: rgba(232, 121, 249, 0.15);
                }

                /* Dark Mode Tab Overrides */
                body[data-gh-mode="dark"] .prompt-panel-tab {
                    border-top: 3px solid transparent;
                    border-bottom: 1px solid transparent;
                    margin-bottom: -1px;
                }
                body[data-gh-mode="dark"] .prompt-panel-tab.active {
                    border-top-color: var(--gh-tag-active-bg);
                    border-bottom-color: var(--gh-bg);
                    background: var(--gh-bg);
                }

                /* 主面板样式 */
                #gemini-helper-panel {
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    transform: translateY(-50%);
                    width: 320px;
                    height: 80vh;
                    min-height: 600px;
                    background: var(--gh-bg, white);
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    transition: all 0.3s ease;
                    border: 1px solid var(--gh-border, #e0e0e0);
                }
                #gemini-helper-panel.collapsed { display: none; }
                .prompt-panel-header {
                    padding: 12px 14px;
                    background: var(--gh-header-bg);
                    color: white;
                    border-radius: 12px 12px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                }
                .prompt-panel-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap; flex-shrink: 0; }
                .site-indicator { font-size: 10px; padding: 2px 5px; background: rgba(255,255,255,0.2); border-radius: 4px; margin-left: 4px; white-space: nowrap; }
                .prompt-panel-controls { display: flex; gap: 4px; align-items: center; }
                .prompt-panel-btn {
                    background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px;
                    border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s; font-size: 14px;
                }
                .prompt-panel-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }
                .prompt-search-bar { padding: 12px; border-bottom: 1px solid var(--gh-border, #e5e7eb); background: var(--gh-bg-secondary, #f9fafb); }
                .prompt-search-input {
                    width: 100%; padding: 8px 12px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 8px; font-size: 14px;
                    transition: all 0.2s; box-sizing: border-box;
                    background: var(--gh-input-bg, #ffffff); color: var(--gh-text, #1f2937);
                }
                .prompt-search-input:focus { outline: none; border-color: ${colors.primary}; }
                .prompt-categories { padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap; background: var(--gh-bg, white); border-bottom: 1px solid var(--gh-border, #e5e7eb); }
                .category-tag {
                    padding: 4px 10px; background: var(--gh-hover, #f3f4f6); border-radius: 12px; font-size: 12px; color: #4b5563;
                    cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
                }
                .category-tag:hover { background: var(--gh-border, #e5e7eb); }
                .category-tag.active {
                    background: var(--gh-tag-active-bg); color: white; border-color: var(--gh-tag-active-bg);
                }
                .prompt-list { flex: 1; overflow-y: auto; padding: 8px; }
                .prompt-item {
                    background: var(--gh-bg, white); border: 1px solid var(--gh-border, #e5e7eb); border-radius: 8px; padding: 12px; margin-bottom: 8px;
                    cursor: pointer; transition: all 0.2s; position: relative;
                }
                .prompt-item:hover {
                    border-color: ${colors.primary};
                    box-shadow: 0 4px 12px rgba(66,133,244,0.15);
                    transform: translateY(-2px);
                }
                .prompt-item.selected {
                    background: linear-gradient(135deg, #e8f0fe 0%, #f1f8e9 100%);
                    border-color: ${colors.primary};
                }
                .prompt-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
                .prompt-item-title { font-weight: 600; font-size: 14px; color: var(--gh-text, #1f2937); flex: 1; }
                .prompt-item-category { font-size: 11px; padding: 2px 6px; background: var(--gh-hover, #f3f4f6); border-radius: 4px; color: var(--gh-text-secondary, #6b7280); }
                .prompt-item-content { font-size: 13px; color: var(--gh-text-secondary, #6b7280); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .prompt-item-actions { position: absolute; top: 8px; right: 8px; display: none; gap: 4px; }
                .prompt-item:hover .prompt-item-actions { display: flex; }
                .prompt-action-btn {
                    width: 24px; height: 24px; border: none; background: var(--gh-bg, white); border-radius: 4px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 12px;
                }
                .prompt-action-btn:hover { background: var(--gh-hover, #f3f4f6); transform: scale(1.1); }
                .prompt-item.dragging { opacity: 0.5; }
                .add-prompt-btn {
                    margin: 12px; padding: 10px; background: var(--gh-header-bg);
                    color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
                    transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
                }
                .add-prompt-btn:hover { transform: translateY(-2px); }
                /* 模态框 */
                .prompt-modal {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center; z-index: 1000000; animation: fadeIn 0.2s;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .prompt-modal-content {
                    background: var(--gh-bg, white); border-radius: 12px; width: 90%; max-width: 500px; padding: 24px; animation: slideUp 0.3s;
                }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .prompt-modal-header { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: var(--gh-text, #1f2937); }
                .prompt-form-group { margin-bottom: 16px; }
                .prompt-form-label { display: block; font-size: 14px; font-weight: 500; color: var(--gh-text, #374151); margin-bottom: 6px; }
                .prompt-form-input, .prompt-form-textarea {
                    width: 100%; padding: 8px 12px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 6px; font-size: 14px;
                    transition: all 0.2s; box-sizing: border-box;
                    background: var(--gh-input-bg, #ffffff); color: var(--gh-text, #1f2937);
                }
                .prompt-form-textarea { min-height: 100px; resize: vertical; font-family: inherit; }
                .prompt-form-input:focus, .prompt-form-textarea:focus { outline: none; border-color: ${colors.primary}; }
                .prompt-modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
                .prompt-modal-btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; }
                .prompt-modal-btn.primary { background: var(--gh-header-bg); color: white; border: 1px solid rgba(255,255,255,0.2); }
                .prompt-modal-btn.secondary { background: var(--gh-hover, #f3f4f6); color: #4b5563; }
                /* 选中的提示词显示栏 */
                .selected-prompt-bar {
                    position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
                    background: var(--gh-header-bg);
                    color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; display: none;
                    align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(66,133,244,0.3);
                    z-index: 999998; animation: slideInUp 0.3s;
                }
                @keyframes slideInUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                .selected-prompt-bar.show { display: flex; }
                .selected-prompt-text { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .clear-prompt-btn {
                    background: rgba(255,255,255,0.2); border: none; color: white; width: 20px; height: 20px;
                    border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
                }
                .quick-prompt-btn {
                    width: 44px; height: 44px;
                    background: var(--gh-header-bg);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;
                    font-size: 18px; cursor: pointer; box-shadow: 0 4px 12px rgba(66,133,244,0.3);
                    border: none; transition: transform 0.3s;
                }
                .quick-prompt-btn:hover { transform: scale(1.1); }
                /* 快捷按钮组（收起时显示） */
                .quick-btn-group {
                    position: fixed; bottom: 120px; right: 30px;
                    display: flex; flex-direction: column; gap: 10px;
                    z-index: 999997; transition: opacity 0.3s;
                }
                .quick-btn-group.hidden { display: none; }
                .hidden { display: none !important; }
                .outline-hidden { display: none !important; }
                .gemini-toast {
                    position: fixed !important; top: 32px !important; left: 50% !important; transform: translateX(-50%) !important;
                    background: var(--gh-header-bg); /* 品牌渐变色 -> 动态主题色 */
                    color: white; /* 渐变色背景通常较深，配白字 */
                    padding: 10px 24px; border-radius: 9999px; font-size: 14px; font-weight: 500;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
                    z-index: 1000001 !important; animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid rgba(255, 255, 255, 0.15); /* 增加一点白色内描边提升精致感 */
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    pointer-events: none;
                }
                @keyframes toastSlideIn {
                    from { transform: translate(-50%, -20px) scale(0.95); opacity: 0; }
                    to { transform: translate(-50%, 0) scale(1); opacity: 1; }
                }
                /* Theme Toggle Animation (View Transitions API) */
                ::view-transition-old(root),
                ::view-transition-new(root) {
                    animation: none;
                    mix-blend-mode: normal;
                }
                ::view-transition-old(root) {
                    z-index: 1;
                }
                ::view-transition-new(root) {
                    z-index: 9999;
                }
                .dark-theme::view-transition-old(root) {
                    z-index: 9999;
                }
                .dark-theme::view-transition-new(root) {
                    z-index: 1;
                }
                @keyframes themeReveal {
                    from { clip-path: circle(0% at var(--theme-x, 95%) var(--theme-y, 5%)); }
                    to { clip-path: circle(150% at var(--theme-x, 95%) var(--theme-y, 5%)); }
                }
                @keyframes themeShrink {
                    from { clip-path: circle(150% at var(--theme-x, 95%) var(--theme-y, 5%)); }
                    to { clip-path: circle(0% at var(--theme-x, 95%) var(--theme-y, 5%)); }
                }
                /* 快捷跳转按钮组（面板内） */
                .scroll-nav-container {
                    display: flex; gap: 8px; padding: 10px 16px; border-top: 1px solid var(--gh-border, #e5e7eb);
                    background: var(--gh-bg-secondary);
                    border-radius: 0 0 12px 12px; justify-content: center;
                }
                .scroll-nav-btn {
                    flex: 1; max-width: 120px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; font-size: 14px; color: white; gap: 4px;
                    background: var(--gh-header-bg);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s;
                }
                .scroll-nav-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .scroll-nav-btn.icon-only {
                    flex: 0 0 32px; width: 32px; border-radius: 50%; padding: 0;
                }
                .scroll-nav-btn.icon-only span {
                    display: inline-block; transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .scroll-nav-btn.icon-only:hover span {
                    transform: rotate(360deg) scale(1.2);
                }

                /* ========== 会话面板样式 ========== */
                .conversations-content {
                    display: flex; flex-direction: column; flex: 1; min-height: 200px;
                    overflow-x: hidden; /* 隐藏横向滚动条 */
                }
                .conversations-toolbar {
                    display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--gh-border, #e5e7eb); flex-shrink: 0;
                }
                .conversations-toolbar-btn {
                    padding: 6px 12px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 8px; background: var(--gh-bg-secondary, #f9fafb);
                    font-size: 13px; color: var(--gh-text, #374151); cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center; gap: 4px;
                }
                .conversations-toolbar-btn:hover { background: var(--gh-hover, #f3f4f6); border-color: #9ca3af; }
                .conversations-toolbar-btn.sync { padding: 6px 10px; }
                .conversations-toolbar-btn.batch-mode.active { background: var(--gh-border-active); color: white; border-color: var(--gh-border-active); }
                .conversations-toolbar-btn:disabled { opacity: 0.6; cursor: wait; }
                .conversations-folder-select {
                    padding: 6px 10px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 8px;
                    background: var(--gh-bg-secondary, #f9fafb); font-size: 13px; color: var(--gh-text, #374151); cursor: pointer;
                    flex: 1; min-width: 0; max-width: 150px;
                }
                .conversations-folder-select:focus { outline: none; border-color: var(--gh-border-active); }
                .conversations-folder-list {
                    flex: 1; overflow-y: auto; padding: 8px;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE/Edge */
                }
                .conversations-folder-list::-webkit-scrollbar { display: none; } /* Chrome */
                .conversations-folder-item {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 10px 12px; margin-bottom: 4px; border-radius: 8px;
                    background: var(--gh-bg-secondary, #f9fafb); cursor: pointer; transition: all 0.2s;
                    flex-wrap: wrap; /* 允许换行，会话列表在下方 */
                }
                .conversations-folder-item:hover { background: var(--gh-hover, #f3f4f6); }
                .conversations-folder-item.default { background: var(--gh-folder-bg-default); }
                .conversations-folder-item.expanded {
                    background: var(--gh-folder-bg-expanded) !important; /* 更深的紫蓝色 */
                    border: 2px solid var(--gh-border-active); /* 明显的边框 */
                    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
                    border-radius: 8px 8px 0 0; /* 展开时上方圆角 */
                }
                .conversations-folder-info {
                    display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
                    position: relative; /* 为绝对定位的箭头提供参考 */
                }
                .conversations-folder-icon {
                    font-size: 18px; width: 24px; height: 24px;
                    display: flex; align-items: center; justify-content: center;
                    line-height: 1; flex-shrink: 0;
                }
                .conversations-folder-name {
                    font-size: 14px; font-weight: 500; color: var(--gh-text, #1f2937);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    user-select: none; /* 禁止选中 */
                }
                .conversations-folder-count { font-size: 12px; color: var(--gh-text-secondary, #6b7280); flex-shrink: 0; user-select: none; }
                .conversations-folder-menu-btn {
                    width: 24px; height: 24px; border: none; background: transparent;
                    color: var(--gh-text-secondary, #6b7280); cursor: pointer; border-radius: 4px; font-size: 14px;
                }
                .conversations-folder-menu-btn:hover { background: var(--gh-border, #e5e7eb); }
                .conversations-folder-controls {
                    display: flex; align-items: center; gap: 4px; flex-shrink: 0;
                }
                .conversations-folder-order-btns {
                    position: absolute; right: 0; top: 50%; transform: translateY(-50%);
                    display: flex; align-items: center; gap: 2px;
                    opacity: 0; transition: opacity 0.2s;
                    background: linear-gradient(to right, transparent, currentColor 8px); /* 渐变遮罩 */
                    background: inherit; padding-left: 8px;
                }
                .conversations-folder-item:hover .conversations-folder-order-btns {
                    opacity: 1;
                }
                .conversations-folder-order-btn {
                    width: 20px; height: 20px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 4px;
                    background: var(--gh-bg, white); color: var(--gh-text-secondary, #6b7280); cursor: pointer; font-size: 11px;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.15s;
                }
                .conversations-folder-order-btn:hover:not(:disabled) {
                    background: var(--gh-hover, #f3f4f6); border-color: #9ca3af; color: var(--gh-text, #374151);
                }
                .conversations-folder-order-btn:disabled {
                    opacity: 0.3; cursor: default;
                }
                .conversations-folder-menu {
                    background: var(--gh-bg, white); border: 1px solid var(--gh-border, #e5e7eb); border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000002; padding: 4px;
                    min-width: 100px;
                }
                .conversations-folder-menu button {
                    display: block; width: 100%; padding: 8px 12px; border: none; background: none;
                    text-align: left; font-size: 13px; color: var(--gh-text, #374151); cursor: pointer; border-radius: 4px;
                }
                .conversations-folder-menu button:hover { background: var(--gh-hover, #f3f4f6); }
                .conversations-empty {
                    text-align: center; padding: 40px 20px; color: #9ca3af; font-size: 14px;
                }

                /* 搜索栏样式 */
                .conversations-search-bar {
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--gh-border, #e5e7eb);
                    background: var(--gh-bg-secondary, #f9fafb);
                }
                .conversations-search-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0;
                    position: relative; /* For dropdown menu */
                }
                /* Has Filter State: Remove Tag Btn Radius */
                .conversations-search-wrapper.has-filter .conversations-tag-search-btn {
                    border-radius: 0;
                    border-right: none;
                }
                
                .conversations-search-input-group {
                    flex: 1;
                    position: relative;
                    height: 36px;
                    min-width: 0;
                }
                .conversations-search-input {
                    width: 100%;
                    height: 100%;
                    padding: 0 12px; /* Symmetric padding */
                    border: 1px solid var(--gh-input-border, #d1d5db);
                    border-radius: 8px 0 0 8px;
                    font-size: 14px;
                    box-sizing: border-box;
                    transition: all 0.2s;
                    background: var(--gh-input-bg, #ffffff); color: var(--gh-text, #1f2937);
                }
                .conversations-search-input:focus {
                    outline: none;
                    border-color: var(--gh-border-active);
                    z-index: 1;
                    position: relative;
                }
                
                /* Pin Button */
                .conversations-pin-filter-btn {
                    cursor: pointer; width: 36px; height: 36px; color: #9ca3af; font-size: 14px;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--gh-input-border, #d1d5db); border-left: none;
                    background: var(--gh-bg, white); box-sizing: border-box; transition: all 0.2s;
                }
                .conversations-pin-filter-btn:hover { background: var(--gh-hover, #f3f4f6); color: var(--gh-text, #374151); }
                .conversations-pin-filter-btn.active { 
                    color: var(--gh-border-active); background: var(--gh-folder-bg-default); 
                    box-shadow: inset 0 0 0 1px #818cf8;
                }

                .conversations-result-bar {
                    text-align: center;
                    padding: 6px;
                    color: #3b82f6;
                    font-size: 13px;
                    background: #eff6ff;
                    display: none;
                }
                .conversations-result-bar.visible { display: block; }

                /* 标签样式 */
                .conversations-tag {
                    display: inline-block; padding: 2px 6px; border-radius: 4px;
                    font-size: 11px; margin-right: 4px; margin-top: 4px;
                    color: white; background-color: #9ca3af; line-height: 1.2;
                    /* Fix 1: Max width and overflow */
                    max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;
                }
                .conversations-tag-list {
                    margin-top: 2px; display: flex; flex-wrap: wrap; gap: 4px; border-top: 1px dashed #eee; padding-top: 2px;
                }
                .conversations-tag-list:empty { display: none; }

                /* 标签筛选按钮 */
                .conversations-tag-search-btn {
                    cursor: pointer; width: 36px; height: 36px; color: #9ca3af; font-size: 14px;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--gh-input-border, #d1d5db); border-left: none; border-radius: 0; /* Always 0 radius/square */
                    background: var(--gh-bg, white); box-sizing: border-box; transition: all 0.2s;
                }
                .conversations-tag-search-btn:hover { background: var(--gh-hover, #f3f4f6); color: var(--gh-text, #374151); }
                .conversations-tag-search-btn.active { 
                    color: var(--gh-border-active); background: var(--gh-folder-bg-default); 
                    box-shadow: inset 0 0 0 1px #818cf8; /* Fix 7: Distinct active border/shadow */
                }
                .conversations-tag-search-btn.empty { opacity: 0.5; }
                
                /* Clear Button - Restyled at far right */
                .conversations-search-clear {
                    cursor: pointer; width: 36px; height: 36px; color: #9ca3af; font-size: 18px;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--gh-input-border, #d1d5db); border-left: none; border-radius: 0 8px 8px 0;
                    background: var(--gh-bg, white); box-sizing: border-box; transition: all 0.2s;
                    user-select: none;
                }
                .conversations-search-clear:hover { background: #fef2f2; color: #ef4444; }
                .conversations-search-clear.disabled { 
                    opacity: 0.3; cursor: default; background: var(--gh-bg-secondary, #f9fafb); pointer-events: none;
                }

                /* Removed old inner clear button styles */

                /* 标签筛选菜单 */
                .conversations-tag-filter-menu {
                    position: absolute;
                    top: calc(100% + 4px);
                    right: 0;
                    width: 200px;
                    background: var(--gh-bg, white);
                    border: 1px solid var(--gh-border, #e5e7eb);
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: fadeIn 0.2s;
                }
                .conversations-tag-filter-list {
                    overflow-y: auto; flex: 1; padding: 4px; display: flex; flex-direction: column; gap: 2px;
                }
                .conversations-tag-filter-footer {
                    padding: 4px; border-top: 1px solid #eee; background: var(--gh-bg-secondary, #f9fafb); flex-shrink: 0;
                }
                .conversations-tag-filter-item {
                    display: flex; align-items: center; gap: 8px; padding: 8px;
                    cursor: pointer; border-radius: 6px; font-size: 13px; color: var(--gh-text, #374151);
                    /* Fix overflow */
                    width: 100%; box-sizing: border-box; overflow: hidden;
                }
                .conversations-tag-filter-item span:not(.conversations-tag-dot) {
                     white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
                }
                .conversations-tag-filter-item:hover { background: var(--gh-hover, #f3f4f6); }
                .conversations-tag-filter-item.selected { background: var(--gh-folder-bg-default); color: #2563eb; font-weight: 500; }
                
                /* Checkmark for selected */
                .conversations-tag-filter-item.selected::after {
                    content: '✓'; margin-left: auto; font-size: 14px; font-weight: bold;
                }
                
                /* Ensure dot doesn't stretch */
                .conversations-tag-dot {
                    width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0;
                    border: 1px solid rgba(0,0,0,0.05); /* Subtle border */
                }
                
                .conversations-tag-filter-divider { height: 1px; background: #eee; margin: 4px 0; flex-shrink: 0; }
                .conversations-tag-filter-action { color: var(--gh-border-active); font-weight: 500; justify-content: center; }

                /* 标签管理弹窗 */
                .conversations-tag-manager-list {
                    max-height: 250px; overflow-y: auto; border: 1px solid var(--gh-border, #e5e7eb); border-radius: 4px; margin-bottom: 12px; padding: 4px;
                }
                .conversations-tag-manager-item {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 8px; border-bottom: 1px solid var(--gh-hover, #f3f4f6);
                }
                .conversations-tag-manager-item:last-child { border-bottom: none; }
                .conversations-tag-manager-item:hover { background: var(--gh-bg-secondary, #f9fafb); }
                .conversations-tag-preview {
                    padding: 2px 8px; border-radius: 4px; font-size: 12px; color: white;
                    /* Fix overflow */
                    max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; display: inline-block;
                }
                .conversations-tag-actions { display: flex; gap: 4px; flex-shrink: 0; }
                .conversations-tag-btn {
                    width: 24px; height: 24px; border: none; background: transparent; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; color: #9ca3af; border-radius: 4px; transition: all 0.2s;
                }
                .conversations-tag-btn:hover { background: var(--gh-border, #e5e7eb); color: var(--gh-text, #374151); }
                .conversations-tag-btn:hover { background: #fee2e2; color: #ef4444; }
                .conversations-tag-btn.edit:hover { background: #e0f2fe; color: #3b82f6; }

                /* 颜色选择器 */
                .conversations-color-picker {
                    display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; margin: 12px 0;
                }
                .conversations-color-item {
                    width: 24px; height: 24px; border-radius: 4px; cursor: pointer;
                    border: 2px solid transparent; transition: transform 0.1s;
                }
                .conversations-color-item:hover { transform: scale(1.1); }
                .conversations-color-item.selected { border-color: var(--gh-text, #374151); transform: scale(1.1); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .conversations-result-bar {
                    text-align: center;
                    padding: 6px;
                    color: var(--gh-border-active);
                    font-size: 13px;
                    background: var(--gh-folder-bg-default);
                    border-radius: 4px;
                    margin-top: 8px;
                    display: none;
                }
                .conversations-result-bar.visible { display: block; }

                /* 会话列表样式 */
                .conversations-list {
                    width: 100%; /* 占满父容器宽度 */
                    padding: 8px 12px;
                    background: var(--gh-bg-secondary);
                    border: 2px solid var(--gh-border-active);
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    margin-top: -4px; /* 与文件夹项视觉连接 */
                    margin-bottom: 4px;
                    max-height: 300px;
                    overflow-y: auto;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE/Edge */
                }
                .conversations-list::-webkit-scrollbar { display: none; } /* Chrome */
                .conversations-list-empty {
                    padding: 12px; color: #9ca3af; font-size: 13px; text-align: center;
                }
                .conversations-item {
                    display: flex; align-items: center;
                    padding: 8px 12px;
                    margin-bottom: 4px; /* Card Layout: Spacing */
                    border-radius: 6px; /* Card Layout: Radius */
                    background: var(--gh-bg, white);  /* Card Layout: White Background */
                    cursor: pointer;
                    transition: all 0.2s;
                    gap: 8px;
                    position: relative;
                    /* border-bottom removed for card style */
                }
                .conversations-item:hover {
                    background: var(--gh-hover, #f3f4f6); /* Slightly darker on hover */
                }
                /* Rounded Blue Bar on Hover */
                .conversations-item::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%) scaleY(0);
                    width: 4px;
                    height: 80%;
                    background-color: #428cf1;
                    border-radius: 0 4px 4px 0; /* 右侧圆角，左侧贴边 */
                    transition: transform 0.2s;
                }
                .conversations-item:hover::before {
                    transform: translateY(-50%) scaleY(1);
                }

                .conversations-item-title {
                    flex: 1;
                    min-width: 0;
                    font-size: 14px; color: var(--gh-text, #374151);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                /* Tags Container */
                .conversations-tag-list {
                    display: flex; gap: 4px; border: none; padding: 0; margin: 0;
                    flex-shrink: 0;
                    max-width: 35%;
                    overflow: hidden;
                }
                .conversations-item-meta {
                    display: flex; align-items: center; gap: 8px; flex-shrink: 0;
                    margin-left: auto;
                }
                .conversations-item-time {
                    font-size: 11px; color: #9ca3af; flex-shrink: 0;
                }
                .conversations-item-menu-btn {
                    width: 20px; height: 20px; border: none; background: transparent;
                    color: #9ca3af; cursor: pointer; border-radius: 4px; font-size: 12px;
                    opacity: 0; transition: opacity 0.2s; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
                }
                .conversations-item:hover .conversations-item-menu-btn { opacity: 1; }
                .conversations-item-menu-btn:hover { background: var(--gh-border, #e5e7eb); color: var(--gh-text, #374151); }
                .conversations-item-menu {
                    background: var(--gh-bg, white); border: 1px solid var(--gh-border, #e5e7eb); border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000002; padding: 4px;
                    min-width: 120px;
                }
                .conversations-item-menu button {
                    display: block; width: 100%; padding: 8px 12px; border: none; background: none;
                    text-align: left; font-size: 13px; color: var(--gh-text, #374151); cursor: pointer; border-radius: 4px;
                }
                .conversations-item-menu button:hover { background: var(--gh-hover, #f3f4f6); }
                .conversations-item-menu button.danger { color: #dc2626; }
                .conversations-item-menu button.danger:hover { background: #fef2f2; }

                /* 复选框样式 */
                .conversations-folder-checkbox {
                    margin-right: 8px; width: 16px; height: 16px; cursor: pointer;
                    accent-color: #4b5563; flex-shrink: 0;
                }
                .conversations-item-checkbox {
                    width: 16px; height: 16px; margin-right: 8px; cursor: pointer;
                    accent-color: #4b5563; flex-shrink: 0;
                }

                /* 底部批量操作栏 */
                .conversations-batch-bar {
                    position: sticky; bottom: 0; left: 0; right: 0;
                    background: var(--gh-bg, white);
                    padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;
                    border-radius: 8px; margin-top: 8px;
                    border: 1px solid var(--gh-border, #e5e7eb);
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
                }
                .conversations-batch-info {
                    color: var(--gh-text, #374151); font-size: 13px; font-weight: 500;
                }
                .conversations-batch-btns {
                    display: flex; gap: 8px;
                }
                .conversations-batch-btn {
                    padding: 4px 10px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 6px;
                    font-size: 12px; cursor: pointer; transition: all 0.2s;
                    background: var(--gh-hover, #f3f4f6); color: var(--gh-text, #374151);
                }
                .conversations-batch-btn:hover { background: var(--gh-border, #e5e7eb); border-color: #9ca3af; }
                .conversations-batch-btn.danger { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
                .conversations-batch-btn.danger:hover { background: #fecaca; border-color: #f87171; }
                .conversations-batch-btn.cancel { background: transparent; border: none; color: var(--gh-text-secondary, #6b7280); }
                .conversations-batch-btn.cancel:hover { background: var(--gh-hover, #f3f4f6); color: var(--gh-text, #374151); border: none; }

                /* 会话对话框样式 */
                .conversations-dialog-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5); z-index: 1000003;
                    display: flex; align-items: center; justify-content: center;
                }
                .conversations-dialog {
                    background: var(--gh-bg, white); border-radius: 12px; padding: 20px; min-width: 320px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                }
                .conversations-dialog-title {
                    font-size: 16px; font-weight: 600; color: var(--gh-text, #1f2937); margin-bottom: 16px;
                }
                .conversations-dialog-message {
                    font-size: 14px; color: #4b5563; margin-bottom: 20px; line-height: 1.5;
                    white-space: pre-line;
                }
                .conversations-dialog-section {
                    margin-bottom: 16px;
                }
                .conversations-dialog-section label {
                    display: block; font-size: 13px; color: var(--gh-text-secondary, #6b7280); margin-bottom: 8px;
                }
                .conversations-dialog-input {
                    width: 100%; padding: 10px 12px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 8px;
                    font-size: 14px; box-sizing: border-box;
                    background: var(--gh-input-bg, #ffffff); color: var(--gh-text, #1f2937);
                }
                .conversations-dialog-input:focus {
                    outline: none; border-color: #4285f4; box-shadow: 0 0 0 2px rgba(66,133,244,0.1);
                }
                .conversations-dialog-buttons {
                    display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;
                }
                .conversations-dialog-btn {
                    padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s;
                }
                .conversations-dialog-btn.cancel {
                    border: 1px solid var(--gh-input-border, #d1d5db); background: var(--gh-bg, white); color: var(--gh-text, #374151);
                }
                .conversations-dialog-btn.cancel:hover { background: var(--gh-hover, #f3f4f6); }
                .conversations-dialog-btn.confirm {
                    border: 1px solid rgba(255,255,255,0.2); background: var(--gh-header-bg); color: white;
                }
                .conversations-dialog-btn.confirm:hover { opacity: 0.9; }

                /* 文件夹选择列表 */
                .conversations-folder-select-list {
                    max-height: 250px; overflow-y: auto; margin: 12px 0;
                }
                .conversations-folder-select-item {
                    padding: 12px 16px; border-radius: 8px; cursor: pointer;
                    transition: all 0.2s; font-size: 14px;
                }
                .conversations-folder-select-item:hover {
                    background: var(--gh-hover, #f3f4f6);
                }

                /* Emoji 选择器 */
                .conversations-emoji-picker {
                    display: flex; flex-wrap: wrap; gap: 4px;
                }
                .conversations-emoji-btn {
                    width: 36px; height: 36px; border: 1px solid var(--gh-border, #e5e7eb); border-radius: 8px;
                    background: var(--gh-bg-secondary, #f9fafb); font-size: 18px; cursor: pointer; transition: all 0.2s;
                }
                .conversations-emoji-btn:hover { background: var(--gh-hover, #f3f4f6); border-color: var(--gh-input-border, #d1d5db); }
                .conversations-emoji-btn.selected {
                    background: #e0e7ff; border-color: #4285f4; box-shadow: 0 0 0 2px rgba(66,133,244,0.2);
                }

                /* 分类管理按钮 */
                .category-manage-btn {
                    padding: 4px 8px; background: transparent; border: 1px dashed #9ca3af; border-radius: 12px;
                    font-size: 12px; color: var(--gh-text-secondary, #6b7280); cursor: pointer; transition: all 0.2s; margin-left: 4px;
                }
                .category-manage-btn:hover { background: var(--gh-hover, #f3f4f6); border-color: var(--gh-text-secondary, #6b7280); color: var(--gh-text, #374151); }
                /* 分类管理弹窗 */
                .category-modal-content { max-height: 400px; }
                .category-list { max-height: 280px; overflow-y: auto; margin: 16px 0; }
                .category-item {
                    display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
                    background: var(--gh-bg-secondary, #f9fafb); border-radius: 8px; margin-bottom: 8px; transition: all 0.2s;
                }
                .category-item:hover { background: var(--gh-hover, #f3f4f6); }
                .category-item-info { display: flex; align-items: center; gap: 12px; flex: 1; }
                .category-item-name { font-weight: 500; color: var(--gh-text, #1f2937); font-size: 14px; }
                .category-item-count { font-size: 12px; color: var(--gh-text-secondary, #6b7280); background: var(--gh-border, #e5e7eb); padding: 2px 8px; border-radius: 10px; }
                .category-item-actions { display: flex; gap: 8px; }
                .category-action-btn {
                    padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; border: none; transition: all 0.2s;
                }
                .category-action-btn.rename { background: #dbeafe; color: #1d4ed8; }
                .category-action-btn.rename:hover { background: #bfdbfe; }
                .category-action-btn.delete { background: #fee2e2; color: #dc2626; }
                .category-action-btn.delete:hover { background: #fecaca; }
                .category-empty { text-align: center; color: #9ca3af; padding: 40px 0; font-size: 14px; }
                /* Tab 切换栏 */
                .prompt-panel-tabs {
                    display: flex; background: var(--gh-bg-secondary, #f9fafb); border-bottom: 1px solid var(--gh-border, #e5e7eb);
                }
                .prompt-panel-tab {
                    flex: 1; padding: 10px 16px; background: transparent; border: none;
                    font-size: 13px; font-weight: 500; color: var(--gh-text-secondary, #6b7280); cursor: pointer;
                    transition: all 0.2s; border-bottom: 2px solid transparent;
                }
                .prompt-panel-tab:hover { color: var(--gh-text, #374151); background: var(--gh-hover, #f3f4f6); }
                .prompt-panel-tab.active {
                    color: ${colors.primary}; border-bottom-color: ${colors.primary}; background: var(--gh-bg, white);
                }
                /* 面板内容区 */
                .prompt-panel-content { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 280px; }
                .prompt-panel-content.hidden { display: none; }
                /* 设置面板样式 - 合并优化 */
                .settings-content { padding: 16px; overflow-y: auto; flex: 1; scrollbar-width: none; -ms-overflow-style: none; }
                .settings-content::-webkit-scrollbar { display: none; }
                .settings-section { margin-bottom: 24px; }
                .settings-section-title {
                    font-size: 12px; font-weight: 600; color: var(--gh-text-secondary, #6b7280); margin-bottom: 8px;
                    text-transform: uppercase; letter-spacing: 0.5px; padding-left: 4px; border-bottom: none;
                }
                .setting-item {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 12px; background: var(--gh-bg-secondary, #f9fafb); border-radius: 8px; margin-bottom: 8px;
                    border: 1px solid var(--gh-hover, #f3f4f6); transition: all 0.2s;
                }
                .setting-item:hover { border-color: linear-gradient(135deg, #4285f4 0%, #34a853 100%); background: var(--gh-bg, white); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .setting-item-info { flex: 1; margin-right: 12px; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
                .setting-item-label { font-size: 14px; font-weight: 500; color: var(--gh-text, #374151); margin-bottom: 2px; white-space: nowrap; }
                .setting-item-desc { font-size: 12px; color: #9ca3af; line-height: 1.3; }
                .setting-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
                .setting-select {
                    padding: 6px 8px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 6px; font-size: 13px;
                    color: var(--gh-text, #374151); background: var(--gh-bg, white); outline: none; transition: all 0.2s; height: 32px; box-sizing: border-box;
                    min-width: 100px;
                }
                .setting-select:focus { border-color: #4285f4; box-shadow: 0 0 0 2px rgba(66,133,244,0.1); }
                .setting-toggle {
                    width: 44px; height: 24px; background: var(--gh-input-border, #d1d5db); border-radius: 12px; position: relative;
                    cursor: pointer; transition: all 0.3s; flex-shrink: 0;
                }
                .setting-toggle::after {
                    content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
                    background: var(--gh-bg, white); border-radius: 50%; transition: all 0.3s; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .setting-toggle.active { background: #4285f4; } /* 默认蓝色，会被JS覆盖 */
                .setting-toggle.active::after { left: 22px; }

                /* 大纲面板样式 */
                .outline-content {
                    display: flex; flex-direction: column; flex: 1; min-height: 200px; user-select: none; overflow: hidden;
                }
                /* 大纲固定工具栏 */
                .outline-fixed-toolbar {
                    padding: 10px 12px; background: var(--gh-bg-secondary, #f9fafb); border-bottom: 1px solid var(--gh-border, #e5e7eb);
                    flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;
                }
                .outline-toolbar-row {
                    display: flex; align-items: center; gap: 8px;
                }
                .outline-toolbar-btn {
                    width: 28px; height: 28px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 6px;
                    background: var(--gh-bg, white); color: var(--gh-text-secondary, #6b7280); cursor: pointer; display: flex;
                    align-items: center; justify-content: center; font-size: 14px;
                    transition: all 0.2s; flex-shrink: 0;
                }
                .outline-toolbar-btn:hover { border-color: ${colors.primary}; color: ${colors.primary}; background: #f0f9ff; }
                .outline-toolbar-btn.active { border-color: ${colors.primary}; color: white; background: ${colors.primary}; }
                .outline-search-input {
                    flex: 1; height: 28px; padding: 0 10px; border: 1px solid var(--gh-input-border, #d1d5db); border-radius: 6px;
                    font-size: 13px; color: var(--gh-text, #374151); outline: none; transition: all 0.2s;
                    background: var(--gh-input-bg, #ffffff);
                }
                .outline-search-input:focus { border-color: ${colors.primary}; box-shadow: 0 0 0 2px rgba(66,133,244,0.1); }
                .outline-search-input::placeholder { color: #9ca3af; }
                .outline-search-clear {
                    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
                    width: 16px; height: 16px; border: none; background: var(--gh-input-border, #d1d5db); color: white;
                    border-radius: 50%; cursor: pointer; font-size: 10px; line-height: 16px; text-align: center;
                }
                .outline-search-clear:hover { background: #9ca3af; }
                .outline-search-wrapper { position: relative; flex: 1; display: flex; align-items: center; }

                /* 隐身模式：隐藏 Gemini Business 设置菜单 (防止切换主题时闪烁) */
                body.gh-stealth-mode md-menu,
                body.gh-stealth-mode md-menu-surface,
                body.gh-stealth-mode .mat-menu-panel,
                body.gh-stealth-mode [role="menu"] {
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                .outline-search-result { font-size: 12px; color: var(--gh-text-secondary, #6b7280); margin-left: 8px; white-space: nowrap; }
                .outline-result-bar {
                    padding: 6px 12px; background: #eff6ff; color: #1d4ed8; font-size: 12px;
                    border-bottom: 1px solid #dbeafe; text-align: center; flex-shrink: 0;
                    transition: all 0.3s;
                }
                /* 层级滑块 */
                .outline-level-slider-container {
                    display: flex; align-items: center; gap: 6px; width: 100%;
                }
                .outline-level-slider {
                    flex: 1; height: 4px; -webkit-appearance: none; appearance: none;
                    background: var(--gh-border, #e5e7eb); border-radius: 2px; outline: none; cursor: pointer;
                }
                .outline-level-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
                    background: ${colors.primary}; cursor: pointer; border: 2px solid var(--gh-bg);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .outline-level-slider::-moz-range-thumb {
                    width: 14px; height: 14px; border-radius: 50%;
                    background: ${colors.primary}; cursor: pointer; border: 2px solid var(--gh-bg);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .outline-level-dots {
                    display: flex; justify-content: space-between; align-items: center;
                    position: relative; flex: 1; height: 24px;
                }
                .outline-level-dot {
                    width: 12px; height: 12px; border-radius: 50%; background: var(--gh-input-border, #d1d5db);
                    cursor: pointer; transition: all 0.2s; position: relative; z-index: 2;
                    border: 2px solid var(--gh-bg); box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .outline-level-dot:hover { background: ${colors.primary}; transform: scale(1.2); }
                .outline-level-dot.active { background: ${colors.primary}; }
                .outline-level-dot-tooltip {
                    position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
                    background: var(--gh-text, #374151); color: var(--gh-bg, white); padding: 4px 8px; border-radius: 4px;
                    font-size: 11px; white-space: nowrap; opacity: 0; visibility: hidden;
                    transition: all 0.2s; pointer-events: none; margin-bottom: 4px;
                }
                .outline-level-dot:hover .outline-level-dot-tooltip { opacity: 1; visibility: visible; }
                .outline-level-line {
                    position: absolute; left: 10px; right: 10px; top: 50%; height: 4px;
                    background: var(--gh-border, #e5e7eb); transform: translateY(-50%); z-index: 1; border-radius: 2px;
                }
                .outline-level-progress {
                    position: absolute; left: 0; top: 0; height: 100%; background: ${colors.primary};
                    border-radius: 2px; transition: width 0.2s;
                }
                /* 大纲列表区 */
                .outline-list-wrapper { flex: 1; overflow-y: auto; padding: 8px 12px; }
                .outline-list { display: flex; flex-direction: column; gap: 2px; }
                .outline-item {
                    padding: 6px 10px 6px 10px; border-radius: 6px; cursor: pointer;
                    background: transparent; border: 1px solid transparent;
                    font-size: 13px; color: var(--gh-text, #374151); transition: all 0.15s;
                    display: flex; align-items: center; position: relative;
                }
                .outline-item:hover { background: var(--gh-hover, #f3f4f6); }
                .outline-item.highlight { background: var(--gh-folder-bg-expanded); border-color: ${colors.primary}; }
				.outline-item-toggle {
					width: 24px; min-width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
					color: #9ca3af; cursor: pointer; transition: all 0.2s ease;
					font-size: 16px; flex-shrink: 0; margin-right: 2px; box-sizing: border-box; border-radius: 4px;
				}
				.outline-item-toggle:hover { color: ${colors.primary}; background-color: rgba(0,0,0,0.05); }
				.outline-item-toggle.expanded { transform: rotate(90deg); color: ${colors.primary}; }
				.outline-item-toggle.invisible { opacity: 0; cursor: default; pointer-events: none; visibility: visible !important; display: inline-flex !important; }
				.outline-item-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 24px; }
                .outline-item.collapsed-children { display: none; }
                /* 大纲层级缩进 - 箭头跟随缩进，文字保持左对齐 */
                .outline-level-1 { padding-left: 10px; font-weight: 600; font-size: 14px; }
                .outline-level-2 { padding-left: 28px; font-weight: 500; }
                .outline-level-3 { padding-left: 46px; }
                .outline-level-4 { padding-left: 64px; font-size: 12px; }
                .outline-level-5 { padding-left: 82px; font-size: 12px; color: var(--gh-text-secondary, #6b7280); }
                .outline-level-6 { padding-left: 100px; font-size: 12px; color: #9ca3af; }
                .outline-empty { text-align: center; color: #9ca3af; padding: 40px 20px; font-size: 14px; }
                /* 大纲高亮效果 */
                .outline-highlight { animation: outlineHighlight 2s ease-out; }
                @keyframes outlineHighlight {
                    0% { background: rgba(66, 133, 244, 0.3); }
                    100% { background: transparent; }
                }
            `;
            document.head.appendChild(style);
        }

        /**
         * 启动主题监听器 (Auto Dark Mode)
         */
        monitorTheme() {
            const panel = document.getElementById('gemini-helper-panel');
            if (!panel) return;

            const checkTheme = () => {
                // Refined Detection Logic: Priority Class > Data > Style
                const bodyClass = document.body.className;
                const hasDarkClass = /\bdark-theme\b/i.test(bodyClass);
                const hasLightClass = /\blight-theme\b/i.test(bodyClass);

                // 1. Explicit Class (Gemini Standard uses this)
                let isDark = false;
                if (hasDarkClass) {
                    isDark = true;
                } else if (hasLightClass) {
                    isDark = false;
                } else {
                    // 2. Data Attribute
                    const dataTheme = document.body.dataset.theme || document.documentElement.dataset.theme;
                    if (dataTheme === 'dark') {
                        isDark = true;
                    } else if (dataTheme === 'light') {
                        isDark = false;
                    } else {
                        // 3. Style color-scheme (Gemini Business uses this)
                        isDark = document.body.style.colorScheme === 'dark';
                    }
                }

                // 2. Sync to Plugin UI (ghMode)
                if (isDark) {
                    document.body.dataset.ghMode = 'dark';
                } else {
                    delete document.body.dataset.ghMode;
                }

                // 3. Sync to Settings (Persistence) & Button Icon
                // Only update if changed to avoid redundant saves
                const currentSavedMode = this.settings.themeMode;
                const detectedMode = isDark ? 'dark' : 'light';

                // Avoid saving on every check, only if truly changed from what we think it is
                // But we need to distinguish between "detected change" and "just checking"
                // Actually, just save it if it's different.
                if (currentSavedMode !== detectedMode) {
                    this.settings.themeMode = detectedMode;
                    this.saveSettings();
                    // GM_setValue handled in saveSettings with site-scoped key
                }

                const themeBtns = [document.getElementById('theme-toggle-btn'), document.getElementById('quick-theme-btn')];
                themeBtns.forEach((themeBtn) => {
                    if (themeBtn) {
                        // Update icon using DOM methods (avoid TrustedHTML error)
                        const svgNS = 'http://www.w3.org/2000/svg';
                        const svg = document.createElementNS(svgNS, 'svg');
                        svg.setAttribute('xmlns', svgNS);
                        svg.setAttribute('height', '20px');
                        svg.setAttribute('viewBox', '0 -960 960 960');
                        svg.setAttribute('width', '20px');
                        svg.setAttribute('fill', '#FFFFFF');

                        const path = document.createElementNS(svgNS, 'path');
                        path.setAttribute(
                            'd',
                            isDark
                                ? 'M480-280q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Z'
                                : 'M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z',
                        );
                        svg.appendChild(path);

                        themeBtn.textContent = ''; // clear
                        themeBtn.appendChild(svg);
                    }
                });
            };

            checkTheme();

            if (!this.themeObserver) {
                this.themeObserver = new MutationObserver((mutations) => {
                    checkTheme();
                });
                // Listen to class changes on body (primary method), dataset attributes AND style
                this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
                this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
            }
        }

        // 应用主题 (Web -> DOM)
        applyTheme(targetMode) {
            const mode = targetMode || this.settings.themeMode;
            if (!mode) return;

            if (mode === 'dark') {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme'); // For standard version consistency
                document.body.style.colorScheme = 'dark'; // Force color-scheme for Business
            } else {
                document.body.classList.remove('dark-theme');
                document.body.style.colorScheme = 'light'; // Force color-scheme for Business
                // Only add light-theme if we are likely on Standard version (based on url or adapter)
                // Gemini Business uses empty class for light. Standard uses 'light-theme'.
                if (window.location.host === 'gemini.google.com') {
                    document.body.classList.add('light-theme');
                }
            }
        }

        // 切换主题 (User Action) - 带圆形扩散动画
        toggleTheme(event) {
            const bodyClass = document.body.className;
            // Also check style for robustness
            const isDark = /\bdark-theme\b/i.test(bodyClass) || document.body.style.colorScheme === 'dark';
            const nextMode = isDark ? 'light' : 'dark';

            // 计算动画起点坐标（从点击位置或默认右上角）
            let x = 95,
                y = 5;
            if (event && event.clientX !== undefined) {
                x = (event.clientX / window.innerWidth) * 100;
                y = (event.clientY / window.innerHeight) * 100;
            } else {
                // 尝试从主题按钮位置获取
                const themeBtn = document.getElementById('theme-toggle-btn') || document.getElementById('quick-theme-btn');
                if (themeBtn) {
                    const rect = themeBtn.getBoundingClientRect();
                    x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
                    y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
                }
            }

            // 设置 CSS 变量
            document.documentElement.style.setProperty('--theme-x', `${x}%`);
            document.documentElement.style.setProperty('--theme-y', `${y}%`);

            // 执行主题切换的核心逻辑
            const doToggle = () => {
                // 优先使用适配器的原生切换逻辑 (针对 Gemini Business)
                if (typeof this.siteAdapter.toggleTheme === 'function') {
                    return this.siteAdapter.toggleTheme(nextMode).then((success) => {
                        if (!success) {
                            showToast('自动切换主题失败，请尝试在网页设置中手动切换');
                        }
                    });
                }
                this.applyTheme(nextMode);
            };

            // 使用 View Transitions API（如果浏览器支持）
            if (document.startViewTransition) {
                const transition = document.startViewTransition(() => {
                    doToggle();
                });

                // 应用自定义动画
                transition.ready.then(() => {
                    const animation = isDark ? 'themeReveal' : 'themeShrink';
                    document.documentElement.animate(
                        {
                            clipPath: isDark
                                ? ['circle(0% at var(--theme-x) var(--theme-y))', 'circle(150% at var(--theme-x) var(--theme-y))']
                                : ['circle(150% at var(--theme-x) var(--theme-y))', 'circle(0% at var(--theme-x) var(--theme-y))'],
                        },
                        {
                            duration: 800,
                            easing: 'ease-in-out',
                            pseudoElement: isDark ? '::view-transition-new(root)' : '::view-transition-old(root)',
                        },
                    );
                });
            } else {
                // 降级：直接切换
                doToggle();
            }
        }

        createUI() {
            const existingPanel = document.getElementById('gemini-helper-panel');
            const existingBar = document.querySelector('.selected-prompt-bar');
            const existingBtnGroup = document.getElementById('quick-btn-group');

            if (existingPanel) existingPanel.remove();
            if (existingBar) existingBar.remove();
            if (existingBtnGroup) existingBtnGroup.remove();

            const panel = createElement('div', {
                id: 'gemini-helper-panel',
                className: this.isCollapsed ? 'collapsed' : '',
            });

            // Header
            const header = createElement('div', { className: 'prompt-panel-header' });
            const title = createElement('div', { className: 'prompt-panel-title' });
            title.appendChild(createElement('span', {}, '✨'));
            title.appendChild(createElement('span', {}, this.t('panelTitle')));

            const controls = createElement('div', { className: 'prompt-panel-controls' });

            // 主题切换按钮 (SVG Icon) - Moved to Controls
            const themeBtn = createElement('button', {
                id: 'theme-toggle-btn',
                className: 'prompt-panel-btn',
                title: this.t('toggleTheme'),
                style: '', // use class style
            });
            // Initial icon state (Default to Light mode -> Show Moon for toggle to dark)
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('xmlns', svgNS);
            svg.setAttribute('height', '20px');
            svg.setAttribute('viewBox', '0 -960 960 960');
            svg.setAttribute('width', '20px');
            svg.setAttribute('fill', '#FFFFFF');
            const path = document.createElementNS(svgNS, 'path');
            // Default Moon Icon (for Light Mode)
            path.setAttribute(
                'd',
                'M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z',
            );
            svg.appendChild(path);
            themeBtn.appendChild(svg);

            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止冒泡，防止触发 Header 双击（隐私模式）
                this.toggleTheme();
            });
            themeBtn.addEventListener('dblclick', (e) => e.stopPropagation()); // 阻止双击冒泡
            controls.appendChild(themeBtn);

            const refreshBtn = createElement(
                'button',
                {
                    className: 'prompt-panel-btn',
                    id: 'refresh-prompts',
                    title: this.t('refreshPrompts'),
                },
                '⟳',
            );
            refreshBtn.addEventListener('click', () => {
                refreshBtn.classList.add('loading');
                // 根据当前 Tab 智能刷新
                if (this.currentTab === 'outline') {
                    this.refreshOutline();
                    showToast(this.t('refreshed'));
                } else if (this.currentTab === 'prompts') {
                    this.refreshPromptList();
                    showToast(this.t('refreshed'));
                } else if (this.currentTab === 'conversations') {
                    // 只刷新 UI 显示，不执行侧边栏同步
                    this.conversationManager?.createUI();
                    showToast(this.t('refreshed'));
                } else {
                    showToast(this.t('refreshed'));
                }
                setTimeout(() => refreshBtn.classList.remove('loading'), 500);
            });
            const toggleBtn = createElement(
                'button',
                {
                    className: 'prompt-panel-btn',
                    id: 'toggle-panel',
                    title: this.t('collapse'),
                },

                this.isCollapsed ? '+' : '−', // 根据初始状态设置图标
            );
            // 注意：toggleBtn 的事件监听在 bindEvents 中统一绑定，避免重复绑定
            // 新建标签页按钮
            // 新标签页按钮 (只有在设置开启且站点支持时显示)
            if (this.settings.tabSettings?.openInNewTab && this.siteAdapter.supportsNewTab()) {
                const newTabBtn = createElement(
                    'button',
                    {
                        className: 'prompt-panel-btn',
                        id: 'new-tab-btn',
                        title: this.t('newTabTooltip'),
                        style: 'margin-right: 2px;',
                    },
                    '+',
                );
                newTabBtn.addEventListener('click', () => {
                    const url = this.siteAdapter.getNewTabUrl();
                    if (url) {
                        window.open(url, '_blank');
                    }
                });
                controls.appendChild(newTabBtn);
            }

            // 设置按钮（固定在header，不占用Tab位置）
            const settingsBtn = createElement(
                'button',
                {
                    className: 'prompt-panel-btn',
                    id: 'settings-btn',
                    title: this.t('tabSettings'),
                },
                '⚙',
            );
            settingsBtn.addEventListener('click', () => {
                if (this.currentTab === 'settings') {
                    // 已在设置页，返回上一个 Tab（默认提示词）
                    this.switchTab(this.previousTab || 'prompts');
                } else {
                    // 记住当前 Tab，进入设置
                    this.previousTab = this.currentTab;
                    this.switchTab('settings');
                }
            });

            controls.appendChild(settingsBtn);
            controls.appendChild(refreshBtn);
            controls.appendChild(toggleBtn);

            header.appendChild(title);
            header.appendChild(controls);

            // 双击面板标题切换隐私模式 (Boss Key)
            title.style.cursor = 'pointer';
            title.addEventListener('dblclick', () => {
                if (this.tabRenameManager) {
                    const isPrivate = this.tabRenameManager.togglePrivacyMode();
                    this.saveSettings();
                    // 同步设置面板中的隐私模式开关状态
                    const privacyToggle = document.getElementById('toggle-privacy-mode');
                    if (privacyToggle) {
                        privacyToggle.classList.toggle('active', isPrivate);
                    }
                    // 同步伪装标题输入框的禁用状态
                    const privacyTitleItem = privacyToggle?.closest('.setting-item')?.nextElementSibling;
                    if (privacyTitleItem && privacyTitleItem.classList.contains('setting-item')) {
                        const privacyTitleInput = privacyTitleItem.querySelector('input');
                        if (privacyTitleInput) {
                            privacyTitleInput.disabled = !isPrivate;
                            privacyTitleItem.style.opacity = isPrivate ? '1' : '0.5';
                            privacyTitleItem.style.pointerEvents = isPrivate ? 'auto' : 'none';
                        }
                    }
                    showToast(isPrivate ? '🔒 隐私模式已开启' : '🔓 隐私模式已关闭');
                }
            });

            // Tab 栏
            const tabs = createElement('div', { className: 'prompt-panel-tabs' });

            // 根据设置的顺序渲染 Tab
            const tabOrder = this.settings.tabOrder || DEFAULT_TAB_ORDER;

            // 确保所有 Tab 都存在（防止新版本新增 Tab 或配置丢失）
            const allTabs = new Set([...tabOrder, ...DEFAULT_TAB_ORDER]);
            // 过滤掉未定义的 Tab ID
            const validTabs = Array.from(allTabs).filter((id) => TAB_DEFINITIONS[id]);

            validTabs.forEach((tabId) => {
                const def = TAB_DEFINITIONS[tabId];

                // 特殊处理：如果大纲被禁用，添加 hidden 类，但仍然渲染（为了保持 DOM 结构一致性，或者稍后在 switchTab 处理可见性）
                // 这里稍微调整逻辑：创建 button，初始 class 根据状态决定
                let className = 'prompt-panel-tab';
                if (this.currentTab === tabId) className += ' active';

                // 大纲特殊显隐逻辑
                if (tabId === 'outline' && !this.settings.outline?.enabled) {
                    className += ' hidden';
                }
                // 提示词特殊显隐逻辑
                if (tabId === 'prompts' && !this.settings.prompts?.enabled) {
                    className += ' hidden';
                }
                // 会话特殊显隐逻辑
                if (tabId === 'conversations' && this.settings.conversations?.enabled === false) {
                    className += ' hidden';
                }

                // 设置 Tab 不在这里渲染（已移动到 header 按钮）
                if (tabId === 'settings') return;

                const btn = createElement('button', {
                    className: className,
                    'data-tab': tabId,
                    id: `${tabId}-tab`,
                });

                // 图标 + 文字
                btn.appendChild(createElement('span', { style: 'margin-right: 4px;' }, def.icon));
                btn.appendChild(document.createTextNode(this.t(def.labelKey)));
                // btn.appendChild(document.createTextNode(this.t(def.labelKey)));

                btn.addEventListener('click', () => this.switchTab(tabId));
                tabs.appendChild(btn);
            });

            panel.appendChild(header);
            panel.appendChild(tabs);

            // 内容容器需按固定顺序创建（DOM 结构不受 Tab 顺序影响，只影响 Tab 按钮顺序）
            // 1. 提示词面板内容区
            const promptsContent = createElement('div', {
                className: `prompt-panel-content${this.currentTab === 'prompts' ? '' : ' hidden'}`,
                id: 'prompts-content',
            });

            const searchBar = createElement('div', { className: 'prompt-search-bar' });
            const searchInput = createElement('input', {
                className: 'prompt-search-input',
                id: 'prompt-search',
                type: 'text',
                placeholder: this.t('searchPlaceholder'),
            });
            searchBar.appendChild(searchInput);

            const categories = createElement('div', { className: 'prompt-categories', id: 'prompt-categories' });
            const list = createElement('div', { className: 'prompt-list', id: 'prompt-list' });

            const addBtn = createElement('button', { className: 'add-prompt-btn', id: 'add-prompt' });
            addBtn.appendChild(createElement('span', {}, '+'));
            addBtn.appendChild(createElement('span', {}, this.t('addPrompt')));

            promptsContent.appendChild(searchBar);
            promptsContent.appendChild(categories);
            promptsContent.appendChild(list);
            promptsContent.appendChild(addBtn);

            // 2. 大纲面板内容区
            const outlineContent = createElement('div', {
                className: `prompt-panel-content${this.currentTab === 'outline' ? '' : ' hidden'}`,
                id: 'outline-content',
            });
            // 初始化大纲管理器
            this.outlineManager = new OutlineManager({
                container: outlineContent,
                settings: this.settings,
                onSettingsChange: () => this.saveSettings(),
                onJumpBefore: () => this.anchorManager.setAnchor(this.scrollManager.scrollTop),
                i18n: (k) => this.t(k),
            });

            // 3. 会话面板内容区
            const conversationsContent = createElement('div', {
                className: `prompt-panel-content${this.currentTab === 'conversations' ? '' : ' hidden'}`,
                id: 'conversations-content',
            });
            // 初始化会话管理器
            this.conversationManager = new ConversationManager({
                container: conversationsContent,
                settings: this.settings,
                siteAdapter: this.siteAdapter,
                i18n: (k) => this.t(k),
            });

            // 4. 设置面板内容区
            const settingsContent = createElement('div', {
                className: `prompt-panel-content${this.currentTab === 'settings' ? '' : ' hidden'}`,
                id: 'settings-content',
            });
            this.createSettingsContent(settingsContent);

            panel.appendChild(promptsContent);
            panel.appendChild(outlineContent);
            panel.appendChild(conversationsContent);
            panel.appendChild(settingsContent);

            document.body.appendChild(panel);

            // 选中提示词悬浮条
            const selectedBar = createElement('div', { className: 'selected-prompt-bar', style: 'user-select: none;' });
            selectedBar.appendChild(createElement('span', { style: 'user-select: none;' }, this.t('currentPrompt')));
            selectedBar.appendChild(
                createElement('span', {
                    className: 'selected-prompt-text',
                    id: 'selected-prompt-text',
                    style: 'user-select: none;',
                }),
            );
            const clearBtn = createElement('button', { className: 'clear-prompt-btn', id: 'clear-prompt' }, '×');
            selectedBar.appendChild(clearBtn);
            document.body.appendChild(selectedBar);

            const quickBtnGroup = createElement('div', {
                className: 'quick-btn-group' + (this.isCollapsed ? '' : ' hidden'),
                id: 'quick-btn-group',
            });

            // 按钮工厂函数
            const createQuickButton = (id, def, enabled) => {
                const btn = createElement(
                    'button',
                    {
                        className: 'quick-prompt-btn',
                        id: id === 'anchor' ? 'quick-anchor-btn' : id === 'theme' ? 'quick-theme-btn' : undefined,
                        title: this.t(def.labelKey),
                        style: enabled ? 'display: flex;' : 'display: none;',
                    },
                    def.icon,
                );

                // 锚点按钮初始状态置灰
                if (id === 'anchor') {
                    btn.style.opacity = '0.4';
                    btn.style.cursor = 'default';
                    btn.title = '暂无锚点';
                }

                return btn;
            };

            // 事件处理器
            const buttonActions = {
                scrollTop: () => this.scrollToTop(),
                scrollBottom: () => this.scrollToBottom(),
                panel: () => this.togglePanel(),
                anchor: () => this.handleAnchorClick(),
                theme: (e) => {
                    e.stopPropagation();
                    this.toggleTheme();
                },
            };

            // 保存按钮引用以便后续绑定事件
            const quickButtons = {};

            // 根据配置动态创建按钮
            const btnOrder = this.settings.collapsedButtonsOrder || DEFAULT_COLLAPSED_BUTTONS_ORDER;
            btnOrder.forEach((btnConfig) => {
                const def = COLLAPSED_BUTTON_DEFS[btnConfig.id];
                if (!def) return;

                // 可切换按钮检查 enabled 状态
                const isVisible = def.canToggle ? btnConfig.enabled : true;
                const btn = createQuickButton(btnConfig.id, def, isVisible);
                quickButtons[btnConfig.id] = btn;
                quickBtnGroup.appendChild(btn);
            });

            // 绑定事件
            Object.keys(quickButtons).forEach((id) => {
                const btn = quickButtons[id];
                const action = buttonActions[id];
                if (action) {
                    btn.addEventListener('click', action);
                }
            });

            document.body.appendChild(quickBtnGroup);

            // 快捷跳转按钮组 - 放在面板底部
            const scrollNavContainer = createElement('div', {
                className: 'scroll-nav-container',
                id: 'scroll-nav-container',
            });
            const scrollTopBtn = createElement('button', {
                className: 'scroll-nav-btn',
                id: 'scroll-top-btn',
                title: this.t('scrollTop'),
            });
            scrollTopBtn.appendChild(createElement('span', {}, '⬆'));
            scrollTopBtn.appendChild(createElement('span', {}, this.t('scrollTop')));

            const anchorBtn = createElement('button', {
                className: 'scroll-nav-btn icon-only',
                id: 'scroll-anchor-btn',
                title: '暂无锚点',
                style: 'opacity: 0.4; cursor: default;',
            });
            anchorBtn.appendChild(createElement('span', {}, '⚓'));

            const scrollBottomBtn = createElement('button', {
                className: 'scroll-nav-btn',
                id: 'scroll-bottom-btn',
                title: this.t('scrollBottom'),
            });
            scrollBottomBtn.appendChild(createElement('span', {}, '⬇'));
            scrollBottomBtn.appendChild(createElement('span', {}, this.t('scrollBottom')));

            scrollTopBtn.addEventListener('click', () => this.scrollToTop());
            anchorBtn.addEventListener('click', () => this.handleAnchorClick());
            scrollBottomBtn.addEventListener('click', () => this.scrollToBottom());

            scrollNavContainer.appendChild(scrollTopBtn);
            scrollNavContainer.appendChild(anchorBtn);
            scrollNavContainer.appendChild(scrollBottomBtn);
            panel.appendChild(scrollNavContainer);

            this.refreshCategories();
            this.refreshPromptList();

            // 初始化锚点按钮状态
            setTimeout(() => this.updateAnchorButtonState(this.anchorManager.hasAnchor()), 0);
        }

        // Tab 切换
        switchTab(tabName) {
            this.currentTab = tabName;

            // 更新 Tab 激活状态
            document.querySelectorAll('.prompt-panel-tab').forEach((tab) => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });

            // 更新设置按钮激活状态
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.classList.toggle('active', tabName === 'settings');
            }

            // 切换内容区
            document.getElementById('prompts-content')?.classList.toggle('hidden', tabName !== 'prompts');
            document.getElementById('outline-content')?.classList.toggle('hidden', tabName !== 'outline');
            document.getElementById('conversations-content')?.classList.toggle('hidden', tabName !== 'conversations');
            document.getElementById('settings-content')?.classList.toggle('hidden', tabName !== 'settings');

            // 通知 OutlineManager 激活状态（用于控制自动更新显隐）
            if (this.outlineManager) {
                this.outlineManager.setActive(tabName === 'outline');
            }

            // 通知 ConversationManager 激活状态
            if (this.conversationManager) {
                this.conversationManager.setActive(tabName === 'conversations');
            }

            // 更新刷新按钮的提示
            const refreshBtn = document.getElementById('refresh-prompts');
            if (refreshBtn) {
                const titleMap = {
                    prompts: this.t('refreshPrompts'),
                    outline: this.t('refreshOutline'),
                    conversations: this.t('conversationsRefresh'),
                    settings: this.t('refreshSettings'),
                };
                refreshBtn.title = titleMap[tabName] || this.t('refresh');
            }

            // 切换到大纲时自动刷新
            if (tabName === 'outline') {
                this.refreshOutline();
            }
        }

        // 刷新大纲
        refreshOutline() {
            if (!this.settings.outline?.enabled) return;
            const outline = this.siteAdapter.extractOutline(6);
            if (this.outlineManager) {
                this.outlineManager.update(outline);
            }
        }

        // 创建可折叠区域辅助方法
        createCollapsibleSection(title, content, options = {}) {
            const { defaultExpanded = false } = options;
            const section = createElement('div', { className: 'settings-section' });

            // 标题栏（可点击折叠/展开）
            const header = createElement('div', {
                className: 'settings-section-title',
                style: 'cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;',
            });

            const headerLeft = createElement('div', { style: 'display: flex; align-items: center; gap: 6px;' });
            // 箭头
            const arrow = createElement(
                'span',
                {
                    style: 'font-size: 10px; color: #9ca3af; transition: transform 0.2s; display: inline-block;',
                    className: 'collapse-arrow',
                },
                '▶',
            );

            const headerTitle = createElement('span', {}, title);
            headerLeft.appendChild(arrow);
            headerLeft.appendChild(headerTitle);

            header.appendChild(headerLeft);
            // 如果有右侧元素（如开关状态提示等），可以扩展 options 传入，这里暂时留空

            section.appendChild(header);

            // 内容容器
            const contentContainer = createElement('div', {
                className: 'settings-accordion-content',
                style: `display: ${defaultExpanded ? 'block' : 'none'}; padding-top: 8px; animation: slideDown 0.2s;`,
            });
            contentContainer.appendChild(content);

            // 切换折叠状态
            let isExpanded = defaultExpanded;
            const updateState = () => {
                contentContainer.style.display = isExpanded ? 'block' : 'none';
                arrow.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
            };
            // 初始化状态
            if (defaultExpanded) arrow.style.transform = 'rotate(90deg)';

            header.addEventListener('click', () => {
                isExpanded = !isExpanded;
                updateState();
            });

            section.appendChild(contentContainer);
            return section;
        }

        // 创建设置面板内容
        createSettingsContent(container) {
            const content = createElement('div', { className: 'settings-content' });

            // 1. 语言设置 (保持在顶部)
            const langSection = createElement('div', { className: 'settings-section' });
            langSection.appendChild(createElement('div', { className: 'settings-section-title' }, this.t('settingsTitle')));

            const langItem = createElement('div', { className: 'setting-item' });
            const langInfo = createElement('div', { className: 'setting-item-info' });
            langInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('languageLabel')));
            langInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('languageDesc')));

            const langSelect = createElement('select', { className: 'setting-select', id: 'select-language' });
            const currentLang = GM_getValue(SETTING_KEYS.LANGUAGE, 'auto');
            [
                { value: 'auto', label: this.t('languageAuto') },
                { value: 'zh-CN', label: this.t('languageZhCN') },
                { value: 'zh-TW', label: this.t('languageZhTW') },
                { value: 'en', label: this.t('languageEn') },
            ].forEach((opt) => {
                const option = createElement('option', { value: opt.value }, opt.label);
                if (opt.value === currentLang) option.selected = true;
                langSelect.appendChild(option);
            });
            langSelect.addEventListener('change', () => {
                GM_setValue(SETTING_KEYS.LANGUAGE, langSelect.value);
                this.lang = detectLanguage();
                this.i18n = I18N[this.lang];
                this.createStyles();
                this.createUI();
                this.bindEvents();
                this.switchTab('settings');
                showToast(langSelect.value === 'auto' ? this.t('languageAuto') : langSelect.options[langSelect.selectedIndex].text);
            });

            langItem.appendChild(langInfo);
            langItem.appendChild(langSelect);
            langSection.appendChild(langItem);

            content.appendChild(langSection);

            // 2. 模型锁定设置 (可折叠)
            let lockSection = null;
            if (this.registry && this.registry.adapters) {
                const adaptersWithLock = this.registry.adapters;
                if (adaptersWithLock.length > 0) {
                    const lockContainer = createElement('div', {});
                    // 为每个站点生成配置行
                    adaptersWithLock.forEach((adapter) => {
                        const siteId = adapter.getSiteId();
                        const siteConfig = this.settings.modelLockConfig[siteId] || adapter.getDefaultLockSettings();

                        const row = createElement('div', {
                            className: 'site-lock-row',
                            style: 'display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--gh-hover, #f3f4f6);',
                        });

                        const leftCol = createElement('div', { style: 'display: flex; align-items: center; flex: 1; gap: 12px;' });
                        const nameLabel = createElement('div', { style: 'font-size: 14px; font-weight: 500; color: var(--gh-text, #374151); min-width: 80px;' }, adapter.getName());
                        const toggle = createElement('div', {
                            className: 'setting-toggle' + (siteConfig.enabled ? ' active' : ''),
                            style: 'transform: scale(0.8);',
                        });

                        leftCol.appendChild(nameLabel);
                        leftCol.appendChild(toggle);

                        const rightCol = createElement('div', {});
                        const keywordInput = createElement('input', {
                            type: 'text',
                            className: 'prompt-input-title',
                            value: siteConfig.keyword || '',
                            placeholder: this.t('modelKeywordPlaceholder'),
                            style: 'width: 80px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; text-align: center;',
                        });

                        const updateState = () => {
                            keywordInput.disabled = !siteConfig.enabled;
                            keywordInput.style.opacity = siteConfig.enabled ? '1' : '0.5';
                            keywordInput.style.cursor = siteConfig.enabled ? 'text' : 'not-allowed';
                            toggle.className = 'setting-toggle' + (siteConfig.enabled ? ' active' : '');
                        };
                        updateState();

                        toggle.addEventListener('click', (e) => {
                            e.stopPropagation();
                            siteConfig.enabled = !siteConfig.enabled;
                            this.settings.modelLockConfig[siteId] = siteConfig;
                            updateState();
                            this.saveSettings();
                            if (siteId === this.siteAdapter.getSiteId() && siteConfig.enabled) {
                                this.siteAdapter.lockModel(siteConfig.keyword);
                            }
                        });

                        keywordInput.addEventListener('change', () => {
                            siteConfig.keyword = keywordInput.value.trim();
                            this.settings.modelLockConfig[siteId] = siteConfig;
                            this.saveSettings();
                        });

                        rightCol.appendChild(keywordInput);
                        row.appendChild(leftCol);
                        row.appendChild(rightCol);
                        lockContainer.appendChild(row);
                    });

                    lockSection = this.createCollapsibleSection(this.t('modelLockTitle'), lockContainer);
                }
            }

            // 3. 页面宽度设置 (可折叠)
            const widthContainer = createElement('div', {});

            // 启用开关
            const enableWidthItem = createElement('div', { className: 'setting-item' });
            const enableWidthInfo = createElement('div', { className: 'setting-item-info' });
            enableWidthInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('enablePageWidth')));
            enableWidthInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('pageWidthDesc')));
            const enableToggle = createElement('div', {
                className: 'setting-toggle' + (this.settings.pageWidth && this.settings.pageWidth.enabled ? ' active' : ''),
                id: 'toggle-page-width',
            });
            enableToggle.addEventListener('click', () => {
                this.settings.pageWidth.enabled = !this.settings.pageWidth.enabled;
                enableToggle.classList.toggle('active', this.settings.pageWidth.enabled);
                this.saveSettings();
                if (this.widthStyleManager) {
                    this.widthStyleManager.updateConfig(this.settings.pageWidth);
                }
                showToast(this.settings.pageWidth.enabled ? this.t('settingOn') : this.t('settingOff'));
            });
            enableWidthItem.appendChild(enableWidthInfo);
            enableWidthItem.appendChild(enableToggle);
            widthContainer.appendChild(enableWidthItem);

            // 值设置
            const widthValueItem = createElement('div', { className: 'setting-item' });
            const widthValueInfo = createElement('div', { className: 'setting-item-info' });
            widthValueInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('widthValue')));

            const widthControls = createElement('div', { className: 'setting-controls' });
            const widthInput = createElement('input', {
                type: 'number',
                className: 'setting-select',
                id: 'width-value-input',
                value: this.settings.pageWidth ? this.settings.pageWidth.value : '70',
                style: 'width: 65px !important; min-width: 65px !important; text-align: right;',
            });
            const unitSelect = createElement('select', {
                className: 'setting-select',
                id: 'width-unit-select',
                style: 'width: 65px;',
            });
            ['%', 'px'].forEach((unit) => {
                const option = createElement('option', { value: unit }, unit);
                if (this.settings.pageWidth && this.settings.pageWidth.unit === unit) option.selected = true;
                unitSelect.appendChild(option);
            });

            const validateAndSave = () => {
                let val = parseFloat(widthInput.value);
                const unit = unitSelect.value;
                if (unit === '%') {
                    if (val > 100) val = 100;
                    if (val < 10) val = 10;
                } else {
                    if (val < 400) val = 400;
                }
                if (val !== parseFloat(widthInput.value)) widthInput.value = val;
                this.settings.pageWidth.value = val.toString();
                this.settings.pageWidth.unit = unit;
                this.saveSettings();
                if (this.widthStyleManager) this.widthStyleManager.updateConfig(this.settings.pageWidth);
            };

            let timeout;
            widthInput.addEventListener('input', () => {
                if (widthInput.value.length > 5) widthInput.value = widthInput.value.slice(0, 5);
                if (unitSelect.value === '%' && parseFloat(widthInput.value) > 100) widthInput.value = '100';
                else if (unitSelect.value === 'px' && parseFloat(widthInput.value) <= 100) widthInput.value = '1200';
                clearTimeout(timeout);
                timeout = setTimeout(validateAndSave, 500);
            });
            widthInput.addEventListener('change', validateAndSave);
            unitSelect.addEventListener('change', () => {
                if (unitSelect.value === '%' && parseFloat(widthInput.value) > 100) widthInput.value = '70';
                else if (unitSelect.value === 'px' && parseFloat(widthInput.value) <= 100) widthInput.value = '1200';
                validateAndSave();
                showToast(`${this.t('widthValue')}: ${widthInput.value}${unitSelect.value}`);
            });

            widthControls.appendChild(widthInput);
            widthControls.appendChild(unitSelect);
            widthValueItem.appendChild(widthValueInfo);
            widthValueItem.appendChild(widthControls);
            widthContainer.appendChild(widthValueItem);

            // 防止自动滚动（从其他设置移入）
            const scrollLockItem = createElement('div', { className: 'setting-item' });
            const scrollLockInfo = createElement('div', { className: 'setting-item-info' });
            scrollLockInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('preventAutoScrollLabel')));
            scrollLockInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('preventAutoScrollDesc')));

            const scrollLockToggle = createElement('div', {
                className: 'setting-toggle' + (this.settings.preventAutoScroll ? ' active' : ''),
                id: 'toggle-scroll-lock',
            });
            scrollLockToggle.addEventListener('click', () => {
                this.settings.preventAutoScroll = !this.settings.preventAutoScroll;
                scrollLockToggle.classList.toggle('active', this.settings.preventAutoScroll);
                this.saveSettings();
                if (this.scrollLockManager) {
                    this.scrollLockManager.setEnabled(this.settings.preventAutoScroll);
                }
                showToast(this.settings.preventAutoScroll ? this.t('settingOn') : this.t('settingOff'));
            });
            scrollLockItem.appendChild(scrollLockInfo);
            scrollLockItem.appendChild(scrollLockToggle);
            widthContainer.appendChild(scrollLockItem);

            const widthSection = this.createCollapsibleSection(this.t('pageDisplaySettings'), widthContainer);

            // 4. 界面排版 (可折叠)
            const layoutContainer = createElement('div', {});
            const tabDesc = createElement(
                'div',
                {
                    className: 'setting-item-desc',
                    style: 'padding: 0 12px 8px 12px; margin-bottom: 4px;',
                },
                this.t('tabOrderDesc'),
            );
            layoutContainer.appendChild(tabDesc);

            const currentOrder = this.settings.tabOrder || DEFAULT_TAB_ORDER;
            // 过滤掉 settings（已移到 header 按钮，不参与排序）
            const validOrder = currentOrder.filter((id) => TAB_DEFINITIONS[id] && id !== 'settings');

            validOrder.forEach((tabId, index) => {
                const def = TAB_DEFINITIONS[tabId];
                const item = createElement('div', { className: 'setting-item' });
                const info = createElement('div', { className: 'setting-item-info' });
                info.appendChild(createElement('div', { className: 'setting-item-label' }, this.t(def.labelKey)));

                const controls = createElement('div', { className: 'setting-controls' });

                // 特殊处理：如果是大纲 Tab，在排序按钮旁边添加开关
                if (tabId === 'outline') {
                    const outlineToggle = createElement('div', {
                        className: 'setting-toggle' + (this.settings.outline?.enabled ? ' active' : ''),
                        id: 'toggle-outline-inline',
                        style: 'transform: scale(0.8); margin-right: 12px;',
                        title: this.t('enableOutline'), // 添加提示
                    });
                    outlineToggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.settings.outline.enabled = !this.settings.outline.enabled;
                        outlineToggle.title = this.settings.outline.enabled ? this.t('disableOutline') : this.t('enableOutline');
                        outlineToggle.classList.toggle('active', this.settings.outline.enabled);
                        this.saveSettings();

                        const outlineTab = document.getElementById('outline-tab');
                        if (outlineTab) outlineTab.classList.toggle('hidden', !this.settings.outline.enabled);

                        if (!this.settings.outline.enabled && this.currentTab === 'outline') this.switchTab('settings');

                        // 更新自动更新状态
                        if (this.outlineManager) {
                            this.outlineManager.updateAutoUpdateState();
                        }

                        showToast(this.settings.outline.enabled ? this.t('settingOn') : this.t('settingOff'));
                    });
                    controls.appendChild(outlineToggle);
                }

                // 特殊处理：如果是提示词 Tab，在排序按钮旁边添加开关
                if (tabId === 'prompts') {
                    const promptsToggle = createElement('div', {
                        className: 'setting-toggle' + (this.settings.prompts?.enabled ? ' active' : ''),
                        id: 'toggle-prompts-inline',
                        style: 'transform: scale(0.8); margin-right: 12px;',
                        title: this.t('togglePrompts'),
                    });
                    promptsToggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.settings.prompts.enabled = !this.settings.prompts.enabled;
                        promptsToggle.classList.toggle('active', this.settings.prompts.enabled);
                        this.saveSettings();

                        const promptsTab = document.getElementById('prompts-tab');
                        if (promptsTab) promptsTab.classList.toggle('hidden', !this.settings.prompts.enabled);

                        if (!this.settings.prompts.enabled && this.currentTab === 'prompts') this.switchTab('settings');

                        showToast(this.settings.prompts.enabled ? this.t('settingOn') : this.t('settingOff'));
                    });
                    controls.appendChild(promptsToggle);
                }

                // 特殊处理：如果是会话 Tab，在排序按钮旁边添加开关
                if (tabId === 'conversations') {
                    // 确保 conversations 设置对象存在
                    if (!this.settings.conversations) {
                        this.settings.conversations = { enabled: true };
                    }
                    const conversationsToggle = createElement('div', {
                        className: 'setting-toggle' + (this.settings.conversations?.enabled !== false ? ' active' : ''),
                        id: 'toggle-conversations-inline',
                        style: 'transform: scale(0.8); margin-right: 12px;',
                        title: this.t('toggleConversations'),
                    });
                    conversationsToggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.settings.conversations.enabled = !this.settings.conversations.enabled;
                        conversationsToggle.classList.toggle('active', this.settings.conversations.enabled);
                        this.saveSettings();

                        const conversationsTab = document.getElementById('conversations-tab');
                        if (conversationsTab) conversationsTab.classList.toggle('hidden', !this.settings.conversations.enabled);

                        if (!this.settings.conversations.enabled && this.currentTab === 'conversations') this.switchTab('settings');

                        showToast(this.settings.conversations.enabled ? this.t('settingOn') : this.t('settingOff'));
                    });
                    controls.appendChild(conversationsToggle);
                }

                const upBtn = createElement('button', {
                    className: 'prompt-panel-btn',
                    style: 'background: var(--gh-hover, #f3f4f6); color: #4b5563; width: 32px; height: 32px; font-size: 16px; margin-right: 4px; border: 1px solid var(--gh-border, #e5e7eb);',
                    title: this.t('moveUp'),
                });
                upBtn.textContent = '⬆';
                upBtn.disabled = index === 0;

                const downBtn = createElement('button', {
                    className: 'prompt-panel-btn',
                    style: 'background: var(--gh-hover, #f3f4f6); color: #4b5563; width: 32px; height: 32px; font-size: 16px; border: 1px solid var(--gh-border, #e5e7eb);',
                    title: this.t('moveDown'),
                });
                downBtn.textContent = '⬇';
                downBtn.disabled = index === validOrder.length - 1;

                [upBtn, downBtn].forEach((btn) => {
                    if (btn.disabled) {
                        btn.style.opacity = '0.4';
                        btn.style.cursor = 'not-allowed';
                        btn.style.background = 'var(--gh-hover, #f3f4f6)';
                    } else {
                        btn.style.opacity = '1';
                        btn.style.cursor = 'pointer';
                        btn.onmouseover = () => {
                            btn.style.background = 'var(--gh-border, #e5e7eb)';
                            btn.style.color = '#111827';
                        };
                        btn.onmouseout = () => {
                            btn.style.background = 'var(--gh-hover, #f3f4f6)';
                            btn.style.color = '#4b5563';
                        };
                    }
                });

                upBtn.addEventListener('click', () => {
                    if (index > 0) {
                        const newOrder = [...validOrder];
                        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                        this.settings.tabOrder = newOrder;
                        this.saveSettings();
                        this.createUI();
                        this.bindEvents();
                        this.switchTab('settings');
                    }
                });

                downBtn.addEventListener('click', () => {
                    if (index < validOrder.length - 1) {
                        const newOrder = [...validOrder];
                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                        this.settings.tabOrder = newOrder;
                        this.saveSettings();
                        this.createUI();
                        this.bindEvents();
                        this.switchTab('settings');
                    }
                });

                controls.appendChild(upBtn);
                controls.appendChild(downBtn);

                item.appendChild(info);
                item.appendChild(controls);
                layoutContainer.appendChild(item);
            });

            const layoutSection = this.createCollapsibleSection(this.t('tabOrderSettings'), layoutContainer);

            // 4.5 阅读历史设置
            const anchorContainer = createElement('div', {});

            // 持久化开关
            const anchorPersistenceItem = createElement('div', { className: 'setting-item' });
            const anchorPersistenceInfo = createElement('div', { className: 'setting-item-info' });
            anchorPersistenceInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('readingHistoryPersistence')));
            anchorPersistenceInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('readingHistoryPersistenceDesc')));

            const anchorPersistenceToggle = createElement('div', {
                className: 'setting-toggle' + (this.settings.readingHistory.persistence ? ' active' : ''),
                id: 'toggle-anchor-persistence',
            });

            // 自动恢复开关
            const anchorAutoRestoreItem = createElement('div', { className: 'setting-item' });
            const anchorAutoRestoreInfo = createElement('div', { className: 'setting-item-info' });
            anchorAutoRestoreInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('autoRestore')));
            anchorAutoRestoreInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('autoRestoreDesc')));
            const anchorAutoRestoreToggle = createElement('div', {
                className: 'setting-toggle' + (this.settings.readingHistory.autoRestore ? ' active' : ''),
                id: 'toggle-anchor-auto-restore',
            });

            // 清理时间设置
            const anchorCleanupItem = createElement('div', { className: 'setting-item' });
            const anchorCleanupInfo = createElement('div', { className: 'setting-item-info' });
            anchorCleanupInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('readingHistoryCleanup')));
            anchorCleanupInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('readingHistoryCleanupDesc')));

            const anchorCleanupControls = createElement('div', { className: 'setting-controls' });
            const anchorCleanupInput = createElement('select', { className: 'setting-select' });

            // 填充清理选项
            const cleanupOptions = [
                { val: 1, label: `1 ${this.t('daysSuffix')}` },
                { val: 3, label: `3 ${this.t('daysSuffix')}` },
                { val: 7, label: `7 ${this.t('daysSuffix')}` },
                { val: 30, label: `30 ${this.t('daysSuffix')}` },
                { val: 90, label: `90 ${this.t('daysSuffix')}` },
                { val: -1, label: this.t('cleanupInfinite') },
            ];
            cleanupOptions.forEach((opt) => {
                const option = createElement('option', { value: opt.val }, opt.label);
                if (this.settings.readingHistory.cleanupDays == opt.val) option.selected = true;
                anchorCleanupInput.appendChild(option);
            });

            // 联动逻辑函数
            const updateDependency = (enabled) => {
                if (enabled) {
                    anchorAutoRestoreItem.style.opacity = '1';
                    anchorAutoRestoreItem.style.pointerEvents = 'auto';
                    anchorCleanupItem.style.opacity = '1';
                    anchorCleanupItem.style.pointerEvents = 'auto';
                } else {
                    anchorAutoRestoreItem.style.opacity = '0.5';
                    anchorAutoRestoreItem.style.pointerEvents = 'none';
                    anchorCleanupItem.style.opacity = '0.5';
                    anchorCleanupItem.style.pointerEvents = 'none';
                }
            };

            // 初始化联动
            updateDependency(this.settings.readingHistory.persistence);

            anchorPersistenceToggle.addEventListener('click', () => {
                this.settings.readingHistory.persistence = !this.settings.readingHistory.persistence;
                anchorPersistenceToggle.classList.toggle('active', this.settings.readingHistory.persistence);
                this.saveSettings();
                updateDependency(this.settings.readingHistory.persistence);
                showToast(this.settings.readingHistory.persistence ? this.t('settingOn') : this.t('settingOff'));
            });

            anchorAutoRestoreToggle.addEventListener('click', () => {
                this.settings.readingHistory.autoRestore = !this.settings.readingHistory.autoRestore;
                anchorAutoRestoreToggle.classList.toggle('active', this.settings.readingHistory.autoRestore);
                this.saveSettings();
                showToast(this.settings.readingHistory.autoRestore ? this.t('settingOn') : this.t('settingOff'));
            });

            anchorCleanupInput.addEventListener('change', () => {
                this.settings.readingHistory.cleanupDays = parseInt(anchorCleanupInput.value);
                this.saveSettings();
                showToast(`${this.t('readingHistoryCleanup')}: ${anchorCleanupInput.options[anchorCleanupInput.selectedIndex].text}`);
            });

            anchorPersistenceItem.appendChild(anchorPersistenceInfo);
            anchorPersistenceItem.appendChild(anchorPersistenceToggle);

            anchorAutoRestoreItem.appendChild(anchorAutoRestoreInfo);
            anchorAutoRestoreItem.appendChild(anchorAutoRestoreToggle);

            anchorCleanupControls.appendChild(anchorCleanupInput);
            anchorCleanupItem.appendChild(anchorCleanupInfo);
            anchorCleanupItem.appendChild(anchorCleanupControls);

            anchorContainer.appendChild(anchorPersistenceItem);
            anchorContainer.appendChild(anchorAutoRestoreItem);
            anchorContainer.appendChild(anchorCleanupItem);

            // showCollapsedAnchor has been moved to Panel Settings
            anchorContainer.appendChild(anchorPersistenceItem);
            anchorContainer.appendChild(anchorAutoRestoreItem);
            anchorContainer.appendChild(anchorCleanupItem);

            const anchorSection = this.createCollapsibleSection(this.t('readingNavigationSettings'), anchorContainer);

            // 5. 大纲详细设置
            const outlineSettingsContainer = createElement('div', {});

            // 自动更新开关
            const autoUpdateItem = createElement('div', { className: 'setting-item' });
            const autoUpdateInfo = createElement('div', { className: 'setting-item-info' });
            autoUpdateInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('outlineAutoUpdateLabel')));
            autoUpdateInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('outlineAutoUpdateDesc')));

            const autoUpdateToggle = createElement('div', {
                className: 'setting-toggle' + (this.settings.outline.autoUpdate ? ' active' : ''),
                id: 'toggle-outline-auto-update',
            });
            autoUpdateToggle.addEventListener('click', () => {
                this.settings.outline.autoUpdate = !this.settings.outline.autoUpdate;
                autoUpdateToggle.classList.toggle('active', this.settings.outline.autoUpdate);
                this.saveSettings();
                if (this.outlineManager) this.outlineManager.updateAutoUpdateState();
                showToast(this.settings.outline.autoUpdate ? this.t('settingOn') : this.t('settingOff'));
            });
            autoUpdateItem.appendChild(autoUpdateInfo);
            autoUpdateItem.appendChild(autoUpdateToggle);
            outlineSettingsContainer.appendChild(autoUpdateItem);

            // 更新间隔
            const updateIntervalItem = createElement('div', { className: 'setting-item' });
            const updateIntervalInfo = createElement('div', { className: 'setting-item-info' });
            updateIntervalInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('outlineUpdateIntervalLabel')));
            const updateIntervalControls = createElement('div', { className: 'setting-controls' });
            const updateIntervalInput = createElement('input', {
                type: 'number',
                className: 'setting-select',
                value: this.settings.outline.updateInterval,
                style: 'width: 60px !important; text-align: center;',
                min: 1,
            });
            updateIntervalInput.addEventListener('change', () => {
                let val = parseInt(updateIntervalInput.value, 10);
                if (val < 1) val = 1; // 最小 1 秒
                updateIntervalInput.value = val;
                this.settings.outline.updateInterval = val;
                this.saveSettings();
                // OutlineManager 在触发下一次更新时会自动使用新间隔
                showToast(this.t('outlineIntervalUpdated').replace('{val}', val));
            });
            updateIntervalControls.appendChild(updateIntervalInput);
            updateIntervalItem.appendChild(updateIntervalInfo);
            updateIntervalItem.appendChild(updateIntervalControls);
            outlineSettingsContainer.appendChild(updateIntervalItem);

            const outlineSettingsSection = this.createCollapsibleSection(this.t('outlineSettings'), outlineSettingsContainer, { defaultExpanded: false });

            // 5.5 面板设置
            const panelSettingsContainer = createElement('div', {});

            // 5.5.1 默认显示面板开关
            const defaultPanelStateItem = createElement('div', { className: 'setting-item' });
            const defaultPanelStateInfo = createElement('div', { className: 'setting-item-info' });
            defaultPanelStateInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('defaultPanelStateLabel')));
            defaultPanelStateInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('defaultPanelStateDesc')));

            const defaultPanelStateToggle = createElement('div', {
                className: 'setting-toggle' + (this.settings.defaultPanelState ? ' active' : ''),
                id: 'toggle-default-panel-state',
            });
            defaultPanelStateToggle.addEventListener('click', () => {
                this.settings.defaultPanelState = !this.settings.defaultPanelState;
                defaultPanelStateToggle.classList.toggle('active', this.settings.defaultPanelState);
                this.saveSettings();
                showToast(this.settings.defaultPanelState ? this.t('settingOn') : this.t('settingOff'));
            });
            defaultPanelStateItem.appendChild(defaultPanelStateInfo);
            defaultPanelStateItem.appendChild(defaultPanelStateToggle);
            panelSettingsContainer.appendChild(defaultPanelStateItem);

            // 5.5.2 自动隐藏面板开关
            const autoHidePanelItem = createElement('div', { className: 'setting-item' });
            const autoHidePanelInfo = createElement('div', { className: 'setting-item-info' });
            autoHidePanelInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('autoHidePanelLabel')));
            autoHidePanelInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('autoHidePanelDesc')));

            const autoHidePanelToggle = createElement('div', {
                className: 'setting-toggle' + (this.settings.autoHidePanel ? ' active' : ''),
                id: 'toggle-auto-hide-panel',
            });
            autoHidePanelToggle.addEventListener('click', () => {
                this.settings.autoHidePanel = !this.settings.autoHidePanel;
                autoHidePanelToggle.classList.toggle('active', this.settings.autoHidePanel);
                this.saveSettings();
                showToast(this.settings.autoHidePanel ? this.t('settingOn') : this.t('settingOff'));
            });
            autoHidePanelItem.appendChild(autoHidePanelInfo);
            autoHidePanelItem.appendChild(autoHidePanelToggle);
            panelSettingsContainer.appendChild(autoHidePanelItem);

            // 5.5.3 折叠面板按钮排序
            const collapsedBtnDesc = createElement(
                'div',
                {
                    className: 'setting-item-desc',
                    style: 'padding: 0 12px 8px 12px; margin-bottom: 4px;',
                },
                this.t('collapsedButtonsOrderDesc') || '调整折叠面板按钮的显示顺序',
            );
            panelSettingsContainer.appendChild(collapsedBtnDesc);

            const currentBtnOrder = this.settings.collapsedButtonsOrder || DEFAULT_COLLAPSED_BUTTONS_ORDER;

            currentBtnOrder.forEach((btnConfig, index) => {
                const def = COLLAPSED_BUTTON_DEFS[btnConfig.id];
                if (!def) return;

                const item = createElement('div', { className: 'setting-item' });
                const info = createElement('div', { className: 'setting-item-info' });
                const label = createElement('div', { className: 'setting-item-label', style: 'display: flex; align-items: center;' });
                const iconSpan = createElement('span', { style: 'display: inline-block; width: 24px; text-align: center; margin-right: 4px;' }, def.icon);
                const textSpan = createElement('span', {}, this.t(def.labelKey));
                label.appendChild(iconSpan);
                label.appendChild(textSpan);
                info.appendChild(label);

                const controls = createElement('div', { className: 'setting-controls' });

                // 可切换的按钮（anchor/theme）添加开关
                if (def.canToggle) {
                    const toggle = createElement('div', {
                        className: 'setting-toggle' + (btnConfig.enabled ? ' active' : ''),
                        style: 'transform: scale(0.8); margin-right: 12px;',
                    });
                    toggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        btnConfig.enabled = !btnConfig.enabled;
                        toggle.classList.toggle('active', btnConfig.enabled);
                        this.saveSettings();
                        this.createUI();
                        this.bindEvents();
                        this.switchTab('settings');
                        showToast(btnConfig.enabled ? this.t('settingOn') : this.t('settingOff'));
                    });
                    controls.appendChild(toggle);
                }

                // 上下移动按钮
                const upBtn = createElement('button', {
                    className: 'prompt-panel-btn',
                    style: 'background: var(--gh-hover, #f3f4f6); color: #4b5563; width: 32px; height: 32px; font-size: 16px; margin-right: 4px; border: 1px solid var(--gh-border, #e5e7eb);',
                    title: this.t('moveUp'),
                });
                upBtn.textContent = '⬆';
                upBtn.disabled = index === 0;

                const downBtn = createElement('button', {
                    className: 'prompt-panel-btn',
                    style: 'background: var(--gh-hover, #f3f4f6); color: #4b5563; width: 32px; height: 32px; font-size: 16px; border: 1px solid var(--gh-border, #e5e7eb);',
                    title: this.t('moveDown'),
                });
                downBtn.textContent = '⬇';
                downBtn.disabled = index === currentBtnOrder.length - 1;

                [upBtn, downBtn].forEach((btn) => {
                    if (btn.disabled) {
                        btn.style.opacity = '0.4';
                        btn.style.cursor = 'not-allowed';
                    } else {
                        btn.style.opacity = '1';
                        btn.style.cursor = 'pointer';
                        btn.onmouseover = () => {
                            btn.style.background = 'var(--gh-border, #e5e7eb)';
                            btn.style.color = '#111827';
                        };
                        btn.onmouseout = () => {
                            btn.style.background = 'var(--gh-hover, #f3f4f6)';
                            btn.style.color = '#4b5563';
                        };
                    }
                });

                upBtn.addEventListener('click', () => {
                    if (index > 0) {
                        const newOrder = [...currentBtnOrder];
                        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                        this.settings.collapsedButtonsOrder = newOrder;
                        this.saveSettings();
                        this.createUI();
                        this.bindEvents();
                        this.switchTab('settings');
                    }
                });

                downBtn.addEventListener('click', () => {
                    if (index < currentBtnOrder.length - 1) {
                        const newOrder = [...currentBtnOrder];
                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                        this.settings.collapsedButtonsOrder = newOrder;
                        this.saveSettings();
                        this.createUI();
                        this.bindEvents();
                        this.switchTab('settings');
                    }
                });

                controls.appendChild(upBtn);
                controls.appendChild(downBtn);

                item.appendChild(info);
                item.appendChild(controls);
                panelSettingsContainer.appendChild(item);
            });

            const panelSettingsSection = this.createCollapsibleSection(this.t('panelSettingsTitle'), panelSettingsContainer, { defaultExpanded: false });

            // 6. 标签页设置
            const tabSettingsContainer = createElement('div', {});

            // 6.1 新标签页打开开关
            if (this.siteAdapter.supportsNewTab()) {
                const newTabItem = createElement('div', { className: 'setting-item' });
                const newTabInfo = createElement('div', { className: 'setting-item-info' });
                newTabInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('openNewTabLabel')));
                newTabInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('openNewTabDesc')));

                const newTabToggle = createElement('div', {
                    className: 'setting-toggle' + (this.settings.tabSettings?.openInNewTab ? ' active' : ''),
                    id: 'toggle-new-tab',
                });
                newTabToggle.addEventListener('click', () => {
                    this.settings.tabSettings.openInNewTab = !this.settings.tabSettings.openInNewTab;
                    newTabToggle.classList.toggle('active', this.settings.tabSettings.openInNewTab);
                    this.saveSettings();
                    this.createUI();
                    this.bindEvents();
                    if (this.currentTab === 'settings') {
                        this.switchTab('settings');
                    }
                    showToast(this.settings.tabSettings.openInNewTab ? this.t('settingOn') : this.t('settingOff'));
                });

                newTabItem.appendChild(newTabInfo);
                newTabItem.appendChild(newTabToggle);
                tabSettingsContainer.appendChild(newTabItem);
            }

            // 6.2 自动重命名标签页开关 (仅支持的站点显示)
            if (this.siteAdapter.supportsTabRename()) {
                const renameTabItem = createElement('div', { className: 'setting-item' });
                const renameTabInfo = createElement('div', { className: 'setting-item-info' });
                renameTabInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('autoRenameTabLabel')));
                renameTabInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('autoRenameTabDesc')));

                const renameTabToggle = createElement('div', {
                    className: 'setting-toggle' + (this.settings.tabSettings?.autoRenameTab ? ' active' : ''),
                    id: 'toggle-auto-rename-tab',
                });
                renameTabItem.appendChild(renameTabInfo);
                renameTabItem.appendChild(renameTabToggle);
                tabSettingsContainer.appendChild(renameTabItem);

                // 6.3 检测频率
                const intervalItem = createElement('div', { className: 'setting-item' });
                const intervalInfo = createElement('div', { className: 'setting-item-info' });
                intervalInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('renameIntervalLabel')));
                intervalInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('renameIntervalDesc')));

                const intervalControls = createElement('div', { className: 'setting-controls' });
                const intervalSelect = createElement('select', {
                    className: 'setting-select',
                    id: 'select-rename-interval',
                });
                const intervalOptions = [1, 3, 5, 10, 30, 60];
                intervalOptions.forEach((val) => {
                    const option = createElement('option', { value: val }, `${val} ${this.t('secondsSuffix')}`);
                    if (this.settings.tabSettings?.renameInterval === val) option.selected = true;
                    intervalSelect.appendChild(option);
                });
                intervalSelect.addEventListener('change', () => {
                    this.settings.tabSettings.renameInterval = parseInt(intervalSelect.value);
                    this.saveSettings();
                    if (this.tabRenameManager && this.tabRenameManager.isActive()) {
                        this.tabRenameManager.setInterval(this.settings.tabSettings.renameInterval);
                    }
                    showToast(`${this.t('renameIntervalLabel')}: ${intervalSelect.value}${this.t('secondsSuffix')}`);
                });

                intervalControls.appendChild(intervalSelect);
                intervalItem.appendChild(intervalInfo);
                intervalItem.appendChild(intervalControls);
                tabSettingsContainer.appendChild(intervalItem);

                // 定义状态更新函数
                const updateIntervalState = () => {
                    const isEnabled = this.settings.tabSettings.autoRenameTab;
                    intervalSelect.disabled = !isEnabled;
                    intervalItem.style.opacity = isEnabled ? '1' : '0.5';
                    intervalItem.style.pointerEvents = isEnabled ? 'auto' : 'none';
                };

                // 初始化状态
                updateIntervalState();

                // 绑定开关点击事件
                renameTabToggle.addEventListener('click', () => {
                    this.settings.tabSettings.autoRenameTab = !this.settings.tabSettings.autoRenameTab;
                    renameTabToggle.classList.toggle('active', this.settings.tabSettings.autoRenameTab);
                    this.saveSettings();

                    // 更新检测频率项状态
                    updateIntervalState();

                    // 启动/停止 TabRenameManager
                    if (this.tabRenameManager) {
                        if (this.settings.tabSettings.autoRenameTab) {
                            this.tabRenameManager.start();
                        } else {
                            this.tabRenameManager.stop();
                        }
                    }

                    showToast(this.settings.tabSettings.autoRenameTab ? this.t('settingOn') : this.t('settingOff'));
                });
            }

            // 6.4 显示生成状态 (showStatus)
            if (this.siteAdapter.supportsTabRename()) {
                const showStatusItem = createElement('div', { className: 'setting-item' });
                const showStatusInfo = createElement('div', { className: 'setting-item-info' });
                showStatusInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('showStatusLabel')));
                showStatusInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('showStatusDesc')));

                const showStatusToggle = createElement('div', {
                    className: 'setting-toggle' + (this.settings.tabSettings?.showStatus !== false ? ' active' : ''),
                    id: 'toggle-show-status',
                });
                showStatusToggle.addEventListener('click', () => {
                    this.settings.tabSettings.showStatus = !this.settings.tabSettings.showStatus;
                    showStatusToggle.classList.toggle('active', this.settings.tabSettings.showStatus);
                    this.saveSettings();
                    if (this.tabRenameManager) this.tabRenameManager.updateTabName(true);
                    showToast(this.settings.tabSettings.showStatus ? this.t('settingOn') : this.t('settingOff'));
                });

                showStatusItem.appendChild(showStatusInfo);
                showStatusItem.appendChild(showStatusToggle);
                tabSettingsContainer.appendChild(showStatusItem);
            }

            // 6.5 标题格式 (titleFormat)
            if (this.siteAdapter.supportsTabRename()) {
                const formatItem = createElement('div', { className: 'setting-item' });
                const formatInfo = createElement('div', { className: 'setting-item-info' });
                formatInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('titleFormatLabel')));
                formatInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('titleFormatDesc')));

                const formatInput = createElement('input', {
                    type: 'text',
                    className: 'prompt-input-title',
                    value: this.settings.tabSettings?.titleFormat || '{status}{title}',
                    style: 'width: 130px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;',
                });
                formatInput.addEventListener('change', () => {
                    this.settings.tabSettings.titleFormat = formatInput.value.trim() || '{status}{title}';
                    this.saveSettings();
                    if (this.tabRenameManager) this.tabRenameManager.updateTabName(true);
                });

                formatItem.appendChild(formatInfo);
                formatItem.appendChild(formatInput);
                tabSettingsContainer.appendChild(formatItem);
            }

            // 6.6 发送桌面通知 (showNotification)
            if (this.siteAdapter.supportsTabRename()) {
                const notificationItem = createElement('div', { className: 'setting-item' });
                const notificationInfo = createElement('div', { className: 'setting-item-info' });
                notificationInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('showNotificationLabel')));
                notificationInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('showNotificationDesc')));

                const notificationToggle = createElement('div', {
                    className: 'setting-toggle' + (this.settings.tabSettings?.showNotification ? ' active' : ''),
                    id: 'toggle-show-notification',
                });
                notificationToggle.addEventListener('click', () => {
                    this.settings.tabSettings.showNotification = !this.settings.tabSettings.showNotification;
                    notificationToggle.classList.toggle('active', this.settings.tabSettings.showNotification);
                    this.saveSettings();
                    showToast(this.settings.tabSettings.showNotification ? this.t('settingOn') : this.t('settingOff'));
                });

                notificationItem.appendChild(notificationInfo);
                notificationItem.appendChild(notificationToggle);
                tabSettingsContainer.appendChild(notificationItem);
            }

            // 6.7 自动窗口置顶 (autoFocus)
            if (this.siteAdapter.supportsTabRename()) {
                const autoFocusItem = createElement('div', { className: 'setting-item' });
                const autoFocusInfo = createElement('div', { className: 'setting-item-info' });
                autoFocusInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('autoFocusLabel')));
                autoFocusInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('autoFocusDesc')));

                const autoFocusToggle = createElement('div', {
                    className: 'setting-toggle' + (this.settings.tabSettings?.autoFocus ? ' active' : ''),
                    id: 'toggle-auto-focus',
                });
                autoFocusToggle.addEventListener('click', () => {
                    this.settings.tabSettings.autoFocus = !this.settings.tabSettings.autoFocus;
                    autoFocusToggle.classList.toggle('active', this.settings.tabSettings.autoFocus);
                    this.saveSettings();
                    showToast(this.settings.tabSettings.autoFocus ? this.t('settingOn') : this.t('settingOff'));
                });

                autoFocusItem.appendChild(autoFocusInfo);
                autoFocusItem.appendChild(autoFocusToggle);
                tabSettingsContainer.appendChild(autoFocusItem);
            }

            // 6.8 隐私模式 (privacyMode)
            if (this.siteAdapter.supportsTabRename()) {
                const privacyItem = createElement('div', { className: 'setting-item' });
                const privacyInfo = createElement('div', { className: 'setting-item-info' });
                privacyInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('privacyModeLabel')));
                privacyInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('privacyModeDesc')));

                const privacyToggle = createElement('div', {
                    className: 'setting-toggle' + (this.settings.tabSettings?.privacyMode ? ' active' : ''),
                    id: 'toggle-privacy-mode',
                });

                privacyItem.appendChild(privacyInfo);
                privacyItem.appendChild(privacyToggle);
                tabSettingsContainer.appendChild(privacyItem);

                // 6.9 伪装标题输入框 (privacyTitle)
                const privacyTitleItem = createElement('div', { className: 'setting-item' });
                const privacyTitleInfo = createElement('div', { className: 'setting-item-info' });
                privacyTitleInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('privacyTitleLabel')));

                const privacyTitleInput = createElement('input', {
                    type: 'text',
                    className: 'prompt-input-title',
                    value: this.settings.tabSettings?.privacyTitle || 'Google',
                    placeholder: this.t('privacyTitlePlaceholder'),
                    style: 'width: 100px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;',
                });
                privacyTitleInput.addEventListener('change', () => {
                    this.settings.tabSettings.privacyTitle = privacyTitleInput.value.trim() || 'Google';
                    this.saveSettings();
                    if (this.settings.tabSettings.privacyMode && this.tabRenameManager) {
                        this.tabRenameManager.updateTabName(true);
                    }
                });

                privacyTitleItem.appendChild(privacyTitleInfo);
                privacyTitleItem.appendChild(privacyTitleInput);
                tabSettingsContainer.appendChild(privacyTitleItem);

                // 定义状态更新函数（类似 renameInterval 的处理方式）
                const updatePrivacyTitleState = () => {
                    const isEnabled = this.settings.tabSettings.privacyMode;
                    privacyTitleInput.disabled = !isEnabled;
                    privacyTitleItem.style.opacity = isEnabled ? '1' : '0.5';
                    privacyTitleItem.style.pointerEvents = isEnabled ? 'auto' : 'none';
                };

                // 初始化状态
                updatePrivacyTitleState();

                // 绑定隐私模式开关点击事件
                privacyToggle.addEventListener('click', () => {
                    this.settings.tabSettings.privacyMode = !this.settings.tabSettings.privacyMode;
                    privacyToggle.classList.toggle('active', this.settings.tabSettings.privacyMode);
                    this.saveSettings();
                    if (this.tabRenameManager) this.tabRenameManager.updateTabName(true);
                    // 更新伪装标题项状态
                    updatePrivacyTitleState();
                    showToast(this.settings.tabSettings.privacyMode ? '🔒 ' + this.t('settingOn') : '🔓 ' + this.t('settingOff'));
                });
            }

            const tabSettingsSection = this.createCollapsibleSection(this.t('tabSettingsTitle'), tabSettingsContainer, { defaultExpanded: false });

            // 7. 其他设置 (折叠面板) - 仅保留站点特定功能
            const otherSettingsContainer = createElement('div', {});

            // Gemini Business 专属设置
            if (this.siteAdapter instanceof GeminiBusinessAdapter) {
                const clearItem = createElement('div', { className: 'setting-item' });
                const clearInfo = createElement('div', { className: 'setting-item-info' });
                clearInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('clearOnSendLabel')));
                clearInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('clearOnSendDesc')));
                const toggle = createElement('div', {
                    className: 'setting-toggle' + (this.settings.clearTextareaOnSend ? ' active' : ''),
                    id: 'toggle-clear-on-send',
                });
                toggle.addEventListener('click', () => {
                    this.settings.clearTextareaOnSend = !this.settings.clearTextareaOnSend;
                    toggle.classList.toggle('active', this.settings.clearTextareaOnSend);
                    this.saveSettings();
                    showToast(this.settings.clearTextareaOnSend ? this.t('settingOn') : this.t('settingOff'));
                });
                clearItem.appendChild(clearInfo);
                clearItem.appendChild(toggle);
                otherSettingsContainer.appendChild(clearItem);
            }

            const otherSettingsSection = this.createCollapsibleSection(this.t('otherSettingsTitle'), otherSettingsContainer, { defaultExpanded: false });

            // 7.5. 面板可见性设置 (添加到通用设置/其他设置中，这里选择添加到"界面排版"更合适，或者单独的通用设置区域)
            // 根据用户描述"在通用设置里"，我们找一个合适的位置。
            // 之前的 otherSettingsSection 标题是 "其他设置"，我们可以把 面板可见性 加到这里，或者 layoutSection "界面排版"
            // 考虑到这是界面行为，放在 layoutSection 或者一个新的 "通用设置" 区域比较好。
            // 但现有的 layoutSection 是 Tab 顺序。
            // 让我们把它加到 otherSettingsSection (其他设置) 作为一个子项，或者在 createSettingsContent 开头创建一个新的 General Section。
            // 鉴于 otherSettingsSection 包含 "折叠面板显示锚点" 等，放在这里比较合适。

            // 1. 通用设置（语言）- 已在上方添加
            // 2. 面板设置 (New)
            content.appendChild(panelSettingsSection);
            // 3. 界面排版
            content.appendChild(layoutSection);
            // 4. 标签页设置
            if (tabSettingsSection) content.appendChild(tabSettingsSection);
            // 5. 阅读导航
            content.appendChild(anchorSection);
            // 6. 大纲设置
            content.appendChild(outlineSettingsSection);
            // 7. 页面显示
            content.appendChild(widthSection);
            // 8. 模型锁定
            if (lockSection) content.appendChild(lockSection);
            // 9. 其他设置
            content.appendChild(otherSettingsSection);

            container.appendChild(content);
        }

        togglePanel() {
            const panel = document.getElementById('gemini-helper-panel');
            const quickBtnGroup = document.getElementById('quick-btn-group');
            const toggleBtn = document.getElementById('toggle-panel');
            this.isCollapsed = !this.isCollapsed;

            if (this.isCollapsed) {
                panel.classList.add('collapsed');
                if (quickBtnGroup) quickBtnGroup.classList.remove('hidden');
                if (toggleBtn) toggleBtn.textContent = '+';
            } else {
                panel.classList.remove('collapsed');
                if (quickBtnGroup) quickBtnGroup.classList.add('hidden');
                if (toggleBtn) toggleBtn.textContent = '−';
            }
        }

        // ==================== Auto-Resume & Anchor Logic ====================

        // 恢复阅读历史 (Auto-Resume)
        async restoreReadingProgress() {
            // 将 showToast 传给 manager 以显示加载进度
            const success = await this.readingProgressManager.restoreProgress((msg) => showToast(msg));

            const onRestorationComplete = () => {
                // 延迟一点开启记录，避开惯性滚动等干扰，确保后续的用户滚动能被正确记录
                setTimeout(() => {
                    this.readingProgressManager.startRecording();
                }, 500);
            };

            if (success) {
                // 恢复成功，获取恢复的位置设为“初始锚点”
                const restoredTop = this.readingProgressManager.restoredTop;
                if (restoredTop !== undefined) {
                    this.anchorManager.setAnchor(restoredTop);
                }
                showToast(this.t('restoredPosition'));
            }

            // 无论成功失败，最后都开启记录
            onRestorationComplete();
        }

        // 清理过期阅读历史
        cleanupReadingHistory() {
            this.readingProgressManager.cleanup();
        }

        // 锚点按钮点击 (Back functionality)
        handleAnchorClick() {
            if (this.anchorManager.hasAnchor()) {
                this.anchorManager.backToAnchor();
                showToast(this.t('jumpToAnchor'));
            } else {
                showToast('暂无阅读锚点 (点击顶部/底部按钮可自动生成)');
            }
        }

        // 更新锚点按钮状态 (UI)
        updateAnchorButtonState(hasAnchor) {
            [document.getElementById('quick-anchor-btn'), document.getElementById('scroll-anchor-btn')].forEach((btn) => {
                if (btn) {
                    if (hasAnchor) {
                        btn.style.opacity = '1';
                        btn.style.cursor = 'pointer';
                        btn.title = this.t('jumpToAnchor');
                    } else {
                        btn.style.opacity = '0.4';
                        btn.style.cursor = 'default';
                        btn.title = '暂无锚点';
                    }
                }
            });
        }

        // 滚动到页面顶部
        scrollToTop() {
            // 点击去顶部时，自动记录当前位置为锚点
            this.anchorManager.setAnchor(this.scrollManager.scrollTop);
            this.scrollManager.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // 滚动到页面底部
        scrollToBottom() {
            // 点击去底部时，自动记录当前位置为锚点
            this.anchorManager.setAnchor(this.scrollManager.scrollTop);
            this.scrollManager.scrollTo({ top: this.scrollManager.scrollHeight, behavior: 'smooth' });
        }

        refreshCategories() {
            const container = document.getElementById('prompt-categories');
            if (!container) return;
            const categories = this.getCategories();
            clearElement(container);
            container.appendChild(
                createElement(
                    'span',
                    {
                        className: 'category-tag active',
                        'data-category': 'all',
                    },
                    this.t('allCategory'),
                ),
            );
            categories.forEach((cat) => {
                container.appendChild(createElement('span', { className: 'category-tag', 'data-category': cat }, cat));
            });
            // 添加分类管理按钮
            const manageBtn = createElement(
                'button',
                {
                    className: 'category-manage-btn',
                    title: this.t('categoryManage'),
                },
                this.t('manageCategory'),
            );
            manageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCategoryModal();
            });
            container.appendChild(manageBtn);
        }

        // 显示分类管理弹窗
        showCategoryModal() {
            const categories = this.getCategories();
            const modal = createElement('div', { className: 'prompt-modal' });
            const modalContent = createElement('div', { className: 'prompt-modal-content category-modal-content' });

            const modalHeader = createElement('div', { className: 'prompt-modal-header' }, this.t('categoryManage'));
            modalContent.appendChild(modalHeader);

            const categoryList = createElement('div', { className: 'category-list' });

            if (categories.length === 0) {
                categoryList.appendChild(createElement('div', { className: 'category-empty' }, this.t('categoryEmpty')));
            } else {
                categories.forEach((cat) => {
                    const count = this.prompts.filter((p) => p.category === cat).length;
                    const item = createElement('div', { className: 'category-item' });

                    const info = createElement('div', { className: 'category-item-info' });
                    info.appendChild(createElement('span', { className: 'category-item-name' }, cat));
                    info.appendChild(createElement('span', { className: 'category-item-count' }, `${count} 个提示词`));

                    const actions = createElement('div', { className: 'category-item-actions' });
                    const renameBtn = createElement('button', { className: 'category-action-btn rename' }, this.t('rename'));
                    const deleteBtn = createElement('button', { className: 'category-action-btn delete' }, this.t('delete'));

                    renameBtn.addEventListener('click', () => {
                        const newName = window.prompt(this.t('newCategoryName'), cat);
                        if (newName && newName.trim() && newName !== cat) {
                            this.renameCategory(cat, newName.trim());
                            modal.remove();
                            this.showCategoryModal();
                        }
                    });

                    deleteBtn.addEventListener('click', () => {
                        if (confirm(this.t('confirmDeleteCategory'))) {
                            this.deleteCategory(cat);
                            modal.remove();
                            this.showCategoryModal();
                        }
                    });

                    actions.appendChild(renameBtn);
                    actions.appendChild(deleteBtn);
                    item.appendChild(info);
                    item.appendChild(actions);
                    categoryList.appendChild(item);
                });
            }

            modalContent.appendChild(categoryList);

            const btnGroup = createElement('div', { className: 'prompt-modal-btns' });
            const closeBtn = createElement('button', { className: 'prompt-modal-btn secondary' }, this.t('cancel'));
            closeBtn.addEventListener('click', () => modal.remove());
            btnGroup.appendChild(closeBtn);
            modalContent.appendChild(btnGroup);

            modal.appendChild(modalContent);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            document.body.appendChild(modal);
        }

        // 重命名分类
        renameCategory(oldName, newName) {
            this.prompts.forEach((p) => {
                if (p.category === oldName) {
                    p.category = newName;
                }
            });
            this.savePrompts();
            this.refreshCategories();
            this.refreshPromptList();
            showToast(`分类已重命名为"${newName}"`);
        }

        // 删除分类（将关联提示词移至"未分类"）
        deleteCategory(name) {
            this.prompts.forEach((p) => {
                if (p.category === name) {
                    p.category = '未分类';
                }
            });
            this.savePrompts();
            this.refreshCategories();
            this.refreshPromptList();
            showToast(`分类"${name}"已删除`);
        }

        refreshPromptList(filter = '') {
            const container = document.getElementById('prompt-list');
            if (!container) return;
            const activeCategory = document.querySelector('.category-tag.active')?.dataset.category || 'all';
            let filteredPrompts = this.prompts;

            if (activeCategory !== 'all') filteredPrompts = filteredPrompts.filter((p) => p.category === activeCategory);
            if (filter) filteredPrompts = filteredPrompts.filter((p) => p.title.toLowerCase().includes(filter.toLowerCase()) || p.content.toLowerCase().includes(filter.toLowerCase()));

            clearElement(container);

            if (filteredPrompts.length === 0) {
                container.appendChild(createElement('div', { style: 'text-align: center; padding: 20px; color: #9ca3af;' }, '暂无提示词'));
                return;
            }

            filteredPrompts.forEach((prompt, index) => {
                const item = createElement('div', {
                    className: 'prompt-item',
                    draggable: 'false',
                    style: 'user-select: none;',
                });
                item.dataset.promptId = prompt.id;
                item.dataset.index = index;
                if (this.selectedPrompt?.id === prompt.id) item.classList.add('selected');

                const itemHeader = createElement('div', { className: 'prompt-item-header' });
                itemHeader.appendChild(createElement('div', { className: 'prompt-item-title' }, prompt.title));
                itemHeader.appendChild(createElement('span', { className: 'prompt-item-category' }, prompt.category || '未分类'));

                const itemContent = createElement('div', { className: 'prompt-item-content' }, prompt.content);
                const itemActions = createElement('div', { className: 'prompt-item-actions' });
                const dragBtn = createElement(
                    'button',
                    {
                        className: 'prompt-action-btn drag-prompt',
                        'data-id': prompt.id,
                        title: '拖动排序',
                    },
                    '☰',
                );
                dragBtn.style.cursor = 'grab';

                // 仅当按下拖拽按钮时才允许拖动
                dragBtn.addEventListener('mousedown', () => {
                    item.setAttribute('draggable', 'true');
                    // 监听全局鼠标释放，恢复不可拖动
                    const upHandler = () => {
                        item.setAttribute('draggable', 'false');
                        window.removeEventListener('mouseup', upHandler);
                    };
                    window.addEventListener('mouseup', upHandler);
                });

                itemActions.appendChild(dragBtn);
                itemActions.appendChild(
                    createElement(
                        'button',
                        {
                            className: 'prompt-action-btn copy-prompt',
                            'data-id': prompt.id,
                            title: '复制',
                        },
                        '📋',
                    ),
                );
                itemActions.appendChild(
                    createElement(
                        'button',
                        {
                            className: 'prompt-action-btn edit-prompt',
                            'data-id': prompt.id,
                            title: '编辑',
                        },
                        '✏',
                    ),
                );
                itemActions.appendChild(
                    createElement(
                        'button',
                        {
                            className: 'prompt-action-btn delete-prompt',
                            'data-id': prompt.id,
                            title: '删除',
                        },
                        '🗑',
                    ),
                );

                item.appendChild(itemHeader);
                item.appendChild(itemContent);
                item.appendChild(itemActions);

                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.prompt-item-actions')) this.selectPrompt(prompt, item);
                });

                // 拖拽事件处理
                item.addEventListener('dragstart', (e) => {
                    item.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', item.innerHTML);
                });

                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    const draggingItem = container.querySelector('.dragging');
                    if (draggingItem && draggingItem !== item) {
                        const rect = item.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        if (e.clientY < midpoint) {
                            container.insertBefore(draggingItem, item);
                        } else {
                            container.insertBefore(draggingItem, item.nextSibling);
                        }
                    }
                });

                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                    item.setAttribute('draggable', 'false'); // 拖拽结束立即恢复
                    this.updatePromptOrder();
                });

                container.appendChild(item);
            });
        }

        // 更新提示词顺序
        updatePromptOrder() {
            const container = document.getElementById('prompt-list');
            const items = Array.from(container.querySelectorAll('.prompt-item'));
            const newOrder = items.map((item) => item.dataset.promptId);

            // 重新排列 prompts 数组
            const orderedPrompts = [];
            newOrder.forEach((id) => {
                const prompt = this.prompts.find((p) => p.id === id);
                if (prompt) orderedPrompts.push(prompt);
            });

            this.prompts = orderedPrompts;
            this.savePrompts();
            showToast(this.t('orderUpdated'));
        }

        selectPrompt(prompt, itemElement) {
            if (this.isScrolling) {
                showToast(this.t('scrolling'));
                return;
            }
            this.selectedPrompt = prompt;
            document.querySelectorAll('.prompt-item').forEach((item) => item.classList.remove('selected'));
            itemElement.classList.add('selected');

            // 显示当前提示词悬浮条
            const selectedBar = document.querySelector('.selected-prompt-bar');
            const selectedText = document.getElementById('selected-prompt-text');
            if (selectedBar && selectedText) {
                selectedText.textContent = prompt.title;
                selectedBar.classList.add('show');
            }

            this.insertPromptToTextarea(prompt.content);
            showToast(`${this.t('inserted')}: ${prompt.title}`);
        }

        insertPromptToTextarea(promptContent) {
            if (this.isScrolling) {
                showToast('页面正在滚动，请稍后再选择提示词');
                return;
            }
            const promiseOrResult = this.siteAdapter.insertPrompt(promptContent);

            // 处理异步返回 (Gemini Business 是异步的)
            if (promiseOrResult instanceof Promise) {
                promiseOrResult.then((success) => {
                    if (!success) {
                        showToast('未找到输入框，请点击输入框后重试');
                        // 再次尝试查找
                        this.siteAdapter.findTextarea();
                    }
                });
            } else if (!promiseOrResult) {
                showToast('未找到输入框，请点击输入框后重试');
                this.siteAdapter.findTextarea();
            }
        }

        clearSelectedPrompt() {
            this.selectedPrompt = null;
            document.querySelector('.selected-prompt-bar')?.classList.remove('show');
            document.querySelectorAll('.prompt-item').forEach((item) => item.classList.remove('selected'));
        }

        showEditModal(prompt = null) {
            const isEdit = prompt !== null;
            const modal = createElement('div', { className: 'prompt-modal' });
            const modalContent = createElement('div', { className: 'prompt-modal-content' });

            const modalHeader = createElement('div', { className: 'prompt-modal-header' }, isEdit ? this.t('editPrompt') : this.t('addNewPrompt'));

            const titleGroup = createElement('div', { className: 'prompt-form-group' });
            titleGroup.appendChild(createElement('label', { className: 'prompt-form-label' }, this.t('title')));
            const titleInput = createElement('input', {
                className: 'prompt-form-input',
                type: 'text',
                value: isEdit ? prompt.title : '',
            });
            titleGroup.appendChild(titleInput);

            const categoryGroup = createElement('div', { className: 'prompt-form-group' });
            categoryGroup.appendChild(createElement('label', { className: 'prompt-form-label' }, this.t('category')));
            const categoryInput = createElement('input', {
                className: 'prompt-form-input',
                type: 'text',
                value: isEdit ? prompt.category || '' : '',
                placeholder: this.t('categoryPlaceholder'),
            });
            categoryGroup.appendChild(categoryInput);

            const contentGroup = createElement('div', { className: 'prompt-form-group' });
            contentGroup.appendChild(createElement('label', { className: 'prompt-form-label' }, this.t('content')));
            const contentTextarea = createElement('textarea', { className: 'prompt-form-textarea' });
            contentTextarea.value = isEdit ? prompt.content : '';
            contentGroup.appendChild(contentTextarea);

            const modalActions = createElement('div', { className: 'prompt-modal-actions' });
            const cancelBtn = createElement('button', { className: 'prompt-modal-btn secondary' }, this.t('cancel'));
            const saveBtn = createElement('button', { className: 'prompt-modal-btn primary' }, isEdit ? this.t('save') : this.t('add'));

            modalActions.appendChild(cancelBtn);
            modalActions.appendChild(saveBtn);

            modalContent.appendChild(modalHeader);
            modalContent.appendChild(titleGroup);
            modalContent.appendChild(categoryGroup);
            modalContent.appendChild(contentGroup);
            modalContent.appendChild(modalActions);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            cancelBtn.addEventListener('click', () => modal.remove());
            saveBtn.addEventListener('click', () => {
                const title = titleInput.value.trim();
                const content = contentTextarea.value.trim();
                if (!title || !content) {
                    alert(this.t('fillTitleContent'));
                    return;
                }

                if (isEdit) {
                    this.updatePrompt(prompt.id, { title, category: categoryInput.value.trim(), content });
                    showToast(this.t('promptUpdated'));
                } else {
                    this.addPrompt({ title, category: categoryInput.value.trim(), content });
                    showToast(this.t('promptAdded'));
                }
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }

        findElementByComposedPath(e) {
            if (!e) return null;
            // 获取事件的完整传播路径（兼容没有 composedPath 的浏览器）
            const path = typeof e.composedPath === 'function' ? e.composedPath() : e.path || [];

            // 获取提交按钮选择器数组并合并成 selector 字符串
            const selectors = this.siteAdapter && typeof this.siteAdapter.getSubmitButtonSelectors === 'function' ? this.siteAdapter.getSubmitButtonSelectors() : [];
            const combinedSelector = selectors.length ? selectors.join(', ') : '';

            if (!combinedSelector) return null;

            // 查找路径中第一个符合条件的元素
            const foundElement = path.find((element) => element && element instanceof Element && typeof element.matches === 'function' && element.matches(combinedSelector));

            return foundElement || null;
        }

        bindEvents() {
            const searchInput = document.getElementById('prompt-search');
            if (searchInput) searchInput.addEventListener('input', (e) => this.refreshPromptList(e.target.value));

            const categories = document.getElementById('prompt-categories');
            if (categories) {
                categories.addEventListener('click', (e) => {
                    if (e.target.classList.contains('category-tag')) {
                        document.querySelectorAll('.category-tag').forEach((tag) => tag.classList.remove('active'));
                        e.target.classList.add('active');
                        this.refreshPromptList(document.getElementById('prompt-search')?.value || '');
                    }
                });
            }

            document.getElementById('add-prompt')?.addEventListener('click', () => this.showEditModal());
            document.getElementById('prompt-list')?.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-prompt')) {
                    const prompt = this.prompts.find((p) => p.id === e.target.dataset.id);
                    if (prompt) this.showEditModal(prompt);
                } else if (e.target.classList.contains('delete-prompt')) {
                    if (confirm(this.t('confirmDelete'))) {
                        this.deletePrompt(e.target.dataset.id);
                        showToast(this.t('deleted'));
                    }
                } else if (e.target.classList.contains('copy-prompt')) {
                    const prompt = this.prompts.find((p) => p.id === e.target.dataset.id);
                    if (prompt) {
                        navigator.clipboard
                            .writeText(prompt.content)
                            .then(() => {
                                showToast(this.t('copied'));
                            })
                            .catch(() => {
                                // 降级方案
                                const textarea = document.createElement('textarea');
                                textarea.value = prompt.content;
                                document.body.appendChild(textarea);
                                textarea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textarea);
                                showToast(this.t('copied'));
                            });
                    }
                }
            });

            document.getElementById('clear-prompt')?.addEventListener('click', () => {
                this.clearSelectedPrompt();
                // 针对 Gemini Business，根据设置决定是否用零宽字符清空
                if (this.siteAdapter instanceof GeminiBusinessAdapter) {
                    if (this.settings.clearTextareaOnSend) {
                        this.siteAdapter.clearTextarea(); // 插入零宽字符
                    } else {
                        this.siteAdapter.clearTextareaNormal(); // 普通清空
                    }
                } else {
                    // 其他适配器调用各自的 clearTextarea 方法
                    this.siteAdapter.clearTextarea();
                }
                showToast(this.t('cleared'));
            });

            this.makeDraggable();

            // 2. 按钮点击监听
            document.addEventListener('click', (e) => {
                // 委托适配器检查是否为输入框，自动更新引用
                if (this.siteAdapter.isValidTextarea(e.target)) {
                    this.siteAdapter.textarea = e.target;
                } else {
                    const closest = e.target.closest('[contenteditable="true"], .ProseMirror, textarea');
                    if (closest && this.siteAdapter.isValidTextarea(closest)) {
                        this.siteAdapter.textarea = closest;
                    }
                }

                // 检测是否点击了发送按钮
                const found = this.findElementByComposedPath(e);
                let matched = !!found;
                // 如果 composedPath 没命中，尝试使用 closest 回退（兼容 Shadow DOM 之外的情况）
                if (!matched && e && e.target && typeof e.target.closest === 'function') {
                    const selectors = this.siteAdapter && typeof this.siteAdapter.getSubmitButtonSelectors === 'function' ? this.siteAdapter.getSubmitButtonSelectors() : [];
                    const combined = selectors.length ? selectors.join(', ') : '';
                    if (combined) {
                        try {
                            matched = !!e.target.closest(combined);
                        } catch (err) {
                            matched = false;
                        }
                    }
                }

                if (matched) {
                    // 如果有选中的提示词，清除悬浮条
                    if (this.selectedPrompt) {
                        setTimeout(() => {
                            this.clearSelectedPrompt();
                        }, 100);
                    }
                    // 针对 Gemini Business：无论是否使用提示词，发送后都修复中文输入
                    if (this.siteAdapter instanceof GeminiBusinessAdapter && this.settings.clearTextareaOnSend) {
                        setTimeout(() => {
                            this.siteAdapter.clearTextarea();
                        }, 200);
                    }
                }
            });

            // 3. 回车键发送监听
            document.addEventListener(
                'keydown',
                (e) => {
                    // 仅处理 Enter 键（不带 Shift 修饰符，避免干扰换行操作）
                    if (e.key !== 'Enter' || e.shiftKey) return;

                    // 使用 composedPath 检查事件源是否来自输入框（兼容 Shadow DOM）
                    const path = typeof e.composedPath === 'function' ? e.composedPath() : e.path || [];
                    const isFromTextarea = path.some((element) => element && element instanceof Element && this.siteAdapter.isValidTextarea(element));

                    if (!isFromTextarea) return;

                    // 清理逻辑
                    if (this.selectedPrompt) {
                        setTimeout(() => {
                            this.clearSelectedPrompt();
                        }, 100);
                    }
                    // 针对 Gemini Business：无论是否使用提示词，发送后都修复中文输入
                    if (this.siteAdapter instanceof GeminiBusinessAdapter && this.settings.clearTextareaOnSend) {
                        setTimeout(() => {
                            this.siteAdapter.clearTextarea();
                        }, 200);
                    }
                },
                true,
            ); // 使用捕获阶段确保在 Shadow DOM 场景下也能捕获

            document.getElementById('toggle-panel')?.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止冒泡，避免触发 auto-hide
                this.togglePanel();
            });

            // 4. 全局点击监听（处理自动隐藏）
            document.addEventListener('click', (e) => {
                // 如果是自动隐藏开启，且面板是展开的
                if (this.settings.autoHidePanel && !this.isCollapsed) {
                    const panel = document.getElementById('gemini-helper-panel');
                    const toggleBtn = document.getElementById('toggle-panel');
                    const quickBtnGroup = document.getElementById('quick-btn-group');

                    // 检查点击目标是否在面板外部
                    // 注意：需要排除 toggleBtn 和 quickBtnGroup，以及 panel 本身
                    // 同时排除面板内的任何元素
                    if (panel && !panel.contains(e.target) && !toggleBtn?.contains(e.target) && !quickBtnGroup?.contains(e.target)) {
                        // 额外的安全检查：确保不是点击了面板内的弹出层（如 modal）
                        // 通常 modal 是直接挂在 body 上的，所以如果 modal 打开时，点击 modal 内容不应该隐藏
                        // 但是 modal 通常覆盖全屏，点击 modal 遮罩通过 modal 自己的逻辑关闭。
                        // 这里主要关注点击页面其他部分。

                        this.togglePanel();
                    }
                }
            });

            this.makeDraggable();

            // 初始化 URL 监听 (处理 SPA 页面跳转)
            this.initUrlChangeObserver();
        }

        initUrlChangeObserver() {
            let lastUrl = window.location.href;

            const checkUrl = () => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;

                    // URL 变化时，先停止录制（防止错误覆盖新会话的持久化数据）
                    this.readingProgressManager.stopRecording();

                    // 重置内存中的锚点状态
                    this.anchorScrollTop = null;
                    this.anchorManager.reset();

                    // 会话切换时立即更新标签页标题
                    if (this.tabRenameManager && this.settings.tabSettings?.autoRenameTab) {
                        // 清除缓存的会话名称，强制从新会话获取
                        this.tabRenameManager.lastSessionName = null;
                        // 多次尝试更新，因为 Gemini 可能需要时间来更新页面标题
                        [300, 800, 1500].forEach((delay) => {
                            setTimeout(() => {
                                this.tabRenameManager.updateTabName(true);
                            }, delay);
                        });
                    }

                    // 给予页面渲染一点时间后尝试恢复
                    setTimeout(() => {
                        this.restoreReadingProgress();
                        // 针对 Gemini Business：切换会话后修复中文输入
                        if (this.siteAdapter instanceof GeminiBusinessAdapter && this.settings.clearTextareaOnSend) {
                            // 切换会话后 textarea 引用可能失效，需要重新查找
                            this.siteAdapter.findTextarea();
                            this.siteAdapter.clearTextarea();
                        }
                    }, 1500);
                }
            };

            // 1. 监听 popstate (后退/前进)
            window.addEventListener('popstate', checkUrl);

            // 2. Monkey patch pushState/replaceState
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;

            history.pushState = function () {
                originalPushState.apply(this, arguments);
                checkUrl();
            };

            history.replaceState = function () {
                originalReplaceState.apply(this, arguments);
                checkUrl();
            };

            // 3. 定时器兜底 (防止某些框架绕过 history API)
            // 同时用于检测 Sidebar Observer 的存活状态
            setInterval(() => {
                checkUrl();
                // 周期性检查 Observer 是否存活 (Zombie Check)
                if (this.conversationManager) {
                    this.conversationManager.checkObserverStatus();
                }
            }, 1000);
        }

        makeDraggable() {
            const panel = document.getElementById('gemini-helper-panel');
            const header = panel?.querySelector('.prompt-panel-header');
            if (!panel || !header) return;

            let isDragging = false,
                currentX,
                currentY,
                initialX,
                initialY,
                xOffset = 0,
                yOffset = 0;

            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.prompt-panel-controls')) return;
                e.preventDefault(); // 阻止文本选中
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
                // 拖动时禁止全局文本选中
                document.body.style.userSelect = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    xOffset = currentX;
                    yOffset = currentY;
                    panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
                }
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    // 恢复文本选中
                    document.body.style.userSelect = '';
                }
            });
        }
    }

    function init() {
        try {
            console.log('Gemini Helper: Initializing...');
            // 初始化站点注册表
            const siteRegistry = new SiteRegistry();
            siteRegistry.register(new GeminiBusinessAdapter()); // 优先检测
            siteRegistry.register(new GeminiAdapter());

            const currentAdapter = siteRegistry.detect();

            if (!currentAdapter) {
                console.log('Gemini Helper: 未匹配到当前站点，跳过初始化。');
                return;
            }

            console.log(`Gemini Helper: 已匹配站点 - ${currentAdapter.getName()}`);

            setTimeout(() => {
                try {
                    console.log('Gemini Helper: Creating instance...');
                    window.geminiHelper = new GeminiHelper(siteRegistry);
                    console.log('Gemini Helper: Instance created successfully.');
                } catch (error) {
                    console.error('Gemini Helper: 启动失败 (Constructor Error)', error);
                }
            }, 2000);
        } catch (e) {
            console.error('Gemini Helper: 初始化失败 (Init Error)', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
