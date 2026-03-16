(() => {
  'use strict';
  if (window.__linkedcomment_loaded) return;
  window.__linkedcomment_loaded = true;

  // ─── Toast UI ───
  const toastEl = document.createElement('div');
  toastEl.id = 'linkedcomment-toast';
  document.body.appendChild(toastEl);

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  // ─── Find the most visible LinkedIn post ───
  function findBestPost() {
    // LinkedIn feed post selectors (multiple patterns for different layouts)
    const postSelectors = [
      '.feed-shared-update-v2',
      '.occludable-update',
      '[data-urn*="activity"]',
      '.scaffold-finite-scroll__content > div'
    ];

    let bestPost = null;
    let bestScore = -Infinity;
    const viewportCenter = window.innerHeight / 2;

    for (const selector of postSelectors) {
      const posts = document.querySelectorAll(selector);
      for (const post of posts) {
        const rect = post.getBoundingClientRect();
        // Skip if not visible
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        // Score by proximity to viewport center
        const center = rect.top + rect.height / 2;
        const score = -Math.abs(center - viewportCenter);
        if (score > bestScore) {
          bestScore = score;
          bestPost = post;
        }
      }
    }
    return bestPost;
  }

  // ─── Click "see more" to expand truncated posts ───
  function expandPost(postEl) {
    if (!postEl) return;
    const seeMoreSelectors = [
      'button.feed-shared-inline-show-more-text',
      'button[aria-label*="see more"]',
      'button[aria-label*="See more"]',
      '.feed-shared-text-view__see-more-less-toggle',
      '.see-more',
      'button.feed-shared-inline-show-more-text--minimal-padding',
      '[data-test-id="feed-shared-inline-show-more-text"]'
    ];
    for (const sel of seeMoreSelectors) {
      const btn = postEl.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return;
      }
    }
    // Also try matching by text content
    const allButtons = postEl.querySelectorAll('button, span[role="button"]');
    for (const btn of allButtons) {
      const text = btn.textContent.trim().toLowerCase();
      if (text === '…see more' || text === 'see more' || text === '...see more') {
        btn.click();
        return;
      }
    }
  }

  // ─── Extract text from a post element ───
  function extractPostText(postEl) {
    if (!postEl) return null;

    // Helper: clean up extracted text
    function cleanText(raw) {
      if (!raw) return '';
      return raw
        .replace(/\s*…see more\s*/gi, '')
        .replace(/\s*\.\.\.see more\s*/gi, '')
        .replace(/\s*see less\s*/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Strategy 1: Collect ALL dir="ltr" spans in the post
    const dirSpans = postEl.querySelectorAll('span[dir="ltr"]');

    if (dirSpans.length > 0) {
      const textSpans = Array.from(dirSpans).filter(span => {
        if (span.closest('button, nav, header, [class*="social-counts"], [class*="actor"], [class*="comment-box"]')) return false;
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

    // Strategy 2: Known LinkedIn selectors
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

    // Strategy 3: Broadest fallback
    const skipSelectors = 'button, nav, header, [class*="social-counts"], [class*="actor"], [class*="comment"], footer';
    const candidates = postEl.querySelectorAll('div, p, span, article');
    let bestText = '';
    let bestEl = null;

    for (const el of candidates) {
      if (el.closest(skipSelectors)) continue;
      if (el.querySelector('button[aria-label*="Like"], button[aria-label*="Comment"]')) continue;
      const text = cleanText(el.textContent);
      if (text.length > bestText.length && text.length > 50) {
        bestText = text;
        bestEl = el;
      }
    }
    if (bestText) return bestText;
    return null;
  }

  // ─── Extract author name from a post element ───
  function extractAuthor(postEl) {
    if (!postEl) return null;

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

    // First try within the post element itself
    const inPostSelectors = [
      '.comments-comment-box [contenteditable="true"]',
      '.comments-comment-texteditor [contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]'
    ];

    for (const sel of inPostSelectors) {
      const el = postEl.querySelector(sel);
      if (el) return el;
    }

    // Try sibling/nearby comment areas
    const parent = postEl.parentElement;
    if (parent) {
      for (const sel of inPostSelectors) {
        const el = parent.querySelector(sel);
        if (el) return el;
      }
    }

    return null;
  }

  // ─── Try to open the comment box ───
  function openCommentBox(postEl) {
    if (!postEl) return false;

    const commentBtnSelectors = [
      'button[aria-label*="Comment"]',
      'button[aria-label*="comment"]',
      '.social-actions-button--comment',
      '.comment-button',
      'button.comments-comment-social-bar__comment-action'
    ];

    for (const sel of commentBtnSelectors) {
      const btn = postEl.querySelector(sel);
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  // ─── Insert text into a contenteditable element ───
  function insertText(editor, text) {
    editor.focus();

    // Clear existing content
    editor.textContent = '';
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    // Use execCommand for better compatibility with LinkedIn's editor
    document.execCommand('insertText', false, text);

    // Trigger input events so LinkedIn picks up the change
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ─── High-Reach Post Detector ───
  const postSelectors = [
    '.feed-shared-update-v2',
    '.occludable-update',
    '[data-urn*="activity"]'
  ];

  const highReach = {
    enabled: true,
    thresholds: { reactions: 100, comments: 20, reposts: 10 },
    processedPosts: new WeakSet(),
    badgeCount: 0,
    maxBadges: 5,
    observer: null,
    feedObserver: null
  };

  function parseEngagementCount(text) {
    if (!text) return 0;
    const cleaned = text.replace(/,/g, '').trim().toLowerCase();
    const match = cleaned.match(/([\d.]+)\s*(k|m)?/);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2] === 'k') num *= 1000;
    if (match[2] === 'm') num *= 1000000;
    return Math.round(num);
  }

  function extractEngagement(postEl) {
    const engagement = { reactions: 0, comments: 0, reposts: 0 };
    if (!postEl) return engagement;

    // Reactions — look for the reactions count element
    const reactionSelectors = [
      '.social-details-social-counts__reactions-count',
      'button[aria-label*="reaction"] span',
      'button[aria-label*="like"] span',
      '.reactions-count',
      'span.social-details-social-counts__reactions-count'
    ];
    for (const sel of reactionSelectors) {
      const el = postEl.querySelector(sel);
      if (el && el.textContent.trim()) {
        engagement.reactions = parseEngagementCount(el.textContent);
        if (engagement.reactions > 0) break;
      }
    }

    // Also try aria-label on the reactions button (e.g. "1,234 reactions")
    if (engagement.reactions === 0) {
      const reactBtn = postEl.querySelector('button[aria-label*="reaction"], button[aria-label*="like"]');
      if (reactBtn) {
        const label = reactBtn.getAttribute('aria-label') || '';
        engagement.reactions = parseEngagementCount(label);
      }
    }

    // Comments & Reposts — from social counts buttons
    const socialBtns = postEl.querySelectorAll('button[aria-label]');
    for (const btn of socialBtns) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('comment') && !label.includes('add')) {
        engagement.comments = parseEngagementCount(label);
      }
      if (label.includes('repost')) {
        engagement.reposts = parseEngagementCount(label);
      }
    }

    // Fallback: try text content of social counts items
    if (engagement.comments === 0 || engagement.reposts === 0) {
      const countItems = postEl.querySelectorAll('.social-details-social-counts__item, .social-details-social-counts__comments');
      for (const item of countItems) {
        const text = item.textContent.trim().toLowerCase();
        if (text.includes('comment') && engagement.comments === 0) {
          engagement.comments = parseEngagementCount(text);
        }
        if (text.includes('repost') && engagement.reposts === 0) {
          engagement.reposts = parseEngagementCount(text);
        }
      }
    }

    return engagement;
  }

  function isPromotedPost(postEl) {
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

  let activeWidget = null; // Track the currently open widget

  function closeActiveWidget() {
    if (activeWidget) {
      activeWidget.remove();
      activeWidget = null;
    }
  }

  function createWidget(postEl) {
    closeActiveWidget();

    // Read Ollama settings
    chrome.storage.local.get(['ollamaUrl', 'ollamaModel'], (settings) => {
      const ollamaUrl = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
      const ollamaModel = settings.ollamaModel || '';

      const widget = document.createElement('div');
      widget.className = 'linkedcomment-widget';
      let selectedStyle = 'insightful';
      let lastComment = '';

      // No model warning
      if (!ollamaModel) {
        widget.innerHTML = `
          <div class="linkedcomment-widget-header">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> LinkedComment</span>
            <button class="linkedcomment-widget-close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="linkedcomment-widget-body">
            <div class="linkedcomment-no-model">No model configured. Click the LinkedComment extension icon to set up Ollama.</div>
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

      // Close button
      widget.querySelector('.linkedcomment-widget-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeActiveWidget();
      });

      // Generate
      const genBtn = widget.querySelector('.linkedcomment-gen-btn');
      const loadingEl = widget.querySelector('.linkedcomment-loading');
      const errorEl = widget.querySelector('.linkedcomment-error');
      const outputEl = widget.querySelector('.linkedcomment-output');
      const commentBox = widget.querySelector('.linkedcomment-comment-box');

      async function doGenerate() {
        // Extract post text
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
              action: 'ollamaStream',
              url: `${ollamaUrl}/api/generate`,
              body: JSON.stringify({
                model: ollamaModel,
                prompt: prompt,
                system: SYSTEM_PROMPT,
                stream: true
              })
            }, (response) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else if (!response || !response.ok) reject(new Error(response?.error || 'Generation failed'));
              else resolve(response.data);
            });
          });

          loadingEl.classList.remove('visible');
          let cleaned = result.trim().replace(/^["']|["']$/g, '');
          lastComment = cleaned;

          // Format as HTML
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
          if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            msg = 'Cannot connect to Ollama. Is it running?';
          }
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
            setTimeout(() => {
              box = findCommentBox(postEl);
              if (box) {
                insertText(box, lastComment);
                showToast('Comment inserted!');
                closeActiveWidget();
              } else {
                showToast('Comment box not found. Click "Comment" first.');
              }
            }, 800);
            return;
          }
          showToast('Click "Comment" on the post first.');
          return;
        }
        insertText(box, lastComment);
        showToast('Comment inserted!');
        closeActiveWidget();
      });

      // Stop clicks inside widget from propagating to LinkedIn
      widget.addEventListener('click', (e) => e.stopPropagation());

      postEl.appendChild(widget);
      activeWidget = widget;
    });
  }

  function injectBadge(postEl, engagement) {
    // Don't duplicate
    if (postEl.querySelector('.linkedcomment-reach-badge')) return;
    if (highReach.badgeCount >= highReach.maxBadges) return;

    // Ensure post is positioned for absolute badge placement
    const computed = window.getComputedStyle(postEl);
    if (computed.position === 'static') {
      postEl.style.position = 'relative';
    }

    const badge = document.createElement('div');
    badge.className = 'linkedcomment-reach-badge';

    // Build stats string
    const parts = [];
    if (engagement.reactions > 0) parts.push(formatCount(engagement.reactions) + ' reactions');
    if (engagement.comments > 0) parts.push(formatCount(engagement.comments) + ' comments');

    badge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span>Trending</span>
      ${parts.length ? `<span class="linkedcomment-badge-stats">${parts.join(' · ')}</span>` : ''}
    `;

    // Click handler — open inline widget
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Toggle: if widget already open on this post, close it
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
    if (highReach.processedPosts.has(postEl)) return;
    highReach.processedPosts.add(postEl);

    // Skip promoted posts
    if (isPromotedPost(postEl)) return;

    const engagement = extractEngagement(postEl);
    const t = highReach.thresholds;

    // Check if any metric exceeds threshold
    if (engagement.reactions >= t.reactions || engagement.comments >= t.comments || engagement.reposts >= t.reposts) {
      injectBadge(postEl, engagement);
    }
  }

  function startDetector() {
    if (highReach.observer) return; // already running

    // IntersectionObserver — process posts as they enter viewport
    highReach.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          processPost(entry.target);
        }
      }
    }, { threshold: 0.3 });

    // Observe all existing posts
    for (const sel of postSelectors) {
      document.querySelectorAll(sel).forEach(post => {
        highReach.observer.observe(post);
      });
    }

    // MutationObserver — watch for new posts added to the feed
    highReach.feedObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          for (const sel of postSelectors) {
            // Check if the added node itself is a post
            if (node.matches?.(sel)) {
              highReach.observer.observe(node);
            }
            // Check children
            node.querySelectorAll?.(sel)?.forEach(post => {
              highReach.observer.observe(post);
            });
          }
        }
      }
    });

    highReach.feedObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopDetector() {
    if (highReach.observer) {
      highReach.observer.disconnect();
      highReach.observer = null;
    }
    if (highReach.feedObserver) {
      highReach.feedObserver.disconnect();
      highReach.feedObserver = null;
    }
    // Remove all badges
    document.querySelectorAll('.linkedcomment-reach-badge').forEach(b => b.remove());
    highReach.badgeCount = 0;
    highReach.processedPosts = new WeakSet();
  }

  // Initialize detector from stored settings
  chrome.storage.local.get(['highReachEnabled', 'highReachThresholds'], (data) => {
    if (data.highReachEnabled === false) {
      highReach.enabled = false;
    } else {
      highReach.enabled = true;
    }
    if (data.highReachThresholds) {
      highReach.thresholds = data.highReachThresholds;
    }
    if (highReach.enabled) {
      // Small delay to let LinkedIn finish rendering
      setTimeout(startDetector, 2000);
    }
  });

  // React to settings changes in real time
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.highReachEnabled) {
      highReach.enabled = changes.highReachEnabled.newValue !== false;
      if (highReach.enabled) {
        startDetector();
      } else {
        stopDetector();
      }
    }
    if (changes.highReachThresholds && changes.highReachThresholds.newValue) {
      highReach.thresholds = changes.highReachThresholds.newValue;
      // Re-scan: stop and restart to re-evaluate with new thresholds
      if (highReach.enabled) {
        stopDetector();
        startDetector();
      }
    }
  });

  // ─── Message Handler ───
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // High-reach toggle from popup
    if (msg.action === 'toggleHighReach') {
      highReach.enabled = msg.enabled;
      if (msg.enabled) startDetector();
      else stopDetector();
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

      // Get text before expanding
      const textBefore = extractPostText(post) || '';

      // Check if there's even a "see more" button — if not, post is already full
      const hasSeeMore = post.querySelector(
        'button.feed-shared-inline-show-more-text, button[aria-label*="see more" i], .feed-shared-text-view__see-more-less-toggle, .see-more'
      ) || Array.from(post.querySelectorAll('button, span[role="button"]')).some(
        btn => /^(…|\.\.\.)?see more$/i.test(btn.textContent.trim())
      );

      if (!hasSeeMore) {
        // Post is already fully expanded
        window.__linkedcomment_lastPost = post;
        sendResponse({ text: textBefore, author: extractAuthor(post) });
        return;
      }

      // Use MutationObserver to detect when LinkedIn finishes expanding
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

      // Click "see more"
      expandPost(post);

      // Safety timeout — if observer doesn't fire within 3s, return best we have
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        observer.disconnect();
        const text = extractPostText(post);
        window.__linkedcomment_lastPost = post;
        sendResponse({ text: text || textBefore, author: extractAuthor(post) });
      }, 3000);

      return true; // async response
    }

    if (msg.action === 'insertComment') {
      const post = window.__linkedcomment_lastPost || findBestPost();

      let commentBox = findCommentBox(post);

      if (!commentBox) {
        // Try opening the comment box first
        const opened = openCommentBox(post);
        if (opened) {
          // Wait for comment box to appear
          setTimeout(() => {
            commentBox = findCommentBox(post);
            if (commentBox) {
              insertText(commentBox, msg.text);
              showToast('Comment inserted!');
              sendResponse({ ok: true });
            } else {
              sendResponse({ ok: false, error: 'Comment box did not open. Click "Comment" manually first.' });
            }
          }, 800);
          return true; // async response
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
