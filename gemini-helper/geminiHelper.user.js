// ==UserScript==
// @name         gemini-helper
// @namespace    http://tampermonkey.net/
// @version      1.8.1
// @description  Gemini 助手：支持对话大纲、提示词管理、模型锁定、标签页增强（状态显示/隐私模式/生成完成通知）、阅读历史恢复、双向锚点、自动加宽页面、中文输入修复，智能适配 Gemini 标准版/企业版/Genspark
// @description:en Gemini Helper: Supports outline navigation, prompt management, model locking, tab enhancements (status display/privacy mode/completion notification), reading history, bidirectional anchor, auto page width, Chinese input fix, smart adaptation for Gemini Standard/Enterprise/Genspark
// @author       urzeye
// @homepage     https://github.com/urzeye
// @note         参考 https://linux.do/t/topic/925110 的代码与UI布局拓展实现
// @match        https://gemini.google.com/*
// @match        https://business.gemini.google/*
// @match        https://www.genspark.ai/agents*
// @match        https://genspark.ai/agents*
// @icon         https://raw.githubusercontent.com/gist/urzeye/8d1d3afbbcd0193dbc8a2019b1ba54d3/raw/f7113d329a259963ed1b1ab8cb981e8f635d4cea/gemini.svg
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @grant        window.focus
// @run-at       document-idle
// @supportURL   https://github.com/urzeye/tampermonkey-scripts/issues
// @homepageURL  https://github.com/urzeye/tampermonkey-scripts
// @require      https://update.greasyfork.org/scripts/559089/1714656/background-keep-alive.js
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
	};

	// 默认 Tab 顺序
	const DEFAULT_TAB_ORDER = ['prompts', 'outline', 'settings'];
	const DEFAULT_PROMPTS_SETTINGS = { enabled: true };
	const DEFAULT_READING_HISTORY_SETTINGS = {
		persistence: true,
		autoRestore: false,
		cleanupDays: 30
	};
	const DEFAULT_TAB_SETTINGS = {
		openInNewTab: true,        // 新标签页打开新对话
		autoRenameTab: true,       // 自动重命名标签页
		renameInterval: 3,         // 检测频率(秒)
		showStatus: true,          // 显示生成状态图标 (⏳/✅)
		showNotification: false,   // 发送桌面通知
		autoFocus: false,          // 生成完成后自动将窗口置顶
		privacyMode: false,        // 隐私模式
		privacyTitle: 'Google',    // 隐私模式下的伪装标题
		titleFormat: '{status}{title}-{model}'  // 自定义标题格式，支持 {status}、{title}、{model}
	};

	// Tab 定义（用于渲染和显示）
	const TAB_DEFINITIONS = {
		'prompts': { id: 'prompts', labelKey: 'tabPrompts', icon: '📝' },
		'outline': { id: 'outline', labelKey: 'tabOutline', icon: '📑' },
		'settings': { id: 'settings', labelKey: 'tabSettings', icon: '⚙️' }
	};

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
			refreshPrompts: '刷新提示词',
			refreshOutline: '刷新大纲',
			refreshSettings: '刷新设置',
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
			showCollapsedAnchorLabel: '折叠面板显示锚点',
			showCollapsedAnchorDesc: '当面板收起时，在侧边浮动条中显示锚点按钮',
			preventAutoScrollLabel: '防止自动滚动',
			preventAutoScrollDesc: '当 AI 生成长内容时，阻止页面自动滚动到底部，方便阅读上文',
			// 界面排版开关
			disableOutline: '禁用大纲',
			togglePrompts: '启用/禁用提示词'
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
			showCollapsedAnchorLabel: '折疊面板顯示錨點',
			showCollapsedAnchorDesc: '當面板收起時，在側邊浮動條中顯示錨點按鈕',
			preventAutoScrollLabel: '防止自動滾動',
			preventAutoScrollDesc: '當 AI 生成長內容時，阻止頁面自動滾動到底部，方便閱讀上文',
			// 介面排版開關
			disableOutline: '禁用大綱',
			togglePrompts: '啟用/禁用提示詞'
		},
		'en': {
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
			showCollapsedAnchorLabel: 'Show anchor when collapsed',
			showCollapsedAnchorDesc: 'Display anchor button in sidebar when panel is collapsed',
			preventAutoScrollLabel: 'Prevent auto-scroll',
			preventAutoScrollDesc: 'Stop page from auto-scrolling to bottom during AI generation',
			// Interface Toggle
			disableOutline: 'Disable Outline',
			togglePrompts: 'Toggle Prompts'
		}
	};

	// ============= 默认提示词库 =============
	const DEFAULT_PROMPTS = [
		{
			id: 'default_1',
			title: '代码优化',
			content: '请帮我优化以下代码，提高性能和可读性：\n\n',
			category: '编程'
		},
		{
			id: 'default_2',
			title: '翻译助手',
			content: '请将以下内容翻译成中文，保持专业术语的准确性：\n\n',
			category: '翻译'
		},
	];

	// ============= 页面宽度默认配置 =============
	const DEFAULT_WIDTH_SETTINGS = {
		'gemini': { enabled: false, value: '70', unit: '%' },
		'gemini-business': { enabled: false, value: '1600', unit: 'px' },
		'genspark': { enabled: false, value: '70', unit: '%' }
	};

	// ============= 大纲功能默认配置 =============
	const DEFAULT_OUTLINE_SETTINGS = {
		enabled: true,
		maxLevel: 6,  // 显示到几级标题 (1-6)
		autoUpdate: true,
		updateInterval: 3
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
		match() { throw new Error('必须实现 match()'); }

		/**
		 * 返回站点标识符(用于配置存储)
		 * @returns {string}
		 */
		getSiteId() { throw new Error('必须实现 getSiteId()'); }

		/**
		 * 返回站点显示名称
		 * @returns {string}
		 */
		getName() { throw new Error('必须实现 getName()'); }

		/**
		 * 获取当前会话ID (用于锚点持久化)
		 * @returns {string} Session ID
		 */
		getSessionId() {
			// 优化实现：先去除 URL 中的查询参数 (?及后面内容)，再获取最后一段
			const urlWithoutQuery = window.location.href.split('?')[0];
			const parts = urlWithoutQuery.split('/').filter(p => p);
			return parts.length > 0 ? parts[parts.length - 1] : 'default';
		}

		/**
		 * 是否支持在新标签页打开新对话
		 * @returns {boolean}
		 */
		supportsNewTab() { return true; }

		/**
		 * 获取新标签页打开的 URL
		 * @returns {string}
		 */
		getNewTabUrl() { return window.location.origin; }

		/**
		 * 是否支持标签页重命名
		 * @returns {boolean}
		 */
		supportsTabRename() { return true; }

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
		getThemeColors() { throw new Error('必须实现 getThemeColors()'); }

		/**
		 * 返回需要加宽的CSS选择器列表
		 * @returns {Array<{selector: string, property: string}>}
		 */
		getWidthSelectors() { return []; }

		/**
		 * 返回输入框选择器列表
		 * @returns {string[]}
		 */
		getTextareaSelectors() { return []; }

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
		insertPrompt(content) { throw new Error('必须实现 insertPrompt()'); }

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
			// 1. 优先查找 Shadow DOM 中的滚动容器
			const scrollContainerFromShadow = this.findScrollContainerInShadowDOM(document);
			if (scrollContainerFromShadow) {
				return scrollContainerFromShadow;
			}

			// 2. 尝试查找常见的滚动容器
			const selectors = [
				'.chat-mode-scroller',
				'main',
				'[role="main"]',
				'.conversation-container',
				'.chat-container'
			];

			for (const selector of selectors) {
				const el = document.querySelector(selector);
				if (el && el.scrollHeight > el.clientHeight) {
					return el;
				}
			}

			// 3. 回退到 document.documentElement 或 body
			if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
				return document.documentElement;
			}
			return document.body;
		}

		/**
		 * 在 Shadow DOM 中递归查找滚动容器
		 * @param {Node} root
		 * @param {number} depth
		 * @returns {HTMLElement|null}
		 */
		findScrollContainerInShadowDOM(root, depth = 0) {
			if (depth > 10) return null;

			const allElements = root.querySelectorAll('*');
			for (const el of allElements) {
				// 检查是否是可滚动元素
				if (el.scrollHeight > el.clientHeight + 100) {
					const style = window.getComputedStyle(el);
					if (style.overflowY === 'auto' || style.overflowY === 'scroll' ||
						style.overflow === 'auto' || style.overflow === 'scroll') {
						return el;
					}
				}

				// 递归检查 Shadow DOM
				if (el.shadowRoot) {
					const found = this.findScrollContainerInShadowDOM(el.shadowRoot, depth + 1);
					if (found) return found;
				}
			}
			return null;
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
							const found = candidates.find(c => (c.textContent || '').trim().substring(0, 50) === anchorData.textSignature);
							if (found) targetElement = found;
						}
					}
				} else {
					// 索引越界（可能消息被删了？），尝试文本搜索
					if (anchorData.textSignature) {
						const found = candidates.find(c => (c.textContent || '').trim().substring(0, 50) === anchorData.textSignature);
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
			document.addEventListener('click', (e) => {
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
			}, true); // 使用捕获阶段确保捕获
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
			const config = this.getModelSwitcherConfig(keyword);
			if (!config) return;

			const {
				targetModelKeyword,
				selectorButtonSelectors,
				menuItemSelector,
				checkInterval = 1500,
				maxAttempts = 20,
				menuRenderDelay = 500
			} = config;

			let attempts = 0;
			let isSelecting = false;
			// 辅助函数：标准化文本（小写 + 去空）
			const normalize = str => (str || '').toLowerCase().trim();
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
			// 1. 尝试全局直接查找
			for (const selector of selectors) {
				const el = document.querySelector(selector);
				if (el) return el;
			}

			// 2. 深度 Shadow DOM 查找
			return this.findInShadowRecursive(document, selectors);
		}

		/**
		 * 通过选择器查找所有元素（支持 Shadow DOM）
		 * @param {string} selector
		 * @returns {Element[]}
		 */
		findAllElementsBySelector(selector) {
			const items = [];

			// 1. 尝试全局直接查找
			const globalItems = document.querySelectorAll(selector);
			if (globalItems.length > 0) {
				return Array.from(globalItems);
			}

			// 2. 深度 Shadow DOM 查找
			this.collectElementsInShadow(document, selector, items);
			return items;
		}

		/**
		 * 在 Shadow DOM 中递归查找元素（返回第一个匹配）
		 */
		findInShadowRecursive(root, selectors, depth = 0) {
			if (depth > 15) return null;

			if (root !== document) {
				for (const selector of selectors) {
					try {
						const el = root.querySelector(selector);
						if (el) return el;
					} catch (e) { }
				}
			}

			const allElements = root.querySelectorAll('*');
			for (const el of allElements) {
				if (el.shadowRoot) {
					const found = this.findInShadowRecursive(el.shadowRoot, selectors, depth + 1);
					if (found) return found;
				}
			}
			return null;
		}

		/**
		 * 在 Shadow DOM 中递归收集所有匹配元素
		 */
		collectElementsInShadow(root, selector, results, depth = 0) {
			if (depth > 15) return;

			if (root !== document) {
				try {
					const els = root.querySelectorAll(selector);
					for (const el of els) {
						results.push(el);
					}
				} catch (e) { }
			}

			const allElements = root.querySelectorAll('*');
			for (const el of allElements) {
				if (el.shadowRoot) {
					this.collectElementsInShadow(el.shadowRoot, selector, results, depth + 1);
				}
			}
		}
	}

	/**
	 * Gemini 适配器（gemini.google.com）
	 */
	class GeminiAdapter extends SiteAdapter {
		match() {
			return window.location.hostname.includes('gemini.google') &&
				!window.location.hostname.includes('business.gemini.google');
		}

		getSiteId() { return 'gemini'; }

		getName() { return 'Gemini'; }

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
				'button[aria-label="临时对话"]'
			];
		}

		getWidthSelectors() {
			return [
				{ selector: '.conversation-container', property: 'max-width' },
				{ selector: '.input-area-container', property: 'max-width' },
				// 用户消息右对齐
				{ selector: 'user-query', property: 'max-width', value: '100%', noCenter: true, extraCss: 'display: flex !important; justify-content: flex-end !important;' },
				{ selector: '.user-query-container', property: 'max-width', value: '100%', noCenter: true, extraCss: 'justify-content: flex-end !important;' }
			];
		}

		getTextareaSelectors() {
			return [
				'div[contenteditable="true"].ql-editor',
				'div[contenteditable="true"]',
				'[role="textbox"]',
				'[aria-label*="Enter a prompt"]'
			];
		}

		getSubmitButtonSelectors() {
			return [
				'button[aria-label*="Send"]',
				'button[aria-label*="发送"]',
				'.send-button',
				'[data-testid*="send"]'
			];
		}

		isValidTextarea(element) {
			// 必须是可见的 contenteditable 元素
			if (element.offsetParent === null) return false;
			const isContentEditable = element.getAttribute('contenteditable') === 'true';
			const isTextbox = element.getAttribute('role') === 'textbox';
			// 排除脚本自身的 UI
			if (element.closest('#gemini-helper-panel')) return false;

			return (isContentEditable || isTextbox) || element.classList.contains('ql-editor');
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
			return [
				'.model-response-container',
				'model-response',
				'.response-container',
				'[data-message-id]',
				'message-content'
			];
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
			headings.forEach(heading => {
				const level = parseInt(heading.tagName.charAt(1), 10);
				if (level <= maxLevel) {
					outline.push({
						level,
						text: heading.textContent.trim(),
						element: heading
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
				silenceThreshold: 3000
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
				selectorButtonSelectors: [
					'.input-area-switch-label',
					'.model-selector',
					'[data-test-id="model-selector"]',
					'[aria-label*="model"]',
					'button[aria-haspopup="menu"]'
				],
				menuItemSelector: '.mode-title, [role="menuitem"], [role="option"]',
				checkInterval: 1000,
				maxAttempts: 15,
				menuRenderDelay: 300
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

		getSiteId() { return 'gemini-business'; }

		getName() { return 'Enterprise'; }

		getThemeColors() {
			return { primary: '#4285f4', secondary: '#34a853' };
		}

		getNewTabUrl() {
			return 'https://business.gemini.google';
		}

		supportsTabRename() { return true; }

		isNewConversation() {
			return !window.location.pathname.includes('/session/');
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
				noCenter
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
				config('.input-area-container', undefined, 'left: 0 !important; right: 0 !important;', true)
			];
		}

		getTextareaSelectors() {
			return [
				'div.ProseMirror',
				'.ProseMirror',
				'[contenteditable="true"]:not([type="search"])',
				'[role="textbox"]',
				'textarea:not([type="search"])'
			];
		}

		getSubmitButtonSelectors() {
			return [
				'button[aria-label*="Submit"]',
				'button[aria-label*="提交"]',
				'.send-button',
				'[data-testid*="send"]'
			];
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
			// 优先在 Shadow DOM 中查找
			const element = this.findInShadowDOM(document);
			if (element) {
				this.textarea = element;
				return element;
			}
			return super.findTextarea();
		}

		findInShadowDOM(root, depth = 0) {
			if (depth > 15) return null;

			// 只在 Shadow Root 中搜索选择器（跳过主文档以避免匹配脚本 UI）
			if (root !== document) {
				for (const selector of this.getTextareaSelectors()) {
					try {
						const elements = root.querySelectorAll(selector);
						for (const element of elements) {
							if (this.isValidTextarea(element)) {
								return element;
							}
						}
					} catch (e) {
						// 某些选择器可能在 Shadow DOM 中不支持
					}
				}
			}

			// 在所有 Shadow Root 中递归搜索
			const allElements = root.querySelectorAll('*');
			for (const el of allElements) {
				if (el.shadowRoot) {
					const found = this.findInShadowDOM(el.shadowRoot, depth + 1);
					if (found) return found;
				}
			}
			return null;
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
								data: content
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
				const stopButton = root.querySelector(
					'button[aria-label*="Stop"], button[aria-label*="停止"], ' +
					'[data-test-id="stop-button"], .stop-button, md-icon-button[aria-label*="Stop"]'
				);
				if (stopButton && stopButton.offsetParent !== null) {
					return true;
				}

				const spinner = root.querySelector(
					'mat-spinner, md-spinner, .loading-spinner, [role="progressbar"], ' +
					'.generating-indicator, .response-loading'
				);
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
				const modelSelectors = [
					'#model-selector-menu-anchor',
					'.action-model-selector',
					'.model-selector',
					'[data-test-id="model-selector"]',
					'.current-model'
				];

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
				menuRenderDelay: 500
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
				'.conversation-message'
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
					headings.forEach(heading => {
						// 只匹配包含 data-markdown-start-index 的标题（排除 logo 等非 AI 回复内容）
						// 标题内可能包含多个 span，需要遍历所有 span 并拼接文本
						const spans = heading.querySelectorAll('span[data-markdown-start-index]');
						if (spans.length > 0) {
							const level = parseInt(heading.tagName[1], 10);
							const text = Array.from(spans).map(s => s.textContent.trim()).join('');
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
	}

	/**
	 * Genspark 适配器（genspark.ai）
	 */
	class GensparkAdapter extends SiteAdapter {
		match() {
			return window.location.hostname.includes('genspark.ai');
		}

		getSiteId() { return 'genspark'; }

		getName() { return 'Genspark'; }

		getThemeColors() {
			return { primary: '#667eea', secondary: '#764ba2' };
		}

		getNewTabUrl() {
			return 'https://www.genspark.ai';
		}

		isNewConversation() {
			const path = window.location.pathname;
			return path === '/' || path === '/agents' || path === '/agents/';
		}

		getWidthSelectors() {
			// Genspark 暂时不实现加宽，预留接口
			return [];
		}

		getTextareaSelectors() {
			return [
				'textarea[name="query"]',
				'textarea.search-input',
				'.textarea-wrapper textarea',
				'textarea[placeholder*="Message"]'
			];
		}

		getSubmitButtonSelectors() {
			return [
				'button[aria-label*="Send"]',
				'button[aria-label*="发送"]',
				'.send-button',
				'[data-testid*="send"]'
			];
		}

		getChatContentSelectors() {
			return [
				'.message-content',
				'.markdown-body',
				'[data-testid="chat-message"]'
			];
		}

		insertPrompt(content) {
			if (!this.textarea) return false;

			const currentContent = this.textarea.value.trim();
			this.textarea.value = currentContent ? (content + '\n\n' + currentContent) : (content + '\n\n');
			this.adjustTextareaHeight();
			this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
			this.textarea.focus();
			return true;
		}

		adjustTextareaHeight() {
			if (this.textarea) {
				this.textarea.style.height = 'auto';
				this.textarea.style.height = Math.min(this.textarea.scrollHeight, 200) + 'px';
			}
		}

		clearTextarea() {
			if (this.textarea) {
				this.textarea.value = '';
				this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
				this.adjustTextareaHeight();
			}
		}

		supportsScrollLock() {
			return false;
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
				onComplete: () => this._onAiComplete()
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
					onclick: () => window.focus()
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
			const statusPrefix = (tabSettings.showStatus !== false)
				? (isGenerating ? '⏳ ' : '✅ ')
				: '';

			const format = tabSettings.titleFormat || '{status}{title}';
			const modelName = format.includes('{model}')
				? (this.adapter.getModelName() || '')
				: '';

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

			if (isPolluted(sessionName)) {
				sessionName = this.lastSessionName;
			} else if (sessionName && sessionName !== this.lastSessionName) {
				this.lastSessionName = sessionName;
			}

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

	// HTML 创建函数
	function createElement(tag, properties = {}, textContent = '') {
		const element = document.createElement(tag);
		Object.keys(properties).forEach(key => {
			if (key === 'className') {
				element.className = properties[key];
			} else if (key === 'style') {
				element.setAttribute('style', properties[key]);
			} else {
				element.setAttribute(key, properties[key]);
			}
		});
		if (textContent) element.textContent = textContent;
		return element;
	}

	// 清空元素内容
	function clearElement(element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
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
			return selectors.map((config) => {
				const { selector, globalSelector, property, value, extraCss, noCenter } = config;
				const params = {
					finalWidth: value || globalWidth,
					targetSelector: globalSelector || selector, // 优先使用全局特定选择器
					property,
					extra: extraCss || '',
					centerCss: noCenter ? '' : 'margin-left: auto !important; margin-right: auto !important;'
				};
				return `${params.targetSelector} { ${params.property}: ${params.finalWidth} !important; ${params.centerCss} ${params.extra} }`;
			}).join('\n');
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
			return selectors.map((config) => {
				const { selector, property, value, extraCss, noCenter } = config;
				// Shadow DOM 中只使用原始 selector (不带父级限定)，靠 JS 过滤来保证安全
				const finalWidth = value || globalWidth;
				const extra = extraCss || '';
				const centerCss = noCenter ? '' : 'margin-left: auto !important; margin-right: auto !important;';
				return `${selector} { ${property}: ${finalWidth} !important; ${centerCss} ${extra} }`;
			}).join('\n');
		}

		stopShadowInjection() {
			if (this.shadowCheckInterval) {
				clearInterval(this.shadowCheckInterval);
				this.shadowCheckInterval = null;
			}
		}

		injectToAllShadows(css) {
			if (!document.body) return;

			const walk = (root) => {
				// 如果是 Element 且有 shadowRoot，注入样式
				if (root.shadowRoot) {
					this.injectToShadowRoot(root.shadowRoot, css);
					walk(root.shadowRoot); // 递归遍历 Shadow DOM 内部
				}

				// 遍历子节点
				const children = root.children || root.childNodes; // 兼容 ShadowRoot 和 Element
				for (let i = 0; i < children.length; i++) {
					walk(children[i]);
				}
			};

			walk(document.body);
		}

		injectToShadowRoot(shadowRoot, css) {
			// 检查是否应该注入到该 Shadow DOM（通过 Adapter 过滤，例如排除侧边栏）
			if (shadowRoot.host && !this.siteAdapter.shouldInjectIntoShadow(shadowRoot.host)) {
				return;
			}

			if (this.processedShadowRoots.has(shadowRoot)) {
				// 即使已处理过，也要检查样式内容是否需要更新（如果是配置变更）
				const existingStyle = shadowRoot.getElementById('gemini-helper-width-shadow-style');
				if (existingStyle && existingStyle.textContent !== css) {
					existingStyle.textContent = css;
				}
				return;
			}

			try {
				const style = document.createElement('style');
				style.id = 'gemini-helper-width-shadow-style';
				style.textContent = css;
				shadowRoot.appendChild(style);
				this.processedShadowRoots.add(shadowRoot);
			} catch (e) {
				// 忽略 closed shadow root 错误（虽然我们通常拿不到 closed 的引用）
			}
		}

		clearShadowStyles() {
			if (!document.body) return;

			const walk = (root) => {
				if (root.shadowRoot) {
					const style = root.shadowRoot.getElementById('gemini-helper-width-shadow-style');
					if (style) style.remove();
					this.processedShadowRoots.delete(root.shadowRoot);
					walk(root.shadowRoot);
				}
				const children = root.children || root.childNodes;
				for (let i = 0; i < children.length; i++) {
					walk(children[i]);
				}
			};
			walk(document.body);
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
				scrollTopDescriptor: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop') ||
					Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop')
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
						return self.originalApis.scrollTopDescriptor.get ?
							self.originalApis.scrollTopDescriptor.get.call(this) : this.files; // fallback (impossible normally)
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
					configurable: true
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

				mutations.forEach(mutation => {
					if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
						// 检查是否有新消息节点
						for (const node of mutation.addedNodes) {
							if (node.nodeType === 1) { // Element
								// 使用适配器提供的选择器判断
								for (const sel of contentSelectors) {
									if (node.matches && node.matches(sel) || (node.querySelector && node.querySelector(sel))) {
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
				subtree: true
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
				...((anchorInfo) ? anchorInfo : {})
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
					} catch (err) { console.error('Error restoring content anchor:', err); }

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

			Object.keys(allData).forEach(k => {
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
			this.currentAnchor = null;  // 当前锚点（跳转目标）
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
			} catch (err) { }

			return {
				top: this.scrollManager.scrollTop,
				ts: Date.now(),
				...anchorInfo
			};
		}

		// 记录锚点 (跳转前调用，保存当前位置)
		setAnchor(top) {
			let anchorInfo = {};
			try {
				if (this.scrollManager.siteAdapter.getVisibleAnchorElement) {
					anchorInfo = this.scrollManager.siteAdapter.getVisibleAnchorElement();
				}
			} catch (err) { }

			// 保存当前位置为"上一个锚点"
			this.previousAnchor = {
				top: top,
				ts: Date.now(),
				...anchorInfo
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
			} catch (err) { console.error('Error restoring anchor:', err); }

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
			const shouldEnable = this.settings.outline?.enabled &&
				this.settings.outline?.autoUpdate &&
				this.isActive;

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
				characterData: true // 标题文字变化也要检测
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
			const scrollBtn = createElement('button', {
				className: 'outline-toolbar-btn',
				id: 'outline-scroll-btn',
				title: this.t('outlineScrollBottom')
			}, '⬇');
			scrollBtn.addEventListener('click', () => this.scrollList());
			row1.appendChild(scrollBtn);

			// 展开/折叠按钮
			const expandBtn = createElement('button', {
				className: 'outline-toolbar-btn',
				id: 'outline-expand-btn',
				title: this.t('outlineExpandAll')
			}, '⊕');
			expandBtn.addEventListener('click', () => this.toggleExpandAll());
			row1.appendChild(expandBtn);

			// 搜索框区域
			const searchWrapper = createElement('div', { className: 'outline-search-wrapper' });

			const searchInput = createElement('input', {
				type: 'text',
				className: 'outline-search-input',
				placeholder: this.t('outlineSearch'),
				value: this.state.searchQuery
			});

			const clearBtn = createElement('button', {
				className: 'outline-search-clear hidden',
				title: this.t('clear')
			}, '×');

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
			const levelProgress = createElement('div', { className: 'outline-level-progress', id: 'outline-level-progress' });
			levelLine.appendChild(levelProgress);
			dotsContainer.appendChild(levelLine);

			// 创建 6 个层级节点（0 表示不展开，1-6 表示层级）
			for (let i = 0; i <= 6; i++) {
				const dot = createElement('div', {
					className: `outline-level-dot ${i <= (this.state.expandLevel) ? 'active' : ''}`,
					'data-level': i
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
				id: 'outline-result-bar'
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
			outlineData.forEach(item => {
				this.state.levelCounts[item.level] = (this.state.levelCounts[item.level] || 0) + 1;
			});
			this.updateTooltips();

			// 智能缩进：检测最高层级
			const minLevel = Math.min(...outlineData.map(item => item.level));
			this.state.minLevel = minLevel;

			// 在重构树之前，捕获当前的折叠状态
			const currentStateMap = {};
			if (this.state.tree) {
				this.captureTreeState(this.state.tree, currentStateMap);
			}

			// 构建树形结构
			const outlineKey = outlineData.map(i => i.text).join('|');
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
				nodes.forEach(node => {
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
					collapsed: false
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
			items.forEach(item => {
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
					const isRelevant = !this.state.searchQuery || (item.isMatch || item.hasMatchedDescendant || parentForceExpanded);
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
					'data-level': item.relativeLevel
				});

				const isExpanded = hasChildren && !item.collapsed;
				const toggle = createElement('span', {
					className: `outline-item-toggle ${hasChildren ? (isExpanded ? 'expanded' : '') : 'invisible'}`
				}, '▸');

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

						textEl.innerHTML = '';
						parts.forEach(part => {
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
					this.renderItems(
						container,
						item.children,
						minLevel,
						displayLevel,
						childParentCollapsed,
						item.forceExpanded || parentForceExpanded
					);
				}
			});
		}

		// 初始化树的折叠状态
		initializeCollapsedState(items, displayLevel) {
			items.forEach(item => {
				if (item.children && item.children.length > 0) {
					const allChildrenHidden = item.children.every(child => child.level > displayLevel);
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
			dots.forEach(dot => {
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
			items.forEach(item => {
				item.forceExpanded = false;
				if (item.children && item.children.length > 0) {
					const allChildrenHidden = item.children.every(child => child.level > displayLevel);
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
			dots.forEach(dot => {
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
			nodes.forEach(node => {
				// 使用 level + text 作为 key
				// 注意：如果有完全相同的标题在同一级，可能会冲突，但在当前场景下可以接受
				const key = `${node.level}_${node.text}`;
				stateMap[key] = {
					collapsed: node.collapsed,
					forceExpanded: node.forceExpanded
				};

				if (node.children && node.children.length > 0) {
					this.captureTreeState(node.children, stateMap);
				}
			});
		}

		// 恢复树的状态
		restoreTreeState(nodes, stateMap) {
			nodes.forEach(node => {
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
			this.isCollapsed = false;
			this.isScrolling = false; // 滚动状态锁
			this.anchorScrollTop = null; // 阅读锚点位置
			this.lang = detectLanguage(); // 当前语言
			this.i18n = I18N[this.lang]; // 当前语言文本
			this.settings = this.loadSettings(); // 加载设置

			// 初始化当前 Tab：优先使用设置的第一个 Tab
			this.currentTab = this.settings.tabOrder && this.settings.tabOrder.length > 0
				? this.settings.tabOrder[0]
				: 'prompts';

			// 兜底：如果首个 Tab 被禁用，则回退到 safe tab
			const isOutlineDisabled = this.currentTab === 'outline' && !this.settings.outline?.enabled;
			const isPromptsDisabled = this.currentTab === 'prompts' && !this.settings.prompts?.enabled;

			if (isOutlineDisabled || isPromptsDisabled) {
				// 尝试找一个可用的 tab
				const availableTab = this.settings.tabOrder.find(t => {
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
			const widthSettings = GM_getValue(SETTING_KEYS.PAGE_WIDTH, DEFAULT_WIDTH_SETTINGS);
			const outlineSettings = GM_getValue(SETTING_KEYS.OUTLINE, DEFAULT_OUTLINE_SETTINGS);
			const promptsSettings = GM_getValue(SETTING_KEYS.PROMPTS_SETTINGS, DEFAULT_PROMPTS_SETTINGS);
			const tabOrder = GM_getValue(SETTING_KEYS.TAB_ORDER, DEFAULT_TAB_ORDER);

			// 加载模型锁定设置（按站点隔离，但一次性加载所有站点的配置）
			const savedModelLockSettings = GM_getValue(SETTING_KEYS.MODEL_LOCK, {});
			const mergedModelLockConfig = {};

			// 兼容旧的单一适配器模式（防御性代码）
			const currentAdapter = this.siteAdapter || (this.registry ? this.registry.getCurrent() : null);
			const currentSiteId = currentAdapter ? currentAdapter.getSiteId() : 'unknown';

			// 遍历所有注册的适配器，合并默认配置和保存的配置
			if (this.registry && this.registry.adapters) {
				this.registry.adapters.forEach(adapter => {
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
				showCollapsedAnchor: GM_getValue('gemini_show_collapsed_anchor', true),
				tabSettings: { ...DEFAULT_TAB_SETTINGS, ...GM_getValue(SETTING_KEYS.TAB_SETTINGS, {}) },
				readingHistory: { ...DEFAULT_READING_HISTORY_SETTINGS, ...GM_getValue(SETTING_KEYS.READING_HISTORY, {}) }
			};
		}

		// 保存设置
		saveSettings() {
			GM_setValue(SETTING_KEYS.CLEAR_TEXTAREA_ON_SEND, this.settings.clearTextareaOnSend);

			// 保存模型锁定设置（保存整个字典）
			GM_setValue(SETTING_KEYS.MODEL_LOCK, this.settings.modelLockConfig);

			// 保存标签页设置
			GM_setValue(SETTING_KEYS.TAB_SETTINGS, this.settings.tabSettings);

			// 保存页面宽度设置
			const allWidthSettings = GM_getValue(SETTING_KEYS.PAGE_WIDTH, DEFAULT_WIDTH_SETTINGS);
			allWidthSettings[this.siteAdapter.getSiteId()] = this.settings.pageWidth;
			GM_setValue(SETTING_KEYS.PAGE_WIDTH, allWidthSettings);
			// 保存大纲设置
			GM_setValue(SETTING_KEYS.OUTLINE, this.settings.outline);
			// 保存提示词设置
			GM_setValue(SETTING_KEYS.PROMPTS_SETTINGS, this.settings.prompts);
			// 保存 Tab 顺序
			GM_setValue(SETTING_KEYS.TAB_ORDER, this.settings.tabOrder);
			// 保存防滚动设置
			GM_setValue('gemini_prevent_auto_scroll', this.settings.preventAutoScroll);
			// 保存阅读历史设置
			GM_setValue(SETTING_KEYS.READING_HISTORY, this.settings.readingHistory);
		}

		addPrompt(prompt) {
			prompt.id = 'custom_' + Date.now();
			this.prompts.push(prompt);
			this.savePrompts();
			this.refreshPromptList();
			this.refreshCategories();
		}

		updatePrompt(id, updatedPrompt) {
			const index = this.prompts.findIndex(p => p.id === id);
			if (index !== -1) {
				this.prompts[index] = { ...this.prompts[index], ...updatedPrompt };
				this.savePrompts();
				this.refreshPromptList();
				this.refreshCategories();
			}
		}

		deletePrompt(id) {
			this.prompts = this.prompts.filter(p => p.id !== id);
			this.savePrompts();
			this.refreshPromptList();
			this.refreshCategories();
		}

		getCategories() {
			const categories = new Set();
			this.prompts.forEach(p => {
				if (p.category) categories.add(p.category);
			});
			return Array.from(categories);
		}

		init() {
			this.createStyles();
			this.createUI();
			this.bindEvents();
			// 初始化锚点按钮状态（初始时没有锚点，应置灰）
			this.updateAnchorButtonState(false);
			this.siteAdapter.findTextarea();
			// 对于 Gemini Business，根据设置决定是否在初始化时插入零宽字符
			const currentSiteId = this.siteAdapter.getSiteId();
			const adapterOptions = {
				clearOnInit: this.siteAdapter instanceof GeminiBusinessAdapter ? this.settings.clearTextareaOnSend : false,
				modelLockConfig: this.settings.modelLockConfig[currentSiteId] // 传递当前站点的配置
			};
			// 绑定新对话监听 (点击按钮或快捷键)
			this.siteAdapter.bindNewChatListeners(() => {
				console.log('Gemini Helper: New chat detected, re-initializing...');
				// 重新加载配置并执行初始化逻辑
				this.settings = this.loadSettings();
				const currentSiteId = this.siteAdapter.getSiteId();
				const adapterOptions = {
					clearOnInit: this.siteAdapter instanceof GeminiBusinessAdapter ? this.settings.clearTextareaOnSend : false,
					modelLockConfig: this.settings.modelLockConfig[currentSiteId]
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
                /* 主面板样式 */
                #gemini-helper-panel {
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    transform: translateY(-50%);
                    width: 320px;
                    height: 80vh;
                    min-height: 600px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    transition: all 0.3s ease;
                    border: 1px solid #e0e0e0;
                }
                #gemini-helper-panel.collapsed { display: none; }
                .prompt-panel-header {
                    padding: 16px;
                    background: ${gradient};
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
                .prompt-panel-controls { display: flex; gap: 8px; }
                .prompt-panel-btn {
                    background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px;
                    border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s; font-size: 14px;
                }
                .prompt-panel-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }
                .prompt-search-bar { padding: 12px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
                .prompt-search-input {
                    width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;
                    transition: all 0.2s; box-sizing: border-box;
                }
                .prompt-search-input:focus { outline: none; border-color: ${colors.primary}; }
                .prompt-categories { padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap; background: white; border-bottom: 1px solid #e5e7eb; }
                .category-tag {
                    padding: 4px 10px; background: #f3f4f6; border-radius: 12px; font-size: 12px; color: #4b5563;
                    cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
                }
                .category-tag:hover { background: #e5e7eb; }
                .category-tag.active {
                    background: ${colors.primary}; color: white; border-color: ${colors.primary};
                }
                .prompt-list { flex: 1; overflow-y: auto; padding: 8px; }
                .prompt-item {
                    background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px;
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
                .prompt-item-title { font-weight: 600; font-size: 14px; color: #1f2937; flex: 1; }
                .prompt-item-category { font-size: 11px; padding: 2px 6px; background: #f3f4f6; border-radius: 4px; color: #6b7280; }
                .prompt-item-content { font-size: 13px; color: #6b7280; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .prompt-item-actions { position: absolute; top: 8px; right: 8px; display: none; gap: 4px; }
                .prompt-item:hover .prompt-item-actions { display: flex; }
                .prompt-action-btn {
                    width: 24px; height: 24px; border: none; background: white; border-radius: 4px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 12px;
                }
                .prompt-action-btn:hover { background: #f3f4f6; transform: scale(1.1); }
                .prompt-item.dragging { opacity: 0.5; }
                .add-prompt-btn {
                    margin: 12px; padding: 10px; background: ${gradient};
                    color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
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
                    background: white; border-radius: 12px; width: 90%; max-width: 500px; padding: 24px; animation: slideUp 0.3s;
                }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .prompt-modal-header { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #1f2937; }
                .prompt-form-group { margin-bottom: 16px; }
                .prompt-form-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
                .prompt-form-input, .prompt-form-textarea {
                    width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;
                    transition: all 0.2s; box-sizing: border-box;
                }
                .prompt-form-textarea { min-height: 100px; resize: vertical; font-family: inherit; }
                .prompt-form-input:focus, .prompt-form-textarea:focus { outline: none; border-color: ${colors.primary}; }
                .prompt-modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
                .prompt-modal-btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; }
                .prompt-modal-btn.primary { background: ${gradient}; color: white; }
                .prompt-modal-btn.secondary { background: #f3f4f6; color: #4b5563; }
                /* 选中的提示词显示栏 */
                .selected-prompt-bar {
                    position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
                    background: ${gradient};
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
                    background: ${gradient};
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
                .prompt-toast {
                    position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10b981;
                    color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000001; animation: toastSlideIn 0.3s;
                }
                @keyframes toastSlideIn { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                /* 快捷跳转按钮组（面板内） */
                .scroll-nav-container {
                    display: flex; gap: 8px; padding: 10px 16px; border-top: 1px solid #e5e7eb;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-radius: 0 0 12px 12px; justify-content: center;
                }
                .scroll-nav-btn {
                    flex: 1; max-width: 120px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; font-size: 14px; color: white; gap: 4px;
                    background: ${gradient};
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
                /* 分类管理按钮 */
                .category-manage-btn {
                    padding: 4px 8px; background: transparent; border: 1px dashed #9ca3af; border-radius: 12px;
                    font-size: 12px; color: #6b7280; cursor: pointer; transition: all 0.2s; margin-left: 4px;
                }
                .category-manage-btn:hover { background: #f3f4f6; border-color: #6b7280; color: #374151; }
                /* 分类管理弹窗 */
                .category-modal-content { max-height: 400px; }
                .category-list { max-height: 280px; overflow-y: auto; margin: 16px 0; }
                .category-item {
                    display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
                    background: #f9fafb; border-radius: 8px; margin-bottom: 8px; transition: all 0.2s;
                }
                .category-item:hover { background: #f3f4f6; }
                .category-item-info { display: flex; align-items: center; gap: 12px; flex: 1; }
                .category-item-name { font-weight: 500; color: #1f2937; font-size: 14px; }
                .category-item-count { font-size: 12px; color: #6b7280; background: #e5e7eb; padding: 2px 8px; border-radius: 10px; }
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
                    display: flex; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
                }
                .prompt-panel-tab {
                    flex: 1; padding: 10px 16px; background: transparent; border: none;
                    font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer;
                    transition: all 0.2s; border-bottom: 2px solid transparent;
                }
                .prompt-panel-tab:hover { color: #374151; background: #f3f4f6; }
                .prompt-panel-tab.active {
                    color: ${colors.primary}; border-bottom-color: ${colors.primary}; background: white;
                }
                /* 面板内容区 */
                .prompt-panel-content { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 280px; }
                .prompt-panel-content.hidden { display: none; }
                /* 设置面板样式 - 合并优化 */
                .settings-content { padding: 16px; overflow-y: auto; flex: 1; scrollbar-width: none; -ms-overflow-style: none; }
                .settings-content::-webkit-scrollbar { display: none; }
                .settings-section { margin-bottom: 24px; }
                .settings-section-title {
                    font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;
                    text-transform: uppercase; letter-spacing: 0.5px; padding-left: 4px; border-bottom: none;
                }
                .setting-item {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;
                    border: 1px solid #f3f4f6; transition: all 0.2s;
                }
                .setting-item:hover { border-color: linear-gradient(135deg, #4285f4 0%, #34a853 100%); background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .setting-item-info { flex: 1; margin-right: 12px; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
                .setting-item-label { font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 2px; white-space: nowrap; }
                .setting-item-desc { font-size: 12px; color: #9ca3af; line-height: 1.3; }
                .setting-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
                .setting-select {
                    padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;
                    color: #374151; background: white; outline: none; transition: all 0.2s; height: 32px; box-sizing: border-box;
                    min-width: 100px;
                }
                .setting-select:focus { border-color: #4285f4; box-shadow: 0 0 0 2px rgba(66,133,244,0.1); }
                .setting-toggle {
                    width: 44px; height: 24px; background: #d1d5db; border-radius: 12px; position: relative;
                    cursor: pointer; transition: all 0.3s; flex-shrink: 0;
                }
                .setting-toggle::after {
                    content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
                    background: white; border-radius: 50%; transition: all 0.3s; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .setting-toggle.active { background: #4285f4; } /* 默认蓝色，会被JS覆盖 */
                .setting-toggle.active::after { left: 22px; }

                /* 大纲面板样式 */
                .outline-content {
                    display: flex; flex-direction: column; flex: 1; min-height: 200px; user-select: none; overflow: hidden;
                }
                /* 大纲固定工具栏 */
                .outline-fixed-toolbar {
                    padding: 10px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
                    flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;
                }
                .outline-toolbar-row {
                    display: flex; align-items: center; gap: 8px;
                }
                .outline-toolbar-btn {
                    width: 28px; height: 28px; border: 1px solid #d1d5db; border-radius: 6px;
                    background: white; color: #6b7280; cursor: pointer; display: flex;
                    align-items: center; justify-content: center; font-size: 14px;
                    transition: all 0.2s; flex-shrink: 0;
                }
                .outline-toolbar-btn:hover { border-color: ${colors.primary}; color: ${colors.primary}; background: #f0f9ff; }
                .outline-toolbar-btn.active { border-color: ${colors.primary}; color: white; background: ${colors.primary}; }
                .outline-search-input {
                    flex: 1; height: 28px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 6px;
                    font-size: 13px; color: #374151; outline: none; transition: all 0.2s;
                }
                .outline-search-input:focus { border-color: ${colors.primary}; box-shadow: 0 0 0 2px rgba(66,133,244,0.1); }
                .outline-search-input::placeholder { color: #9ca3af; }
                .outline-search-clear {
                    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
                    width: 16px; height: 16px; border: none; background: #d1d5db; color: white;
                    border-radius: 50%; cursor: pointer; font-size: 10px; line-height: 16px; text-align: center;
                }
                .outline-search-clear:hover { background: #9ca3af; }
                .outline-search-wrapper { position: relative; flex: 1; display: flex; align-items: center; }
                .outline-search-result { font-size: 12px; color: #6b7280; margin-left: 8px; white-space: nowrap; }
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
                    background: #e5e7eb; border-radius: 2px; outline: none; cursor: pointer;
                }
                .outline-level-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
                    background: ${colors.primary}; cursor: pointer; border: 2px solid white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .outline-level-slider::-moz-range-thumb {
                    width: 14px; height: 14px; border-radius: 50%;
                    background: ${colors.primary}; cursor: pointer; border: 2px solid white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .outline-level-dots {
                    display: flex; justify-content: space-between; align-items: center;
                    position: relative; flex: 1; height: 24px;
                }
                .outline-level-dot {
                    width: 12px; height: 12px; border-radius: 50%; background: #d1d5db;
                    cursor: pointer; transition: all 0.2s; position: relative; z-index: 2;
                    border: 2px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .outline-level-dot:hover { background: ${colors.primary}; transform: scale(1.2); }
                .outline-level-dot.active { background: ${colors.primary}; }
                .outline-level-dot-tooltip {
                    position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
                    background: #374151; color: white; padding: 4px 8px; border-radius: 4px;
                    font-size: 11px; white-space: nowrap; opacity: 0; visibility: hidden;
                    transition: all 0.2s; pointer-events: none; margin-bottom: 4px;
                }
                .outline-level-dot:hover .outline-level-dot-tooltip { opacity: 1; visibility: visible; }
                .outline-level-line {
                    position: absolute; left: 10px; right: 10px; top: 50%; height: 4px;
                    background: #e5e7eb; transform: translateY(-50%); z-index: 1; border-radius: 2px;
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
                    font-size: 13px; color: #374151; transition: all 0.15s;
                    display: flex; align-items: center; position: relative;
                }
                .outline-item:hover { background: #f3f4f6; }
                .outline-item.highlight { background: #dbeafe; border-color: ${colors.primary}; }
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
                .outline-level-5 { padding-left: 82px; font-size: 12px; color: #6b7280; }
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

		createUI() {
			const existingPanel = document.getElementById('gemini-helper-panel');
			const existingBar = document.querySelector('.selected-prompt-bar');
			const existingBtnGroup = document.getElementById('quick-btn-group');

			if (existingPanel) existingPanel.remove();
			if (existingBar) existingBar.remove();
			if (existingBtnGroup) existingBtnGroup.remove();

			const panel = createElement('div', { id: 'gemini-helper-panel' });

			// Header
			const header = createElement('div', { className: 'prompt-panel-header' });
			const title = createElement('div', { className: 'prompt-panel-title' });
			title.appendChild(createElement('span', {}, '✨'));
			title.appendChild(createElement('span', {}, this.t('panelTitle')));
			title.appendChild(createElement('span', { className: 'site-indicator' }, this.siteAdapter.getName()));

			const controls = createElement('div', { className: 'prompt-panel-controls' });
			const refreshBtn = createElement('button', { className: 'prompt-panel-btn', id: 'refresh-prompts', title: this.t('refreshPrompts') }, '⟳');
			refreshBtn.addEventListener('click', () => {
				refreshBtn.classList.add('loading');
				// 根据当前 Tab 智能刷新
				if (this.currentTab === 'outline') {
					this.refreshOutline();
					this.showToast(this.t('refreshed'));
				} else if (this.currentTab === 'prompts') {
					this.refreshPromptList();
					this.showToast(this.t('refreshed'));
				} else {
					this.showToast(this.t('refreshed'));
				}
				setTimeout(() => refreshBtn.classList.remove('loading'), 500);
			});
			const toggleBtn = createElement('button', { className: 'prompt-panel-btn', id: 'toggle-panel', title: this.t('collapse') }, '−');
			// 注意：toggleBtn 的事件监听在 bindEvents 中统一绑定，避免重复绑定
			// 新建标签页按钮
			// 新标签页按钮 (只有在设置开启且站点支持时显示)
			if (this.settings.tabSettings?.openInNewTab && this.siteAdapter.supportsNewTab()) {
				const newTabBtn = createElement('button', {
					className: 'prompt-panel-btn',
					id: 'new-tab-btn',
					title: this.t('newTabTooltip'),
					style: 'margin-right: 2px;'
				}, '+');
				newTabBtn.addEventListener('click', () => {
					const url = this.siteAdapter.getNewTabUrl();
					if (url) {
						window.open(url, '_blank');
					}
				});
				controls.appendChild(newTabBtn);
			}

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
					this.showToast(isPrivate ? '🔒 隐私模式已开启' : '🔓 隐私模式已关闭');
				}
			});

			// Tab 栏
			const tabs = createElement('div', { className: 'prompt-panel-tabs' });

			// 根据设置的顺序渲染 Tab
			const tabOrder = this.settings.tabOrder || DEFAULT_TAB_ORDER;

			// 确保所有 Tab 都存在（防止新版本新增 Tab 或配置丢失）
			const allTabs = new Set([...tabOrder, ...DEFAULT_TAB_ORDER]);
			// 过滤掉未定义的 Tab ID
			const validTabs = Array.from(allTabs).filter(id => TAB_DEFINITIONS[id]);

			validTabs.forEach(tabId => {
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

				const btn = createElement('button', {
					className: className,
					'data-tab': tabId,
					id: `${tabId}-tab`
				});

				// 添加图标和文本
				btn.appendChild(createElement('span', { style: 'margin-right: 6px;' }, def.icon));
				btn.appendChild(document.createTextNode(this.t(def.labelKey)));

				btn.addEventListener('click', () => this.switchTab(tabId));
				tabs.appendChild(btn);
			});

			panel.appendChild(header);
			panel.appendChild(tabs);

			// 内容容器需按固定顺序创建（DOM 结构不受 Tab 顺序影响，只影响 Tab 按钮顺序）
			// 1. 提示词面板内容区
			const promptsContent = createElement('div', {
				className: `prompt-panel-content${this.currentTab === 'prompts' ? '' : ' hidden'}`,
				id: 'prompts-content'
			});

			const searchBar = createElement('div', { className: 'prompt-search-bar' });
			const searchInput = createElement('input', { className: 'prompt-search-input', id: 'prompt-search', type: 'text', placeholder: this.t('searchPlaceholder') });
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
				id: 'outline-content'
			});
			// 初始化大纲管理器
			this.outlineManager = new OutlineManager({
				container: outlineContent,
				settings: this.settings,
				onSettingsChange: () => this.saveSettings(),
				onJumpBefore: () => this.anchorManager.setAnchor(this.scrollManager.scrollTop),
				i18n: (k) => this.t(k)
			});



			// 3. 设置面板内容区
			const settingsContent = createElement('div', {
				className: `prompt-panel-content${this.currentTab === 'settings' ? '' : ' hidden'}`,
				id: 'settings-content'
			});
			this.createSettingsContent(settingsContent);


			panel.appendChild(promptsContent);
			panel.appendChild(outlineContent);
			panel.appendChild(settingsContent);

			document.body.appendChild(panel);

			// 选中提示词悬浮条
			const selectedBar = createElement('div', { className: 'selected-prompt-bar', style: 'user-select: none;' });
			selectedBar.appendChild(createElement('span', { style: 'user-select: none;' }, this.t('currentPrompt')));
			selectedBar.appendChild(createElement('span', { className: 'selected-prompt-text', id: 'selected-prompt-text', style: 'user-select: none;' }));
			const clearBtn = createElement('button', { className: 'clear-prompt-btn', id: 'clear-prompt' }, '×');
			selectedBar.appendChild(clearBtn);
			document.body.appendChild(selectedBar);

			const quickBtnGroup = createElement('div', { className: 'quick-btn-group hidden', id: 'quick-btn-group' });
			const quickBtn = createElement('button', { className: 'quick-prompt-btn', title: this.t('panelTitle') }, '✨');
			const quickScrollTop = createElement('button', { className: 'quick-prompt-btn', title: this.t('scrollTop') }, '⬆');
			const quickAnchor = createElement('button', {
				className: 'quick-prompt-btn',
				id: 'quick-anchor-btn',
				title: '暂无锚点',
				style: (this.settings.showCollapsedAnchor ? 'display: flex;' : 'display: none;') + ' opacity: 0.4; cursor: default;'
			}, '⚓');
			const quickScrollBottom = createElement('button', { className: 'quick-prompt-btn', title: this.t('scrollBottom') }, '⬇');

			quickBtn.addEventListener('click', () => { this.togglePanel(); });
			quickScrollTop.addEventListener('click', () => this.scrollToTop());
			quickAnchor.addEventListener('click', () => this.handleAnchorClick());
			quickScrollBottom.addEventListener('click', () => this.scrollToBottom());

			quickBtnGroup.appendChild(quickScrollTop);
			quickBtnGroup.appendChild(quickAnchor);
			quickBtnGroup.appendChild(quickBtn);
			quickBtnGroup.appendChild(quickScrollBottom);
			document.body.appendChild(quickBtnGroup);

			// 快捷跳转按钮组 - 放在面板底部
			const scrollNavContainer = createElement('div', { className: 'scroll-nav-container', id: 'scroll-nav-container' });
			const scrollTopBtn = createElement('button', { className: 'scroll-nav-btn', id: 'scroll-top-btn', title: this.t('scrollTop') });
			scrollTopBtn.appendChild(createElement('span', {}, '⬆'));
			scrollTopBtn.appendChild(createElement('span', {}, this.t('scrollTop')));

			const anchorBtn = createElement('button', {
				className: 'scroll-nav-btn icon-only',
				id: 'scroll-anchor-btn',
				title: '暂无锚点',
				style: 'opacity: 0.4; cursor: default;'
			});
			anchorBtn.appendChild(createElement('span', {}, '⚓'));
			// anchorBtn.appendChild(createElement('span', {}, this.t('anchorPoint')));

			const scrollBottomBtn = createElement('button', { className: 'scroll-nav-btn', id: 'scroll-bottom-btn', title: this.t('scrollBottom') });
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
			document.querySelectorAll('.prompt-panel-tab').forEach(tab => {
				tab.classList.toggle('active', tab.dataset.tab === tabName);
			});

			// 切换内容区
			document.getElementById('prompts-content')?.classList.toggle('hidden', tabName !== 'prompts');
			document.getElementById('outline-content')?.classList.toggle('hidden', tabName !== 'outline');
			document.getElementById('settings-content')?.classList.toggle('hidden', tabName !== 'settings');

			// 通知 OutlineManager 激活状态（用于控制自动更新显隐）
			if (this.outlineManager) {
				this.outlineManager.setActive(tabName === 'outline');
			}

			// 更新刷新按钮的提示
			const refreshBtn = document.getElementById('refresh-prompts');
			if (refreshBtn) {
				const titleMap = {
					'prompts': this.t('refreshPrompts'),
					'outline': this.t('refreshOutline'),
					'settings': this.t('refreshSettings')
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
				style: 'cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;'
			});

			const headerLeft = createElement('div', { style: 'display: flex; align-items: center; gap: 6px;' });
			// 箭头
			const arrow = createElement('span', {
				style: 'font-size: 10px; color: #9ca3af; transition: transform 0.2s; display: inline-block;',
				className: 'collapse-arrow'
			}, '▶');

			const headerTitle = createElement('span', {}, title);
			headerLeft.appendChild(arrow);
			headerLeft.appendChild(headerTitle);

			header.appendChild(headerLeft);
			// 如果有右侧元素（如开关状态提示等），可以扩展 options 传入，这里暂时留空

			section.appendChild(header);

			// 内容容器
			const contentContainer = createElement('div', {
				className: 'settings-accordion-content',
				style: `display: ${defaultExpanded ? 'block' : 'none'}; padding-top: 8px; animation: slideDown 0.2s;`
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
				{ value: 'en', label: this.t('languageEn') }
			].forEach(opt => {
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
				this.showToast(langSelect.value === 'auto' ? this.t('languageAuto') : langSelect.options[langSelect.selectedIndex].text);
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
					adaptersWithLock.forEach(adapter => {
						const siteId = adapter.getSiteId();
						const siteConfig = this.settings.modelLockConfig[siteId] || adapter.getDefaultLockSettings();

						const row = createElement('div', {
							className: 'site-lock-row',
							style: 'display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;'
						});

						const leftCol = createElement('div', { style: 'display: flex; align-items: center; flex: 1; gap: 12px;' });
						const nameLabel = createElement('div', { style: 'font-size: 14px; font-weight: 500; color: #374151; min-width: 80px;' }, adapter.getName());
						const toggle = createElement('div', {
							className: 'setting-toggle' + (siteConfig.enabled ? ' active' : ''),
							style: 'transform: scale(0.8);'
						});

						leftCol.appendChild(nameLabel);
						leftCol.appendChild(toggle);

						const rightCol = createElement('div', {});
						const keywordInput = createElement('input', {
							type: 'text',
							className: 'prompt-input-title',
							value: siteConfig.keyword || '',
							placeholder: this.t('modelKeywordPlaceholder'),
							style: 'width: 80px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; text-align: center;'
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
				id: 'toggle-page-width'
			});
			enableToggle.addEventListener('click', () => {
				this.settings.pageWidth.enabled = !this.settings.pageWidth.enabled;
				enableToggle.classList.toggle('active', this.settings.pageWidth.enabled);
				this.saveSettings();
				if (this.widthStyleManager) {
					this.widthStyleManager.updateConfig(this.settings.pageWidth);
				}
				this.showToast(this.settings.pageWidth.enabled ? this.t('settingOn') : this.t('settingOff'));
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
				style: 'width: 65px !important; min-width: 65px !important; text-align: right;'
			});
			const unitSelect = createElement('select', { className: 'setting-select', id: 'width-unit-select', style: 'width: 65px;' });
			['%', 'px'].forEach(unit => {
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
				this.showToast(`${this.t('widthValue')}: ${widthInput.value}${unitSelect.value}`);
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
				id: 'toggle-scroll-lock'
			});
			scrollLockToggle.addEventListener('click', () => {
				this.settings.preventAutoScroll = !this.settings.preventAutoScroll;
				scrollLockToggle.classList.toggle('active', this.settings.preventAutoScroll);
				this.saveSettings();
				if (this.scrollLockManager) {
					this.scrollLockManager.setEnabled(this.settings.preventAutoScroll);
				}
				this.showToast(this.settings.preventAutoScroll ? this.t('settingOn') : this.t('settingOff'));
			});
			scrollLockItem.appendChild(scrollLockInfo);
			scrollLockItem.appendChild(scrollLockToggle);
			widthContainer.appendChild(scrollLockItem);

			const widthSection = this.createCollapsibleSection(this.t('pageDisplaySettings'), widthContainer);


			// 4. 界面排版 (可折叠)
			const layoutContainer = createElement('div', {});
			const tabDesc = createElement('div', {
				className: 'setting-item-desc',
				style: 'padding: 0 12px 8px 12px; margin-bottom: 4px;'
			}, this.t('tabOrderDesc'));
			layoutContainer.appendChild(tabDesc);

			const currentOrder = this.settings.tabOrder || DEFAULT_TAB_ORDER;
			const validOrder = currentOrder.filter(id => TAB_DEFINITIONS[id]);

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
						title: this.t('enableOutline') // 添加提示
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

						this.showToast(this.settings.outline.enabled ? this.t('settingOn') : this.t('settingOff'));
					});
					controls.appendChild(outlineToggle);
				}

				// 特殊处理：如果是提示词 Tab，在排序按钮旁边添加开关
				if (tabId === 'prompts') {
					const promptsToggle = createElement('div', {
						className: 'setting-toggle' + (this.settings.prompts?.enabled ? ' active' : ''),
						id: 'toggle-prompts-inline',
						style: 'transform: scale(0.8); margin-right: 12px;',
						title: this.t('togglePrompts')
					});
					promptsToggle.addEventListener('click', (e) => {
						e.stopPropagation();
						this.settings.prompts.enabled = !this.settings.prompts.enabled;
						promptsToggle.classList.toggle('active', this.settings.prompts.enabled);
						this.saveSettings();

						const promptsTab = document.getElementById('prompts-tab');
						if (promptsTab) promptsTab.classList.toggle('hidden', !this.settings.prompts.enabled);

						if (!this.settings.prompts.enabled && this.currentTab === 'prompts') this.switchTab('settings');

						this.showToast(this.settings.prompts.enabled ? this.t('settingOn') : this.t('settingOff'));
					});
					controls.appendChild(promptsToggle);
				}

				// 大纲高级设置（如果是在大纲 Tab 行）
				if (tabId === 'outline') {
					// 插入大纲高级设置的可折叠区域到下面（或者作为子项）
					// 为保持 UI 简洁，我们可以在点击大纲 toggle 时不做额外展示，而是有一个专门的“大纲高级设置”区域
					// 由于这里是排序拖拽区，不适合放太多配置。
					// 决定：在排序列表下方新增一个独立的大纲设置区域
				}

				const upBtn = createElement('button', {
					className: 'prompt-panel-btn',
					style: 'background: #f3f4f6; color: #4b5563; width: 32px; height: 32px; font-size: 16px; margin-right: 4px; border: 1px solid #e5e7eb;',
					title: this.t('moveUp')
				});
				upBtn.textContent = '⬆';
				upBtn.disabled = index === 0;

				const downBtn = createElement('button', {
					className: 'prompt-panel-btn',
					style: 'background: #f3f4f6; color: #4b5563; width: 32px; height: 32px; font-size: 16px; border: 1px solid #e5e7eb;',
					title: this.t('moveDown')
				});
				downBtn.textContent = '⬇';
				downBtn.disabled = index === validOrder.length - 1;

				[upBtn, downBtn].forEach(btn => {
					if (btn.disabled) {
						btn.style.opacity = '0.4';
						btn.style.cursor = 'not-allowed';
						btn.style.background = '#f3f4f6';
					} else {
						btn.style.opacity = '1';
						btn.style.cursor = 'pointer';
						btn.onmouseover = () => { btn.style.background = '#e5e7eb'; btn.style.color = '#111827'; };
						btn.onmouseout = () => { btn.style.background = '#f3f4f6'; btn.style.color = '#4b5563'; };
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

			// 4.5 阅读历史设置 (新增独立版块)
			const anchorContainer = createElement('div', {});

			// 持久化开关
			const anchorPersistenceItem = createElement('div', { className: 'setting-item' });
			const anchorPersistenceInfo = createElement('div', { className: 'setting-item-info' });
			anchorPersistenceInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('readingHistoryPersistence')));
			anchorPersistenceInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('readingHistoryPersistenceDesc')));

			const anchorPersistenceToggle = createElement('div', {
				className: 'setting-toggle' + (this.settings.readingHistory.persistence ? ' active' : ''),
				id: 'toggle-anchor-persistence'
			});

			// 自动恢复开关
			const anchorAutoRestoreItem = createElement('div', { className: 'setting-item' });
			const anchorAutoRestoreInfo = createElement('div', { className: 'setting-item-info' });
			anchorAutoRestoreInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('autoRestore')));
			anchorAutoRestoreInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('autoRestoreDesc')));
			const anchorAutoRestoreToggle = createElement('div', {
				className: 'setting-toggle' + (this.settings.readingHistory.autoRestore ? ' active' : ''),
				id: 'toggle-anchor-auto-restore'
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
				{ val: -1, label: this.t('cleanupInfinite') }
			];
			cleanupOptions.forEach(opt => {
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
				this.showToast(this.settings.readingHistory.persistence ? this.t('settingOn') : this.t('settingOff'));
			});

			anchorAutoRestoreToggle.addEventListener('click', () => {
				this.settings.readingHistory.autoRestore = !this.settings.readingHistory.autoRestore;
				anchorAutoRestoreToggle.classList.toggle('active', this.settings.readingHistory.autoRestore);
				this.saveSettings();
				this.showToast(this.settings.readingHistory.autoRestore ? this.t('settingOn') : this.t('settingOff'));
			});

			anchorCleanupInput.addEventListener('change', () => {
				this.settings.readingHistory.cleanupDays = parseInt(anchorCleanupInput.value);
				this.saveSettings();
				this.showToast(`${this.t('readingHistoryCleanup')}: ${anchorCleanupInput.options[anchorCleanupInput.selectedIndex].text}`);
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

			// 折叠面板显示锚点（从其他设置移入）
			const showAnchorItem = createElement('div', { className: 'setting-item' });
			const showAnchorInfo = createElement('div', { className: 'setting-item-info' });
			showAnchorInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('showCollapsedAnchorLabel')));
			showAnchorInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('showCollapsedAnchorDesc')));

			const showAnchorToggle = createElement('div', {
				className: 'setting-toggle' + (this.settings.showCollapsedAnchor ? ' active' : ''),
				id: 'toggle-show-collapsed-anchor'
			});
			showAnchorToggle.addEventListener('click', () => {
				this.settings.showCollapsedAnchor = !this.settings.showCollapsedAnchor;
				showAnchorToggle.classList.toggle('active', this.settings.showCollapsedAnchor);
				this.saveSettings();

				// 实时更新UI
				GM_setValue('gemini_show_collapsed_anchor', this.settings.showCollapsedAnchor);
				const quickAnchor = document.getElementById('quick-anchor-btn');
				if (quickAnchor) {
					quickAnchor.style.display = this.settings.showCollapsedAnchor ? 'flex' : 'none';
				}

				this.showToast(this.settings.showCollapsedAnchor ? this.t('settingOn') : this.t('settingOff'));
			});
			showAnchorItem.appendChild(showAnchorInfo);
			showAnchorItem.appendChild(showAnchorToggle);
			anchorContainer.appendChild(showAnchorItem);

			const anchorSection = this.createCollapsibleSection(this.t('readingNavigationSettings'), anchorContainer);

			// 5. 大纲详细设置 (高级配置)
			const outlineSettingsContainer = createElement('div', {});

			// 自动更新开关
			const autoUpdateItem = createElement('div', { className: 'setting-item' });
			const autoUpdateInfo = createElement('div', { className: 'setting-item-info' });
			autoUpdateInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('outlineAutoUpdateLabel')));
			autoUpdateInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('outlineAutoUpdateDesc')));

			const autoUpdateToggle = createElement('div', {
				className: 'setting-toggle' + (this.settings.outline.autoUpdate ? ' active' : ''),
				id: 'toggle-outline-auto-update'
			});
			autoUpdateToggle.addEventListener('click', () => {
				this.settings.outline.autoUpdate = !this.settings.outline.autoUpdate;
				autoUpdateToggle.classList.toggle('active', this.settings.outline.autoUpdate);
				this.saveSettings();
				if (this.outlineManager) this.outlineManager.updateAutoUpdateState();
				this.showToast(this.settings.outline.autoUpdate ? this.t('settingOn') : this.t('settingOff'));
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
				min: 1
			});
			updateIntervalInput.addEventListener('change', () => {
				let val = parseInt(updateIntervalInput.value, 10);
				if (val < 1) val = 1; // 最小 1 秒
				updateIntervalInput.value = val;
				this.settings.outline.updateInterval = val;
				this.saveSettings();
				// OutlineManager 在触发下一次更新时会自动使用新间隔
				this.showToast(this.t('outlineIntervalUpdated').replace('{val}', val));
			});
			updateIntervalControls.appendChild(updateIntervalInput);
			updateIntervalItem.appendChild(updateIntervalInfo);
			updateIntervalItem.appendChild(updateIntervalControls);
			outlineSettingsContainer.appendChild(updateIntervalItem);

			const outlineSettingsSection = this.createCollapsibleSection(this.t('outlineSettings'), outlineSettingsContainer, { defaultExpanded: false });


			// 6. 标签页设置 (折叠面板)
			const tabSettingsContainer = createElement('div', {});

			// 6.1 新标签页打开开关
			if (this.siteAdapter.supportsNewTab()) {
				const newTabItem = createElement('div', { className: 'setting-item' });
				const newTabInfo = createElement('div', { className: 'setting-item-info' });
				newTabInfo.appendChild(createElement('div', { className: 'setting-item-label' }, this.t('openNewTabLabel')));
				newTabInfo.appendChild(createElement('div', { className: 'setting-item-desc' }, this.t('openNewTabDesc')));

				const newTabToggle = createElement('div', {
					className: 'setting-toggle' + (this.settings.tabSettings?.openInNewTab ? ' active' : ''),
					id: 'toggle-new-tab'
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
					this.showToast(this.settings.tabSettings.openInNewTab ? this.t('settingOn') : this.t('settingOff'));
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
					id: 'toggle-auto-rename-tab'
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
				const intervalSelect = createElement('select', { className: 'setting-select', id: 'select-rename-interval' });
				const intervalOptions = [1, 3, 5, 10, 30, 60];
				intervalOptions.forEach(val => {
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
					this.showToast(`${this.t('renameIntervalLabel')}: ${intervalSelect.value}${this.t('secondsSuffix')}`);
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

					this.showToast(this.settings.tabSettings.autoRenameTab ? this.t('settingOn') : this.t('settingOff'));
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
					id: 'toggle-show-status'
				});
				showStatusToggle.addEventListener('click', () => {
					this.settings.tabSettings.showStatus = !this.settings.tabSettings.showStatus;
					showStatusToggle.classList.toggle('active', this.settings.tabSettings.showStatus);
					this.saveSettings();
					if (this.tabRenameManager) this.tabRenameManager.updateTabName(true);
					this.showToast(this.settings.tabSettings.showStatus ? this.t('settingOn') : this.t('settingOff'));
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
					style: 'width: 130px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;'
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
					id: 'toggle-show-notification'
				});
				notificationToggle.addEventListener('click', () => {
					this.settings.tabSettings.showNotification = !this.settings.tabSettings.showNotification;
					notificationToggle.classList.toggle('active', this.settings.tabSettings.showNotification);
					this.saveSettings();
					this.showToast(this.settings.tabSettings.showNotification ? this.t('settingOn') : this.t('settingOff'));
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
					id: 'toggle-auto-focus'
				});
				autoFocusToggle.addEventListener('click', () => {
					this.settings.tabSettings.autoFocus = !this.settings.tabSettings.autoFocus;
					autoFocusToggle.classList.toggle('active', this.settings.tabSettings.autoFocus);
					this.saveSettings();
					this.showToast(this.settings.tabSettings.autoFocus ? this.t('settingOn') : this.t('settingOff'));
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
					id: 'toggle-privacy-mode'
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
					style: 'width: 100px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;'
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
					this.showToast(this.settings.tabSettings.privacyMode ? '🔒 ' + this.t('settingOn') : '🔓 ' + this.t('settingOff'));
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
					id: 'toggle-clear-on-send'
				});
				toggle.addEventListener('click', () => {
					this.settings.clearTextareaOnSend = !this.settings.clearTextareaOnSend;
					toggle.classList.toggle('active', this.settings.clearTextareaOnSend);
					this.saveSettings();
					this.showToast(this.settings.clearTextareaOnSend ? this.t('settingOn') : this.t('settingOff'));
				});
				clearItem.appendChild(clearInfo);
				clearItem.appendChild(toggle);
				otherSettingsContainer.appendChild(clearItem);
			}

			const otherSettingsSection = this.createCollapsibleSection(this.t('otherSettingsTitle'), otherSettingsContainer, { defaultExpanded: false });

			// ========== 统一管理分类顺序 ==========
			// 1. 通用设置（语言）- 已在上方添加
			// 2. 标签页设置
			if (tabSettingsSection) content.appendChild(tabSettingsSection);
			// 3. 阅读导航
			content.appendChild(anchorSection);
			// 4. 大纲设置
			content.appendChild(outlineSettingsSection);
			// 5. 页面显示
			content.appendChild(widthSection);
			// 6. 模型锁定
			if (lockSection) content.appendChild(lockSection);
			// 7. 界面排版
			content.appendChild(layoutSection);
			// 8. 其他设置
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
			const success = await this.readingProgressManager.restoreProgress((msg) => this.showToast(msg));

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
				this.showToast(this.t('restoredPosition'));
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
				this.showToast(this.t('jumpToAnchor'));
			} else {
				this.showToast('暂无阅读锚点 (点击顶部/底部按钮可自动生成)');
			}
		}

		// 更新锚点按钮状态 (UI)
		updateAnchorButtonState(hasAnchor) {
			[document.getElementById('quick-anchor-btn'), document.getElementById('scroll-anchor-btn')].forEach(btn => {
				if (btn) {
					if (hasAnchor) {
						btn.style.opacity = '1';
						btn.style.cursor = 'pointer';
						btn.title = this.t('jumpToAnchor');
					} else {
						btn.style.opacity = '0.4';
						btn.style.cursor = 'default';
						btn.title = "暂无锚点";
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
			container.appendChild(createElement('span', { className: 'category-tag active', 'data-category': 'all' }, this.t('allCategory')));
			categories.forEach(cat => {
				container.appendChild(createElement('span', { className: 'category-tag', 'data-category': cat }, cat));
			});
			// 添加分类管理按钮
			const manageBtn = createElement('button', { className: 'category-manage-btn', title: this.t('categoryManage') }, this.t('manageCategory'));
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
				categories.forEach(cat => {
					const count = this.prompts.filter(p => p.category === cat).length;
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
			modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
			document.body.appendChild(modal);
		}

		// 重命名分类
		renameCategory(oldName, newName) {
			this.prompts.forEach(p => {
				if (p.category === oldName) {
					p.category = newName;
				}
			});
			this.savePrompts();
			this.refreshCategories();
			this.refreshPromptList();
			this.showToast(`分类已重命名为"${newName}"`);
		}

		// 删除分类（将关联提示词移至"未分类"）
		deleteCategory(name) {
			this.prompts.forEach(p => {
				if (p.category === name) {
					p.category = '未分类';
				}
			});
			this.savePrompts();
			this.refreshCategories();
			this.refreshPromptList();
			this.showToast(`分类"${name}"已删除`);
		}

		refreshPromptList(filter = '') {
			const container = document.getElementById('prompt-list');
			if (!container) return;
			const activeCategory = document.querySelector('.category-tag.active')?.dataset.category || 'all';
			let filteredPrompts = this.prompts;

			if (activeCategory !== 'all') filteredPrompts = filteredPrompts.filter(p => p.category === activeCategory);
			if (filter) filteredPrompts = filteredPrompts.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()) || p.content.toLowerCase().includes(filter.toLowerCase()));

			clearElement(container);

			if (filteredPrompts.length === 0) {
				container.appendChild(createElement('div', { style: 'text-align: center; padding: 20px; color: #9ca3af;' }, '暂无提示词'));
				return;
			}

			filteredPrompts.forEach((prompt, index) => {
				const item = createElement('div', { className: 'prompt-item', draggable: 'false', style: 'user-select: none;' });
				item.dataset.promptId = prompt.id;
				item.dataset.index = index;
				if (this.selectedPrompt?.id === prompt.id) item.classList.add('selected');

				const itemHeader = createElement('div', { className: 'prompt-item-header' });
				itemHeader.appendChild(createElement('div', { className: 'prompt-item-title' }, prompt.title));
				itemHeader.appendChild(createElement('span', { className: 'prompt-item-category' }, prompt.category || '未分类'));

				const itemContent = createElement('div', { className: 'prompt-item-content' }, prompt.content);
				const itemActions = createElement('div', { className: 'prompt-item-actions' });
				const dragBtn = createElement('button', { className: 'prompt-action-btn drag-prompt', 'data-id': prompt.id, title: '拖动排序' }, '☰');
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
				itemActions.appendChild(createElement('button', { className: 'prompt-action-btn copy-prompt', 'data-id': prompt.id, title: '复制' }, '📋'));
				itemActions.appendChild(createElement('button', { className: 'prompt-action-btn edit-prompt', 'data-id': prompt.id, title: '编辑' }, '✏'));
				itemActions.appendChild(createElement('button', { className: 'prompt-action-btn delete-prompt', 'data-id': prompt.id, title: '删除' }, '🗑'));

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
			const newOrder = items.map(item => item.dataset.promptId);

			// 重新排列 prompts 数组
			const orderedPrompts = [];
			newOrder.forEach(id => {
				const prompt = this.prompts.find(p => p.id === id);
				if (prompt) orderedPrompts.push(prompt);
			});

			this.prompts = orderedPrompts;
			this.savePrompts();
			this.showToast(this.t('orderUpdated'));
		}

		selectPrompt(prompt, itemElement) {
			if (this.isScrolling) {
				this.showToast(this.t('scrolling'));
				return;
			}
			this.selectedPrompt = prompt;
			document.querySelectorAll('.prompt-item').forEach(item => item.classList.remove('selected'));
			itemElement.classList.add('selected');

			// 显示当前提示词悬浮条
			const selectedBar = document.querySelector('.selected-prompt-bar');
			const selectedText = document.getElementById('selected-prompt-text');
			if (selectedBar && selectedText) {
				selectedText.textContent = prompt.title;
				selectedBar.classList.add('show');
			}

			this.insertPromptToTextarea(prompt.content);
			this.showToast(`${this.t('inserted')}: ${prompt.title}`);
		}

		insertPromptToTextarea(promptContent) {
			if (this.isScrolling) {
				this.showToast('页面正在滚动，请稍后再选择提示词');
				return;
			}
			const promiseOrResult = this.siteAdapter.insertPrompt(promptContent);

			// 处理异步返回 (Gemini Business 是异步的)
			if (promiseOrResult instanceof Promise) {
				promiseOrResult.then(success => {
					if (!success) {
						this.showToast('未找到输入框，请点击输入框后重试');
						// 再次尝试查找
						this.siteAdapter.findTextarea();
					}
				});
			} else if (!promiseOrResult) {
				this.showToast('未找到输入框，请点击输入框后重试');
				this.siteAdapter.findTextarea();
			}
		}

		clearSelectedPrompt() {
			this.selectedPrompt = null;
			document.querySelector('.selected-prompt-bar')?.classList.remove('show');
			document.querySelectorAll('.prompt-item').forEach(item => item.classList.remove('selected'));
		}

		showEditModal(prompt = null) {
			const isEdit = prompt !== null;
			const modal = createElement('div', { className: 'prompt-modal' });
			const modalContent = createElement('div', { className: 'prompt-modal-content' });

			const modalHeader = createElement('div', { className: 'prompt-modal-header' }, isEdit ? this.t('editPrompt') : this.t('addNewPrompt'));

			const titleGroup = createElement('div', { className: 'prompt-form-group' });
			titleGroup.appendChild(createElement('label', { className: 'prompt-form-label' }, this.t('title')));
			const titleInput = createElement('input', { className: 'prompt-form-input', type: 'text', value: isEdit ? prompt.title : '' });
			titleGroup.appendChild(titleInput);

			const categoryGroup = createElement('div', { className: 'prompt-form-group' });
			categoryGroup.appendChild(createElement('label', { className: 'prompt-form-label' }, this.t('category')));
			const categoryInput = createElement('input', { className: 'prompt-form-input', type: 'text', value: isEdit ? (prompt.category || '') : '', placeholder: this.t('categoryPlaceholder') });
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
				if (!title || !content) { alert(this.t('fillTitleContent')); return; }

				if (isEdit) {
					this.updatePrompt(prompt.id, { title, category: categoryInput.value.trim(), content });
					this.showToast(this.t('promptUpdated'));
				} else {
					this.addPrompt({ title, category: categoryInput.value.trim(), content });
					this.showToast(this.t('promptAdded'));
				}
				modal.remove();
			});

			modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
		}

		showToast(message) {
			const toast = createElement('div', { className: 'prompt-toast' }, message);
			document.body.appendChild(toast);
			setTimeout(() => {
				toast.style.animation = 'toastSlideIn 0.3s reverse';
				setTimeout(() => toast.remove(), 300);
			}, 2000);
		}


		findElementByComposedPath(e) {
			if (!e) return null;
			// 获取事件的完整传播路径（兼容没有 composedPath 的浏览器）
			const path = typeof e.composedPath === 'function' ? e.composedPath() : (e.path || []);

			// 获取提交按钮选择器数组并合并成 selector 字符串
			const selectors = (this.siteAdapter && typeof this.siteAdapter.getSubmitButtonSelectors === 'function')
				? this.siteAdapter.getSubmitButtonSelectors()
				: [];
			const combinedSelector = selectors.length ? selectors.join(', ') : '';

			if (!combinedSelector) return null;

			// 查找路径中第一个符合条件的元素
			const foundElement = path.find(element =>
				element && element instanceof Element && typeof element.matches === 'function' && element.matches(combinedSelector)
			);

			return foundElement || null;
		}

		bindEvents() {
			const searchInput = document.getElementById('prompt-search');
			if (searchInput) searchInput.addEventListener('input', (e) => this.refreshPromptList(e.target.value));

			const categories = document.getElementById('prompt-categories');
			if (categories) {
				categories.addEventListener('click', (e) => {
					if (e.target.classList.contains('category-tag')) {
						document.querySelectorAll('.category-tag').forEach(tag => tag.classList.remove('active'));
						e.target.classList.add('active');
						this.refreshPromptList(document.getElementById('prompt-search')?.value || '');
					}
				});
			}

			document.getElementById('add-prompt')?.addEventListener('click', () => this.showEditModal());
			document.getElementById('prompt-list')?.addEventListener('click', (e) => {
				if (e.target.classList.contains('edit-prompt')) {
					const prompt = this.prompts.find(p => p.id === e.target.dataset.id);
					if (prompt) this.showEditModal(prompt);
				} else if (e.target.classList.contains('delete-prompt')) {
					if (confirm(this.t('confirmDelete'))) {
						this.deletePrompt(e.target.dataset.id);
						this.showToast(this.t('deleted'));
					}
				} else if (e.target.classList.contains('copy-prompt')) {
					const prompt = this.prompts.find(p => p.id === e.target.dataset.id);
					if (prompt) {
						navigator.clipboard.writeText(prompt.content).then(() => {
							this.showToast(this.t('copied'));
						}).catch(() => {
							// 降级方案
							const textarea = document.createElement('textarea');
							textarea.value = prompt.content;
							document.body.appendChild(textarea);
							textarea.select();
							document.execCommand('copy');
							document.body.removeChild(textarea);
							this.showToast(this.t('copied'));
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
				this.showToast(this.t('cleared'));
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
					const selectors = (this.siteAdapter && typeof this.siteAdapter.getSubmitButtonSelectors === 'function')
						? this.siteAdapter.getSubmitButtonSelectors()
						: [];
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
						setTimeout(() => { this.clearSelectedPrompt(); }, 100);
					}
					// 针对 Gemini Business：无论是否使用提示词，发送后都修复中文输入
					if (this.siteAdapter instanceof GeminiBusinessAdapter && this.settings.clearTextareaOnSend) {
						setTimeout(() => { this.siteAdapter.clearTextarea(); }, 200);
					}
				}
			});

			// 3. 回车键发送监听
			document.addEventListener('keydown', (e) => {
				// 仅处理 Enter 键（不带 Shift 修饰符，避免干扰换行操作）
				if (e.key !== 'Enter' || e.shiftKey) return;

				// 使用 composedPath 检查事件源是否来自输入框（兼容 Shadow DOM）
				const path = typeof e.composedPath === 'function' ? e.composedPath() : (e.path || []);
				const isFromTextarea = path.some(element =>
					element && element instanceof Element && this.siteAdapter.isValidTextarea(element)
				);

				if (!isFromTextarea) return;

				// 清理逻辑
				if (this.selectedPrompt) {
					setTimeout(() => { this.clearSelectedPrompt(); }, 100);
				}
				// 针对 Gemini Business：无论是否使用提示词，发送后都修复中文输入
				if (this.siteAdapter instanceof GeminiBusinessAdapter && this.settings.clearTextareaOnSend) {
					setTimeout(() => { this.siteAdapter.clearTextarea(); }, 200);
				}
			}, true); // 使用捕获阶段确保在 Shadow DOM 场景下也能捕获

			document.getElementById('toggle-panel')?.addEventListener('click', () => this.togglePanel());
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
						[300, 800, 1500].forEach(delay => {
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
			setInterval(checkUrl, 1000);
		}

		makeDraggable() {
			const panel = document.getElementById('gemini-helper-panel');
			const header = panel?.querySelector('.prompt-panel-header');
			if (!panel || !header) return;

			let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

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
			siteRegistry.register(new GensparkAdapter());

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
