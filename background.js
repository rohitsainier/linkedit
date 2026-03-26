// ─── Ollama API Proxy ───
// Routes requests through the service worker to bypass CORS/port restrictions

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ─── High-Reach Badge Notifications ───
  if (msg.action === 'notifyHighReachGrab') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#057642' });
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === 'clearBadge') {
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === 'ollamaFetch') {
    fetch(msg.url, {
      method: msg.method || 'GET',
      headers: msg.headers || {},
      body: msg.body || undefined
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        sendResponse({ ok: true, data: text });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (msg.action === 'ollamaStream') {
    fetch(msg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: msg.body
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                fullText += json.response;
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
        sendResponse({ ok: true, data: fullText });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  // ─── Unified AI Generate Handler ───
  if (msg.action === 'aiGenerate') {
    const { provider, model, apiKey, ollamaUrl, systemPrompt, userPrompt } = msg;

    let request;

    if (provider === 'ollama') {
      const url = `${ollamaUrl}/api/generate`;
      request = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: userPrompt, system: systemPrompt, stream: true })
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) fullText += json.response;
            } catch {}
          }
        }
        return fullText;
      });

    } else if (provider === 'openai') {
      request = fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `OpenAI HTTP ${res.status}`);
        return data.choices[0].message.content;
      });

    } else if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      request = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `Gemini HTTP ${res.status}`);
        if (!data.candidates || data.candidates.length === 0) {
          const reason = data.promptFeedback?.blockReason || 'unknown';
          throw new Error(`Gemini blocked response (reason: ${reason})`);
        }
        const candidate = data.candidates[0];
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Gemini blocked response due to safety filters');
        }
        return candidate.content.parts[0].text;
      });

    } else if (provider === 'claude') {
      request = fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `Claude HTTP ${res.status}`);
        return data.content[0].text;
      });

    } else {
      sendResponse({ ok: false, error: `Unknown provider: ${provider}` });
      return;
    }

    request
      .then(text => sendResponse({ ok: true, data: text }))
      .catch(err => {
        let errorMsg = err.message;
        if (errorMsg.includes('401') || errorMsg.includes('403')) {
          errorMsg = 'Invalid API key. Check your settings.';
        } else if (errorMsg.includes('429')) {
          errorMsg = 'Rate limited. Wait a moment and try again.';
        } else if (provider === 'ollama' && (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError'))) {
          errorMsg = 'Cannot connect to Ollama. Is it running?';
        }
        sendResponse({ ok: false, error: errorMsg });
      });
    return true;
  }
});
