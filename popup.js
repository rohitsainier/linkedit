// ─── State ───
let ollamaSettings = { url: 'http://localhost:11434', model: '' };
let commentStyle = 'insightful';
let capturedPost = '';
let lastRawComment = '';

const toastEl = document.getElementById('toast');

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1600);
}

// ─── Post Capture ───
document.getElementById('grabBtn').addEventListener('click', async () => {
  const btn = document.getElementById('grabBtn');
  btn.disabled = true;
  btn.textContent = 'Grabbing...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('linkedin.com')) {
      showToast('Open LinkedIn first!');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'grabPost' });
    if (response && response.text) {
      capturedPost = response.text;
      const preview = document.getElementById('postPreview');
      const postAuthor = document.getElementById('postAuthor');
      const postText = document.getElementById('postText');

      postAuthor.textContent = response.author ? `${response.author}` : 'LinkedIn Post';
      postText.textContent = capturedPost;
      preview.classList.add('visible');

      // Hide paste area if open
      document.getElementById('pasteArea').classList.remove('visible');
      showToast('Post captured!');
    } else {
      showToast('No post found. Scroll to a post and try again.');
    }
  } catch (err) {
    showToast('Cannot reach LinkedIn tab. Refresh the page.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Grab Post from LinkedIn';
  }
});

// Paste toggle
document.getElementById('pasteToggle').addEventListener('click', () => {
  const area = document.getElementById('pasteArea');
  const isVisible = area.classList.contains('visible');
  area.classList.toggle('visible', !isVisible);
  if (!isVisible) area.focus();
});

document.getElementById('pasteArea').addEventListener('input', (e) => {
  capturedPost = e.target.value.trim();
  // Hide preview when manually pasting
  document.getElementById('postPreview').classList.remove('visible');
});

// ─── Style Selection ───
document.querySelectorAll('.style-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    commentStyle = btn.dataset.style;
  });
});

// ─── Ollama Settings ───
function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get(['ollamaUrl', 'ollamaModel'], (data) => {
      if (data.ollamaUrl) ollamaSettings.url = data.ollamaUrl;
      if (data.ollamaModel) ollamaSettings.model = data.ollamaModel;
      document.getElementById('ollamaUrl').value = ollamaSettings.url;
      resolve();
    });
  });
}

function saveSettings() {
  const url = document.getElementById('ollamaUrl').value.trim().replace(/\/+$/, '');
  const model = document.getElementById('ollamaModel').value;
  ollamaSettings.url = url;
  ollamaSettings.model = model;
  chrome.storage.local.set({ ollamaUrl: url, ollamaModel: model });
  showToast('Settings saved');
  document.getElementById('settingsOverlay').style.display = 'none';
}

async function fetchModels(url) {
  const statusEl = document.getElementById('ollamaStatus');
  const selectEl = document.getElementById('ollamaModel');
  const fetchBtn = document.getElementById('fetchModelsBtn');

  url = (url || document.getElementById('ollamaUrl').value).trim().replace(/\/+$/, '');
  statusEl.textContent = 'Connecting...';
  statusEl.className = 'settings-status';
  fetchBtn.disabled = true;
  fetchBtn.textContent = 'Fetching...';

  try {
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'ollamaFetch', url: `${url}/api/tags`, method: 'GET' },
        (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (!response || !response.ok) reject(new Error(response?.error || 'Connection failed'));
          else resolve(response.data);
        }
      );
    });
    const data = JSON.parse(result);
    const models = data.models || [];

    if (models.length === 0) {
      statusEl.textContent = 'Connected, but no models found. Run: ollama pull llama3.2';
      statusEl.className = 'settings-status err';
      selectEl.innerHTML = '<option value="">No models available</option>';
      selectEl.disabled = true;
      return;
    }

    selectEl.innerHTML = '';
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      const gb = m.size / (1024 * 1024 * 1024);
      const size = gb >= 1 ? `${gb.toFixed(1)}GB` : `${(m.size / (1024 * 1024)).toFixed(0)}MB`;
      opt.textContent = `${m.name} (${size})`;
      selectEl.appendChild(opt);
    });
    selectEl.disabled = false;

    if (ollamaSettings.model && models.some(m => m.name === ollamaSettings.model)) {
      selectEl.value = ollamaSettings.model;
    }

    statusEl.textContent = `Connected — ${models.length} model${models.length !== 1 ? 's' : ''} found`;
    statusEl.className = 'settings-status ok';
  } catch (err) {
    statusEl.textContent = `Cannot connect: ${err.message}. Is Ollama running?`;
    statusEl.className = 'settings-status err';
    selectEl.innerHTML = '<option value="">Connection failed</option>';
    selectEl.disabled = true;
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch Models';
  }
}

document.getElementById('settingsGear').addEventListener('click', () => {
  document.getElementById('settingsOverlay').style.display = 'flex';
  loadSettings().then(() => fetchModels(ollamaSettings.url));
});

document.getElementById('settingsClose').addEventListener('click', () => {
  document.getElementById('settingsOverlay').style.display = 'none';
});

document.getElementById('settingsOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('settingsOverlay').style.display = 'none';
});

document.getElementById('fetchModelsBtn').addEventListener('click', () => fetchModels());
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

// ─── Comment Generation ───
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

function buildPrompt(postText, style, angle) {
  const styleMap = {
    'insightful': 'Add a thoughtful insight, data point, or non-obvious perspective that builds on the post. Show you have domain expertise.',
    'supportive': 'Agree and amplify — share a brief personal experience or example that validates the post\'s point. Be warm and genuine.',
    'curious': 'Ask a smart, specific follow-up question that shows you read carefully and want to learn more. Not generic.',
    'contrarian': 'Respectfully challenge or offer an alternative perspective. Be constructive, not argumentative. Start with acknowledging the point, then pivot.',
    'criticize': 'Point out flaws, gaps, or weaknesses in the argument. Be direct and specific about what is wrong or misleading. Stay professional but firm — no sugarcoating. Back up the critique with reasoning or evidence.'
  };

  let prompt = `Write a LinkedIn comment on this post.

Style: ${styleMap[style] || styleMap['insightful']}
${angle ? `\nPersonal angle: ${angle}` : ''}

Post:
"""
${postText.substring(0, 1500)}
"""

Write the comment now:`;

  return prompt;
}

function formatCommentAsHTML(rawText) {
  const escaped = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n{2,}/);
  let html = '';
  paragraphs.forEach(para => {
    const trimmed = para.trim();
    if (!trimmed) return;
    // Convert single newlines to <br>
    html += `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  });
  return html || `<p>${escaped}</p>`;
}

async function generateComment() {
  const outputWrap = document.getElementById('outputWrap');
  const commentText = document.getElementById('commentText');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const genBtn = document.getElementById('generateBtn');
  const angle = document.getElementById('angleInput').value.trim();

  if (!ollamaSettings.model) {
    errorEl.textContent = 'No model selected. Click the gear icon to configure Ollama.';
    errorEl.classList.add('visible');
    return;
  }

  if (!capturedPost) {
    showToast('Grab or paste a post first');
    return;
  }

  errorEl.classList.remove('visible');
  outputWrap.classList.remove('visible');
  loadingEl.classList.add('visible');
  genBtn.disabled = true;
  genBtn.textContent = 'Generating...';

  const prompt = buildPrompt(capturedPost, commentStyle, angle);

  try {
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'ollamaStream',
          url: `${ollamaSettings.url}/api/generate`,
          body: JSON.stringify({
            model: ollamaSettings.model,
            prompt: prompt,
            system: SYSTEM_PROMPT,
            stream: true
          })
        },
        (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (!response || !response.ok) reject(new Error(response?.error || 'Generation failed'));
          else resolve(response.data);
        }
      );
    });

    loadingEl.classList.remove('visible');

    // Clean up: remove any leading/trailing quotes the LLM might add
    let cleaned = result.trim().replace(/^["']|["']$/g, '');
    lastRawComment = cleaned;

    commentText.innerHTML = formatCommentAsHTML(cleaned);
    outputWrap.classList.add('visible');

    if (!cleaned) {
      outputWrap.classList.remove('visible');
      errorEl.textContent = 'Empty response. Try a different prompt or model.';
      errorEl.classList.add('visible');
    }
  } catch (err) {
    loadingEl.classList.remove('visible');
    let msg = err.message;
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      msg = 'Cannot connect to Ollama. Make sure it is running.';
    }
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = 'Generate Comment';
  }
}

document.getElementById('generateBtn').addEventListener('click', generateComment);
document.getElementById('regenBtn').addEventListener('click', generateComment);

// ─── Copy ───
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!lastRawComment) { showToast('Nothing to copy'); return; }
  try {
    await navigator.clipboard.writeText(lastRawComment);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = lastRawComment;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  const btn = document.getElementById('copyBtn');
  btn.textContent = 'Copied!';
  btn.classList.add('btn-success');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('btn-success'); }, 1500);
  showToast('Copied — paste into LinkedIn!');
});

// ─── Insert into LinkedIn ───
document.getElementById('insertBtn').addEventListener('click', async () => {
  if (!lastRawComment) { showToast('Nothing to insert'); return; }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('linkedin.com')) {
      showToast('Open LinkedIn first!');
      return;
    }
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'insertComment',
      text: lastRawComment
    });
    if (response && response.ok) {
      showToast('Comment inserted!');
    } else {
      showToast(response?.error || 'Could not find comment box. Click "Comment" on the post first.');
    }
  } catch {
    showToast('Cannot reach LinkedIn tab. Refresh the page.');
  }
});

// ─── Init ───
loadSettings();
