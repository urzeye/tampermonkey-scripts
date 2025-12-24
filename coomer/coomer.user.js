// ==UserScript==
// @name         Coomer 佬友严选
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  OnlyFans 赛博菩萨，佬友严选，值得信赖！艺术家收藏、作品管理、Video.js 增强播放（快进/倍速/自动全屏），去广告适配
// @author       urzeye
// @match        https://coomer.st/*
// @icon         https://thumbs.onlyfans.com/public/files/thumbs/c50/m/mk/mka/mkamcrf6rjmcwo0jj4zoavhmalzohe5a1640180203/avatar.jpg
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_getResourceText
// @grant        window.onurlchange
// @resource     videojs_css https://cdnjs.cloudflare.com/ajax/libs/video.js/8.16.1/video-js.min.css
// @require      https://cdnjs.cloudflare.com/ajax/libs/video.js/8.16.1/video.min.js
// @require      https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.min.js
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ============================================
    // 常量与配置
    // ============================================
    const STORAGE_KEYS = {
        ARTISTS: 'coomer_artists',
        POSTS: 'coomer_posts',
        SETTINGS: 'coomer_settings',
    };

    const DEFAULT_SETTINGS = {
        autoFullscreen: true,
        blockAds: true,
        panelPosition: 'bottom-right',
        fabPosition: { right: 20, bottom: 80 },
        presetCollapsed: false, // 预置分组是否折叠
        myCollectionCollapsed: false, // 我的收藏分组是否折叠
    };

    // 预置艺术家列表（佬友严选）
    const PRESET_ARTISTS = [
        {
            id: 'thedirectortong',
            nickname: 'thedirectortong',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/thedirectortong',
            avatar: 'https://img.coomer.st/icons/onlyfans/thedirectortong',
        },
        {
            id: '347914002094895104',
            nickname: 'Thelittlejuicer',
            platform: 'Fansly',
            homepageUrl: 'https://coomer.st/fansly/user/347914002094895104',
            avatar: 'https://img.coomer.st/icons/fansly/347914002094895104',
        },
        {
            id: 'thelittlejuicer',
            nickname: 'thelittlejuicer',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/thelittlejuicer',
            avatar: 'https://img.coomer.st/icons/onlyfans/thelittlejuicer',
        },
        {
            id: 'applecptv',
            nickname: 'applecptv',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/applecptv',
            avatar: 'https://img.coomer.st/icons/onlyfans/applecptv',
        },
        {
            id: 'kimchi.couple',
            nickname: 'kimchi.couple',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/kimchi.couple',
            avatar: 'https://img.coomer.st/icons/onlyfans/kimchi.couple',
        },
        {
            id: '531599132742135808',
            nickname: 'candy_factory',
            platform: 'Fansly',
            homepageUrl: 'https://coomer.st/fansly/user/531599132742135808',
            avatar: 'https://img.coomer.st/icons/fansly/531599132742135808',
        },
        {
            id: 'chocoletmilkk',
            nickname: 'chocoletmilkk',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/chocoletmilkk',
            avatar: 'https://img.coomer.st/icons/onlyfans/chocoletmilkk',
        },
        {
            id: '504758618625683456',
            nickname: 'demifairytw',
            platform: 'Fansly',
            homepageUrl: 'https://coomer.st/fansly/user/504758618625683456',
            avatar: 'https://img.coomer.st/icons/fansly/504758618625683456',
        },
        {
            id: 'skylar_blue',
            nickname: 'skylar_blue',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/skylar_blue',
            avatar: 'https://img.coomer.st/icons/onlyfans/skylar_blue',
        },
        {
            id: 'yui_xin_tw',
            nickname: 'yui_xin_tw',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/yui_xin_tw',
            avatar: 'https://img.coomer.st/icons/onlyfans/yui_xin_tw',
        },
        {
            id: 'yuyuhwa',
            nickname: 'yuyuhwa',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/yuyuhwa',
            avatar: 'https://img.coomer.st/icons/onlyfans/yuyuhwa',
        },
        {
            id: 'xxapple',
            nickname: 'xxapple',
            platform: 'OnlyFans',
            homepageUrl: 'https://coomer.st/onlyfans/user/xxapple',
            avatar: 'https://img.coomer.st/icons/onlyfans/xxapple',
        },
    ];

    const DOM_SELECTORS = {
        // 艺术家页面
        artistAvatar: '.user-header__avatar img',
        artistName: '.user-header__profile span:nth-child(2)',
        artistPlatform: '.user-header__profile span:nth-child(3)',
        // 作品页面
        postTitle: '.post__content',
        postAttachment: 'a.post__attachment-link',
        postThumbnail: '.post__thumbnail img',
        // 视频播放器
        videoWrapper: '.fluid_video_wrapper',
        videoElement: 'video',
    };

    // URL 匹配规则
    const URL_PATTERNS = {
        // userId 匹配任何非斜杠字符
        artistPage: /^\/(\w+)\/user\/([^/]+)\/?$/,
        postPage: /^\/(\w+)\/user\/([^/]+)\/post\/([^/]+)\/?$/,
    };

    // ============================================
    // StorageManager - 数据持久化
    // ============================================
    const StorageManager = {
        get(key, defaultValue = null) {
            try {
                const data = GM_getValue(key);
                return data !== undefined ? JSON.parse(data) : defaultValue;
            } catch {
                return defaultValue;
            }
        },

        set(key, value) {
            GM_setValue(key, JSON.stringify(value));
        },

        getArtists() {
            return this.get(STORAGE_KEYS.ARTISTS, {});
        },

        setArtists(artists) {
            this.set(STORAGE_KEYS.ARTISTS, artists);
        },

        getPosts() {
            return this.get(STORAGE_KEYS.POSTS, {});
        },

        setPosts(posts) {
            this.set(STORAGE_KEYS.POSTS, posts);
        },

        getSettings() {
            return { ...DEFAULT_SETTINGS, ...this.get(STORAGE_KEYS.SETTINGS, {}) };
        },

        setSettings(settings) {
            this.set(STORAGE_KEYS.SETTINGS, settings);
        },
    };

    // ============================================
    // PageParser - 页面数据解析
    // ============================================
    const PageParser = {
        getCurrentPageType() {
            const path = window.location.pathname;
            if (URL_PATTERNS.postPage.test(path)) return 'post';
            if (URL_PATTERNS.artistPage.test(path)) return 'artist';
            return 'other';
        },

        parseUrlInfo() {
            const path = window.location.pathname;
            let match;

            if ((match = URL_PATTERNS.postPage.exec(path))) {
                return { platform: match[1], userId: match[2], postId: match[3] };
            }
            if ((match = URL_PATTERNS.artistPage.exec(path))) {
                return { platform: match[1], userId: match[2] };
            }
            return null;
        },

        parseArtistInfo() {
            const urlInfo = this.parseUrlInfo();
            if (!urlInfo) return null;

            const pageType = this.getCurrentPageType();
            let avatar = '';
            let nickname = '';
            let platform = urlInfo.platform;

            if (pageType === 'post') {
                // 作品页面的选择器
                // 昵称: <a class="post__user-name">Thelittlejuicer</a>
                nickname = document.querySelector('a.post__user-name')?.textContent?.trim() || '';
                // 头像: <a class="post__user-profile"><picture><img src="//img.coomer.st/icons/..."></picture></a>
                const avatarImg = document.querySelector('a.post__user-profile img');
                if (avatarImg?.src) {
                    avatar = avatarImg.src.startsWith('//') ? 'https:' + avatarImg.src : avatarImg.src;
                }
            } else if (pageType === 'artist') {
                // 艺术家主页的选择器
                // 昵称: <span itemprop="name">thelittlejuicer</span>
                nickname =
                    document.querySelector('.user-header__profile span[itemprop="name"]')?.textContent?.trim() ||
                    document.querySelector('.user-header__profile span:nth-child(2)')?.textContent?.trim() ||
                    '';
                // 头像: <picture class="fancy-image__picture"><img src="//img.coomer.st/icons/..."></picture>
                const avatarImg = document.querySelector('.user-header__avatar img') || document.querySelector('.user-header picture img');
                if (avatarImg?.src) {
                    avatar = avatarImg.src.startsWith('//') ? 'https:' + avatarImg.src : avatarImg.src;
                }
                // 平台
                const platformEl = document.querySelector('.user-header__profile span:nth-child(1) img');
                if (platformEl?.src) {
                    // 从图片路径提取平台名 /static/onlyfans.svg -> onlyfans
                    const match = platformEl.src.match(/\/static\/(\w+)\.svg/);
                    if (match) platform = match[1];
                }
            }

            // 备用：如果没有获取到头像，根据 URL 构造一个
            if (!avatar && urlInfo.userId) {
                avatar = `https://img.coomer.st/icons/${urlInfo.platform}/${urlInfo.userId}`;
            }

            // 备用：如果没有获取到昵称，使用 userId
            if (!nickname) {
                nickname = urlInfo.userId;
            }

            // 构造正确的艺术家主页 URL
            const artistHomepageUrl = `https://coomer.st/${urlInfo.platform}/user/${urlInfo.userId}`;

            return {
                id: urlInfo.userId,
                nickname,
                avatar,
                platform: this.normalizePlatform(platform),
                homepageUrl: artistHomepageUrl,
                isPreset: false,
                addedAt: Date.now(),
            };
        },

        parsePostInfo() {
            const urlInfo = this.parseUrlInfo();
            if (!urlInfo || !urlInfo.postId) return null;

            const artistInfo = this.parseArtistInfo();
            const title = document.querySelector(DOM_SELECTORS.postTitle)?.textContent?.trim() || '';

            // 获取所有媒体下载链接
            const attachments = document.querySelectorAll(DOM_SELECTORS.postAttachment);
            let mediaUrls = Array.from(attachments)
                .map((a) => a.href)
                .filter(Boolean);

            // 如果没有找到附件链接，尝试从图片链接获取
            if (mediaUrls.length === 0) {
                // 获取 .fileThumb 大图链接
                const imageLinks = document.querySelectorAll('.post__files .fileThumb');
                mediaUrls = Array.from(imageLinks)
                    .map((a) => a.href)
                    .filter(Boolean);
            }

            // 获取缩略图：优先使用作品图片，如果没有则使用艺术家头像作为封面
            let thumb = document.querySelector(DOM_SELECTORS.postThumbnail)?.src || document.querySelector('.post__image img')?.src || document.querySelector('.fileThumb img')?.src || '';
            if (!thumb && artistInfo?.avatar) {
                thumb = artistInfo.avatar;
            }

            // 判断类型
            const hasVideo = mediaUrls.some((url) => /\.(mp4|webm|mov|m4v)/i.test(url));

            return {
                id: urlInfo.postId,
                title: title || `Post ${urlInfo.postId}`,
                artistId: urlInfo.userId,
                artistName: artistInfo?.nickname || '',
                platform: urlInfo.platform,
                thumb,
                mediaUrls,
                type: hasVideo ? 'video' : 'image',
                pageUrl: window.location.href.split('?')[0],
                addedAt: Date.now(),
            };
        },

        normalizePlatform(platform) {
            const map = {
                onlyfans: 'OnlyFans',
                fansly: 'Fansly',
                candfans: 'CandFans',
            };
            return map[platform.toLowerCase()] || platform;
        },
    };

    // ============================================
    // ArtistManager - 艺术家管理
    // ============================================
    const ArtistManager = {
        getAll() {
            return StorageManager.getArtists();
        },

        get(id) {
            return this.getAll()[id] || null;
        },

        add(artist) {
            const artists = this.getAll();
            artists[artist.id] = artist;
            StorageManager.setArtists(artists);
            return artist;
        },

        remove(id) {
            const artists = this.getAll();
            delete artists[id];
            StorageManager.setArtists(artists);
        },

        exists(id) {
            return !!this.getAll()[id];
        },

        count() {
            return Object.keys(this.getAll()).length;
        },

        // 切换置顶状态
        togglePin(id) {
            const artists = this.getAll();
            if (artists[id]) {
                artists[id].isPinned = !artists[id].isPinned;
                StorageManager.setArtists(artists);
                return artists[id].isPinned;
            }
            return false;
        },

        // 获取排序后的列表（置顶优先，然后按时间倒序）
        getSortedList() {
            return Object.values(this.getAll()).sort((a, b) => {
                // 置顶的排在前面
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                // 同级别按时间倒序（最新的在前）
                return (b.addedAt || 0) - (a.addedAt || 0);
            });
        },

        // 收藏当前页面的艺术家
        collectCurrent() {
            const info = PageParser.parseArtistInfo();
            if (!info) return null;
            return this.add(info);
        },
    };

    // ============================================
    // PostManager - 作品管理
    // ============================================
    const PostManager = {
        getAll() {
            return StorageManager.getPosts();
        },

        get(id) {
            return this.getAll()[id] || null;
        },

        add(post) {
            const posts = this.getAll();
            posts[post.id] = post;
            StorageManager.setPosts(posts);
            return post;
        },

        remove(id) {
            const posts = this.getAll();
            delete posts[id];
            StorageManager.setPosts(posts);
        },

        exists(id) {
            return !!this.getAll()[id];
        },

        count() {
            return Object.keys(this.getAll()).length;
        },

        // 切换置顶状态
        togglePin(id) {
            const posts = this.getAll();
            if (posts[id]) {
                posts[id].isPinned = !posts[id].isPinned;
                StorageManager.setPosts(posts);
                return posts[id].isPinned;
            }
            return false;
        },

        // 获取排序后的列表（置顶优先，然后按时间倒序）
        getSortedList() {
            return Object.values(this.getAll()).sort((a, b) => {
                // 置顶的排在前面
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                // 同级别按时间倒序（最新的在前）
                return (b.addedAt || 0) - (a.addedAt || 0);
            });
        },

        // 收藏当前页面的作品
        collectCurrent() {
            const info = PageParser.parsePostInfo();
            if (!info) return null;
            return this.add(info);
        },

        // 获取按艺术家分组的作品
        getByArtist(artistId) {
            const posts = this.getAll();
            return Object.values(posts).filter((p) => p.artistId === artistId);
        },
    };

    // ============================================
    // AdBlocker - 广告拦截
    // ============================================
    const AD_DOMAINS = ['tsyndicate.com', 'trafficstars.com', 'exoclick.com', 'exosrv.com', 'trafserv.io', 'tsyndlab.com', 'clksite.com', 'syndication.exoclick.com'];

    const AdBlocker = {
        init() {
            const settings = StorageManager.getSettings();
            if (!settings.blockAds) return;

            this.hookFluidPlayer();
            this.hookXHR();
            this.hookFetch();
        },

        hookFluidPlayer() {
            // 在 document-start 时执行，确保在 Fluid Player 加载前 hook
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    const originalDefineProperty = Object.defineProperty;
                    Object.defineProperty = function(obj, prop, descriptor) {
                        if (prop === 'fluidPlayer' && obj === window) {
                            const originalGetter = descriptor.get;
                            const originalValue = descriptor.value;
                            
                            const wrapper = function(...args) {
                                // 移除广告配置
                                if (args[1] && args[1].vastOptions) {
                                    delete args[1].vastOptions;
                                }
                                if (args[1] && args[1].adList) {
                                    args[1].adList = [];
                                }
                                const fn = originalGetter ? originalGetter() : originalValue;
                                return fn.apply(this, args);
                            };
                            
                            if (originalGetter) {
                                descriptor.get = () => wrapper;
                            } else {
                                descriptor.value = wrapper;
                            }
                        }
                        return originalDefineProperty.call(this, obj, prop, descriptor);
                    };
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
        },

        hookXHR() {
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    const adDomains = ${JSON.stringify(AD_DOMAINS)};
                    const isAdUrl = (url) => {
                        try {
                            const urlObj = new URL(url, location.origin);
                            return adDomains.some(d => urlObj.hostname.includes(d));
                        } catch { return false; }
                    };

                    const originalOpen = XMLHttpRequest.prototype.open;
                    XMLHttpRequest.prototype.open = function(method, url, ...args) {
                        if (isAdUrl(url)) {
                            this._blocked = true;
                            return;
                        }
                        return originalOpen.call(this, method, url, ...args);
                    };

                    const originalSend = XMLHttpRequest.prototype.send;
                    XMLHttpRequest.prototype.send = function(...args) {
                        if (this._blocked) return;
                        return originalSend.apply(this, args);
                    };
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
        },

        hookFetch() {
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    const adDomains = ${JSON.stringify(AD_DOMAINS)};
                    const isAdUrl = (url) => {
                        try {
                            const urlObj = new URL(url, location.origin);
                            return adDomains.some(d => urlObj.hostname.includes(d));
                        } catch { return false; }
                    };

                    const originalFetch = window.fetch;
                    window.fetch = function(input, init) {
                        const url = typeof input === 'string' ? input : input.url;
                        if (isAdUrl(url)) {
                            return Promise.reject(new Error('Blocked by AdBlocker'));
                        }
                        return originalFetch.apply(this, arguments);
                    };
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
        },
    };

    // ============================================
    // AutoFullscreen - 自动全屏
    // ============================================
    const AutoFullscreen = {
        init() {
            const settings = StorageManager.getSettings();
            if (!settings.autoFullscreen) return;

            // 等待 DOM 加载完成后监听视频
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        },

        setup() {
            // 使用 MutationObserver 检测视频元素
            const observer = new MutationObserver(() => {
                const video = document.querySelector('video');
                if (video && !video._autoFullscreenBound) {
                    video._autoFullscreenBound = true;
                    this.bindVideo(video);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // 也检查已存在的视频
            const video = document.querySelector('video');
            if (video) this.bindVideo(video);
        },

        bindVideo(video) {
            video.addEventListener(
                'play',
                () => {
                    // 延迟执行，避免与广告冲突
                    setTimeout(() => {
                        if (!document.fullscreenElement && !video.paused) {
                            this.requestFullscreen(video);
                        }
                    }, 500);
                },
                { once: true },
            );
        },

        requestFullscreen(element) {
            if (element.requestFullscreen) {
                element.requestFullscreen().catch(() => {});
            } else if (element.webkitEnterFullscreen) {
                // iOS Safari
                element.webkitEnterFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            }
        },
    };

    // ============================================
    // VideoPlayerEnhancer - 替换原生播放器为 Video.js
    // ============================================
    const VideoPlayerEnhancer = {
        playerCounter: 0,
        observer: null,

        init() {
            // 等待 DOM 加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        },

        setup() {
            // 处理页面上已存在的 Fluid Player
            this.replaceExistingPlayers();

            // 使用 MutationObserver 检测新出现的 Fluid Player
            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查是否是 Fluid Player 容器或包含 Fluid Player
                            if (node.classList?.contains('fluid_video_wrapper')) {
                                this.replacePlayer(node);
                            } else if (node.querySelector) {
                                const fluidWrappers = node.querySelectorAll('.fluid_video_wrapper');
                                fluidWrappers.forEach((wrapper) => this.replacePlayer(wrapper));
                            }
                        }
                    }
                }
            });

            this.observer.observe(document.body, { childList: true, subtree: true });
        },

        replaceExistingPlayers() {
            const fluidWrappers = document.querySelectorAll('.fluid_video_wrapper');
            fluidWrappers.forEach((wrapper) => this.replacePlayer(wrapper));
        },

        replacePlayer(fluidWrapper) {
            // 防止重复处理
            if (fluidWrapper._coomerReplaced) return;
            fluidWrapper._coomerReplaced = true;

            // 获取原始视频元素和视频源
            const originalVideo = fluidWrapper.querySelector('video');
            if (!originalVideo) return;

            const source = originalVideo.querySelector('source');
            const videoSrc = source?.src || originalVideo.src;
            if (!videoSrc) return;

            // 获取原始尺寸
            const computedStyle = window.getComputedStyle(fluidWrapper);
            const originalWidth = fluidWrapper.offsetWidth || computedStyle.width;
            const originalHeight = fluidWrapper.offsetHeight || computedStyle.height;

            // 创建新的容器
            const playerId = `coomer-player-${this.playerCounter++}`;
            const container = document.createElement('div');
            container.className = 'coomer-video-container';
            container.style.cssText = `
                width: ${typeof originalWidth === 'number' ? originalWidth + 'px' : originalWidth};
                max-width: 100%;
                margin: 0 auto;
            `;

            // 创建 Video.js 播放器元素
            const videoElement = document.createElement('video');
            videoElement.id = playerId;
            videoElement.className = 'video-js vjs-big-play-centered';
            videoElement.setAttribute('controls', '');
            videoElement.setAttribute('preload', 'metadata');
            videoElement.setAttribute('playsinline', '');
            videoElement.setAttribute('webkit-playsinline', '');

            const sourceElement = document.createElement('source');
            sourceElement.src = videoSrc;
            sourceElement.type = 'video/mp4';
            videoElement.appendChild(sourceElement);

            container.appendChild(videoElement);

            // 替换 DOM
            fluidWrapper.parentNode.replaceChild(container, fluidWrapper);

            // 初始化 Video.js
            this.initVideoJs(playerId);
        },

        initVideoJs(playerId) {
            // 确保 videojs 可用
            if (typeof videojs === 'undefined') {
                console.warn('[Coomer] Video.js not loaded, retrying...');
                setTimeout(() => this.initVideoJs(playerId), 500);
                return;
            }

            const settings = StorageManager.getSettings();
            const isMobile = window.innerWidth < 768;

            const player = videojs(playerId, {
                fluid: true,
                responsive: true,
                controls: true,
                preload: 'metadata',
                playbackRates: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
                userActions: {
                    doubleClick: true,
                    hotkeys: true,
                },
                controlBar: {
                    children: [
                        'playToggle',
                        'skipBackward',
                        'skipForward',
                        'currentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'playbackRateMenuButton',
                        'volumePanel',
                        'pictureInPictureToggle',
                        'fullscreenToggle',
                    ],
                    skipButtons: {
                        forward: 10,
                        backward: 10,
                    },
                },
            });

            // 键盘快捷键增强 + 自动全屏
            player.ready(() => {
                // 自动全屏（设置开启时尝试触发，移动端可能因浏览器限制而失败）
                if (settings.autoFullscreen) {
                    player.one('play', () => {
                        // 延迟确保控件完全渲染
                        setTimeout(() => {
                            if (!document.fullscreenElement && !player.paused()) {
                                player.requestFullscreen().catch(() => {});
                            }
                        }, 300);
                    });
                }

                const videoEl = player.el();
                videoEl.addEventListener('keydown', (e) => {
                    switch (e.key) {
                        case 'ArrowLeft':
                            e.preventDefault();
                            player.currentTime(Math.max(0, player.currentTime() - 10));
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            player.volume(Math.min(1, player.volume() + 0.1));
                            break;
                        case 'ArrowDown':
                            e.preventDefault();
                            player.volume(Math.max(0, player.volume() - 0.1));
                            break;
                    }
                });
            });

            return player;
        },

        // 注入 Video.js 容器样式
        injectStyles() {
            GM_addStyle(`
                .coomer-video-container {
                    background: #000;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .coomer-video-container .video-js {
                    width: 100%;
                    border-radius: 8px;
                }
                /* Video.js 主题适配 */
                .coomer-video-container .vjs-control-bar {
                    background: rgba(18, 18, 18, 0.9);
                }
                .coomer-video-container .vjs-play-progress,
                .coomer-video-container .vjs-volume-level {
                    background: var(--coomer-primary, #E0AA3E);
                }
                .coomer-video-container .vjs-big-play-button {
                    background: rgba(18, 18, 18, 0.8);
                    border: 2px solid var(--coomer-primary, #E0AA3E);
                    border-radius: 50%;
                }
                .coomer-video-container .vjs-big-play-button:hover {
                    background: var(--coomer-primary, #E0AA3E);
                }
                /* 移动端优化 */
                @media (max-width: 767px) {
                    .coomer-video-container .vjs-control-bar {
                        font-size: 12px;
                    }
                    .coomer-video-container .vjs-time-control {
                        padding: 0 4px;
                        min-width: auto;
                    }
                }
            `);
        },
    };

    // ============================================
    // SearchManager - 搜索过滤
    // ============================================
    const SearchManager = {
        artistFuse: null,
        postFuse: null,
        currentQuery: '',
        debounceTimer: null,

        // 初始化艺术家搜索
        initArtistSearch(artists) {
            if (typeof Fuse === 'undefined') {
                console.warn('[Coomer] Fuse.js not loaded');
                return false;
            }
            this.artistFuse = new Fuse(artists, {
                keys: ['id', 'nickname', 'platform'],
                threshold: 0.4, // 较严格的匹配，允许少量拼写错误
                includeScore: true,
                ignoreLocation: true,
                minMatchCharLength: 1,
            });
            return true;
        },

        // 初始化作品搜索
        initPostSearch(posts) {
            if (typeof Fuse === 'undefined') {
                console.warn('[Coomer] Fuse.js not loaded');
                return false;
            }
            this.postFuse = new Fuse(posts, {
                keys: ['title', 'artistName', 'content'],
                threshold: 0.4, // 较严格的匹配，允许少量拼写错误
                includeScore: true,
                ignoreLocation: true,
                minMatchCharLength: 1,
            });
            return true;
        },

        // 搜索艺术家
        searchArtists(query, artists) {
            const q = query.trim();
            if (!q) return null;
            if (!this.initArtistSearch(artists)) {
                // Fuse 未加载，使用简单的字符串匹配
                const lowerQ = q.toLowerCase();
                return artists.filter((a) => a.id?.toLowerCase().includes(lowerQ) || a.nickname?.toLowerCase().includes(lowerQ) || a.platform?.toLowerCase().includes(lowerQ));
            }
            const results = this.artistFuse.search(q);
            console.log('[Coomer] Artist search results:', q, results.length);
            return results.map((r) => r.item);
        },

        // 搜索作品
        searchPosts(query, posts) {
            const q = query.trim();
            if (!q) return null;
            if (!this.initPostSearch(posts)) {
                // Fuse 未加载，使用简单的字符串匹配
                const lowerQ = q.toLowerCase();
                return posts.filter((p) => p.title?.toLowerCase().includes(lowerQ) || p.artistName?.toLowerCase().includes(lowerQ) || p.content?.toLowerCase().includes(lowerQ));
            }
            const results = this.postFuse.search(q);
            console.log('[Coomer] Post search results:', q, results.length);
            return results.map((r) => r.item);
        },

        // 防抖搜索
        debounceSearch(callback, delay = 300) {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(callback, delay);
        },
    };

    // ============================================
    // UIPanel - 用户界面面板
    // ============================================
    const UIPanel = {
        container: null,
        panel: null,
        isOpen: false,
        activeTab: 'artists',

        // SPA 无刷新跳转
        navigateTo(url) {
            this.close(); // 先关闭面板

            // 策略：优先查找页面上已存在的精确链接进行点击（触发 SPA 路由）
            // 如果找不到，则回退到 window.location.href（硬跳转）
            // 移除不稳定的“链接劫持”逻辑，避免误跳到首页

            const targetPath = url.replace(window.location.origin, '');

            // 1. 优先找页面上已有的完全匹配的目标链接（且不是 _blank）
            const exactLink = document.querySelector(`a[href="${targetPath}"]:not([target="_blank"]), a[href="${url}"]:not([target="_blank"])`);
            if (exactLink) {
                exactLink.click();
                return;
            }

            // 2. 实在没办法，通过 location 跳转（会刷新，但最稳妥）
            window.location.href = url;
        },

        init() {
            this.injectStyles();
            this.createFloatingButton();
            this.createPanel();
            this.createQuickActions();
        },

        injectStyles() {
            // 注入 video.js CSS
            try {
                const videojsCss = GM_getResourceText('videojs_css');
                if (videojsCss) GM_addStyle(videojsCss);
            } catch (e) {
                console.warn('Failed to load video.js CSS:', e);
            }

            GM_addStyle(`
                :root {
                    --coomer-bg: #121212;
                    --coomer-surface: rgba(26, 26, 29, 0.95);
                    --coomer-card: #1E1E22;
                    --coomer-border: #333333;
                    --coomer-primary: #E0AA3E;
                    --coomer-primary-hover: #F2C94C;
                    --coomer-text: #E0E0E0;
                    --coomer-text-sec: #A0A0A0;
                    --coomer-danger: #ef4444;
                    --coomer-success: #10b981;
                    --coomer-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                }

                /* 隐藏公告横幅 */
                #announcement-banner {
                    display: none !important;
                }

                /* 屏蔽广告元素 */
                .global-sidebar-entry-item[href*="tsyndicate.com"],
                #ts_ad_native_wxfxp,
                .ts-im-container {
                    display: none !important;
                }

                /* 悬浮按钮 - The Orb */
                .coomer-fab {
                    position: fixed;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: #121212;
                    color: var(--coomer-primary);
                    border: 1px solid var(--coomer-primary);
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    user-select: none;
                    touch-action: none;
                }
                .coomer-fab:hover {
                    width: 54px;
                    height: 54px;
                    background: var(--coomer-primary);
                    color: #121212;
                    box-shadow: 0 0 20px rgba(224, 170, 62, 0.4);
                }
                .coomer-fab.dragging {
                    cursor: grabbing;
                    transform: scale(0.95);
                    transition: none;
                }

                /* 面板容器 */
                .coomer-panel-overlay {
                    position: fixed;
                    top: 0;
                    bg-color: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 99998;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                .coomer-panel-overlay.open {
                    opacity: 1;
                    visibility: visible;
                }

                /* 抽屉式面板 */
                .coomer-panel {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    max-height: 75vh;
                    background: var(--coomer-surface);
                    backdrop-filter: blur(12px);
                    border-radius: 20px 20px 0 0;
                    z-index: 99999;
                    transform: translateY(100%);
                    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
                    color: var(--coomer-text);
                    box-shadow: var(--coomer-shadow);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-bottom: none;
                }
                .coomer-panel.open {
                    transform: translateY(0);
                }

                /* PC 端样式 */
                @media (min-width: 768px) {
                    .coomer-panel {
                        left: auto;
                        right: 24px;
                        bottom: 96px;
                        width: 420px;
                        max-height: 600px;
                        border-radius: 16px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    }
                }

                /* 面板头部 */
                .coomer-panel-header {
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(18, 18, 18, 0.8);
                    border-bottom: 1px solid var(--coomer-primary);
                    border-radius: 20px 20px 0 0;
                }
                @media (min-width: 768px) {
                    .coomer-panel-header {
                        border-radius: 16px 16px 0 0;
                    }
                }
                .coomer-panel-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--coomer-primary);
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                .coomer-panel-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .coomer-panel-settings {
                    background: transparent;
                    border: none;
                    color: var(--coomer-text-sec);
                    font-size: 16px;
                    cursor: pointer;
                    padding: 8px;
                    line-height: 1;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .coomer-panel-settings:hover {
                    color: var(--coomer-primary);
                    background: rgba(255, 255, 255, 0.05);
                }
                .coomer-panel-close {
                    background: transparent;
                    border: none;
                    color: var(--coomer-text-sec);
                    font-size: 20px;
                    cursor: pointer;
                    padding: 8px;
                    line-height: 1;
                    border-radius: 8px;
                    transition: all 0.2s;
                    z-index: 10;
                }
                .coomer-panel-close:hover {
                    color: var(--coomer-primary);
                    background: rgba(255, 255, 255, 0.05);
                }

                /* 标签栏 */
                .coomer-tabs {
                    display: flex;
                    background: #121212;
                    padding: 4px;
                    margin: 0;
                }
                .coomer-tab {
                    flex: 1;
                    padding: 10px;
                    background: transparent;
                    border: none;
                    color: var(--coomer-text-sec);
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    position: relative;
                }
                .coomer-tab::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    width: 0;
                    height: 2px;
                    background: var(--coomer-primary);
                    transition: all 0.3s ease;
                    transform: translateX(-50%);
                }
                .coomer-tab:hover {
                    color: var(--coomer-text);
                }
                .coomer-tab.active {
                    color: var(--coomer-primary);
                }
                .coomer-tab.active::after {
                    width: 40%;
                }

                /* 面板内容 */
                .coomer-panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                }
                /* 自定义滚动条 */
                .coomer-panel-content::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .coomer-panel-content::-webkit-scrollbar-track {
                    background: transparent;
                }
                .coomer-panel-content::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 3px;
                    transition: background 0.2s;
                }
                .coomer-panel-content::-webkit-scrollbar-thumb:hover {
                    background: var(--coomer-primary);
                }

                /* 空状态 */
                .coomer-empty {
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                }
                .coomer-empty-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                }

                /* 分组组件 */
                .coomer-group {
                    margin-bottom: 16px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 12px;
                    padding: 0 12px;
                }
                .coomer-group-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 0;
                    cursor: pointer;
                    user-select: none;
                    position: sticky;
                    top: 0;
                    background: var(--coomer-surface);
                    z-index: 10;
                    margin: 0 -12px;
                    padding-left: 12px;
                    padding-right: 12px;
                    border-radius: 8px 8px 0 0;
                }
                .coomer-group-title {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--coomer-text-sec);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-transform: uppercase;
                }
                .coomer-group-count {
                    font-size: 12px;
                    color: var(--coomer-text-sec);
                    opacity: 0.7;
                    font-weight: normal;
                }
                .coomer-group-toggle {
                    font-size: 12px;
                    color: var(--coomer-text-sec);
                    transition: transform 0.2s;
                }
                .coomer-group-toggle.collapsed {
                    transform: rotate(-90deg);
                }
                .coomer-group-content {
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                }
                .coomer-group-content.collapsed {
                    max-height: 0 !important;
                }
                .coomer-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    font-size: 10px;
                    border-radius: 4px;
                    background: var(--coomer-primary);
                    color: #000;
                    font-weight: 700;
                }
                .coomer-card .coomer-badge {
                    position: absolute;
                    top: 28px;
                    left: 4px;
                    z-index: 4;
                }

                /* 艺术家/作品卡片网格 */
                .coomer-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                    gap: 16px;
                    padding-bottom: 12px;
                }
                .coomer-card {
                    position: relative;
                    background: var(--coomer-card);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .coomer-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                    border-color: rgba(224, 170, 62, 0.3);
                }
                .coomer-card-img {
                    width: 100%;
                    aspect-ratio: 1;
                    object-fit: cover;
                    background: #121212;
                    filter: brightness(0.9);
                    transition: filter 0.3s;
                }
                .coomer-card:hover .coomer-card-img {
                    filter: brightness(1.1);
                }
                .coomer-card-info {
                    padding: 10px;
                }
                .coomer-card-name {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--coomer-text);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .coomer-card-meta {
                    font-size: 10px;
                    color: var(--coomer-text-sec);
                    margin-top: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .coomer-card-count {
                    position: absolute;
                    bottom: 48px;
                    right: 6px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: 600;
                    border-radius: 4px;
                    background: rgba(0, 0, 0, 0.85);
                    color: var(--coomer-primary);
                    border: 1px solid rgba(224, 170, 62, 0.3);
                    z-index: 3;
                }
                .coomer-card-delete {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: rgba(20, 20, 20, 0.9);
                    color: var(--coomer-text);
                    border: 1px solid #333;
                    cursor: pointer;
                    font-size: 14px;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: all 0.2s;
                    z-index: 5;
                }
                .coomer-card:hover .coomer-card-delete {
                    opacity: 1;
                }
                .coomer-card-delete:hover {
                    background: var(--coomer-danger);
                    border-color: var(--coomer-danger);
                    color: white;
                    transform: scale(1.1);
                }
                .coomer-card-pin {
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: rgba(20, 20, 20, 0.9);
                    color: var(--coomer-text-sec);
                    border: 1px solid #333;
                    cursor: pointer;
                    font-size: 12px;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: all 0.2s;
                    z-index: 5;
                }
                .coomer-card:hover .coomer-card-pin {
                    opacity: 1;
                }
                .coomer-card-pin.pinned {
                    opacity: 1;
                    border-color: var(--coomer-primary);
                    color: var(--coomer-primary);
                }
                .coomer-card-pin:hover {
                    color: var(--coomer-primary);
                    border-color: var(--coomer-primary);
                    transform: scale(1.1);
                }
                .coomer-card.pinned {
                    border: 1px solid var(--coomer-primary);
                    box-shadow: 0 0 10px rgba(224, 170, 62, 0.1);
                }

                /* 设置项 */
                .coomer-setting-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid #2d2d44;
                }
                /* 视频播放列表 */
                .coomer-video-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .coomer-video-item {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: var(--coomer-card);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .coomer-video-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: var(--coomer-primary);
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                .coomer-video-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--coomer-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }
                .coomer-video-item:hover .coomer-video-icon {
                    background: var(--coomer-primary);
                    color: #000;
                    transform: scale(1.1);
                }
                .coomer-video-name {
                    font-size: 14px;
                    color: #e0e0e0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    flex: 1;
                    font-weight: 500;
                }

                /* 视频播放器遮罩层 */
                .coomer-video-player-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.95);
                    backdrop-filter: blur(8px);
                    z-index: 100000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .coomer-video-player-wrapper {
                    position: relative;
                    width: 90%;
                    max-width: 1000px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }
                .coomer-video-close {
                    position: absolute;
                    top: -50px;
                    right: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .coomer-video-close:hover {
                    background: var(--coomer-primary);
                    color: #000;
                    transform: rotate(90deg);
                }

                .coomer-setting-label {
                    font-size: 14px;
                    color: var(--coomer-text);
                }
                .coomer-toggle {
                    position: relative;
                    width: 44px;
                    height: 24px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                .coomer-toggle.active {
                    background: var(--coomer-primary);
                }
                .coomer-toggle::after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                }
                .coomer-toggle.active::after {
                    transform: translateX(20px);
                    background: #fff;
                }

                /* 快捷操作按钮 */
                .coomer-quick-actions {
                    position: fixed;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    z-index: 99997;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(20px);
                    transition: all 0.3s;
                    pointer-events: none;
                }
                .coomer-quick-actions.show {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .coomer-quick-btn {
                    min-width: 80px;
                    height: 36px;
                    padding: 0 16px;
                    border-radius: 18px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    transition: all 0.2s;
                    white-space: nowrap;
                    background: rgba(18, 18, 18, 0.9);
                    color: var(--coomer-text);
                    backdrop-filter: blur(4px);
                }
                .coomer-quick-btn:hover {
                    transform: translateX(-4px);
                    border-color: var(--coomer-primary);
                    color: var(--coomer-primary);
                }
                .coomer-quick-btn.collect-artist {
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .coomer-quick-btn.collect-post {
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .coomer-quick-btn.collected {
                    background: var(--coomer-primary);
                    color: #000;
                    border-color: var(--coomer-primary);
                    font-weight: 700;
                    box-shadow: 0 0 15px rgba(224, 170, 62, 0.3);
                }
                /* 移动端隐藏悬浮快捷操作 */
                @media (max-width: 767px) {
                    .coomer-quick-actions {
                        display: none !important;
                    }
                }

                /* 面板上方收藏快捷操作（移动端显示，位置由JS动态计算） */
                .coomer-panel-quick-actions {
                    display: none;
                    position: fixed;
                    left: 0;
                    right: 0;
                    gap: 8px;
                    padding: 10px 16px;
                    background: rgba(18, 18, 18, 0.98);
                    backdrop-filter: blur(8px);
                    border-top: 1px solid var(--coomer-primary);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    z-index: 100000;
                }
                @media (max-width: 767px) {
                    .coomer-panel-quick-actions.show {
                        display: flex;
                    }
                }
                .coomer-panel-quick-actions .coomer-quick-btn {
                    flex: 1;
                    justify-content: center;
                }

                /* Toast 提示 */
                .coomer-toast {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    background: #333;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    z-index: 100000;
                    opacity: 0;
                    transition: all 0.3s;
                    pointer-events: none;
                }
                .coomer-toast.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                .coomer-toast.success {
                    background: #4CAF50;
                }
                .coomer-toast.error {
                    background: #f44336;
                }

                /* 操作按钮组 */
                .coomer-btn-group {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }
                .coomer-btn {
                    flex: 1;
                    padding: 12px 16px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .coomer-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                .coomer-btn-primary {
                    background: var(--coomer-primary);
                    color: #000;
                }
                .coomer-btn-primary:hover {
                    background: var(--coomer-primary-hover);
                }
                .coomer-btn-danger {
                    background: transparent;
                    border: 1px solid var(--coomer-danger);
                    color: var(--coomer-danger);
                }
                .coomer-btn-danger:hover {
                    background: var(--coomer-danger);
                    color: white;
                }
                .coomer-btn-secondary {
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--coomer-text);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .coomer-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.1);
                }

                /* 搜索框 */
                .coomer-search-container {
                    flex: 1;
                    max-width: 200px;
                    margin: 0 12px;
                }
                .coomer-search-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .coomer-search-input {
                    width: 100%;
                    padding: 6px 28px 6px 28px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid transparent;
                    border-radius: 6px;
                    color: var(--coomer-text);
                    font-size: 12px;
                    outline: none;
                    transition: all 0.2s;
                }
                .coomer-search-input:focus {
                    border-color: var(--coomer-primary);
                    background: rgba(255, 255, 255, 0.12);
                }
                .coomer-search-input::placeholder {
                    color: var(--coomer-text-sec);
                }
                .coomer-search-icon {
                    position: absolute;
                    left: 8px;
                    font-size: 12px;
                    color: var(--coomer-text-sec);
                    pointer-events: none;
                }
                .coomer-search-clear {
                    position: absolute;
                    right: 4px;
                    background: transparent;
                    border: none;
                    color: var(--coomer-text-sec);
                    cursor: pointer;
                    padding: 2px 6px;
                    font-size: 14px;
                    line-height: 1;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .coomer-search-clear.visible {
                    opacity: 1;
                }
                .coomer-search-clear:hover {
                    color: var(--coomer-primary);
                }
                /* 无搜索结果 */
                .coomer-no-results {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--coomer-text-sec);
                }
                .coomer-no-results-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                    opacity: 0.5;
                }
            `);
        },

        createFloatingButton() {
            const fab = document.createElement('button');
            fab.className = 'coomer-fab';
            fab.innerHTML = '⭐';
            fab.title = 'Coomer 佬友严选 (可拖拽移动)';

            // 恢复保存的位置
            const settings = StorageManager.getSettings();
            const pos = settings.fabPosition || DEFAULT_SETTINGS.fabPosition;
            fab.style.right = pos.right + 'px';
            fab.style.bottom = pos.bottom + 'px';

            // 拖拽功能
            let isDragging = false;
            let hasMoved = false;
            let startX, startY, startRight, startBottom;

            const onStart = (e) => {
                isDragging = true;
                hasMoved = false;
                fab.classList.add('dragging');

                const touch = e.touches ? e.touches[0] : e;
                startX = touch.clientX;
                startY = touch.clientY;
                startRight = parseInt(fab.style.right) || pos.right;
                startBottom = parseInt(fab.style.bottom) || pos.bottom;

                e.preventDefault();
            };

            const onMove = (e) => {
                if (!isDragging) return;

                const touch = e.touches ? e.touches[0] : e;
                const deltaX = startX - touch.clientX;
                const deltaY = startY - touch.clientY;

                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    hasMoved = true;
                }

                const newRight = Math.max(10, Math.min(window.innerWidth - 66, startRight + deltaX));
                const newBottom = Math.max(10, Math.min(window.innerHeight - 66, startBottom + deltaY));

                fab.style.right = newRight + 'px';
                fab.style.bottom = newBottom + 'px';

                e.preventDefault();
            };

            const onEnd = (e) => {
                if (!isDragging) return;
                isDragging = false;
                fab.classList.remove('dragging');

                // 保存位置
                const newSettings = StorageManager.getSettings();
                newSettings.fabPosition = {
                    right: parseInt(fab.style.right),
                    bottom: parseInt(fab.style.bottom),
                };
                StorageManager.setSettings(newSettings);

                // 更新快捷操作按钮位置
                if (this.updateQuickActionsPosition) {
                    this.updateQuickActionsPosition();
                }

                // 移动端：如果未拖拽，触发点击
                if (!hasMoved && e.type === 'touchend') {
                    this.toggle();
                }
            };

            // 鼠标事件
            fab.addEventListener('mousedown', onStart);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);

            // 触摸事件
            fab.addEventListener('touchstart', onStart, { passive: false });
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);

            // 点击事件（仅在未拖拽时触发）
            fab.addEventListener('click', (e) => {
                if (hasMoved) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                this.toggle();
            });

            document.body.appendChild(fab);
            this.fab = fab;
        },

        createPanel() {
            // 遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'coomer-panel-overlay';
            overlay.addEventListener('click', () => this.close());
            document.body.appendChild(overlay);
            this.overlay = overlay;

            // 面板
            const panel = document.createElement('div');
            panel.className = 'coomer-panel';
            panel.innerHTML = `
                <div class="coomer-panel-header">
                    <span class="coomer-panel-title">👑 臻选</span>
                    <div class="coomer-search-container">
                        <div class="coomer-search-wrapper">
                            <span class="coomer-search-icon">🔍</span>
                            <input type="text" class="coomer-search-input" placeholder="搜索艺术家...">
                            <button class="coomer-search-clear">×</button>
                        </div>
                    </div>
                    <div class="coomer-panel-header-actions">
                        <button class="coomer-panel-settings" title="设置">⚙️</button>
                        <button class="coomer-panel-close">×</button>
                    </div>
                </div>
                <div class="coomer-tabs">
                    <button class="coomer-tab active" data-tab="artists">👩‍🎨 艺术家</button>
                    <button class="coomer-tab" data-tab="posts">🎬 作品</button>
                </div>
                <div class="coomer-panel-content"></div>
            `;

            // 关闭按钮事件 - 使用更可靠的绑定方式
            const closeBtn = panel.querySelector('.coomer-panel-close');
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });

            // 设置按钮事件
            const settingsBtn = panel.querySelector('.coomer-panel-settings');
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchTab('settings');
            });

            // 搜索框事件
            const searchInput = panel.querySelector('.coomer-search-input');
            const searchClear = panel.querySelector('.coomer-search-clear');
            this.searchInput = searchInput;

            // 点击搜索框时，如果面板未完全展开则自动展开
            searchInput.addEventListener('focus', () => {
                if (!this.isOpen) {
                    this.open();
                }
            });

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                searchClear.classList.toggle('visible', query.length > 0);
                SearchManager.debounceSearch(() => {
                    this.handleSearch(query);
                });
            });

            searchClear.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                searchInput.value = '';
                searchClear.classList.remove('visible');
                this.handleSearch('');
            });

            // 标签页切换事件
            panel.querySelectorAll('.coomer-tab').forEach((tab) => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.switchTab(tab.dataset.tab);
                });
            });

            // 阻止面板内部点击冒泡到遮罩层
            panel.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            document.body.appendChild(panel);
            this.panel = panel;
            this.contentArea = panel.querySelector('.coomer-panel-content');

            // 渲染初始内容
            this.renderTab('artists');
        },

        // 处理搜索
        handleSearch(query) {
            SearchManager.currentQuery = query.trim();
            this.renderTab(this.activeTab);
        },

        // 更新搜索框占位符
        updateSearchPlaceholder() {
            if (!this.searchInput) return;
            const placeholders = {
                artists: '搜索艺术家...',
                posts: '搜索作品...',
                settings: '搜索设置...',
            };
            this.searchInput.placeholder = placeholders[this.activeTab] || '搜索...';
            // 设置页面隐藏搜索框
            const searchContainer = this.panel.querySelector('.coomer-search-container');
            if (searchContainer) {
                searchContainer.style.display = this.activeTab === 'settings' ? 'none' : 'block';
            }
        },

        // SPA URL 变化时重新创建快捷操作按钮
        recreateQuickActions() {
            // 移除旧的快捷操作按钮
            if (this.quickActions) {
                this.quickActions.remove();
                this.quickActions = null;
                this.updateQuickActionsPosition = null;
            }
            // 延迟一点重新创建（等待页面渲染）
            setTimeout(() => {
                this.createQuickActions();
            }, 500);
        },

        createQuickActions() {
            const container = document.createElement('div');
            container.className = 'coomer-quick-actions';

            const pageType = PageParser.getCurrentPageType();
            const urlInfo = PageParser.parseUrlInfo();

            // 首先添加艺术家按钮（会显示在上方）
            if (pageType === 'artist' || pageType === 'post') {
                const isArtistCollected = urlInfo && ArtistManager.exists(urlInfo.userId);
                const collectArtistBtn = document.createElement('button');
                collectArtistBtn.className = `coomer-quick-btn collect-artist ${isArtistCollected ? 'collected' : ''}`;
                collectArtistBtn.innerHTML = isArtistCollected ? '✓ 已藏艺术家' : '👤 收藏艺术家';
                collectArtistBtn.title = isArtistCollected ? '点击取消收藏艺术家' : '收藏当前艺术家';
                collectArtistBtn.addEventListener('click', () => this.handleCollectArtist(collectArtistBtn));
                container.appendChild(collectArtistBtn);
            }

            // 然后添加作品按钮（会显示在下方，更靠近主按钮）
            if (pageType === 'post') {
                const isPostCollected = urlInfo && PostManager.exists(urlInfo.postId);
                const collectPostBtn = document.createElement('button');
                collectPostBtn.className = `coomer-quick-btn collect-post ${isPostCollected ? 'collected' : ''}`;
                collectPostBtn.innerHTML = isPostCollected ? '✓ 已藏作品' : '🎬 收藏作品';
                collectPostBtn.title = isPostCollected ? '点击取消收藏作品' : '收藏当前作品';
                collectPostBtn.addEventListener('click', () => this.handleCollectPost(collectPostBtn));
                container.appendChild(collectPostBtn);
            }

            if (container.children.length > 0) {
                document.body.appendChild(container);
                this.quickActions = container;

                // 更新快捷操作按钮位置
                const updateQuickActionsPosition = () => {
                    const fabRight = parseInt(this.fab.style.right) || 20;
                    const fabBottom = parseInt(this.fab.style.bottom) || 80;
                    container.style.right = fabRight + 'px';
                    container.style.bottom = fabBottom + 65 + 'px'; // 悬浮按钮高度 + 间距
                };

                // 初始化位置
                updateQuickActionsPosition();

                // 显示/隐藏快捷操作
                const showQuickActions = () => {
                    if (this.isOpen) return; // 面板打开时不显示
                    updateQuickActionsPosition();
                    container.classList.add('show');
                };

                const hideQuickActions = () => {
                    setTimeout(() => {
                        if (!container.matches(':hover') && !this.fab.matches(':hover')) {
                            container.classList.remove('show');
                        }
                    }, 150);
                };

                // 悬浮按钮悬停时显示快捷操作
                this.fab.addEventListener('mouseenter', showQuickActions);
                this.fab.addEventListener('mouseleave', hideQuickActions);
                container.addEventListener('mouseenter', () => container.classList.add('show'));
                container.addEventListener('mouseleave', hideQuickActions);

                // 保存位置更新函数供拖拽时调用
                this.updateQuickActionsPosition = updateQuickActionsPosition;
            }
        },

        // 更新快捷操作按钮的收藏状态
        updateQuickActionsState() {
            if (!this.quickActions) return;
            const urlInfo = PageParser.parseUrlInfo();
            if (!urlInfo) return;

            // 更新艺术家按钮状态
            const artistBtn = this.quickActions.querySelector('.collect-artist');
            if (artistBtn) {
                const isCollected = ArtistManager.exists(urlInfo.userId);
                artistBtn.classList.toggle('collected', isCollected);
                artistBtn.innerHTML = isCollected ? '✓ 已藏艺术家' : '👤 艺术家';
                artistBtn.title = isCollected ? '点击取消收藏艺术家' : '收藏当前艺术家';
            }

            // 更新作品按钮状态
            const postBtn = this.quickActions.querySelector('.collect-post');
            if (postBtn && urlInfo.postId) {
                const isCollected = PostManager.exists(urlInfo.postId);
                postBtn.classList.toggle('collected', isCollected);
                postBtn.innerHTML = isCollected ? '✓ 已藏作品' : '🎬 作品';
                postBtn.title = isCollected ? '点击取消收藏作品' : '收藏当前作品';
            }
        },

        handleCollectArtist(btn) {
            const urlInfo = PageParser.parseUrlInfo();
            if (!urlInfo) return;

            if (ArtistManager.exists(urlInfo.userId)) {
                ArtistManager.remove(urlInfo.userId);
                btn.classList.remove('collected');
                btn.innerHTML = '👤 收藏艺术家';
                btn.title = '收藏当前艺术家';
                this.showToast('已取消收藏', 'success');
            } else {
                const artist = ArtistManager.collectCurrent();
                if (artist) {
                    btn.classList.add('collected');
                    btn.innerHTML = '✓ 已藏艺术家';
                    btn.title = '点击取消收藏艺术家';
                    this.showToast(`已收藏 ${artist.nickname}`, 'success');
                } else {
                    this.showToast('收藏失败，请稍后重试', 'error');
                }
            }
            // 刷新面板内容
            if (this.isOpen && this.activeTab === 'artists') {
                this.renderTab('artists');
            }
        },

        handleCollectPost(btn) {
            const urlInfo = PageParser.parseUrlInfo();
            if (!urlInfo || !urlInfo.postId) return;

            if (PostManager.exists(urlInfo.postId)) {
                PostManager.remove(urlInfo.postId);
                btn.classList.remove('collected');
                btn.innerHTML = '🎬 收藏作品';
                btn.title = '收藏当前作品';
                this.showToast('已取消收藏', 'success');
            } else {
                const post = PostManager.collectCurrent();
                if (post) {
                    btn.classList.add('collected');
                    btn.innerHTML = '✓ 已藏作品';
                    btn.title = '点击取消收藏作品';
                    this.showToast('作品已收藏', 'success');
                } else {
                    this.showToast('收藏失败，请稍后重试', 'error');
                }
            }
            // 刷新面板内容
            if (this.isOpen && this.activeTab === 'posts') {
                this.renderTab('posts');
            }
        },

        // 更新面板上方快捷操作（移动端）
        updatePanelQuickActions() {
            // 获取或创建容器
            let container = document.querySelector('.coomer-panel-quick-actions');
            if (!container) {
                container = document.createElement('div');
                container.className = 'coomer-panel-quick-actions';
                document.body.appendChild(container);
            }

            const pageType = PageParser.getCurrentPageType();
            const urlInfo = PageParser.parseUrlInfo();

            // 清空容器
            container.innerHTML = '';
            container.classList.remove('show');
            container.style.top = '';

            // 如果不在艺术家或作品页面，不显示按钮
            if (pageType !== 'artist' && pageType !== 'post') {
                return;
            }

            // 艺术家收藏按钮
            if (pageType === 'artist' || pageType === 'post') {
                const isArtistCollected = urlInfo && ArtistManager.exists(urlInfo.userId);
                const artistBtn = document.createElement('button');
                artistBtn.className = `coomer-quick-btn collect-artist ${isArtistCollected ? 'collected' : ''}`;
                artistBtn.innerHTML = isArtistCollected ? '✓ 已藏艺术家' : '👤 艺术家';
                artistBtn.addEventListener('click', () => this.handleCollectArtist(artistBtn));
                container.appendChild(artistBtn);
            }

            // 作品收藏按钮
            if (pageType === 'post') {
                const isPostCollected = urlInfo && PostManager.exists(urlInfo.postId);
                const postBtn = document.createElement('button');
                postBtn.className = `coomer-quick-btn collect-post ${isPostCollected ? 'collected' : ''}`;
                postBtn.innerHTML = isPostCollected ? '✓ 已藏作品' : '🎬 作品';
                postBtn.addEventListener('click', () => this.handleCollectPost(postBtn));
                container.appendChild(postBtn);
            }

            // 显示并动态定位（紧贴面板顶部）
            if (container.children.length > 0) {
                // 计算面板高度，设置 bottom 值
                const panelHeight = this.panel.offsetHeight;
                container.style.bottom = panelHeight + 'px';
                container.classList.add('show');
            }
        },

        // 隐藏面板上方快捷操作
        hidePanelQuickActions() {
            const container = document.querySelector('.coomer-panel-quick-actions');
            if (container) {
                container.classList.remove('show');
            }
        },

        toggle() {
            this.isOpen ? this.close() : this.open();
        },

        open() {
            this.isOpen = true;
            this.overlay.classList.add('open');
            this.panel.classList.add('open');
            // 隐藏悬浮快捷操作按钮
            if (this.quickActions) {
                this.quickActions.style.display = 'none';
            }
            // 更新面板内快捷操作（移动端）
            this.updatePanelQuickActions();
            // 监听面板高度变化，动态更新收藏按钮位置
            this.startPanelResizeObserver();
            this.renderTab(this.activeTab);
        },

        close() {
            this.isOpen = false;
            this.overlay.classList.remove('open');
            this.panel.classList.remove('open');
            // 恢复悬浮快捷操作按钮
            if (this.quickActions) {
                this.quickActions.style.display = '';
            }
            // 隐藏面板上方快捷操作（移动端）
            this.hidePanelQuickActions();
            // 停止监听面板高度变化
            this.stopPanelResizeObserver();
        },

        // 开始监听面板高度变化
        startPanelResizeObserver() {
            if (this.panelResizeObserver) return;
            const container = document.querySelector('.coomer-panel-quick-actions');
            if (!container) return;

            this.panelResizeObserver = new ResizeObserver(() => {
                if (this.isOpen && container.classList.contains('show')) {
                    const panelHeight = this.panel.offsetHeight;
                    container.style.bottom = panelHeight + 'px';
                }
            });
            this.panelResizeObserver.observe(this.panel);
        },

        // 停止监听面板高度变化
        stopPanelResizeObserver() {
            if (this.panelResizeObserver) {
                this.panelResizeObserver.disconnect();
                this.panelResizeObserver = null;
            }
        },

        switchTab(tabName) {
            this.activeTab = tabName;
            this.panel.querySelectorAll('.coomer-tab').forEach((tab) => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            // 切换标签时清空搜索
            if (this.searchInput) {
                this.searchInput.value = '';
                SearchManager.currentQuery = '';
                const clearBtn = this.panel.querySelector('.coomer-search-clear');
                if (clearBtn) clearBtn.classList.remove('visible');
            }
            this.updateSearchPlaceholder();
            this.renderTab(tabName);
        },

        renderTab(tabName) {
            const content = this.contentArea;
            content.innerHTML = '';

            switch (tabName) {
                case 'artists':
                    this.renderArtistsTab(content);
                    break;
                case 'posts':
                    this.renderPostsTab(content);
                    break;
                case 'settings':
                    this.renderSettingsTab(content);
                    break;
            }
        },

        renderArtistsTab(container) {
            const myArtists = ArtistManager.getSortedList();
            const presetArtists = PRESET_ARTISTS;
            const settings = StorageManager.getSettings();
            const query = SearchManager.currentQuery;

            // 搜索模式
            if (query.trim()) {
                const allArtists = [...presetArtists.map((a) => ({ ...a, isPreset: true })), ...myArtists.map((a) => ({ ...a, isPreset: false }))];
                const results = SearchManager.searchArtists(query, allArtists);

                if (!results || results.length === 0) {
                    container.innerHTML = `
                        <div class="coomer-no-results">
                            <div class="coomer-no-results-icon">🔍</div>
                            <div>未找到匹配的艺术家</div>
                            <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">尝试其他关键词</div>
                        </div>
                    `;
                    return;
                }

                const grid = document.createElement('div');
                grid.className = 'coomer-grid';
                results.forEach((artist) => {
                    grid.appendChild(this.createArtistCard(artist, artist.isPreset));
                });
                container.appendChild(grid);
                return;
            }

            // 如果都没有内容，显示空状态
            if (myArtists.length === 0 && presetArtists.length === 0) {
                container.innerHTML = `
                    <div class="coomer-empty">
                        <div class="coomer-empty-icon">📌</div>
                        <div>暂无收藏的艺术家</div>
                        <div style="font-size: 12px; margin-top: 8px;">访问艺术家主页并点击收藏按钮</div>
                    </div>
                `;
                return;
            }

            // 渲染预置艺术家分组（佬友严选）
            if (presetArtists.length > 0) {
                const presetGroup = this.createArtistGroup(
                    '📌 佬友严选',
                    presetArtists,
                    settings.presetCollapsed,
                    'preset',
                    true, // 是预置列表
                );
                container.appendChild(presetGroup);
            }

            // 渲染我的收藏分组
            if (myArtists.length > 0) {
                const myGroup = this.createArtistGroup(
                    '⭐ 我的收藏',
                    myArtists,
                    settings.myCollectionCollapsed,
                    'myCollection',
                    false, // 不是预置列表
                );
                container.appendChild(myGroup);
            } else if (presetArtists.length > 0) {
                // 有预置但没有自己收藏的，显示提示
                const emptyHint = document.createElement('div');
                emptyHint.style.cssText = 'text-align: center; color: #888; padding: 20px; font-size: 12px;';
                emptyHint.textContent = '点击艺术家卡片访问主页，或使用快捷按钮收藏';
                container.appendChild(emptyHint);
            }
        },

        // 创建艺术家分组
        createArtistGroup(title, artists, isCollapsed, settingKey, isPreset) {
            const group = document.createElement('div');
            group.className = 'coomer-group';

            // 分组标题
            const header = document.createElement('div');
            header.className = 'coomer-group-header';
            header.innerHTML = `
                <div class="coomer-group-title">
                    ${title}
                    <span class="coomer-group-count">(${artists.length})</span>
                </div>
                <span class="coomer-group-toggle ${isCollapsed ? 'collapsed' : ''}">▼</span>
            `;
            header.addEventListener('click', () => {
                const content = group.querySelector('.coomer-group-content');
                const toggle = header.querySelector('.coomer-group-toggle');
                const isCurrentlyCollapsed = content.classList.contains('collapsed');
                // 切换折叠状态
                content.classList.toggle('collapsed', !isCurrentlyCollapsed);
                toggle.classList.toggle('collapsed', !isCurrentlyCollapsed);
                // 设置 max-height
                content.style.maxHeight = isCurrentlyCollapsed ? content.scrollHeight + 'px' : '0';
                // 保存折叠状态
                const settings = StorageManager.getSettings();
                settings[settingKey + 'Collapsed'] = !isCurrentlyCollapsed;
                StorageManager.setSettings(settings);
            });
            group.appendChild(header);

            // 分组内容
            const content = document.createElement('div');
            content.className = `coomer-group-content ${isCollapsed ? 'collapsed' : ''}`;

            const grid = document.createElement('div');
            grid.className = 'coomer-grid';

            artists.forEach((artist) => {
                const card = this.createArtistCard(artist, isPreset);
                grid.appendChild(card);
            });

            content.appendChild(grid);
            group.appendChild(content);

            return group;
        },

        // 创建艺术家卡片
        createArtistCard(artist, isPreset = false) {
            const isInMyCollection = !isPreset && ArtistManager.exists(artist.id);
            const card = document.createElement('div');
            card.className = `coomer-card ${artist.isPinned ? 'pinned' : ''}`;

            if (isPreset) {
                // 预置艺术家卡片
                const isAlreadyCollected = ArtistManager.exists(artist.id);
                card.innerHTML = `
                    <img class="coomer-card-img" src="${artist.avatar || 'https://via.placeholder.com/100?text=No+Image'}" 
                         alt="${artist.nickname}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/100?text=Error'">
                    <div class="coomer-card-info">
                        <div class="coomer-card-name">${artist.nickname}</div>
                        <div class="coomer-card-meta">${artist.platform} ${isAlreadyCollected ? '✓' : ''}</div>
                    </div>
                `;
                // 点击预置卡片：跳转到主页
                card.addEventListener('click', () => {
                    this.navigateTo(artist.homepageUrl);
                });
                // 右键添加到收藏
                card.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (!ArtistManager.exists(artist.id)) {
                        ArtistManager.add({
                            ...artist,
                            isPreset: false,
                            addedAt: Date.now(),
                        });
                        this.renderTab('artists');
                        this.showToast(`已添加 ${artist.nickname} 到我的收藏`, 'success');
                    } else {
                        this.showToast('该艺术家已在收藏中', 'error');
                    }
                });
                card.title = '点击访问主页，右键添加到收藏';
            } else {
                // 我的收藏卡片
                card.innerHTML = `
                    <button class="coomer-card-pin ${artist.isPinned ? 'pinned' : ''}" title="${artist.isPinned ? '取消置顶' : '置顶'}">📌</button>
                    <button class="coomer-card-delete" title="删除">×</button>
                    <img class="coomer-card-img" src="${artist.avatar || 'https://via.placeholder.com/100?text=No+Image'}" 
                         alt="${artist.nickname}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/100?text=Error'">
                    <div class="coomer-card-info">
                        <div class="coomer-card-name">${artist.nickname}</div>
                        <div class="coomer-card-meta">${artist.platform}</div>
                    </div>
                `;

                // 点击卡片跳转到艺术家主页
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('coomer-card-delete') || e.target.classList.contains('coomer-card-pin')) return;
                    this.navigateTo(artist.homepageUrl);
                });

                // 置顶按钮
                card.querySelector('.coomer-card-pin').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isPinned = ArtistManager.togglePin(artist.id);
                    this.renderTab('artists');
                    this.showToast(isPinned ? '已置顶' : '已取消置顶', 'success');
                });

                // 删除按钮
                card.querySelector('.coomer-card-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`确定要删除 ${artist.nickname} 吗？`)) {
                        ArtistManager.remove(artist.id);
                        this.renderTab('artists');
                        this.updateQuickActionsState();
                        this.showToast('已删除', 'success');
                    }
                });
            }

            return card;
        },

        renderPostsTab(container) {
            let posts = PostManager.getSortedList(); // 使用排序后的列表
            const query = SearchManager.currentQuery;

            // 搜索模式
            if (query.trim()) {
                const results = SearchManager.searchPosts(query, posts);
                if (!results || results.length === 0) {
                    container.innerHTML = `
                        <div class="coomer-no-results">
                            <div class="coomer-no-results-icon">🔍</div>
                            <div>未找到匹配的作品</div>
                            <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">尝试其他关键词</div>
                        </div>
                    `;
                    return;
                }
                posts = results;
            }

            if (posts.length === 0) {
                container.innerHTML = `
                    <div class="coomer-empty">
                        <div class="coomer-empty-icon">🎬</div>
                        <div>暂无收藏的作品</div>
                        <div style="font-size: 12px; margin-top: 8px;">访问作品页面并点击收藏按钮</div>
                    </div>
                `;
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'coomer-grid';

            posts.forEach((post) => {
                const card = document.createElement('div');
                card.className = `coomer-card ${post.isPinned ? 'pinned' : ''}`;
                // 媒体数量角标
                const mediaCount = post.mediaUrls ? post.mediaUrls.length : 0;
                const countBadge = mediaCount > 0 ? `<span class="coomer-card-count">${post.type === 'video' ? '🎬' : '📷'} ${mediaCount}</span>` : '';
                card.innerHTML = `
                    <button class="coomer-card-pin ${post.isPinned ? 'pinned' : ''}" title="${post.isPinned ? '取消置顶' : '置顶'}">📌</button>
                    <button class="coomer-card-delete" title="删除">×</button>
                    ${countBadge}
                    <img class="coomer-card-img" src="${post.thumb || 'https://via.placeholder.com/100?text=' + (post.type === 'video' ? '🎬' : '📷')}" 
                         alt="${post.title}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/100?text=${post.type === 'video' ? '🎬' : '📷'}'">
                    <div class="coomer-card-info">
                        <div class="coomer-card-name">${post.title}</div>
                        <div class="coomer-card-meta">${post.type === 'video' ? '🎬' : '🖼️'} ${post.artistName}</div>
                    </div>
                `;

                // 点击卡片查看详情
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('coomer-card-delete') || e.target.classList.contains('coomer-card-pin')) return;
                    this.showPostDetail(post);
                });

                // 置顶按钮
                card.querySelector('.coomer-card-pin').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isPinned = PostManager.togglePin(post.id);
                    this.renderTab('posts');
                    this.showToast(isPinned ? '已置顶' : '已取消置顶', 'success');
                });

                // 删除按钮
                card.querySelector('.coomer-card-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`确定要删除这个作品吗？`)) {
                        PostManager.remove(post.id);
                        this.renderTab('posts');
                        this.updateQuickActionsState();
                        this.showToast('已删除', 'success');
                    }
                });

                grid.appendChild(card);
            });

            container.appendChild(grid);
        },

        showPostDetail(post) {
            // 根据类型生成预览内容
            let previewContent = '';
            if (post.type === 'video' && post.mediaUrls && post.mediaUrls.length > 0) {
                // 视频作品：显示播放按钮列表
                const videoList = post.mediaUrls
                    .map((url, index) => {
                        // 单个视频显示"点击播放"，多个视频显示"视频 1"、"视频 2"...
                        const displayName = post.mediaUrls.length === 1 ? '点击播放' : `视频 ${index + 1} 点击播放`;
                        return `
                        <div class="coomer-video-item" data-url="${url}">
                            <span class="coomer-video-icon">▶️</span>
                            <span class="coomer-video-name">${displayName}</span>
                        </div>
                    `;
                    })
                    .join('');
                previewContent = `
                    <div class="coomer-video-list">
                        ${videoList}
                    </div>
                `;
            } else if (post.thumb) {
                // 图片作品：显示缩略图
                previewContent = `<img class="coomer-card-img" src="${post.thumb}" style="width: 100%; border-radius: 8px; aspect-ratio: 16/9;">`;
            } else {
                // 无预览时显示占位符
                previewContent = `<div style="width: 100%; height: 120px; background: #252540; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;">${
                    post.type === 'video' ? '🎬' : '📷'
                }</div>`;
            }

            this.contentArea.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <button class="coomer-btn coomer-btn-secondary" id="back-btn">← 返回</button>
                </div>
                ${previewContent}
                <h3 style="margin: 12px 0 8px; font-size: 16px;">${post.title}</h3>
                <p style="color: #888; font-size: 14px;">艺术家: ${
                    post.platform ? `<a href="#" id="artist-link" style="color: var(--coomer-primary); text-decoration: none; cursor: pointer;">${post.artistName}</a>` : post.artistName
                }</p>
                
                <div class="coomer-btn-group">
                    <button class="coomer-btn coomer-btn-primary" id="open-btn">📖 打开页面</button>
                    <button class="coomer-btn coomer-btn-secondary" id="copy-btn">📋 复制下载链接 (${post.mediaUrls ? post.mediaUrls.length : 0})</button>
                </div>
                <div class="coomer-btn-group">
                    <button class="coomer-btn coomer-btn-danger" id="delete-btn">🗑️ 删除</button>
                </div>
            `;

            this.contentArea.querySelector('#back-btn').addEventListener('click', () => {
                this.renderTab('posts');
            });

            this.contentArea.querySelector('#open-btn').addEventListener('click', () => {
                this.navigateTo(post.pageUrl);
            });

            // 艺术家链接点击事件（仅在有 platform 数据时绑定）
            if (post.platform) {
                this.contentArea.querySelector('#artist-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    const artistUrl = `https://coomer.st/${post.platform}/user/${post.artistId}`;
                    this.navigateTo(artistUrl);
                });
            }

            this.contentArea.querySelector('#copy-btn').addEventListener('click', () => {
                const links = post.mediaUrls.join('\n');
                GM_setClipboard(links);
                const count = post.mediaUrls.length;
                this.showToast(`已复制 ${count} 条下载链接`, 'success');
            });

            this.contentArea.querySelector('#delete-btn').addEventListener('click', () => {
                if (confirm('确定要删除这个作品吗？')) {
                    PostManager.remove(post.id);
                    this.renderTab('posts');
                    this.updateQuickActionsState();
                    this.showToast('已删除', 'success');
                }
            });

            // 视频播放按钮点击事件 - 使用 video.js 播放
            this.contentArea.querySelectorAll('.coomer-video-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const url = item.dataset.url;
                    this.playVideo(url);
                });
            });
        },

        // 使用 video.js 播放视频
        playVideo(url) {
            // 注入 Video.js 自定义暗黑主题
            if (!document.getElementById('coomer-video-theme')) {
                const style = document.createElement('style');
                style.id = 'coomer-video-theme';
                style.textContent = `
                    .video-js .vjs-big-play-button {
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        line-height: 2em;
                        height: 2em;
                        width: 2em;
                        border-radius: 50%;
                        background-color: rgba(224, 170, 62, 0.9);
                        border: none;
                        font-size: 3.5em;
                        box-shadow: 0 0 30px rgba(0,0,0,0.5);
                        backdrop-filter: blur(4px);
                    }
                    .video-js .vjs-big-play-button:hover {
                        background-color: #E0AA3E;
                        transform: translate(-50%, -50%) scale(1.1);
                    }
                    .video-js .vjs-control-bar {
                        background-color: rgba(0, 0, 0, 0.8);
                        border-radius: 8px;
                        margin: 12px;
                        width: calc(100% - 24px);
                        bottom: 0;
                        height: 48px;
                        display: flex;
                        align-items: center;
                    }
                    .video-js .vjs-button {
                        color: #E0E0E0;
                    }
                    .video-js .vjs-button:hover {
                        color: #E0AA3E;
                    }
                    .video-js .vjs-slider {
                        background-color: rgba(255, 255, 255, 0.2);
                    }
                    .video-js .vjs-play-progress {
                        background-color: #E0AA3E;
                    }
                    .video-js .vjs-play-progress:before {
                        color: #E0AA3E;
                    }
                    .video-js .vjs-load-progress {
                        background-color: rgba(255, 255, 255, 0.1);
                    }
                    .video-js .vjs-load-progress div {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    /* 快进快退按钮图标适配 */
                    .video-js .vjs-skip-backward-15,
                    .video-js .vjs-skip-forward-15 {
                        font-family: FontAwesome, sans-serif; /* fallback */
                    }
                    .video-js .vjs-skip-backward-15:before {
                        content: "↺";
                        font-size: 1.5em; /* 调整图标大小 */
                        line-height: 1.8;
                    }
                    .video-js .vjs-skip-forward-15:before {
                        content: "↻";
                        font-size: 1.5em; /* 调整图标大小 */
                        line-height: 1.8;
                    }
                    /* 确保按钮在 hover 时变为金色 */
                    .video-js .vjs-skip-backward-15:hover,
                    .video-js .vjs-skip-forward-15:hover {
                         color: #E0AA3E;
                    }
                `;
                document.head.appendChild(style);
            }

            // 创建播放器容器
            const playerContainer = document.createElement('div');
            playerContainer.className = 'coomer-video-player-overlay';
            playerContainer.innerHTML = `
                <div class="coomer-video-player-wrapper">
                    <button class="coomer-video-close">×</button>
                    <video id="coomer-video-player" class="video-js vjs-big-play-centered vjs-fluid" controls preload="auto">
                        <source src="${url}" type="video/mp4">
                    </video>
                </div>
            `;
            document.body.appendChild(playerContainer);

            // 初始化 video.js 播放器
            const player = videojs('coomer-video-player', {
                fluid: true,
                autoplay: true,
                controls: true,
                playbackRates: [0.5, 1.0, 1.5, 2.0], // 倍速播放
                userActions: {
                    doubleClick: true, // 双击全屏
                    hotkeys: true, // 启用键盘热键
                },
                controlBar: {
                    children: [
                        'playToggle',
                        'skipBackward', // 后退 10s
                        'skipForward', // 快进 10s
                        'currentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'playbackRateMenuButton',
                        'volumePanel',
                        'pictureInPictureToggle',
                        'fullscreenToggle',
                    ],
                    skipButtons: {
                        forward: 10, // Video.js 8.x 只支持 5/10/30 秒
                        backward: 10,
                    },
                },
            });

            // 自动聚焦以便键盘控制 + 自动全屏
            player.ready(() => {
                player.focus();

                // 自动全屏（设置开启时）
                const settings = StorageManager.getSettings();
                if (settings.autoFullscreen) {
                    player.one('play', () => {
                        setTimeout(() => {
                            if (!document.fullscreenElement && !player.paused()) {
                                // 对播放器容器请求全屏，保留 Video.js 控件
                                const playerEl = player.el();
                                if (playerEl.requestFullscreen) {
                                    playerEl.requestFullscreen().catch(() => {});
                                } else if (playerEl.webkitRequestFullscreen) {
                                    playerEl.webkitRequestFullscreen();
                                }
                            }
                        }, 300);
                    });
                }
            });

            const closePlayer = () => {
                if (player) {
                    player.dispose();
                }
                if (playerContainer && playerContainer.parentNode) {
                    playerContainer.parentNode.removeChild(playerContainer);
                }
                document.removeEventListener('keydown', escHandler);
            };

            // 关闭按钮
            playerContainer.querySelector('.coomer-video-close').addEventListener('click', closePlayer);

            // 点击遮罩关闭
            playerContainer.addEventListener('click', (e) => {
                if (e.target === playerContainer) {
                    closePlayer();
                }
            });

            // ESC 键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closePlayer();
                }
            };
            document.addEventListener('keydown', escHandler);
        },

        renderSettingsTab(container) {
            const settings = StorageManager.getSettings();

            container.innerHTML = `
                <div class="coomer-setting-item">
                    <span class="coomer-setting-label">🚫 屏蔽广告</span>
                    <div class="coomer-toggle ${settings.blockAds ? 'active' : ''}" data-key="blockAds"></div>
                </div>
                <div class="coomer-setting-item">
                    <span class="coomer-setting-label">📺 自动全屏</span>
                    <div class="coomer-toggle ${settings.autoFullscreen ? 'active' : ''}" data-key="autoFullscreen"></div>
                </div>
                <div style="margin-top: 24px;">
                    <div class="coomer-btn-group">
                        <button class="coomer-btn coomer-btn-secondary" id="export-btn">📤 导出数据</button>
                        <button class="coomer-btn coomer-btn-secondary" id="import-btn">📥 导入数据</button>
                    </div>
                </div>
                <div style="margin-top: 16px; text-align: center; color: #666; font-size: 12px;">
                    <div>Coomer 佬友严选 v1.0.0</div>
                    <div style="margin-top: 4px;">艺术家: ${ArtistManager.count()} | 作品: ${PostManager.count()}</div>
                </div>
            `;

            // 绑定开关事件
            container.querySelectorAll('.coomer-toggle').forEach((toggle) => {
                toggle.addEventListener('click', () => {
                    const key = toggle.dataset.key;
                    const newSettings = StorageManager.getSettings();
                    newSettings[key] = !newSettings[key];
                    StorageManager.setSettings(newSettings);
                    toggle.classList.toggle('active');
                    this.showToast('设置已保存', 'success');
                });
            });

            // 导出数据
            container.querySelector('#export-btn').addEventListener('click', () => {
                const data = {
                    artists: ArtistManager.getAll(),
                    posts: PostManager.getAll(),
                    settings: StorageManager.getSettings(),
                    exportedAt: Date.now(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `coomer-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('数据已导出', 'success');
            });

            // 导入数据
            container.querySelector('#import-btn').addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        try {
                            const data = JSON.parse(evt.target.result);
                            if (data.artists) StorageManager.setArtists(data.artists);
                            if (data.posts) StorageManager.setPosts(data.posts);
                            if (data.settings) StorageManager.setSettings(data.settings);
                            this.showToast('数据已导入', 'success');
                            this.renderTab('settings');
                        } catch {
                            this.showToast('导入失败，文件格式错误', 'error');
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        },

        showToast(message, type = '') {
            // 移除已有的 toast
            document.querySelectorAll('.coomer-toast').forEach((t) => t.remove());

            const toast = document.createElement('div');
            toast.className = `coomer-toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add('show');
            });

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        },
    };

    // ============================================
    // 初始化
    // ============================================
    function init() {
        // 广告拦截需要在 document-start 时执行
        AdBlocker.init();

        // 等待 DOM 加载完成后初始化其他功能
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
            initUI();
        }
    }

    function initUI() {
        // 注入样式
        VideoPlayerEnhancer.injectStyles();

        // 等待页面完全渲染（SPA 需要延迟）
        setTimeout(() => {
            UIPanel.init();
            AutoFullscreen.init();
            VideoPlayerEnhancer.init();

            // 监听 SPA URL 变化
            if (window.onurlchange === null) {
                window.addEventListener('urlchange', (info) => {
                    // URL 变化时重新创建快捷操作按钮
                    UIPanel.recreateQuickActions();
                });
            }
        }, 1000);
    }

    init();
})();
