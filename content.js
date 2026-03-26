(() => {
  'use strict';
  if (window.__linkedcomment_loaded) return;
  window.__linkedcomment_loaded = true;

  const DEBUG = true;
  function log(...args) { if (DEBUG) console.log('[LinkedComment]', ...args); }

  // ─── Toast UI ───
  const toastEl = document.createElement('div');
  toastEl.id = 'linkedcomment-toast';
  document.body.appendChild(toastEl);

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  // ─── Dark Mode Detection ───
  let darkModeSetting = 'auto'; // 'auto', 'light', 'dark'

  function isLinkedInDark() {
    return document.body.classList.contains('theme--dark') ||
           document.documentElement.classList.contains('theme--dark') ||
           document.documentElement.getAttribute('data-theme') === 'dark' ||
           document.body.getAttribute('data-theme') === 'dark';
  }

  let _applyingDark = false;
  function applyDarkMode() {
    if (_applyingDark) return;
    _applyingDark = true;
    let shouldBeDark = false;
    if (darkModeSetting === 'dark') {
      shouldBeDark = true;
    } else if (darkModeSetting === 'auto') {
      shouldBeDark = isLinkedInDark();
    }
    if (shouldBeDark) {
      document.documentElement.classList.add('linkedcomment-dark');
    } else {
      document.documentElement.classList.remove('linkedcomment-dark');
    }
    _applyingDark = false;
  }

  const themeObserver = new MutationObserver(() => {
    if (darkModeSetting === 'auto') applyDarkMode();
  });
  if (document.body) {
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  } else {
    const bodyWait = setInterval(() => {
      if (document.body) {
        clearInterval(bodyWait);
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
      }
    }, 200);
  }

  // ─── Find all feed posts (SDUI-compatible) ───
  // LinkedIn SDUI wraps each feed post in a container with an <h2> containing "Feed post".
  // Falls back to legacy selectors for older LinkedIn versions.
  function findAllFeedPosts() {
    const posts = [];
    const seen = new Set();

    // Strategy 1 (SDUI): h2 containing "Feed post" screen-reader text
    document.querySelectorAll('h2').forEach(h2 => {
      const text = h2.textContent.trim();
      if (text === 'Feed post' || text.startsWith('Feed post')) {
        const container = h2.parentElement;
        if (container && !seen.has(container)) {
          seen.add(container);
          posts.push(container);
        }
      }
    });

    if (posts.length > 0) {
      log(`Found ${posts.length} posts via SDUI h2 strategy`);
      return posts;
    }

    // Strategy 2 (Legacy): .occludable-update
    document.querySelectorAll('.occludable-update').forEach(el => {
      if (!el.parentElement?.closest('.occludable-update')) {
        if (!seen.has(el)) { seen.add(el); posts.push(el); }
      }
    });

    if (posts.length > 0) {
      log(`Found ${posts.length} posts via legacy .occludable-update`);
      return posts;
    }

    // Strategy 3 (Fallback): data-urn containing activity
    document.querySelectorAll('[data-urn*="urn:li:activity"]').forEach(el => {
      if (!seen.has(el)) { seen.add(el); posts.push(el); }
    });

    log(`Found ${posts.length} posts via fallback strategies`);
    return posts;
  }

  // ─── Find the most visible LinkedIn post ───
  function findBestPost() {
    const posts = findAllFeedPosts();
    let bestPost = null;
    let bestScore = -Infinity;
    const viewportCenter = window.innerHeight / 2;

    for (const post of posts) {
      const rect = post.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      const center = rect.top + rect.height / 2;
      const score = -Math.abs(center - viewportCenter);
      if (score > bestScore) {
        bestScore = score;
        bestPost = post;
      }
    }
    return bestPost;
  }

  // ─── Click "see more" to expand truncated posts ───
  function expandPost(postEl) {
    if (!postEl) return;

    // Strategy 1 (SDUI): data-testid
    const testIdBtn = postEl.querySelector('[data-testid="expandable-text-button"]');
    if (testIdBtn && testIdBtn.offsetParent !== null) {
      testIdBtn.click();
      return;
    }

    // Strategy 2 (Legacy selectors)
    const legacySelectors = [
      'button.feed-shared-inline-show-more-text',
      'button[aria-label*="see more"]',
      'button[aria-label*="See more"]',
      '.feed-shared-text-view__see-more-less-toggle',
      '.see-more',
      'button.feed-shared-inline-show-more-text--minimal-padding',
      '[data-test-id="feed-shared-inline-show-more-text"]'
    ];
    for (const sel of legacySelectors) {
      const btn = postEl.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return;
      }
    }

    // Strategy 3: Match by text content
    const allButtons = postEl.querySelectorAll('button, span[role="button"]');
    for (const btn of allButtons) {
      const text = btn.textContent.trim().toLowerCase();
      if (text === '…see more' || text === 'see more' || text === '...see more' ||
          text === '… more' || text === '…more') {
        btn.click();
        return;
      }
    }
  }

  // ─── Extract text from a post element ───
  function extractPostText(postEl) {
    if (!postEl) return null;

    function cleanText(raw) {
      if (!raw) return '';
      return raw
        .replace(/\s*…\s*more\s*/gi, '')
        .replace(/\s*…see more\s*/gi, '')
        .replace(/\s*\.\.\.see more\s*/gi, '')
        .replace(/\s*see less\s*/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Strategy 1 (SDUI): data-testid="expandable-text-box"
    const textBox = postEl.querySelector('[data-testid="expandable-text-box"]');
    if (textBox) {
      const text = cleanText(textBox.textContent);
      if (text.length > 20) {
        log('Text extracted via data-testid="expandable-text-box"');
        return text;
      }
    }

    // Strategy 2: Collect dir="ltr" spans
    const dirSpans = postEl.querySelectorAll('span[dir="ltr"]');
    if (dirSpans.length > 0) {
      const textSpans = Array.from(dirSpans).filter(span => {
        if (span.closest('button, nav, header, h2, [class*="social-counts"], [class*="actor"], [class*="comment-box"]')) return false;
        if (span.textContent.trim().length < 2) return false;
        return true;
      });
      if (textSpans.length > 0) {
        let container = textSpans[0].parentElement;
        for (let i = 0; i < 5; i++) {
          if (!container || !container.parentElement) break;
          const containedSpans = container.querySelectorAll('span[dir="ltr"]');
          if (containedSpans.length >= textSpans.length) break;
          container = container.parentElement;
        }
        if (container) {
          const text = cleanText(container.textContent);
          if (text.length > 20) return text;
        }
        const allText = textSpans.map(s => s.textContent.trim()).filter(Boolean).join('\n');
        const cleaned = cleanText(allText);
        if (cleaned.length > 20) return cleaned;
      }
    }

    // Strategy 3: Known LinkedIn selectors (legacy)
    const textSelectors = [
      '.feed-shared-text .break-words',
      '.update-components-text .break-words',
      '[data-test-id="main-feed-activity-card__commentary"]',
      '.feed-shared-update-v2__commentary .break-words',
      '.feed-shared-update-v2__commentary',
      '.feed-shared-text',
      '.update-components-text'
    ];
    for (const sel of textSelectors) {
      const el = postEl.querySelector(sel);
      if (el) {
        let text = cleanText(el.textContent);
        if (text && text.length > 20) return text;
        text = cleanText(el.innerText);
        if (text && text.length > 20) return text;
      }
    }

    // Strategy 4: Broadest fallback — find longest text block
    const skipSelectors = 'button, nav, header, h2, footer';
    const candidates = postEl.querySelectorAll('div, p, span, article');
    let bestText = '';
    for (const el of candidates) {
      if (el.closest(skipSelectors)) continue;
      if (el.querySelector('button[aria-label*="Like"], button[aria-label*="Comment"]')) continue;
      const text = cleanText(el.textContent);
      if (text.length > bestText.length && text.length > 50) {
        bestText = text;
      }
    }
    if (bestText) return bestText;
    return null;
  }

  // ─── Extract author name from a post element ───
  function extractAuthor(postEl) {
    if (!postEl) return null;

    // Strategy 1 (SDUI): Parse from overflow menu button aria-label
    const menuBtn = postEl.querySelector('button[aria-label*="control menu for post by"]');
    if (menuBtn) {
      const label = menuBtn.getAttribute('aria-label');
      const match = label.match(/post by (.+)/i);
      if (match) return match[1].trim();
    }

    // Strategy 2 (SDUI): Parse from "Hide post by" button
    const hideBtn = postEl.querySelector('button[aria-label*="Hide post by"]');
    if (hideBtn) {
      const label = hideBtn.getAttribute('aria-label');
      const match = label.match(/post by (.+)/i);
      if (match) return match[1].trim();
    }

    // Strategy 3 (SDUI): Parse from "Follow" button aria-label
    const followBtn = postEl.querySelector('button[aria-label*="Follow "]');
    if (followBtn) {
      const label = followBtn.getAttribute('aria-label');
      const match = label.match(/Follow (.+)/i);
      if (match) return match[1].trim();
    }

    // Strategy 4 (Legacy)
    const authorSelectors = [
      '.update-components-actor__name .visually-hidden',
      '.update-components-actor__title .visually-hidden',
      '.feed-shared-actor__name .visually-hidden',
      '.feed-shared-actor__title',
      '.update-components-actor__name',
      '.feed-shared-actor__name'
    ];
    for (const sel of authorSelectors) {
      const el = postEl.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim().split('\n')[0].trim();
      }
    }
    return null;
  }

  // ─── Find comment box for the best post ───
  function findCommentBox(postEl) {
    if (!postEl) return null;

    const selectors = [
      // SDUI: contenteditable with role="textbox"
      '[role="textbox"][contenteditable="true"]',
      // SDUI: data-testid based comment input
      '[data-testid="comment-texteditor"] [contenteditable="true"]',
      // SDUI: aria-label based
      '[aria-label="Write a comment…"][contenteditable="true"]',
      '[aria-label="Write a comment"][contenteditable="true"]',
      '[aria-placeholder="Add a comment…"][contenteditable="true"]',
      // Generic contenteditable inside the post
      '[contenteditable="true"]',
      // Legacy
      '.ql-editor[contenteditable="true"]',
      '.comments-comment-box [contenteditable="true"]',
      '.comments-comment-texteditor [contenteditable="true"]'
    ];

    // Search within the post element first
    for (const sel of selectors) {
      const el = postEl.querySelector(sel);
      if (el) return el;
    }

    // Walk up several parent levels (SDUI renders comment box outside post sometimes)
    let ancestor = postEl.parentElement;
    for (let i = 0; i < 5 && ancestor; i++) {
      for (const sel of selectors) {
        const el = ancestor.querySelector(sel);
        if (el) return el;
      }
      ancestor = ancestor.parentElement;
    }

    // Last resort: find the nearest comment box in the next sibling containers
    let sibling = postEl.nextElementSibling;
    for (let i = 0; i < 3 && sibling; i++) {
      for (const sel of selectors) {
        const el = sibling.querySelector(sel);
        if (el) return el;
      }
      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  // ─── Try to open the comment box ───
  function openCommentBox(postEl) {
    if (!postEl) return false;

    // Strategy 1 (SDUI): Find button containing comment SVG icon
    const commentSvg = postEl.querySelector('svg#comment-small');
    if (commentSvg) {
      const btn = commentSvg.closest('button');
      if (btn) { btn.click(); return true; }
    }

    // Strategy 2 (SDUI): Find button with "Comment" text
    const allBtns = postEl.querySelectorAll('button');
    for (const btn of allBtns) {
      const text = btn.textContent.trim();
      if (text === 'Comment') {
        btn.click();
        return true;
      }
    }

    // Strategy 3 (Legacy)
    const legacySelectors = [
      'button[aria-label*="Comment"]',
      'button[aria-label*="comment"]',
      '.social-actions-button--comment',
      '.comment-button',
      'button.comments-comment-social-bar__comment-action'
    ];
    for (const sel of legacySelectors) {
      const btn = postEl.querySelector(sel);
      if (btn) { btn.click(); return true; }
    }
    return false;
  }

  // ─── Insert text into a contenteditable element ───
  function insertText(editor, text) {
    editor.focus();
    editor.textContent = '';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.execCommand('insertText', false, text);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ─── High-Reach Post Detector ───
  const highReach = {
    enabled: true,
    thresholds: { reactions: 100, comments: 20, reposts: 10 },
    badgeCount: 0,
    maxBadges: 1000,
    observer: null,      // IntersectionObserver (legacy)
    feedObserver: null,   // MutationObserver for new posts
    scanTimer: null       // Debounce timer for SDUI scanning
  };

  function parseEngagementCount(text) {
    if (!text) return 0;
    const cleaned = text.replace(/,/g, '').trim().toLowerCase();
    const match = cleaned.match(/([\d.]+)(k|m)?\b/);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2] === 'k') num *= 1000;
    if (match[2] === 'm') num *= 1000000;
    return Math.round(num);
  }

  // ─── Extract engagement (reactions, comments, reposts) ───
  // SDUI uses screen-reader spans (class e992b629 or similar) with text like "20 reactions"
  // Also checks aria-hidden spans with count text as backup.
  function extractEngagement(postEl) {
    const engagement = { reactions: 0, comments: 0, reposts: 0 };
    if (!postEl) return engagement;

    // Strategy 1 (SDUI): Screen-reader spans with count text
    // These are spans with class "e992b629" containing text like "20 reactions", "8 comments"
    // Also look for any span whose text matches the pattern "N reactions/comments/reposts"
    const allSpans = postEl.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent.trim().toLowerCase();
      // Only match short text that looks like a count (avoid matching long post text)
      if (text.length > 50) continue;

      if (text.match(/^\d[\d,.]*[km]?\s*reactions?$/) && engagement.reactions === 0) {
        engagement.reactions = parseEngagementCount(text);
      } else if (text.match(/^\d[\d,.]*[km]?\s*comments?$/) && engagement.comments === 0) {
        engagement.comments = parseEngagementCount(text);
      } else if (text.match(/^\d[\d,.]*[km]?\s*reposts?$/) && engagement.reposts === 0) {
        engagement.reposts = parseEngagementCount(text);
      }
    }

    if (engagement.reactions > 0 || engagement.comments > 0 || engagement.reposts > 0) {
      log('Engagement via SDUI spans:', engagement);
      return engagement;
    }

    // Strategy 2 (Legacy): Old class-based selectors
    const allSocialDetails = postEl.querySelectorAll('.social-details-social-activity');
    let scopeEl = allSocialDetails.length > 0
      ? allSocialDetails[allSocialDetails.length - 1]
      : null;
    if (!scopeEl) {
      const allCounts = postEl.querySelectorAll('.social-details-social-counts');
      if (allCounts.length > 0) scopeEl = allCounts[allCounts.length - 1];
    }
    if (!scopeEl) scopeEl = postEl;

    const reactEl = scopeEl.querySelector('.social-details-social-counts__reactions-count');
    if (reactEl && reactEl.textContent.trim()) {
      engagement.reactions = parseEngagementCount(reactEl.textContent);
    }
    if (engagement.reactions === 0) {
      const reactBtn = scopeEl.querySelector('button[aria-label*="reaction"], button[aria-label*="like"]');
      if (reactBtn) engagement.reactions = parseEngagementCount(reactBtn.getAttribute('aria-label') || '');
    }

    const countEls = scopeEl.querySelectorAll('.social-details-social-counts__item, .social-details-social-counts__comments');
    for (const el of countEls) {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('comment') && engagement.comments === 0) engagement.comments = parseEngagementCount(text);
      if (text.includes('repost') && engagement.reposts === 0) engagement.reposts = parseEngagementCount(text);
    }

    if (engagement.comments === 0 || engagement.reposts === 0) {
      const btns = scopeEl.querySelectorAll('button[aria-label]');
      for (const btn of btns) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes('comment') && !label.includes('add') && engagement.comments === 0) {
          engagement.comments = parseEngagementCount(label);
        }
        if (label.includes('repost') && engagement.reposts === 0) {
          engagement.reposts = parseEngagementCount(label);
        }
      }
    }

    log('Engagement via legacy selectors:', engagement);
    return engagement;
  }

  function isPromotedPost(postEl) {
    // Strategy 1 (SDUI): Check for "Promoted" or "Sponsored" text in short <p> elements
    const paragraphs = postEl.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent.trim().toLowerCase();
      if (text.length < 20 && (text === 'promoted' || text === 'sponsored')) return true;
    }

    // Strategy 2 (Legacy)
    const subDesc = postEl.querySelector('.feed-shared-actor__sub-description, .update-components-actor__sub-description');
    if (subDesc && subDesc.textContent.trim().toLowerCase().includes('promoted')) return true;
    return false;
  }

  function formatCount(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    return String(num);
  }

  // ─── Inline Comment Widget ───
  const SYSTEM_PROMPT = `You are a LinkedIn engagement expert. Your job is to write a single comment in response to a LinkedIn post.

Rules:
- Write ONLY the comment text, nothing else (no "Here's a comment:" preamble)
- Keep it concise: 1-3 short sentences (under 280 characters ideally)
- Sound genuine and human, not robotic or generic
- Add value: share a perspective, ask a smart question, or offer a relevant insight
- Do NOT use hashtags in comments
- Do NOT use markdown formatting (no **, ##, etc)
- Do NOT start with "Great post!" or "Thanks for sharing!" — those are generic and low-value
- Match the energy of the original post`;

  const STYLE_MAP = {
    'insightful': 'Add a thoughtful insight, data point, or non-obvious perspective that builds on the post. Show you have domain expertise.',
    'supportive': 'Agree and amplify — share a brief personal experience or example that validates the post\'s point. Be warm and genuine.',
    'curious': 'Ask a smart, specific follow-up question that shows you read carefully and want to learn more. Not generic.',
    'contrarian': 'Respectfully challenge or offer an alternative perspective. Be constructive, not argumentative. Start with acknowledging the point, then pivot.',
    'criticize': 'Point out flaws, gaps, or weaknesses in the argument. Be direct and specific about what is wrong or misleading. Stay professional but firm — no sugarcoating. Back up the critique with reasoning or evidence.'
  };

  let activeWidget = null;

  function closeActiveWidget() {
    if (activeWidget) {
      activeWidget.remove();
      activeWidget = null;
    }
  }

  function isExtensionValid() {
    try {
      return !!chrome.runtime?.id;
    } catch { return false; }
  }

  function createWidget(postEl) {
    closeActiveWidget();

    if (!isExtensionValid()) {
      showToast('Extension reloaded — please refresh this page.');
      return;
    }

    chrome.storage.local.get(['aiProvider', 'ollamaUrl', 'ollamaModel', 'openaiApiKey', 'openaiModel', 'geminiApiKey', 'geminiModel', 'claudeApiKey', 'claudeModel'], (settings) => {
      const provider = settings.aiProvider || 'ollama';
      const ollamaUrl = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');

      const modelKeys = { ollama: 'ollamaModel', openai: 'openaiModel', gemini: 'geminiModel', claude: 'claudeModel' };
      const apiKeyKeys = { openai: 'openaiApiKey', gemini: 'geminiApiKey', claude: 'claudeApiKey' };
      const activeModel = settings[modelKeys[provider]] || '';
      const activeApiKey = provider !== 'ollama' ? (settings[apiKeyKeys[provider]] || '') : '';

      const providerConfig = { provider, model: activeModel, apiKey: activeApiKey, ollamaUrl };

      const widget = document.createElement('div');
      widget.className = 'linkedcomment-widget';
      let selectedStyle = 'insightful';
      let lastComment = '';

      // Check if provider is properly configured
      const needsApiKey = provider !== 'ollama' && !activeApiKey;
      const needsModel = !activeModel;

      if (needsApiKey || needsModel) {
        const providerNames = { ollama: 'Ollama', openai: 'OpenAI', gemini: 'Google Gemini', claude: 'Anthropic Claude' };
        const issue = needsApiKey ? `No API key set for ${providerNames[provider]}` : `No model selected for ${providerNames[provider]}`;
        widget.innerHTML = `
          <div class="linkedcomment-widget-header">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> LinkedComment</span>
            <button class="linkedcomment-widget-close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="linkedcomment-widget-body">
            <div class="linkedcomment-no-model">${issue}. Click the LinkedComment extension icon to configure.</div>
          </div>
        `;
        widget.querySelector('.linkedcomment-widget-close').addEventListener('click', (e) => {
          e.stopPropagation();
          closeActiveWidget();
        });
        postEl.appendChild(widget);
        activeWidget = widget;
        return;
      }

      widget.innerHTML = `
        <div class="linkedcomment-widget-header">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> LinkedComment</span>
          <button class="linkedcomment-widget-close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="linkedcomment-widget-body">
          <div class="linkedcomment-styles">
            <button class="linkedcomment-style-btn active" data-style="insightful">Insightful</button>
            <button class="linkedcomment-style-btn" data-style="supportive">Supportive</button>
            <button class="linkedcomment-style-btn" data-style="curious">Curious</button>
            <button class="linkedcomment-style-btn" data-style="contrarian">Contrarian</button>
            <button class="linkedcomment-style-btn" data-style="criticize">Criticize</button>
          </div>
          <input type="text" class="linkedcomment-angle" placeholder="Your angle (optional) — e.g. &quot;as a startup founder&quot;">
          <button class="linkedcomment-gen-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Generate Comment
          </button>
          <div class="linkedcomment-loading"><div class="linkedcomment-spinner"></div><span>Crafting your comment...</span></div>
          <div class="linkedcomment-error"></div>
          <div class="linkedcomment-output">
            <div class="linkedcomment-comment-box"></div>
            <div class="linkedcomment-actions">
              <button class="linkedcomment-btn-copy">Copy</button>
              <button class="linkedcomment-btn-insert">Insert</button>
              <button class="linkedcomment-btn-redo">Redo</button>
            </div>
          </div>
        </div>
      `;

      // Style selection
      widget.querySelectorAll('.linkedcomment-style-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          widget.querySelectorAll('.linkedcomment-style-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedStyle = btn.dataset.style;
        });
      });

      widget.querySelector('.linkedcomment-widget-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeActiveWidget();
      });

      const genBtn = widget.querySelector('.linkedcomment-gen-btn');
      const loadingEl = widget.querySelector('.linkedcomment-loading');
      const errorEl = widget.querySelector('.linkedcomment-error');
      const outputEl = widget.querySelector('.linkedcomment-output');
      const commentBox = widget.querySelector('.linkedcomment-comment-box');

      async function doGenerate() {
        expandPost(postEl);
        await new Promise(r => setTimeout(r, 300));
        const postText = extractPostText(postEl);
        if (!postText) {
          errorEl.textContent = 'Could not extract post text.';
          errorEl.classList.add('visible');
          return;
        }

        const angle = widget.querySelector('.linkedcomment-angle').value.trim();
        const prompt = `Write a LinkedIn comment on this post.\n\nStyle: ${STYLE_MAP[selectedStyle] || STYLE_MAP['insightful']}${angle ? `\nPersonal angle: ${angle}` : ''}\n\nPost:\n"""\n${postText.substring(0, 1500)}\n"""\n\nWrite the comment now:`;

        errorEl.classList.remove('visible');
        outputEl.classList.remove('visible');
        loadingEl.classList.add('visible');
        genBtn.disabled = true;
        genBtn.textContent = 'Generating...';

        try {
          const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              action: 'aiGenerate',
              provider: providerConfig.provider,
              model: providerConfig.model,
              apiKey: providerConfig.apiKey,
              ollamaUrl: providerConfig.ollamaUrl,
              systemPrompt: SYSTEM_PROMPT,
              userPrompt: prompt
            }, (response) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else if (!response || !response.ok) reject(new Error(response?.error || 'Generation failed'));
              else resolve(response.data);
            });
          });

          loadingEl.classList.remove('visible');
          let cleaned = result.trim().replace(/^["']|["']$/g, '');
          lastComment = cleaned;

          const escaped = cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const paragraphs = escaped.split(/\n{2,}/);
          let html = '';
          paragraphs.forEach(p => {
            const t = p.trim();
            if (t) html += `<p>${t.replace(/\n/g, '<br>')}</p>`;
          });
          commentBox.innerHTML = html || `<p>${escaped}</p>`;
          outputEl.classList.add('visible');

          if (!cleaned) {
            outputEl.classList.remove('visible');
            errorEl.textContent = 'Empty response. Try a different model.';
            errorEl.classList.add('visible');
          }
        } catch (err) {
          loadingEl.classList.remove('visible');
          let msg = err.message;
          // Error messages are already provider-aware from background.js
          errorEl.textContent = msg;
          errorEl.classList.add('visible');
        } finally {
          genBtn.disabled = false;
          genBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Generate Comment';
        }
      }

      genBtn.addEventListener('click', (e) => { e.stopPropagation(); doGenerate(); });
      widget.querySelector('.linkedcomment-btn-redo').addEventListener('click', (e) => { e.stopPropagation(); doGenerate(); });

      // Copy
      widget.querySelector('.linkedcomment-btn-copy').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!lastComment) return;
        try {
          await navigator.clipboard.writeText(lastComment);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = lastComment;
          ta.style.cssText = 'position:fixed;left:-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        const btn = widget.querySelector('.linkedcomment-btn-copy');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
        showToast('Copied to clipboard!');
      });

      // Insert into LinkedIn comment box
      widget.querySelector('.linkedcomment-btn-insert').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!lastComment) return;
        window.__linkedcomment_lastPost = postEl;

        let box = findCommentBox(postEl);
        if (!box) {
          const opened = openCommentBox(postEl);
          if (opened) {
            // Retry with increasing delays — SDUI renders async
            let retries = 0;
            const maxRetries = 5;
            const tryFind = () => {
              box = findCommentBox(postEl);
              if (box) {
                insertText(box, lastComment);
                showToast('Comment inserted!');
                closeActiveWidget();
              } else if (retries < maxRetries) {
                retries++;
                setTimeout(tryFind, 400 * retries);
              } else {
                showToast('Comment box not found. Click "Comment" first.');
              }
            };
            setTimeout(tryFind, 500);
            return;
          }
          showToast('Click "Comment" on the post first.');
          return;
        }
        insertText(box, lastComment);
        showToast('Comment inserted!');
        closeActiveWidget();
      });

      widget.addEventListener('click', (e) => e.stopPropagation());
      postEl.appendChild(widget);
      activeWidget = widget;
    });
  }

  function injectBadge(postEl, engagement) {
    if (postEl.querySelector(':scope > .linkedcomment-reach-badge')) return;
    if (highReach.badgeCount >= highReach.maxBadges) return;

    const computed = window.getComputedStyle(postEl);
    if (computed.position === 'static') {
      postEl.style.position = 'relative';
    }

    const badge = document.createElement('div');
    badge.className = 'linkedcomment-reach-badge';

    const totalScore = engagement.reactions + (engagement.comments * 5) + (engagement.reposts * 3);
    let tier = 'warm';
    let tierLabel = 'Trending';
    if (totalScore >= 5000) {
      tier = 'viral';
      tierLabel = '🔥 Viral';
    } else if (totalScore >= 1000) {
      tier = 'hot';
      tierLabel = '⚡ Hot';
    }
    badge.setAttribute('data-tier', tier);

    const parts = [];
    if (engagement.reactions > 0) parts.push(`<span class="linkedcomment-stat-num">${formatCount(engagement.reactions)}</span> reactions`);
    if (engagement.comments > 0) parts.push(`<span class="linkedcomment-stat-num">${formatCount(engagement.comments)}</span> comments`);
    if (engagement.reposts > 0) parts.push(`<span class="linkedcomment-stat-num">${formatCount(engagement.reposts)}</span> reposts`);

    badge.innerHTML = `
      ${tier === 'warm' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' : ''}
      <span>${tierLabel}</span>
      ${parts.length ? `<span class="linkedcomment-badge-stats">${parts.join(' · ')}</span>` : ''}
      <span class="linkedcomment-badge-dot"></span>
      <span class="linkedcomment-badge-cta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Reply</span>
    `;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const existingWidget = postEl.querySelector('.linkedcomment-widget');
      if (existingWidget) {
        closeActiveWidget();
        return;
      }
      createWidget(postEl);
    });

    postEl.appendChild(badge);
    highReach.badgeCount++;
  }

  function processPost(postEl) {
    // Dedup: mark processed using a data attribute
    if (postEl.hasAttribute('data-linkedcomment-processed')) return;
    postEl.setAttribute('data-linkedcomment-processed', 'true');

    if (isPromotedPost(postEl)) return;

    const engagement = extractEngagement(postEl);
    const t = highReach.thresholds;

    log('Post engagement:', engagement, 'Thresholds:', t);

    if (engagement.reactions >= t.reactions || engagement.comments >= t.comments || engagement.reposts >= t.reposts) {
      injectBadge(postEl, engagement);
    }
  }

  // ─── Debounced scan for new posts ───
  function scheduleScan() {
    if (highReach.scanTimer) return;
    highReach.scanTimer = requestAnimationFrame(() => {
      highReach.scanTimer = null;
      scanFeedPosts();
    });
  }

  function scanFeedPosts() {
    const posts = findAllFeedPosts();
    let processed = 0;
    for (const post of posts) {
      if (!post.hasAttribute('data-linkedcomment-processed')) {
        // Only process posts visible in or near viewport
        const rect = post.getBoundingClientRect();
        if (rect.bottom >= -500 && rect.top <= window.innerHeight + 500) {
          processPost(post);
          processed++;
        }
      }
    }
    if (processed > 0) log(`Processed ${processed} new posts`);
  }

  function startDetector() {
    if (highReach.feedObserver) return; // already running

    log('Starting feed detector');

    // Initial scan
    scanFeedPosts();

    // Also scan on scroll (throttled)
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        scanFeedPosts();
      }, 500);
    }, { passive: true });

    // MutationObserver — watch for new posts added to the feed
    highReach.feedObserver = new MutationObserver(() => {
      scheduleScan();
    });

    highReach.feedObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopDetector() {
    if (highReach.feedObserver) {
      highReach.feedObserver.disconnect();
      highReach.feedObserver = null;
    }
    if (highReach.scanTimer) {
      cancelAnimationFrame(highReach.scanTimer);
      highReach.scanTimer = null;
    }
    document.querySelectorAll('.linkedcomment-reach-badge').forEach(b => b.remove());
    document.querySelectorAll('[data-linkedcomment-processed]').forEach(el => el.removeAttribute('data-linkedcomment-processed'));
    highReach.badgeCount = 0;
    log('Detector stopped');
  }

  // Initialize
  if (!isExtensionValid()) return;
  chrome.storage.local.get(['highReachEnabled', 'highReachThresholds', 'darkMode'], (data) => {
    if (data.darkMode) darkModeSetting = data.darkMode;
    applyDarkMode();

    if (data.highReachEnabled === false) {
      highReach.enabled = false;
    } else {
      highReach.enabled = true;
    }
    if (data.highReachThresholds) {
      highReach.thresholds = data.highReachThresholds;
    }
    if (highReach.enabled) {
      setTimeout(startDetector, 2000);
    }
  });

  // React to settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.darkMode) {
      darkModeSetting = changes.darkMode.newValue || 'auto';
      applyDarkMode();
    }
    if (changes.highReachEnabled) {
      highReach.enabled = changes.highReachEnabled.newValue !== false;
      if (highReach.enabled) startDetector();
      else stopDetector();
    }
    if (changes.highReachThresholds && changes.highReachThresholds.newValue) {
      highReach.thresholds = changes.highReachThresholds.newValue;
      if (highReach.enabled) {
        stopDetector();
        startDetector();
      }
    }
  });

  // ─── Message Handler ───
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'toggleHighReach') {
      highReach.enabled = msg.enabled;
      if (msg.enabled) startDetector();
      else stopDetector();
      sendResponse({ ok: true });
      return;
    }

    if (msg.action === 'updateDarkMode') {
      darkModeSetting = msg.darkMode || 'auto';
      applyDarkMode();
      sendResponse({ ok: true });
      return;
    }

    if (msg.action === 'updateThresholds') {
      highReach.thresholds = msg.thresholds;
      if (highReach.enabled) {
        stopDetector();
        startDetector();
      }
      sendResponse({ ok: true });
      return;
    }

    if (msg.action === 'grabPost') {
      const post = findBestPost();
      if (!post) {
        sendResponse({ text: null });
        return;
      }

      const textBefore = extractPostText(post) || '';

      // Check for "see more" button
      const hasSeeMore = post.querySelector('[data-testid="expandable-text-button"]') ||
        post.querySelector('button.feed-shared-inline-show-more-text, button[aria-label*="see more" i], .feed-shared-text-view__see-more-less-toggle, .see-more') ||
        Array.from(post.querySelectorAll('button, span[role="button"]')).some(
          btn => /^(…|\.\.\.)?see more$/i.test(btn.textContent.trim()) || btn.textContent.trim() === '… more' || btn.textContent.trim() === '…more'
        );

      if (!hasSeeMore) {
        window.__linkedcomment_lastPost = post;
        sendResponse({ text: textBefore, author: extractAuthor(post) });
        return;
      }

      let resolved = false;
      const observer = new MutationObserver(() => {
        if (resolved) return;
        const textAfter = extractPostText(post);
        if (textAfter && textAfter.length > textBefore.length) {
          resolved = true;
          observer.disconnect();
          window.__linkedcomment_lastPost = post;
          sendResponse({ text: textAfter, author: extractAuthor(post) });
        }
      });

      observer.observe(post, { childList: true, subtree: true, characterData: true, attributes: true });
      expandPost(post);

      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        observer.disconnect();
        const text = extractPostText(post);
        window.__linkedcomment_lastPost = post;
        sendResponse({ text: text || textBefore, author: extractAuthor(post) });
      }, 3000);

      return true;
    }

    if (msg.action === 'insertComment') {
      const post = window.__linkedcomment_lastPost || findBestPost();

      let commentBox = findCommentBox(post);

      if (!commentBox) {
        const opened = openCommentBox(post);
        if (opened) {
          // Retry with increasing delays — SDUI renders async
          let retries = 0;
          const maxRetries = 5;
          const tryFind = () => {
            commentBox = findCommentBox(post);
            if (commentBox) {
              insertText(commentBox, msg.text);
              showToast('Comment inserted!');
              sendResponse({ ok: true });
            } else if (retries < maxRetries) {
              retries++;
              setTimeout(tryFind, 400 * retries);
            } else {
              sendResponse({ ok: false, error: 'Comment box did not open. Click "Comment" manually first.' });
            }
          };
          setTimeout(tryFind, 500);
          return true;
        }
        sendResponse({ ok: false, error: 'No comment box found. Click "Comment" on the post first.' });
        return;
      }

      insertText(commentBox, msg.text);
      showToast('Comment inserted!');
      sendResponse({ ok: true });
      return;
    }
  });

})();
