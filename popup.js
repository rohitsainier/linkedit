// ─── State ───
let ollamaSettings = { url: 'http://localhost:11434', model: '' };

const toastEl = document.getElementById('toast');

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1600);
}

// ─── Settings ───
function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get(['ollamaUrl', 'ollamaModel', 'highReachEnabled', 'highReachThresholds', 'darkMode'], (data) => {
      if (data.ollamaUrl) ollamaSettings.url = data.ollamaUrl;
      if (data.ollamaModel) ollamaSettings.model = data.ollamaModel;
      document.getElementById('ollamaUrl').value = ollamaSettings.url;

      // Dark mode setting
      const darkModeSelect = document.getElementById('darkModeSelect');
      if (darkModeSelect) darkModeSelect.value = data.darkMode || 'auto';

      // High-reach detector settings
      const toggle = document.getElementById('highReachToggle');
      if (toggle) toggle.checked = data.highReachEnabled !== false;

      if (data.highReachThresholds) {
        const t = data.highReachThresholds;
        if (document.getElementById('threshReactions')) document.getElementById('threshReactions').value = t.reactions ?? 100;
        if (document.getElementById('threshComments')) document.getElementById('threshComments').value = t.comments ?? 20;
        if (document.getElementById('threshReposts')) document.getElementById('threshReposts').value = t.reposts ?? 10;
      }

      resolve();
    });
  });
}

function saveSettings() {
  const url = document.getElementById('ollamaUrl').value.trim().replace(/\/+$/, '');
  const model = document.getElementById('ollamaModel').value;
  ollamaSettings.url = url;
  ollamaSettings.model = model;

  // Dark mode setting
  const darkMode = document.getElementById('darkModeSelect')?.value || 'auto';

  // High-reach settings
  const highReachEnabled = document.getElementById('highReachToggle')?.checked ?? true;
  const highReachThresholds = {
    reactions: parseInt(document.getElementById('threshReactions')?.value ?? 100),
    comments: parseInt(document.getElementById('threshComments')?.value ?? 20),
    reposts: parseInt(document.getElementById('threshReposts')?.value ?? 10)
  };

  chrome.storage.local.set({
    ollamaUrl: url,
    ollamaModel: model,
    darkMode,
    highReachEnabled,
    highReachThresholds
  });

  // Notify content script about changes
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && tab.url && tab.url.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleHighReach', enabled: highReachEnabled });
      chrome.tabs.sendMessage(tab.id, { action: 'updateThresholds', thresholds: highReachThresholds });
      chrome.tabs.sendMessage(tab.id, { action: 'updateDarkMode', darkMode });
    }
  });

  showToast('Settings saved');
}

// ─── Fetch Ollama Models ───
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

// ─── Event Listeners ───
document.getElementById('fetchModelsBtn').addEventListener('click', () => fetchModels());
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

// ─── Init ───
loadSettings().then(() => fetchModels(ollamaSettings.url));
