(() => {
  'use strict';
  if (window.__linkedit_loaded) return;
  window.__linkedit_loaded = true;

  // ─── Unicode Font Maps (compact) ───
  const BOLD_UPPER = '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭';
  const BOLD_LOWER = '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇';
  const ITALIC_UPPER = '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡';
  const ITALIC_LOWER = '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻';

  function toBold(text) {
    const bu = [...BOLD_UPPER], bl = [...BOLD_LOWER];
    return [...text].map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return bu[code - 65];
      if (code >= 97 && code <= 122) return bl[code - 97];
      return c;
    }).join('');
  }

  function toItalic(text) {
    const iu = [...ITALIC_UPPER], il = [...ITALIC_LOWER];
    return [...text].map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return iu[code - 65];
      if (code >= 97 && code <= 122) return il[code - 97];
      return c;
    }).join('');
  }

  // ─── Create UI ───
  const floatBar = document.createElement('div');
  floatBar.id = 'linkedit-float-bar';
  floatBar.classList.add('active');

  const miniToolbar = document.createElement('div');
  miniToolbar.id = 'linkedit-mini-toolbar';

  const quickTools = [
    { label: '𝗕 Bold', action: 'bold' },
    { label: '𝘐 Italic', action: 'italic' },
    { label: 'S̶t̶r̶i̶k̶e̶', action: 'strike' },
    { label: '• Bullet', action: 'bullet' },
    { label: '→ Arrow', action: 'arrow' },
    { label: '━━━━', action: 'separator' },
    { label: '✅ ❌', action: 'checklist' },
    { label: '🔥 Fire', action: 'emoji_fire' },
    { label: '📌 Pin', action: 'emoji_pin' },
    { label: '💡 Idea', action: 'emoji_idea' },
  ];

  quickTools.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = 'le-mini-btn';
    btn.textContent = tool.label;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyTool(tool.action);
    });
    miniToolbar.appendChild(btn);
  });

  const fab = document.createElement('button');
  fab.id = 'linkedit-fab';
  fab.textContent = 'Le';
  fab.title = 'LinkeEdit — Format your post';

  let toolbarOpen = false;
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toolbarOpen = !toolbarOpen;
    miniToolbar.classList.toggle('open', toolbarOpen);
    fab.style.background = toolbarOpen ? '#1d4ed8' : '#2563eb';
  });

  floatBar.appendChild(miniToolbar);
  floatBar.appendChild(fab);

  const toastEl = document.createElement('div');
  toastEl.id = 'linkedit-toast';

  document.body.appendChild(floatBar);
  document.body.appendChild(toastEl);

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  // ─── Find LinkedIn's editor ───
  function findEditor() {
    // LinkedIn uses contenteditable divs for post creation
    const editors = document.querySelectorAll(
      '.ql-editor[contenteditable="true"], ' +
      '[role="textbox"][contenteditable="true"], ' +
      '.editor-content [contenteditable="true"], ' +
      '.msg-form__contenteditable [contenteditable="true"]'
    );
    return editors[0] || null;
  }

  function getSelectedTextInEditor(editor) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { text: '', range: null };
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return { text: '', range: null };
    return { text: sel.toString(), range };
  }

  function insertTextAtCursor(editor, text) {
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
        // Trigger input event so LinkedIn picks up the change
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }
    // Fallback: append
    editor.textContent += text;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function replaceSelectedText(editor, newText) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const textNode = document.createTextNode(newText);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ─── Apply Tools ───
  function applyTool(action) {
    const editor = findEditor();
    if (!editor) {
      showToast('Open a LinkedIn post editor first!');
      return;
    }

    const { text, range } = getSelectedTextInEditor(editor);

    switch (action) {
      case 'bold':
        if (text) {
          replaceSelectedText(editor, toBold(text));
          showToast('Bold applied!');
        } else {
          showToast('Select text first, then click Bold');
        }
        break;

      case 'italic':
        if (text) {
          replaceSelectedText(editor, toItalic(text));
          showToast('Italic applied!');
        } else {
          showToast('Select text first, then click Italic');
        }
        break;

      case 'strike':
        if (text) {
          const struck = [...text].map(c => c + '\u0336').join('');
          replaceSelectedText(editor, struck);
          showToast('Strikethrough applied!');
        } else {
          showToast('Select text first');
        }
        break;

      case 'bullet':
        insertTextAtCursor(editor, '\n• ');
        showToast('Bullet inserted');
        break;

      case 'arrow':
        insertTextAtCursor(editor, '\n→ ');
        showToast('Arrow inserted');
        break;

      case 'separator':
        insertTextAtCursor(editor, '\n─────────\n');
        showToast('Separator inserted');
        break;

      case 'checklist':
        insertTextAtCursor(editor, '\n✅ \n❌ ');
        showToast('Checklist inserted');
        break;

      case 'emoji_fire':
        insertTextAtCursor(editor, '🔥');
        break;

      case 'emoji_pin':
        insertTextAtCursor(editor, '📌');
        break;

      case 'emoji_idea':
        insertTextAtCursor(editor, '💡');
        break;
    }
  }

  // ─── Auto-show when LinkedIn editor is open ───
  const observer = new MutationObserver(() => {
    const editor = findEditor();
    floatBar.classList.toggle('active', !!editor);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // ─── Listen for popup messages ───
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggle') {
      toolbarOpen = !toolbarOpen;
      miniToolbar.classList.toggle('open', toolbarOpen);
    }
  });

})();
