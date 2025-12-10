// ==UserScript==
// @name         gemini-helper
// @namespace    http://tampermonkey.net/
// @version      1.6.1
// @description  Gemini 多功能助手：提示词管理（增删改查/分类/拖拽排序）、页面加宽、快捷导航、多语言支持，兼容 Gemini 标准版/企业版
// @author       urzeye
// @note         参考 https://linux.do/t/topic/925110 的代码与UI布局拓展实现
// @match        https://gemini.google.com/*
// @match        https://business.gemini.google/*
// @match        https://www.genspark.ai/agents*
// @match        https://genspark.ai/agents*
// @icon         https://raw.githubusercontent.com/gist/urzeye/8d1d3afbbcd0193dbc8a2019b1ba54d3/raw/f7113d329a259963ed1b1ab8cb981e8f635d4cea/gemini.svg
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// @supportURL   https://github.com/urzeye/tampermonkey-scripts/issues
// @homepageURL  https://github.com/urzeye/tampermonkey-scripts
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
		LANGUAGE: 'ui_language',
		PAGE_WIDTH: 'page_width_settings'
	};

	const I18N = {
		'zh-CN': {
			panelTitle: 'Gemini 助手',
			tabPrompts: '📝 提示词',
			tabSettings: '⚙️ 设置',
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
			settingsTitle: '设置',
			clearOnSendLabel: '发送后自动修复中文输入',
			clearOnSendDesc: '发送消息后插入零宽字符，修复下次输入首字母问题（仅 Gemini Business）',
			settingOn: '开',
			settingOff: '关',
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
			languageDesc: '设置面板显示语言，重新打开页面生效',
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
			unitPercent: '百分比 (%)'
		},
		'zh-TW': {
			panelTitle: 'Gemini 助手',
			tabPrompts: '📝 提示詞',
			tabSettings: '⚙️ 設置',
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
			settingsTitle: '設置',
			clearOnSendLabel: '發送後自動修復中文輸入',
			clearOnSendDesc: '發送訊息後插入零寬字元，修復下次輸入首字母問題（僅 Gemini Business）',
			settingOn: '開',
			settingOff: '關',
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
			languageDesc: '設定面板顯示語言，重新開啟頁面生效',
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
			unitPercent: '百分比 (%)'
		},
		'en': {
			panelTitle: 'Gemini Helper',
			tabPrompts: '📝 Prompts',
			tabSettings: '⚙️ Settings',
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
			settingsTitle: 'Settings',
			clearOnSendLabel: 'Auto-fix Chinese input after send',
			clearOnSendDesc: 'Insert zero-width char after send to fix first letter issue (Gemini Business only)',
			settingOn: 'ON',
			settingOff: 'OFF',
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
			languageDesc: 'Set panel display language, reload page to apply',
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
			unitPercent: 'Percentage (%)'
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
			// 1. 优先查找 Shadow DOM 中的滚动容器 (恢复原版逻辑)
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
		 * 页面加载完成后执行
		 */
		afterPropertiesSet() {
			// default do nothing
		}

		/**
		 * 判断是否应该将样式注入到指定的 Shadow Host 中
		 * 用于解决 Shadow DOM 样式污染问题
		 */
		shouldInjectIntoShadow(host) {
			return true;
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

		// 排除侧边栏 (mat-sidenav, mat-drawer) 中的 Shadow DOM
		shouldInjectIntoShadow(host) {
			if (host.closest('mat-sidenav') || host.closest('mat-drawer') || host.closest('[class*="bg-sidebar"]')) return false;
			return true;
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

		afterPropertiesSet(clearOnInit = true) {
			// fixed: gemini business 在使用中文输入时，首字母会自动转换为英文，多一个字母
			// 根据 clearOnInit 参数决定是否插入零宽字符
			if (clearOnInit) {
				this.clearTextarea();
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

	// 安全的 HTML 创建函数
	function createElementSafely(tag, properties = {}, textContent = '') {
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

	// 安全清空元素内容
	function clearElementSafely(element) {
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

	// ==================== 核心管理类 ====================

	/**
	 * Gemini 助手核心类
	 * 管理提示词、设置和 UI 界面
	 */
	class GeminiHelper {
		constructor(siteAdapter) {
			this.prompts = this.loadPrompts();
			this.selectedPrompt = null;
			this.isCollapsed = false;
			this.siteAdapter = siteAdapter;
			this.isScrolling = false; // 滚动状态锁
			this.currentTab = 'prompts'; // 当前激活的 Tab
			this.lang = detectLanguage(); // 当前语言
			this.i18n = I18N[this.lang]; // 当前语言文本
			this.settings = this.loadSettings(); // 加载设置
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
			return {
				clearTextareaOnSend: GM_getValue(SETTING_KEYS.CLEAR_TEXTAREA_ON_SEND, false), // 默认关闭
				pageWidth: widthSettings[this.siteAdapter.getSiteId()] || DEFAULT_WIDTH_SETTINGS[this.siteAdapter.getSiteId()]
			};
		}

		// 保存设置
		saveSettings() {
			GM_setValue(SETTING_KEYS.CLEAR_TEXTAREA_ON_SEND, this.settings.clearTextareaOnSend);
			// 保存页面宽度设置
			const allWidthSettings = GM_getValue(SETTING_KEYS.PAGE_WIDTH, DEFAULT_WIDTH_SETTINGS);
			allWidthSettings[this.siteAdapter.getSiteId()] = this.settings.pageWidth;
			GM_setValue(SETTING_KEYS.PAGE_WIDTH, allWidthSettings);
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
			this.siteAdapter.findTextarea();
			// 对于 Gemini Business，根据设置决定是否在初始化时插入零宽字符
			const shouldClearOnInit = this.siteAdapter instanceof GeminiBusinessAdapter
				? this.settings.clearTextareaOnSend
				: false;
			this.siteAdapter.afterPropertiesSet(shouldClearOnInit);
			// 创建并应用页面宽度样式
			this.widthStyleManager = new WidthStyleManager(this.siteAdapter, this.settings.pageWidth);
			this.widthStyleManager.apply();
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
                    max-height: 70vh;
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
                    position: fixed; bottom: 100px; right: 30px; display: flex; flex-direction: column; gap: 10px;
                    z-index: 999997; transition: opacity 0.3s;
                }
                .quick-btn-group.hidden { display: none; }
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
                .prompt-panel-content { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
                .prompt-panel-content.hidden { display: none; }
                /* 设置面板 */
                .settings-content { padding: 16px; overflow-y: auto; flex: 1; }
                .settings-section { margin-bottom: 20px; }
                .settings-section-title {
                    font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 12px;
                    padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;
                }
                .setting-item {
                    display: flex; align-items: flex-start; justify-content: space-between;
                    padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;
                }
                .setting-item-info { flex: 1; margin-right: 12px; }
                .setting-item-label { font-size: 14px; font-weight: 500; color: #1f2937; margin-bottom: 4px; }
                .setting-item-desc { font-size: 12px; color: #6b7280; line-height: 1.4; }
                /* 开关组件 */
                .setting-toggle {
                    position: relative; width: 44px; height: 24px; background: #d1d5db;
                    border-radius: 12px; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
                }
                .setting-toggle.active { background: ${colors.primary}; }
                .setting-toggle::after {
                    content: ''; position: absolute; top: 2px; left: 2px;
                    width: 20px; height: 20px; background: white; border-radius: 50%;
                    transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .setting-toggle.active::after { left: 22px; }
                /* 下拉选择框 */
                .setting-select {
                    padding: 6px 10px; font-size: 13px; border: 1px solid #d1d5db;
                    border-radius: 6px; background: white; color: #374151;
                    cursor: pointer; min-width: 100px; flex-shrink: 0;
                }
                .setting-select:focus { outline: none; border-color: ${colors.primary}; }
                .settings-empty {
                    text-align: center; color: #9ca3af; padding: 40px 20px; font-size: 14px;
                }
                /* 设置面板样式 */
                .settings-content { padding: 16px; overflow-y: auto; max-height: calc(70vh - 60px); }
                .settings-section { margin-bottom: 24px; }
                .settings-section-title { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; padding-left: 4px; }
                .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px; border: 1px solid #f3f4f6; transition: all 0.2s; }
                .setting-item:hover { border-color: ${colors.primary}; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .setting-item-info { flex: 1; margin-right: 12px; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
                .setting-item-label { font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 2px; white-space: nowrap; }
                .setting-item-desc { font-size: 12px; color: #9ca3af; line-height: 1.3; }
                .setting-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
                .setting-select { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; color: #374151; background: white; outline: none; transition: all 0.2s; height: 32px; box-sizing: border-box; }
                .setting-select:focus { border-color: ${colors.primary}; box-shadow: 0 0 0 2px rgba(66,133,244,0.1); }
                .setting-toggle { width: 46px; height: 24px; background: #d1d5db; border-radius: 12px; position: relative; cursor: pointer; transition: all 0.3s; flex-shrink: 0; }
                .setting-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: all 0.3s; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                .setting-toggle.active { background: ${colors.primary}; }
                .setting-toggle.active::after { left: 24px; }
            `;
			document.head.appendChild(style);
		}

		createUI() {
			const existingPanel = document.getElementById('gemini-helper-panel');
			const existingBar = document.querySelector('.selected-prompt-bar');
			const existingBtn = document.querySelector('.quick-prompt-btn');

			if (existingPanel) existingPanel.remove();
			if (existingBar) existingBar.remove();
			if (existingBtn) existingBtn.remove();

			const panel = createElementSafely('div', { id: 'gemini-helper-panel' });

			// Header
			const header = createElementSafely('div', { className: 'prompt-panel-header' });
			const title = createElementSafely('div', { className: 'prompt-panel-title' });
			title.appendChild(createElementSafely('span', {}, '✨'));
			title.appendChild(createElementSafely('span', {}, this.t('panelTitle')));
			title.appendChild(createElementSafely('span', { className: 'site-indicator' }, this.siteAdapter.getName()));

			const controls = createElementSafely('div', { className: 'prompt-panel-controls' });
			const refreshBtn = createElementSafely('button', { className: 'prompt-panel-btn', id: 'refresh-prompts', title: this.t('refresh') }, '⟳');
			const toggleBtn = createElementSafely('button', { className: 'prompt-panel-btn', id: 'toggle-panel', title: this.t('collapse') }, '−');
			controls.appendChild(refreshBtn);
			controls.appendChild(toggleBtn);

			header.appendChild(title);
			header.appendChild(controls);

			// Tab 栏
			const tabs = createElementSafely('div', { className: 'prompt-panel-tabs' });
			const promptsTab = createElementSafely('button', { className: 'prompt-panel-tab active', 'data-tab': 'prompts' }, this.t('tabPrompts'));
			const settingsTab = createElementSafely('button', { className: 'prompt-panel-tab', 'data-tab': 'settings' }, this.t('tabSettings'));
			promptsTab.addEventListener('click', () => this.switchTab('prompts'));
			settingsTab.addEventListener('click', () => this.switchTab('settings'));
			tabs.appendChild(promptsTab);
			tabs.appendChild(settingsTab);

			// 提示词面板内容区
			const promptsContent = createElementSafely('div', { className: 'prompt-panel-content', id: 'prompts-content' });

			const searchBar = createElementSafely('div', { className: 'prompt-search-bar' });
			const searchInput = createElementSafely('input', { className: 'prompt-search-input', id: 'prompt-search', type: 'text', placeholder: this.t('searchPlaceholder') });
			searchBar.appendChild(searchInput);

			const categories = createElementSafely('div', { className: 'prompt-categories', id: 'prompt-categories' });
			const list = createElementSafely('div', { className: 'prompt-list', id: 'prompt-list' });

			const addBtn = createElementSafely('button', { className: 'add-prompt-btn', id: 'add-prompt' });
			addBtn.appendChild(createElementSafely('span', {}, '+'));
			addBtn.appendChild(createElementSafely('span', {}, this.t('addPrompt')));

			promptsContent.appendChild(searchBar);
			promptsContent.appendChild(categories);
			promptsContent.appendChild(list);
			promptsContent.appendChild(addBtn);

			// 设置面板内容区
			const settingsContent = createElementSafely('div', { className: 'prompt-panel-content hidden', id: 'settings-content' });
			this.createSettingsContent(settingsContent);

			panel.appendChild(header);
			panel.appendChild(tabs);
			panel.appendChild(promptsContent);
			panel.appendChild(settingsContent);

			document.body.appendChild(panel);

			// 选中提示词悬浮条
			const selectedBar = createElementSafely('div', { className: 'selected-prompt-bar', style: 'user-select: none;' });
			selectedBar.appendChild(createElementSafely('span', { style: 'user-select: none;' }, this.t('currentPrompt')));
			selectedBar.appendChild(createElementSafely('span', { className: 'selected-prompt-text', id: 'selected-prompt-text', style: 'user-select: none;' }));
			const clearBtn = createElementSafely('button', { className: 'clear-prompt-btn', id: 'clear-prompt' }, '×');
			selectedBar.appendChild(clearBtn);
			document.body.appendChild(selectedBar);

			// 快捷按钮组（收起时显示）
			const quickBtnGroup = createElementSafely('div', { className: 'quick-btn-group hidden', id: 'quick-btn-group' });
			const quickBtn = createElementSafely('button', { className: 'quick-prompt-btn', title: this.t('panelTitle') }, '✨');
			const quickScrollTop = createElementSafely('button', { className: 'quick-prompt-btn', title: this.t('scrollTop') }, '⬆');
			const quickScrollBottom = createElementSafely('button', { className: 'quick-prompt-btn', title: this.t('scrollBottom') }, '⬇');
			quickBtn.addEventListener('click', () => { this.togglePanel(); });
			quickScrollTop.addEventListener('click', () => this.scrollToTop());
			quickScrollBottom.addEventListener('click', () => this.scrollToBottom());
			quickBtnGroup.appendChild(quickScrollTop);
			quickBtnGroup.appendChild(quickBtn);
			quickBtnGroup.appendChild(quickScrollBottom);
			document.body.appendChild(quickBtnGroup);

			// 快捷跳转按钮组 - 放在面板底部
			const scrollNavContainer = createElementSafely('div', { className: 'scroll-nav-container', id: 'scroll-nav-container' });
			const scrollTopBtn = createElementSafely('button', { className: 'scroll-nav-btn', id: 'scroll-top-btn', title: this.t('scrollTop') });
			scrollTopBtn.appendChild(createElementSafely('span', {}, '⬆'));
			scrollTopBtn.appendChild(createElementSafely('span', {}, this.t('scrollTop')));
			const scrollBottomBtn = createElementSafely('button', { className: 'scroll-nav-btn', id: 'scroll-bottom-btn', title: this.t('scrollBottom') });
			scrollBottomBtn.appendChild(createElementSafely('span', {}, '⬇'));
			scrollBottomBtn.appendChild(createElementSafely('span', {}, this.t('scrollBottom')));
			scrollTopBtn.addEventListener('click', () => this.scrollToTop());
			scrollBottomBtn.addEventListener('click', () => this.scrollToBottom());
			scrollNavContainer.appendChild(scrollTopBtn);
			scrollNavContainer.appendChild(scrollBottomBtn);
			panel.appendChild(scrollNavContainer);

			this.refreshCategories();
			this.refreshPromptList();
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
			document.getElementById('settings-content')?.classList.toggle('hidden', tabName !== 'settings');
		}

		// 创建设置面板内容
		createSettingsContent(container) {
			const content = createElementSafely('div', { className: 'settings-content' });

			// 通用设置区：语言选择
			const generalSection = createElementSafely('div', { className: 'settings-section' });
			generalSection.appendChild(createElementSafely('div', { className: 'settings-section-title' }, this.t('settingsTitle')));

			// 语言选择项
			const langItem = createElementSafely('div', { className: 'setting-item' });
			const langInfo = createElementSafely('div', { className: 'setting-item-info' });
			langInfo.appendChild(createElementSafely('div', { className: 'setting-item-label' }, this.t('languageLabel')));
			langInfo.appendChild(createElementSafely('div', { className: 'setting-item-desc' }, this.t('languageDesc')));

			const langSelect = createElementSafely('select', { className: 'setting-select', id: 'select-language' });
			const currentLang = GM_getValue(SETTING_KEYS.LANGUAGE, 'auto');
			[
				{ value: 'auto', label: this.t('languageAuto') },
				{ value: 'zh-CN', label: this.t('languageZhCN') },
				{ value: 'zh-TW', label: this.t('languageZhTW') },
				{ value: 'en', label: this.t('languageEn') }
			].forEach(opt => {
				const option = createElementSafely('option', { value: opt.value }, opt.label);
				if (opt.value === currentLang) option.selected = true;
				langSelect.appendChild(option);
			});
			langSelect.addEventListener('change', () => {
				GM_setValue(SETTING_KEYS.LANGUAGE, langSelect.value);
				// 更新当前语言并重新渲染 UI，实现即时生效
				this.lang = detectLanguage();
				this.i18n = I18N[this.lang];
				this.createStyles();
				this.createUI();
				this.bindEvents();
				// 切换到设置面板
				this.switchTab('settings');
				this.showToast(langSelect.value === 'auto' ? this.t('languageAuto') : langSelect.options[langSelect.selectedIndex].text);
			});

			langItem.appendChild(langInfo);
			langItem.appendChild(langSelect);
			generalSection.appendChild(langItem);

			// 页面宽度设置
			const widthSection = createElementSafely('div', { className: 'settings-section' });
			widthSection.appendChild(createElementSafely('div', { className: 'settings-section-title' }, this.t('pageWidthLabel')));
			// 启用页面加宽开关
			const enableWidthItem = createElementSafely('div', { className: 'setting-item' });
			const enableWidthInfo = createElementSafely('div', { className: 'setting-item-info' });
			enableWidthInfo.appendChild(createElementSafely('div', { className: 'setting-item-label' }, this.t('enablePageWidth')));
			enableWidthInfo.appendChild(createElementSafely('div', { className: 'setting-item-desc' }, this.t('pageWidthDesc')));
			const enableToggle = createElementSafely('div', {
				className: 'setting-toggle' + (this.settings.pageWidth && this.settings.pageWidth.enabled ? ' active' : ''),
				id: 'toggle-page-width'
			});
			enableToggle.addEventListener('click', () => {
				this.settings.pageWidth.enabled = !this.settings.pageWidth.enabled;
				enableToggle.classList.toggle('active', this.settings.pageWidth.enabled);
				this.saveSettings();
				// 应用宽度样式
				if (this.widthStyleManager) {
					this.widthStyleManager.updateConfig(this.settings.pageWidth);
				}
				this.showToast(this.settings.pageWidth.enabled ? this.t('settingOn') : this.t('settingOff'));
			});
			enableWidthItem.appendChild(enableWidthInfo);
			enableWidthItem.appendChild(enableToggle);
			widthSection.appendChild(enableWidthItem);
			// 宽度值和单位设置
			const widthValueItem = createElementSafely('div', { className: 'setting-item' });
			const widthValueInfo = createElementSafely('div', { className: 'setting-item-info' });
			widthValueInfo.appendChild(createElementSafely('div', { className: 'setting-item-label' }, this.t('widthValue')));

			const widthControls = createElementSafely('div', { className: 'setting-controls' });

			const widthInput = createElementSafely('input', {
				type: 'number',
				className: 'setting-select',
				id: 'width-value-input',
				value: this.settings.pageWidth ? this.settings.pageWidth.value : '70',
				style: 'width: 70px; text-align: right;'
			});

			const unitSelect = createElementSafely('select', {
				className: 'setting-select',
				id: 'width-unit-select',
				style: 'width: 65px;'
			});
			['%', 'px'].forEach(unit => {
				const option = createElementSafely('option', { value: unit }, unit);
				if (this.settings.pageWidth && this.settings.pageWidth.unit === unit) {
					option.selected = true;
				}
				unitSelect.appendChild(option);
			});

			// 限制值逻辑
			const validateAndSave = () => {
				let val = parseFloat(widthInput.value);
				const unit = unitSelect.value;

				if (unit === '%') {
					if (val > 100) val = 100;
					if (val < 10) val = 10; // 最小限制
				} else {
					if (val < 400) val = 400; // 像素最小限制
				}

				// 如果值被修正了，更新输入框
				if (val !== parseFloat(widthInput.value)) {
					widthInput.value = val;
				}

				this.settings.pageWidth.value = val.toString();
				this.settings.pageWidth.unit = unit;
				this.saveSettings();

				if (this.widthStyleManager) {
					this.widthStyleManager.updateConfig(this.settings.pageWidth);
				}
			};

			// 输入变化事件（防抖）
			let timeout;
			widthInput.addEventListener('input', () => {
				// 实时限制输入长度，避免太长
				if (widthInput.value.length > 5) widthInput.value = widthInput.value.slice(0, 5);

				// 实时限制百分比逻辑
				if (unitSelect.value === '%' && parseFloat(widthInput.value) > 100) {
					widthInput.value = '100';
				}

				clearTimeout(timeout);
				timeout = setTimeout(validateAndSave, 500);
			});

			widthInput.addEventListener('change', validateAndSave); // 失去焦点或回车立即保存

			unitSelect.addEventListener('change', () => {
				// 切换单位时，提供合理的默认转换或限制
				if (unitSelect.value === '%' && parseFloat(widthInput.value) > 100) {
					widthInput.value = '70'; // 切换到%时，默认给个舒服的宽度
				} else if (unitSelect.value === 'px' && parseFloat(widthInput.value) <= 100) {
					widthInput.value = '1200'; // 切换到px时，默认给个舒服的宽度
				}
				validateAndSave();
				this.showToast(`${this.t('widthValue')}: ${widthInput.value}${unitSelect.value}`);
			});

			widthControls.appendChild(widthInput);
			widthControls.appendChild(unitSelect);

			widthValueItem.appendChild(widthValueInfo);
			widthValueItem.appendChild(widthControls);
			widthSection.appendChild(widthValueItem);
			content.appendChild(generalSection);
			content.appendChild(widthSection);

			// 只在 Gemini Business 时添加清空输入框设置
			if (this.siteAdapter instanceof GeminiBusinessAdapter) {
				const clearItem = createElementSafely('div', { className: 'setting-item' });
				const clearInfo = createElementSafely('div', { className: 'setting-item-info' });
				clearInfo.appendChild(createElementSafely('div', { className: 'setting-item-label' }, this.t('clearOnSendLabel')));
				clearInfo.appendChild(createElementSafely('div', { className: 'setting-item-desc' }, this.t('clearOnSendDesc')));

				const toggle = createElementSafely('div', {
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
				generalSection.appendChild(clearItem);
			}

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

		// 滚动到页面顶部
		scrollToTop() {
			if (this.isScrolling) return;
			const scrollContainer = this.siteAdapter.getScrollContainer();
			if (scrollContainer) {
				this.isScrolling = true;
				scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
				// 锁定 1 秒禁止操作，防止焦点漂移
				setTimeout(() => { this.isScrolling = false; }, 1000);
			}
		}

		// 滚动到页面底部
		scrollToBottom() {
			if (this.isScrolling) return;
			const scrollContainer = this.siteAdapter.getScrollContainer();
			if (scrollContainer) {
				this.isScrolling = true;
				scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
				// 锁定 1 秒禁止操作
				setTimeout(() => { this.isScrolling = false; }, 1000);
			}
		}

		refreshCategories() {
			const container = document.getElementById('prompt-categories');
			if (!container) return;
			const categories = this.getCategories();
			clearElementSafely(container);
			container.appendChild(createElementSafely('span', { className: 'category-tag active', 'data-category': 'all' }, this.t('allCategory')));
			categories.forEach(cat => {
				container.appendChild(createElementSafely('span', { className: 'category-tag', 'data-category': cat }, cat));
			});
			// 添加分类管理按钮
			const manageBtn = createElementSafely('button', { className: 'category-manage-btn', title: this.t('categoryManage') }, this.t('manageCategory'));
			manageBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showCategoryModal();
			});
			container.appendChild(manageBtn);
		}

		// 显示分类管理弹窗
		showCategoryModal() {
			const categories = this.getCategories();
			const modal = createElementSafely('div', { className: 'prompt-modal' });
			const modalContent = createElementSafely('div', { className: 'prompt-modal-content category-modal-content' });

			const modalHeader = createElementSafely('div', { className: 'prompt-modal-header' }, this.t('categoryManage'));
			modalContent.appendChild(modalHeader);

			const categoryList = createElementSafely('div', { className: 'category-list' });

			if (categories.length === 0) {
				categoryList.appendChild(createElementSafely('div', { className: 'category-empty' }, this.t('categoryEmpty')));
			} else {
				categories.forEach(cat => {
					const count = this.prompts.filter(p => p.category === cat).length;
					const item = createElementSafely('div', { className: 'category-item' });

					const info = createElementSafely('div', { className: 'category-item-info' });
					info.appendChild(createElementSafely('span', { className: 'category-item-name' }, cat));
					info.appendChild(createElementSafely('span', { className: 'category-item-count' }, `${count} 个提示词`));

					const actions = createElementSafely('div', { className: 'category-item-actions' });
					const renameBtn = createElementSafely('button', { className: 'category-action-btn rename' }, this.t('rename'));
					const deleteBtn = createElementSafely('button', { className: 'category-action-btn delete' }, this.t('delete'));

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

			const btnGroup = createElementSafely('div', { className: 'prompt-modal-btns' });
			const closeBtn = createElementSafely('button', { className: 'prompt-modal-btn secondary' }, this.t('cancel'));
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

			clearElementSafely(container);

			if (filteredPrompts.length === 0) {
				container.appendChild(createElementSafely('div', { style: 'text-align: center; padding: 20px; color: #9ca3af;' }, '暂无提示词'));
				return;
			}

			filteredPrompts.forEach((prompt, index) => {
				const item = createElementSafely('div', { className: 'prompt-item', draggable: 'false', style: 'user-select: none;' });
				item.dataset.promptId = prompt.id;
				item.dataset.index = index;
				if (this.selectedPrompt?.id === prompt.id) item.classList.add('selected');

				const itemHeader = createElementSafely('div', { className: 'prompt-item-header' });
				itemHeader.appendChild(createElementSafely('div', { className: 'prompt-item-title' }, prompt.title));
				itemHeader.appendChild(createElementSafely('span', { className: 'prompt-item-category' }, prompt.category || '未分类'));

				const itemContent = createElementSafely('div', { className: 'prompt-item-content' }, prompt.content);
				const itemActions = createElementSafely('div', { className: 'prompt-item-actions' });
				const dragBtn = createElementSafely('button', { className: 'prompt-action-btn drag-prompt', 'data-id': prompt.id, title: '拖动排序' }, '☰');
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
				itemActions.appendChild(createElementSafely('button', { className: 'prompt-action-btn copy-prompt', 'data-id': prompt.id, title: '复制' }, '📋'));
				itemActions.appendChild(createElementSafely('button', { className: 'prompt-action-btn edit-prompt', 'data-id': prompt.id, title: '编辑' }, '✏'));
				itemActions.appendChild(createElementSafely('button', { className: 'prompt-action-btn delete-prompt', 'data-id': prompt.id, title: '删除' }, '🗑'));

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
			const modal = createElementSafely('div', { className: 'prompt-modal' });
			const modalContent = createElementSafely('div', { className: 'prompt-modal-content' });

			const modalHeader = createElementSafely('div', { className: 'prompt-modal-header' }, isEdit ? this.t('editPrompt') : this.t('addNewPrompt'));

			const titleGroup = createElementSafely('div', { className: 'prompt-form-group' });
			titleGroup.appendChild(createElementSafely('label', { className: 'prompt-form-label' }, this.t('title')));
			const titleInput = createElementSafely('input', { className: 'prompt-form-input', type: 'text', value: isEdit ? prompt.title : '' });
			titleGroup.appendChild(titleInput);

			const categoryGroup = createElementSafely('div', { className: 'prompt-form-group' });
			categoryGroup.appendChild(createElementSafely('label', { className: 'prompt-form-label' }, this.t('category')));
			const categoryInput = createElementSafely('input', { className: 'prompt-form-input', type: 'text', value: isEdit ? (prompt.category || '') : '', placeholder: this.t('categoryPlaceholder') });
			categoryGroup.appendChild(categoryInput);

			const contentGroup = createElementSafely('div', { className: 'prompt-form-group' });
			contentGroup.appendChild(createElementSafely('label', { className: 'prompt-form-label' }, this.t('content')));
			const contentTextarea = createElementSafely('textarea', { className: 'prompt-form-textarea' });
			contentTextarea.value = isEdit ? prompt.content : '';
			contentGroup.appendChild(contentTextarea);

			const modalActions = createElementSafely('div', { className: 'prompt-modal-actions' });
			const cancelBtn = createElementSafely('button', { className: 'prompt-modal-btn secondary' }, this.t('cancel'));
			const saveBtn = createElementSafely('button', { className: 'prompt-modal-btn primary' }, isEdit ? this.t('save') : this.t('add'));

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
			const toast = createElementSafely('div', { className: 'prompt-toast' }, message);
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

			document.getElementById('refresh-prompts')?.addEventListener('click', () => {
				this.refreshPromptList();
				this.siteAdapter.findTextarea();
				this.showToast(this.t('refreshed'));
			});

			document.getElementById('toggle-panel')?.addEventListener('click', () => this.togglePanel());
			this.makeDraggable();

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
					// 针对 Gemini Business 适配器，根据设置决定是否调用 clearTextarea 修复中文输入问题
					if (this.siteAdapter instanceof GeminiBusinessAdapter && this.settings.clearTextareaOnSend) {
						setTimeout(() => { this.siteAdapter.clearTextarea(); }, 200);
					}
				}
			});

			// 监听 Enter 键发送（Ctrl+Enter 或直接 Enter），兼容 Shadow DOM：从事件传播路径查找真实输入元素
			document.addEventListener('keydown', (e) => {
				// 只在按下 Enter（非 Shift+Enter）时处理
				if (!(e.key === 'Enter' && !e.shiftKey)) return;

				// 获取事件传播路径，兼容 composedPath 或 e.path
				const path = typeof e.composedPath === 'function' ? e.composedPath() : (e.path || [e.target]);
				let foundEditor = null;
				for (const node of path) {
					if (!node || !(node instanceof Element)) continue;

					// 严格判定：先检查显式的可编辑特征（contenteditable / role=textbox / ProseMirror / TEXTAREA）
					try {
						const isStrictEditable = (
							(typeof node.getAttribute === 'function' && node.getAttribute('contenteditable') === 'true') ||
							(typeof node.getAttribute === 'function' && node.getAttribute('role') === 'textbox') ||
							(node.classList && node.classList.contains && node.classList.contains('ProseMirror')) ||
							(node.tagName === 'TEXTAREA')
						);
						if (isStrictEditable) {
							foundEditor = node;
							break;
						}
					} catch (err) {
						// 忽略检测错误，继续后续判定
					}

					// 次级判定：调用适配器的 isValidTextarea（适配器可能有更严格或特殊逻辑）
					try {
						if (this.siteAdapter.isValidTextarea(node)) {
							foundEditor = node;
							break;
						}
					} catch (err) {
						// 忽略 isValidTextarea 抛出的意外错误
					}

					// 最后的兜底：检查常见选择器匹配
					try {
						if (node.matches && node.matches('[contenteditable="true"], .ProseMirror, textarea')) {
							foundEditor = node;
							break;
						}
					} catch (err) {
						// 忽略 matches 抛出的错误
					}
				}

				if (foundEditor) {
					// 更新适配器的 textarea 引用，防止后续操作找不到元素
					try { this.siteAdapter.textarea = foundEditor; } catch (err) { /* 忽略 */ }
					// 如果有选中的提示词，清除悬浮条
					if (this.selectedPrompt) {
						setTimeout(() => { this.clearSelectedPrompt(); }, 100);
					}
					// 针对 Gemini Business 适配器，根据设置决定是否调用 clearTextarea 修复中文输入问题
					if (this.siteAdapter instanceof GeminiBusinessAdapter && this.settings.clearTextareaOnSend) {
						setTimeout(() => { this.siteAdapter.clearTextarea(); }, 200);
					}
				}
			});
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
				new GeminiHelper(currentAdapter);
			} catch (error) {
				console.error('Gemini Helper 启动失败', error);
			}
		}, 2000);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
