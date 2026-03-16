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

  // ─── Message Handler ───
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
