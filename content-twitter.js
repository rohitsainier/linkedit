(() => {
  'use strict';
  if (window.__linkedcomment_loaded) return;
  window.__linkedcomment_loaded = true;

  const DEBUG = true;
  function log(...args) { if (DEBUG) console.log('[LinkedComment:X]', ...args); }

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
  let darkModeSetting = 'auto';

  function isXDark() {
    return document.body.style.backgroundColor === 'rgb(0, 0, 0)' ||
           document.documentElement.getAttribute('data-theme') === 'dark' ||
           document.body.getAttribute('data-color-mode') === 'dark' ||
           document.documentElement.style.colorScheme === 'dark' ||
           getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)' ||
           getComputedStyle(document.body).backgroundColor === 'rgb(21, 32, 43)';
  }

  let _applyingDark = false;
  function applyDarkMode() {
    if (_applyingDark) return;
    _applyingDark = true;
    let shouldBeDark = false;
    if (darkModeSetting === 'dark') {
      shouldBeDark = true;
    } else if (darkModeSetting === 'auto') {
      shouldBeDark = isXDark();
    }
    if (shouldBeDark) {
      document.documentElement.classList.add('linkedcomment-dark');
    } else {
      document.documentElement.classList.remove('linkedcomment-dark');
    }
    _applyingDark = false;
  }

  // Apply X.com platform class for theming
  document.documentElement.classList.add('linkedcomment-xcom');

  const themeObserver = new MutationObserver(() => {
    if (darkModeSetting === 'auto') applyDarkMode();
  });
  if (document.body) {
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-color-mode'] });
  } else {
    const bodyWait = setInterval(() => {
      if (document.body) {
        clearInterval(bodyWait);
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-color-mode'] });
      }
    }, 200);
  }

  // ─── Find all feed posts (X.com tweets) ───
  function findAllFeedPosts() {
    const posts = [];
    const seen = new Set();

    // Primary: article elements with data-testid="tweet"
    document.querySelectorAll('article[data-testid="tweet"]').forEach(el => {
      if (!seen.has(el)) {
        seen.add(el);
        posts.push(el);
      }
    });

    if (posts.length > 0) {
      log(`Found ${posts.length} tweets via data-testid="tweet"`);
      return posts;
    }

    // Fallback: article elements in timeline
    document.querySelectorAll('[data-testid="primaryColumn"] article').forEach(el => {
      if (!seen.has(el)) {
        seen.add(el);
        posts.push(el);
      }
    });

    log(`Found ${posts.length} tweets via fallback`);
    return posts;
  }

  // ─── Find the most visible tweet ───
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

  // ─── Expand truncated tweets ───
  function expandPost(postEl) {
    if (!postEl) return;

    // Strategy 1: data-testid based "Show more" link
    const showMore = postEl.querySelector('[data-testid="tweet-text-show-more-link"]');
    if (showMore && showMore.offsetParent !== null) {
      showMore.click();
      return;
    }

    // Strategy 2: "Show more" text content
    const allLinks = postEl.querySelectorAll('a, button, span[role="button"], div[role="button"]');
    for (const el of allLinks) {
      const text = el.textContent.trim().toLowerCase();
      if (text === 'show more' || text === 'show this thread') {
        el.click();
        return;
      }
    }
  }

  // ─── Extract text from a tweet ───
  function extractPostText(postEl) {
    if (!postEl) return null;

    function cleanText(raw) {
      if (!raw) return '';
      return raw
        .replace(/\s*Show more\s*/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Strategy 1: data-testid="tweetText"
    const tweetText = postEl.querySelector('[data-testid="tweetText"]');
    if (tweetText) {
      const text = cleanText(tweetText.textContent);
      if (text.length > 10) {
        log('Text extracted via data-testid="tweetText"');
        return text;
      }
    }

    // Strategy 2: div[lang] within tweet (X.com uses lang attribute on tweet text)
    const langDivs = postEl.querySelectorAll('div[lang]');
    for (const div of langDivs) {
      if (div.closest('blockquote')) continue; // skip quoted tweets
      const text = cleanText(div.textContent);
      if (text.length > 10) {
        return text;
      }
    }

    // Strategy 3: Broadest fallback — longest text block
    const candidates = postEl.querySelectorAll('div, span');
    let bestText = '';
    for (const el of candidates) {
      if (el.closest('button, nav, header, [role="group"]')) continue;
      const text = cleanText(el.textContent);
      if (text.length > bestText.length && text.length > 30) {
        bestText = text;
      }
    }
    if (bestText) return bestText;
    return null;
  }

  // ─── Extract author name from a tweet ───
  function extractAuthor(postEl) {
    if (!postEl) return null;

    // Strategy 1: data-testid="User-Name"
    const userName = postEl.querySelector('[data-testid="User-Name"]');
    if (userName) {
      // The first text element inside is usually the display name
      const nameEl = userName.querySelector('a span');
      if (nameEl) return nameEl.textContent.trim();
      return userName.textContent.trim().split('\n')[0].trim();
    }

    // Strategy 2: aria-label on tweet article
    const label = postEl.getAttribute('aria-label');
    if (label) {
      // Labels are like "Post by @username"
      const match = label.match(/(?:Post|Tweet) by @?(\S+)/i);
      if (match) return match[1];
    }

    return null;
  }

  // ─── Find reply box for a tweet ───
  function findCommentBox(postEl) {
    if (!postEl) return null;

    const selectors = [
      // X.com reply textbox
      '[data-testid="tweetTextarea_0"] [role="textbox"][contenteditable="true"]',
      '[data-testid="tweetTextarea_0"]',
      // Reply modal
      '[aria-labelledby="modal-header"] [role="textbox"][contenteditable="true"]',
      // Generic
      '[role="textbox"][contenteditable="true"]',
      '[contenteditable="true"][data-offset-key]',
      '[contenteditable="true"]'
    ];

    // Search within the post
    for (const sel of selectors) {
      const el = postEl.querySelector(sel);
      if (el) return el;
    }

    // Walk up parents
    let ancestor = postEl.parentElement;
    for (let i = 0; i < 5 && ancestor; i++) {
      for (const sel of selectors) {
        const el = ancestor.querySelector(sel);
        if (el) return el;
      }
      ancestor = ancestor.parentElement;
    }

    // Check reply modal (X.com opens replies in modals)
    const modal = document.querySelector('[aria-labelledby="modal-header"], [aria-modal="true"], [data-testid="sheetDialog"]');
    if (modal) {
      for (const sel of selectors) {
        const el = modal.querySelector(sel);
        if (el) return el;
      }
    }

    // Check inline reply area below tweet
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

  // ─── Try to open the reply box ───
  function openCommentBox(postEl) {
    if (!postEl) return false;

    // Strategy 1: data-testid="reply" button
    const replyBtn = postEl.querySelector('[data-testid="reply"]');
    if (replyBtn) {
      replyBtn.click();
      return true;
    }

    // Strategy 2: aria-label="Reply"
    const ariaBtn = postEl.querySelector('button[aria-label="Reply"], button[aria-label="reply"]');
    if (ariaBtn) {
      ariaBtn.click();
      return true;
    }

    // Strategy 3: Find button with reply icon (speech bubble SVG)
    const allBtns = postEl.querySelectorAll('[role="group"] button');
    for (const btn of allBtns) {
      const label = btn.getAttribute('aria-label') || '';
      if (label.toLowerCase().includes('repl')) {
        btn.click();
        return true;
      }
    }

    return false;
  }

  // ─── Insert text into a contenteditable element ───
  function insertText(editor, text) {
    editor.focus();
    // X.com uses Draft.js — need to simulate proper input
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);

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
    feedObserver: null,
    scanTimer: null
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

  // ─── Extract engagement from a tweet ───
  function extractEngagement(postEl) {
    const engagement = { reactions: 0, comments: 0, reposts: 0, views: 0 };
    if (!postEl) return engagement;

    // X.com puts engagement in the action group at the bottom of each tweet
    const actionGroup = postEl.querySelector('[role="group"]');
    if (!actionGroup) return engagement;

    // Strategy 1: Parse aria-labels on action buttons
    const buttons = actionGroup.querySelectorAll('button[aria-label], a[aria-label]');
    for (const btn of buttons) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();

      if (label.includes('like') && !label.includes('unlike') && engagement.reactions === 0) {
        engagement.reactions = parseEngagementCount(label);
      } else if (label.includes('repl') && engagement.comments === 0) {
        engagement.comments = parseEngagementCount(label);
      } else if ((label.includes('repost') || label.includes('retweet')) && engagement.reposts === 0) {
        engagement.reposts = parseEngagementCount(label);
      } else if (label.includes('view') && engagement.views === 0) {
        engagement.views = parseEngagementCount(label);
      }
    }

    // Strategy 2: Parse text inside app-text-transition-container (count numbers)
    if (engagement.reactions === 0 && engagement.comments === 0) {
      const countContainers = actionGroup.querySelectorAll('[data-testid="app-text-transition-container"]');
      const counts = [];
      for (const c of countContainers) {
        const num = parseEngagementCount(c.textContent);
        if (num > 0) counts.push(num);
      }
      // X.com order: replies, reposts, likes, views/bookmarks
      if (counts.length >= 4) {
        engagement.comments = counts[0];
        engagement.reposts = counts[1];
        engagement.reactions = counts[2];
        engagement.views = counts[3];
      } else if (counts.length >= 3) {
        engagement.comments = counts[0];
        engagement.reposts = counts[1];
        engagement.reactions = counts[2];
      } else if (counts.length === 2) {
        engagement.reposts = counts[0];
        engagement.reactions = counts[1];
      } else if (counts.length === 1) {
        engagement.reactions = counts[0];
      }
    }

    log('Engagement:', engagement);
    return engagement;
  }

  function isPromotedPost(postEl) {
    // X.com marks ads with "Ad" or "Promoted" text
    const spans = postEl.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent.trim().toLowerCase();
      if (text.length < 15 && (text === 'ad' || text === 'promoted')) return true;
    }
    // Also check for "Ad" in aria labels
    const adLabel = postEl.querySelector('[data-testid="socialContext"]');
    if (adLabel && adLabel.textContent.trim().toLowerCase().includes('promoted')) return true;
    return false;
  }

  function formatCount(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    return String(num);
  }

  // ─── Inline Comment Widget ───
  const SYSTEM_PROMPT = `You are an X.com (Twitter) engagement expert. Your job is to write a single reply to a tweet/post.

Rules:
- Write ONLY the reply text, nothing else (no "Here's a reply:" preamble)
- Keep it concise: 1-2 short sentences (under 280 characters — this is X.com)
- Sound genuine and human, not robotic or generic
- Add value: share a perspective, ask a smart question, or offer a relevant take
- Do NOT overuse hashtags (1 max if relevant, 0 is fine)
- Do NOT use markdown formatting (no **, ##, etc)
- Do NOT start with generic replies like "Great take!" or "So true!"
- Match the energy and tone of the original post
- Be punchy and direct — X.com rewards brevity`;

  const STYLE_MAP = {
    'insightful': 'Add a thoughtful insight, data point, or non-obvious perspective that builds on the post. Show expertise.',
    'supportive': 'Agree and amplify — share a brief personal take or example that validates the point. Be genuine.',
    'curious': 'Ask a smart, specific follow-up question that shows you read carefully. Not generic.',
    'contrarian': 'Respectfully challenge or offer an alternative perspective. Be constructive. Acknowledge the point, then pivot.',
    'criticize': 'Point out flaws, gaps, or weaknesses. Be direct and specific. Stay professional but firm. Back up the critique with reasoning.'
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
          <input type="text" class="linkedcomment-angle" placeholder="Your angle (optional) — e.g. &quot;as a dev&quot;">
          <button class="linkedcomment-gen-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Generate Reply
          </button>
          <div class="linkedcomment-loading"><div class="linkedcomment-spinner"></div><span>Crafting your reply...</span></div>
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
          errorEl.textContent = 'Could not extract tweet text.';
          errorEl.classList.add('visible');
          return;
        }

        const angle = widget.querySelector('.linkedcomment-angle').value.trim();
        const prompt = `Write a reply to this X.com post.\n\nStyle: ${STYLE_MAP[selectedStyle] || STYLE_MAP['insightful']}${angle ? `\nPersonal angle: ${angle}` : ''}\n\nPost:\n"""\n${postText.substring(0, 1500)}\n"""\n\nWrite the reply now:`;

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
          errorEl.textContent = err.message;
          errorEl.classList.add('visible');
        } finally {
          genBtn.disabled = false;
          genBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Generate Reply';
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

      // Insert into X.com reply box
      widget.querySelector('.linkedcomment-btn-insert').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!lastComment) return;
        window.__linkedcomment_lastPost = postEl;

        let box = findCommentBox(postEl);
        if (!box) {
          const opened = openCommentBox(postEl);
          if (opened) {
            let retries = 0;
            const maxRetries = 5;
            const tryFind = () => {
              box = findCommentBox(postEl);
              if (box) {
                insertText(box, lastComment);
                showToast('Reply inserted!');
                closeActiveWidget();
              } else if (retries < maxRetries) {
                retries++;
                setTimeout(tryFind, 400 * retries);
              } else {
                showToast('Reply box not found. Click "Reply" first.');
              }
            };
            setTimeout(tryFind, 500);
            return;
          }
          showToast('Click "Reply" on the tweet first.');
          return;
        }
        insertText(box, lastComment);
        showToast('Reply inserted!');
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

    const totalScore = engagement.reactions + (engagement.comments * 5) + (engagement.reposts * 3) + Math.floor(engagement.views / 100);
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
    if (engagement.reactions > 0) parts.push(`<span class="linkedcomment-stat-num">${formatCount(engagement.reactions)}</span> likes`);
    if (engagement.comments > 0) parts.push(`<span class="linkedcomment-stat-num">${formatCount(engagement.comments)}</span> replies`);
    if (engagement.reposts > 0) parts.push(`<span class="linkedcomment-stat-num">${formatCount(engagement.reposts)}</span> reposts`);
    if (engagement.views > 0) parts.push(`<span class="linkedcomment-stat-num">${formatCount(engagement.views)}</span> views`);

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
    if (postEl.hasAttribute('data-linkedcomment-processed')) return;
    postEl.setAttribute('data-linkedcomment-processed', 'true');

    if (isPromotedPost(postEl)) return;

    const engagement = extractEngagement(postEl);
    const t = highReach.thresholds;

    log('Tweet engagement:', engagement, 'Thresholds:', t);

    if (engagement.reactions >= t.reactions || engagement.comments >= t.comments || engagement.reposts >= t.reposts) {
      injectBadge(postEl, engagement);
    }
  }

  // ─── Debounced scan ───
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
        const rect = post.getBoundingClientRect();
        if (rect.bottom >= -500 && rect.top <= window.innerHeight + 500) {
          processPost(post);
          processed++;
        }
      }
    }
    if (processed > 0) log(`Processed ${processed} new tweets`);
  }

  function startDetector() {
    if (highReach.feedObserver) return;

    log('Starting X.com feed detector');
    scanFeedPosts();

    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        scanFeedPosts();
      }, 500);
    }, { passive: true });

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
      const text = extractPostText(post);
      window.__linkedcomment_lastPost = post;
      sendResponse({ text, author: extractAuthor(post) });
      return;
    }

    if (msg.action === 'insertComment') {
      const post = window.__linkedcomment_lastPost || findBestPost();

      let commentBox = findCommentBox(post);

      if (!commentBox) {
        const opened = openCommentBox(post);
        if (opened) {
          let retries = 0;
          const maxRetries = 5;
          const tryFind = () => {
            commentBox = findCommentBox(post);
            if (commentBox) {
              insertText(commentBox, msg.text);
              showToast('Reply inserted!');
              sendResponse({ ok: true });
            } else if (retries < maxRetries) {
              retries++;
              setTimeout(tryFind, 400 * retries);
            } else {
              sendResponse({ ok: false, error: 'Reply box did not open. Click "Reply" manually first.' });
            }
          };
          setTimeout(tryFind, 500);
          return true;
        }
        sendResponse({ ok: false, error: 'No reply box found. Click "Reply" on the tweet first.' });
        return;
      }

      insertText(commentBox, msg.text);
      showToast('Reply inserted!');
      sendResponse({ ok: true });
      return;
    }
  });

})();
