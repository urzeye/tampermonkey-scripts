// ==UserScript==
// @name         gemini-helper
// @namespace    http://tampermonkey.net/
// @version      1.5.3
// @description  为 Gemini、Gemini Enterprise 增加提示词管理功能，支持增删改查和快速插入；支持快速到页面顶部、底部
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
	if (window.promptManagerInitialized) {
		return;
	}
	window.promptManagerInitialized = true;

	// 默认提示词库
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
		 * 返回输入框选择器列表
		 * @returns {string[]}
		 */
		getTextareaSelectors() { return []; }

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
	}

	/**
	 * Gemini 适配器（gemini.google.com）
	 */
	class GeminiAdapter extends SiteAdapter {
		match() {
			return window.location.hostname.includes('gemini.google') &&
				!window.location.hostname.includes('business.gemini.google');
		}

		getName() { return 'Gemini'; }

		getThemeColors() {
			return { primary: '#4285f4', secondary: '#34a853' };
		}

		getTextareaSelectors() {
			return [
				'div[contenteditable="true"].ql-editor',
				'div[contenteditable="true"]',
				'[role="textbox"]',
				'[aria-label*="Enter a prompt"]'
			];
		}

		isValidTextarea(element) {
			// 必须是可见的 contenteditable 元素
			if (element.offsetParent === null) return false;
			const isContentEditable = element.getAttribute('contenteditable') === 'true';
			const isTextbox = element.getAttribute('role') === 'textbox';
			// 排除脚本自身的 UI
			if (element.closest('#universal-prompt-panel')) return false;

			return (isContentEditable || isTextbox) || element.classList.contains('ql-editor');
		}

		insertPrompt(content) {
			const editor = this.textarea;
			if (!editor) return false;

			editor.focus();
			try {
				// 先全选
				document.execCommand('selectAll', false, null);

				// 【关键 Trick】插入一个空格来“替换”旧内容
				// 直接 delete 会破坏 DOM 结构导致多行失效
				// 用 insertText 插入空格，既清空了旧文，又保留了段落标签 <p>
				document.execCommand('insertText', false, ' ');

				// 再次全选（为了选中刚才那个空格，准备覆盖它）
				// 如果不加这步，提示词前面会多一个空格
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

		getName() { return 'Enterprise'; }

		getThemeColors() {
			return { primary: '#4285f4', secondary: '#34a853' };
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

		isValidTextarea(element) {
			// 排除搜索框
			if (element.type === 'search') return false;
			if (element.classList.contains('main-input')) return false;
			if (element.getAttribute('aria-label')?.includes('搜索')) return false;
			if (element.placeholder?.includes('搜索')) return false;
			// 排除脚本自己的 UI
			if (element.classList.contains('prompt-search-input')) return false;
			if (element.id === 'prompt-search') return false;
			if (element.closest('#universal-prompt-panel')) return false;

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
							// 插入空格替换旧内容
							document.execCommand('insertText', false, ' ');
							// 再次全选
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
				document.execCommand('delete', false, null);
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

		getName() { return 'Genspark'; }

		getThemeColors() {
			return { primary: '#667eea', secondary: '#764ba2' };
		}

		getTextareaSelectors() {
			return [
				'textarea[name="query"]',
				'textarea.search-input',
				'.textarea-wrapper textarea',
				'textarea[placeholder*="Message"]'
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

	// 提示词管理类
	class UniversalPromptManager {
		constructor(siteAdapter) {
			this.prompts = this.loadPrompts();
			this.selectedPrompt = null;
			this.isCollapsed = false;
			this.siteAdapter = siteAdapter;
			this.isScrolling = false; // 滚动状态锁
			this.init();
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
		}

		createStyles() {
			const existingStyle = document.getElementById('universal-prompt-manager-styles');
			if (existingStyle) existingStyle.remove();

			const colors = this.siteAdapter.getThemeColors();
			const gradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;

			const style = document.createElement('style');
			style.id = 'universal-prompt-manager-styles';
			style.textContent = `
                /* 主面板样式 */
                #universal-prompt-panel {
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
                #universal-prompt-panel.collapsed { display: none; }
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
            `;
			document.head.appendChild(style);
		}

		createUI() {
			const existingPanel = document.getElementById('universal-prompt-panel');
			const existingBar = document.querySelector('.selected-prompt-bar');
			const existingBtn = document.querySelector('.quick-prompt-btn');

			if (existingPanel) existingPanel.remove();
			if (existingBar) existingBar.remove();
			if (existingBtn) existingBtn.remove();

			const panel = createElementSafely('div', { id: 'universal-prompt-panel' });
			const header = createElementSafely('div', { className: 'prompt-panel-header' });
			const title = createElementSafely('div', { className: 'prompt-panel-title' });
			title.appendChild(createElementSafely('span', {}, '📝'));
			title.appendChild(createElementSafely('span', {}, '提示词管理'));
			title.appendChild(createElementSafely('span', { className: 'site-indicator' }, this.siteAdapter.getName()));

			const controls = createElementSafely('div', { className: 'prompt-panel-controls' });
			const refreshBtn = createElementSafely('button', { className: 'prompt-panel-btn', id: 'refresh-prompts', title: '刷新' }, '⟳');
			const toggleBtn = createElementSafely('button', { className: 'prompt-panel-btn', id: 'toggle-panel', title: '收起' }, '−');
			controls.appendChild(refreshBtn);
			controls.appendChild(toggleBtn);

			header.appendChild(title);
			header.appendChild(controls);

			const searchBar = createElementSafely('div', { className: 'prompt-search-bar' });
			const searchInput = createElementSafely('input', { className: 'prompt-search-input', id: 'prompt-search', type: 'text', placeholder: '搜索提示词...' });
			searchBar.appendChild(searchInput);

			const categories = createElementSafely('div', { className: 'prompt-categories', id: 'prompt-categories' });
			const list = createElementSafely('div', { className: 'prompt-list', id: 'prompt-list' });

			const addBtn = createElementSafely('button', { className: 'add-prompt-btn', id: 'add-prompt' });
			addBtn.appendChild(createElementSafely('span', {}, '+'));
			addBtn.appendChild(createElementSafely('span', {}, '添加新提示词'));

			panel.appendChild(header);
			panel.appendChild(searchBar);
			panel.appendChild(categories);
			panel.appendChild(list);
			panel.appendChild(addBtn);

			document.body.appendChild(panel);

			const selectedBar = createElementSafely('div', { className: 'selected-prompt-bar', style: 'user-select: none;' });
			selectedBar.appendChild(createElementSafely('span', { style: 'user-select: none;' }, '当前提示词：'));
			selectedBar.appendChild(createElementSafely('span', { className: 'selected-prompt-text', id: 'selected-prompt-text', style: 'user-select: none;' }));
			const clearBtn = createElementSafely('button', { className: 'clear-prompt-btn', id: 'clear-prompt' }, '×');
			selectedBar.appendChild(clearBtn);
			document.body.appendChild(selectedBar);

			// 快捷按钮组（收起时显示）
			const quickBtnGroup = createElementSafely('div', { className: 'quick-btn-group hidden', id: 'quick-btn-group' });
			const quickBtn = createElementSafely('button', { className: 'quick-prompt-btn', title: '打开提示词管理器' }, '📝');
			const quickScrollTop = createElementSafely('button', { className: 'quick-prompt-btn', title: '跳转到顶部' }, '⬆');
			const quickScrollBottom = createElementSafely('button', { className: 'quick-prompt-btn', title: '跳转到底部' }, '⬇');
			quickBtn.addEventListener('click', () => { this.togglePanel(); });
			quickScrollTop.addEventListener('click', () => this.scrollToTop());
			quickScrollBottom.addEventListener('click', () => this.scrollToBottom());
			quickBtnGroup.appendChild(quickScrollTop);
			quickBtnGroup.appendChild(quickBtn);
			quickBtnGroup.appendChild(quickScrollBottom);
			document.body.appendChild(quickBtnGroup);

			// 快捷跳转按钮组 - 放在面板底部
			const scrollNavContainer = createElementSafely('div', { className: 'scroll-nav-container', id: 'scroll-nav-container' });
			const scrollTopBtn = createElementSafely('button', { className: 'scroll-nav-btn', id: 'scroll-top-btn', title: '跳转到顶部' });
			scrollTopBtn.appendChild(createElementSafely('span', {}, '⬆'));
			scrollTopBtn.appendChild(createElementSafely('span', {}, '顶部'));
			const scrollBottomBtn = createElementSafely('button', { className: 'scroll-nav-btn', id: 'scroll-bottom-btn', title: '跳转到底部' });
			scrollBottomBtn.appendChild(createElementSafely('span', {}, '⬇'));
			scrollBottomBtn.appendChild(createElementSafely('span', {}, '底部'));
			scrollTopBtn.addEventListener('click', () => this.scrollToTop());
			scrollBottomBtn.addEventListener('click', () => this.scrollToBottom());
			scrollNavContainer.appendChild(scrollTopBtn);
			scrollNavContainer.appendChild(scrollBottomBtn);
			panel.appendChild(scrollNavContainer);

			this.refreshCategories();
			this.refreshPromptList();
		}

		togglePanel() {
			const panel = document.getElementById('universal-prompt-panel');
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
			container.appendChild(createElementSafely('span', { className: 'category-tag active', 'data-category': 'all' }, '全部'));
			categories.forEach(cat => {
				container.appendChild(createElementSafely('span', { className: 'category-tag', 'data-category': cat }, cat));
			});
			// 添加分类管理按钮
			const manageBtn = createElementSafely('button', { className: 'category-manage-btn', title: '管理分类' }, '⚙ 管理');
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

			const modalHeader = createElementSafely('div', { className: 'prompt-modal-header' }, '分类管理');
			modalContent.appendChild(modalHeader);

			const categoryList = createElementSafely('div', { className: 'category-list' });

			if (categories.length === 0) {
				categoryList.appendChild(createElementSafely('div', { className: 'category-empty' }, '暂无分类，添加提示词时会自动创建分类'));
			} else {
				categories.forEach(cat => {
					const count = this.prompts.filter(p => p.category === cat).length;
					const item = createElementSafely('div', { className: 'category-item' });

					const info = createElementSafely('div', { className: 'category-item-info' });
					info.appendChild(createElementSafely('span', { className: 'category-item-name' }, cat));
					info.appendChild(createElementSafely('span', { className: 'category-item-count' }, `${count} 个提示词`));

					const actions = createElementSafely('div', { className: 'category-item-actions' });
					const renameBtn = createElementSafely('button', { className: 'category-action-btn rename' }, '重命名');
					const deleteBtn = createElementSafely('button', { className: 'category-action-btn delete' }, '删除');

					renameBtn.addEventListener('click', () => {
						const newName = prompt('请输入新的分类名称：', cat);
						if (newName && newName.trim() && newName !== cat) {
							this.renameCategory(cat, newName.trim());
							modal.remove();
							this.showCategoryModal();
						}
					});

					deleteBtn.addEventListener('click', () => {
						if (confirm(`确定要删除分类"${cat}"吗？\n该分类下的 ${count} 个提示词将被移至"未分类"。`)) {
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
			const closeBtn = createElementSafely('button', { className: 'prompt-modal-btn secondary' }, '关闭');
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
			this.showToast('已更新排序');
		}

		selectPrompt(prompt, itemElement) {
			if (this.isScrolling) {
				this.showToast('页面正在滚动，请稍后...');
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
			this.showToast(`已插入提示词: ${prompt.title}`);
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

			const modalHeader = createElementSafely('div', { className: 'prompt-modal-header' }, isEdit ? '编辑提示词' : '添加新提示词');

			const titleGroup = createElementSafely('div', { className: 'prompt-form-group' });
			titleGroup.appendChild(createElementSafely('label', { className: 'prompt-form-label' }, '标题'));
			const titleInput = createElementSafely('input', { className: 'prompt-form-input', type: 'text', value: isEdit ? prompt.title : '' });
			titleGroup.appendChild(titleInput);

			const categoryGroup = createElementSafely('div', { className: 'prompt-form-group' });
			categoryGroup.appendChild(createElementSafely('label', { className: 'prompt-form-label' }, '分类'));
			const categoryInput = createElementSafely('input', { className: 'prompt-form-input', type: 'text', value: isEdit ? (prompt.category || '') : '', placeholder: '例如：编程、翻译' });
			categoryGroup.appendChild(categoryInput);

			const contentGroup = createElementSafely('div', { className: 'prompt-form-group' });
			contentGroup.appendChild(createElementSafely('label', { className: 'prompt-form-label' }, '提示词内容'));
			const contentTextarea = createElementSafely('textarea', { className: 'prompt-form-textarea' });
			contentTextarea.value = isEdit ? prompt.content : '';
			contentGroup.appendChild(contentTextarea);

			const modalActions = createElementSafely('div', { className: 'prompt-modal-actions' });
			const cancelBtn = createElementSafely('button', { className: 'prompt-modal-btn secondary' }, '取消');
			const saveBtn = createElementSafely('button', { className: 'prompt-modal-btn primary' }, isEdit ? '保存' : '添加');

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
				if (!title || !content) { alert('请填写标题和内容'); return; }

				if (isEdit) {
					this.updatePrompt(prompt.id, { title, category: categoryInput.value.trim(), content });
					this.showToast('提示词已更新');
				} else {
					this.addPrompt({ title, category: categoryInput.value.trim(), content });
					this.showToast('提示词已添加');
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
					if (confirm('确定删除?')) {
						this.deletePrompt(e.target.dataset.id);
						this.showToast('已删除');
					}
				} else if (e.target.classList.contains('copy-prompt')) {
					const prompt = this.prompts.find(p => p.id === e.target.dataset.id);
					if (prompt) {
						navigator.clipboard.writeText(prompt.content).then(() => {
							this.showToast('已复制到剪贴板');
						}).catch(() => {
							// 降级方案
							const textarea = document.createElement('textarea');
							textarea.value = prompt.content;
							document.body.appendChild(textarea);
							textarea.select();
							document.execCommand('copy');
							document.body.removeChild(textarea);
							this.showToast('已复制到剪贴板');
						});
					}
				}
			});

			document.getElementById('clear-prompt')?.addEventListener('click', () => {
				this.clearSelectedPrompt();
				this.siteAdapter.clearTextarea();
				this.showToast('已清除内容');
			});

			document.getElementById('refresh-prompts')?.addEventListener('click', () => {
				this.refreshPromptList();
				this.siteAdapter.findTextarea();
				this.showToast('已刷新');
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

				// 监听发送按钮点击，自动隐藏悬浮条
				if (this.selectedPrompt && e.target.closest('button[aria-label*="Send"], button[aria-label*="发送"], .send-button, [data-testid*="send"]')) {
					setTimeout(() => this.clearSelectedPrompt(), 100);
				}
			});

			// 监听 Enter 键发送（Ctrl+Enter 或直接 Enter）
			document.addEventListener('keydown', (e) => {
				if (this.selectedPrompt && e.key === 'Enter' && !e.shiftKey) {
					// 检查是否在输入框内
					if (this.siteAdapter.isValidTextarea(e.target) || e.target.closest('[contenteditable="true"]')) {
						setTimeout(() => this.clearSelectedPrompt(), 100);
					}
				}
			});
		}

		makeDraggable() {
			const panel = document.getElementById('universal-prompt-panel');
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
				new UniversalPromptManager(currentAdapter);
			} catch (error) {
				console.error('提示词管理器启动失败', error);
			}
		}, 2000);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
