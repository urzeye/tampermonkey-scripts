// ==UserScript==
// @name         gemini-helper
// @namespace    http://tampermonkey.net/
// @version      1.4.2
// @description  为 Gemini、Gemini Enterprise 增加提示词管理功能，支持增删改查和快速插入；支持快速到页面顶部、底部
// @author       urzeye
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

	// 检测当前网站
	const isGeminiBusiness = window.location.hostname.includes('business.gemini.google');
	const isGemini = window.location.hostname.includes('gemini.google') && !isGeminiBusiness;
	const isAnyGemini = isGemini || isGeminiBusiness; // 用于样式和通用逻辑
	const isGenspark = window.location.hostname.includes('genspark.ai');

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
		constructor() {
			this.prompts = this.loadPrompts();
			this.selectedPrompt = null;
			this.textarea = null;
			this.isCollapsed = false;
			this.site = isGeminiBusiness ? 'gemini-business' : (isGemini ? 'gemini' : 'genspark');
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
			this.findTextarea();
		}

		createStyles() {
			const existingStyle = document.getElementById('universal-prompt-manager-styles');
			if (existingStyle) existingStyle.remove();

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
                    background: ${isAnyGemini ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
                    color: white;
                    border-radius: 12px 12px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
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
                .prompt-search-input:focus { outline: none; border-color: ${isAnyGemini ? '#4285f4' : '#667eea'}; }
                .prompt-categories { padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap; background: white; border-bottom: 1px solid #e5e7eb; }
                .category-tag {
                    padding: 4px 10px; background: #f3f4f6; border-radius: 12px; font-size: 12px; color: #4b5563;
                    cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
                }
                .category-tag:hover { background: #e5e7eb; }
                .category-tag.active {
                    background: ${isAnyGemini ? '#4285f4' : '#667eea'}; color: white; border-color: ${isAnyGemini ? '#4285f4' : '#667eea'};
                }
                .prompt-list { flex: 1; overflow-y: auto; padding: 8px; }
                .prompt-item {
                    background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px;
                    cursor: pointer; transition: all 0.2s; position: relative;
                }
                .prompt-item:hover {
                    border-color: ${isAnyGemini ? '#4285f4' : '#667eea'};
                    box-shadow: 0 4px 12px ${isAnyGemini ? 'rgba(66,133,244,0.15)' : 'rgba(102,126,234,0.15)'};
                    transform: translateY(-2px);
                }
                .prompt-item.selected {
                    background: ${isAnyGemini ? 'linear-gradient(135deg, #e8f0fe 0%, #f1f8e9 100%)' : 'linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%)'};
                    border-color: ${isAnyGemini ? '#4285f4' : '#667eea'};
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
                    margin: 12px; padding: 10px; background: ${isAnyGemini ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
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
                .prompt-form-input:focus, .prompt-form-textarea:focus { outline: none; border-color: ${isAnyGemini ? '#4285f4' : '#667eea'}; }
                .prompt-modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
                .prompt-modal-btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; }
                .prompt-modal-btn.primary { background: ${isAnyGemini ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color: white; }
                .prompt-modal-btn.secondary { background: #f3f4f6; color: #4b5563; }
                /* 选中的提示词显示栏 */
                .selected-prompt-bar {
                    position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
                    background: ${isAnyGemini ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
                    color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; display: none;
                    align-items: center; gap: 8px; box-shadow: 0 4px 12px ${isAnyGemini ? 'rgba(66,133,244,0.3)' : 'rgba(102,126,234,0.3)'};
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
                    background: ${isAnyGemini ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;
                    font-size: 18px; cursor: pointer; box-shadow: 0 4px 12px ${isAnyGemini ? 'rgba(66,133,244,0.3)' : 'rgba(102,126,234,0.3)'};
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
                    background: ${isAnyGemini ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
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
			title.appendChild(createElementSafely('span', { className: 'site-indicator' }, isGeminiBusiness ? 'Enterprise' : (isGemini ? 'Gemini' : 'Genspark')));

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

			const selectedBar = createElementSafely('div', { className: 'selected-prompt-bar' });
			selectedBar.appendChild(createElementSafely('span', {}, '当前提示词：'));
			selectedBar.appendChild(createElementSafely('span', { className: 'selected-prompt-text', id: 'selected-prompt-text' }));
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
			const scrollContainer = this.getScrollContainer();
			scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
		}

		// 滚动到页面底部
		scrollToBottom() {
			const scrollContainer = this.getScrollContainer();
			scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
		}

		// 获取滚动容器（Gemini 页面可能使用自定义滚动容器或 Shadow DOM）
		getScrollContainer() {
			// 优先查找 Shadow DOM 中的滚动容器（Gemini Business）
			const scrollContainerFromShadow = this.findScrollContainerInShadowDOM(document);
			if (scrollContainerFromShadow) {
				return scrollContainerFromShadow;
			}

			// 尝试查找主文档中的滚动容器
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

			// 回退到 document.documentElement 或 body
			if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
				return document.documentElement;
			}
			return document.body;
		}

		// 在 Shadow DOM 中递归查找滚动容器
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
				const item = createElementSafely('div', { className: 'prompt-item', draggable: 'true' });
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
				itemActions.appendChild(dragBtn);
				itemActions.appendChild(createElementSafely('button', { className: 'prompt-action-btn copy-prompt', 'data-id': prompt.id, title: '复制' }, '📋'));
				itemActions.appendChild(createElementSafely('button', { className: 'prompt-action-btn edit-prompt', 'data-id': prompt.id, title: '编辑' }, '✏'));
				itemActions.appendChild(createElementSafely('button', { className: 'prompt-action-btn delete-prompt', 'data-id': prompt.id, title: '删除' }, '🗑'));

				item.appendChild(itemHeader);
				item.appendChild(itemContent);
				item.appendChild(itemActions);
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
			// 对于商业版，使用异步查找机制
			if (isGeminiBusiness) {
				this.findAndInsertForBusiness(promptContent);
				return;
			}

			if (!this.textarea || !document.body.contains(this.textarea)) {
				this.findTextarea();
			}

			if (this.textarea) {
				if (isGemini) {
					this.insertToGemini(promptContent);
				} else {
					this.insertToGenspark(promptContent);
				}
			} else {
				this.showToast('未找到输入框，请点击输入框后重试');
				this.findTextarea();
			}
		}

		// 商业版专用：异步查找并插入（支持 Shadow DOM）
		findAndInsertForBusiness(promptContent) {
			// 精确的选择器，优先级从高到低
			const selectors = [
				'div.ProseMirror',
				'.ProseMirror',
				'[contenteditable="true"]:not([type="search"])',
				'[role="textbox"]',
				'textarea:not([type="search"])'
			];

			// 判断是否为有效的聊天输入框（排除搜索框等）
			const isValidChatInput = (element) => {
				// 排除搜索框
				if (element.type === 'search') return false;
				if (element.classList.contains('main-input')) return false;
				if (element.getAttribute('aria-label')?.includes('搜索')) return false;
				if (element.placeholder?.includes('搜索')) return false;
				// 排除脚本自己的 UI
				if (element.classList.contains('prompt-search-input')) return false;
				if (element.id === 'prompt-search') return false;
				return true;
			};

			// 递归搜索 Shadow DOM 的函数
			const searchInShadowDOM = (root, depth = 0) => {
				if (depth > 15) return null; // 防止无限递归

				// 只在 Shadow Root 中搜索选择器（跳过主文档以避免匹配脚本 UI）
				if (root !== document) {
					for (const selector of selectors) {
						try {
							const elements = root.querySelectorAll(selector);
							for (const element of elements) {
								if (isValidChatInput(element)) {
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
						const found = searchInShadowDOM(el.shadowRoot, depth + 1);
						if (found) return found;
					}
				}

				return null;
			};

			// 尝试查找元素
			const tryFind = () => searchInShadowDOM(document);

			let element = tryFind();

			if (element) {
				this.textarea = element;
				this.insertToGeminiBusiness(promptContent);
			} else {
				// 轮询等待元素出现
				this.showToast('正在等待输入框加载...');
				let attempts = 0;
				const maxAttempts = 15;
				const checkInterval = setInterval(() => {
					attempts++;
					element = tryFind();
					if (element) {
						clearInterval(checkInterval);
						this.textarea = element;
						this.insertToGeminiBusiness(promptContent);
					} else if (attempts >= maxAttempts) {
						clearInterval(checkInterval);
						this.showToast('未找到输入框，请手动点击输入框后重试');
					}
				}, 500);
			}
		}

		insertToGemini(promptContent) {
			const editor = this.textarea;
			editor.focus();
			try {
				const success = document.execCommand('insertText', false, promptContent);
				if (!success) {
					throw new Error('execCommand returned false');
				}
			} catch (e) {
				const currentContent = editor.textContent;
				editor.textContent = currentContent + promptContent;
				editor.dispatchEvent(new Event('input', { bubbles: true }));
				editor.dispatchEvent(new Event('change', { bubbles: true }));
			}
		}

		// Gemini 商业版使用 ProseMirror 编辑器
		insertToGeminiBusiness(promptContent) {
			const editor = this.textarea;
			editor.click();
			editor.focus();

			// 等待一小段时间后尝试插入
			setTimeout(() => {
				try {
					// 尝试使用 execCommand
					const success = document.execCommand('insertText', false, promptContent);
					if (!success) {
						throw new Error('execCommand returned false');
					}
				} catch (e) {

					// 方法2: 直接操作 DOM
					// 查找或创建 p 元素
					let p = editor.querySelector('p');
					if (!p) {
						p = document.createElement('p');
						editor.appendChild(p);
					}

					// 清空占位符文本
					const placeholderTexts = ['您要在网上查找什么信息', '输入提示', 'Enter a prompt'];
					const currentText = editor.textContent || '';
					const hasPlaceholder = placeholderTexts.some(ph => currentText.includes(ph));

					if (hasPlaceholder || currentText.trim() === '') {
						p.textContent = promptContent;
					} else {
						p.textContent = currentText + promptContent;
					}

					// 触发各种事件以通知 ProseMirror 更新
					const inputEvent = new InputEvent('input', {
						bubbles: true,
						cancelable: true,
						inputType: 'insertText',
						data: promptContent
					});
					editor.dispatchEvent(inputEvent);
					editor.dispatchEvent(new Event('change', { bubbles: true }));

					// 尝试触发 keyup 事件
					editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
				}
			}, 100);
		}

		insertToGenspark(promptContent) {
			const textarea = this.textarea;
			const currentContent = textarea.value.trim();
			textarea.value = currentContent ? (promptContent + '\n\n' + currentContent) : (promptContent + '\n\n');
			this.adjustTextareaHeight();
			textarea.dispatchEvent(new Event('input', { bubbles: true }));
			textarea.focus();
		}

		adjustTextareaHeight() {
			if (this.textarea && isGenspark) {
				this.textarea.style.height = 'auto';
				this.textarea.style.height = Math.min(this.textarea.scrollHeight, 200) + 'px';
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

		findTextarea() {
			let selectors = [];
			if (isGeminiBusiness) {
				// Gemini 商业版使用 ProseMirror 编辑器
				selectors = [
					'div.ProseMirror[contenteditable="true"]',
					'div.ProseMirror',
					'[role="textbox"]',
					'div[contenteditable="true"]'
				];
			} else if (isGemini) {
				// 普通 Gemini 使用 Quill 编辑器
				selectors = [
					'div[contenteditable="true"].ql-editor',
					'div[contenteditable="true"]',
					'[role="textbox"]',
					'[aria-label*="Enter a prompt"]'
				];
			} else {
				selectors = [
					'textarea[name="query"]',
					'textarea.search-input',
					'.textarea-wrapper textarea',
					'textarea[placeholder*="Message"]'
				];
			}

			for (const selector of selectors) {
				const elements = document.querySelectorAll(selector);
				for (const element of elements) {
					const isVisible = element.offsetParent !== null ||
						element.classList.contains('ProseMirror') ||
						selector.includes('ProseMirror');
					if (isVisible) {
						this.textarea = element;
						if (isGenspark) {
							this.textarea.addEventListener('input', () => this.adjustTextareaHeight());
						}
						return true;
					}
				}
			}

			setTimeout(() => this.findTextarea(), 1500);
			return false;
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
							// 降级方案：使用旧方法
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
				if (this.textarea) {
					if (isAnyGemini) {
						this.textarea.focus();
						document.execCommand('selectAll', false, null);
						document.execCommand('delete', false, null);
					} else {
						this.textarea.value = '';
						this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
					}
				}
				this.showToast('已清除内容');
			});

			document.getElementById('refresh-prompts')?.addEventListener('click', () => {
				this.refreshPromptList();
				this.findTextarea();
				this.showToast('已刷新');
			});

			document.getElementById('toggle-panel')?.addEventListener('click', () => this.togglePanel());
			this.makeDraggable();

			document.addEventListener('click', (e) => {
				// 支持普通 Gemini 和商业版的点击检测
				if (isAnyGemini && (e.target.getAttribute('contenteditable') === 'true' || e.target.closest('.ProseMirror'))) {
					const editor = e.target.closest('.ProseMirror') || e.target;
					if (editor.getAttribute('contenteditable') === 'true' || editor.classList.contains('ProseMirror')) {
						this.textarea = editor;
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
					const inEditor = e.target.getAttribute('contenteditable') === 'true' ||
						e.target.closest('.ProseMirror') ||
						e.target.tagName === 'TEXTAREA';
					if (inEditor) {
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
				initialX = e.clientX - xOffset;
				initialY = e.clientY - yOffset;
				isDragging = true;
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

			document.addEventListener('mouseup', () => { isDragging = false; });
		}
	}

	function init() {
		setTimeout(() => {
			try {
				new UniversalPromptManager();
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