# LinkedComment — AI Comment Generator for LinkedIn

A Chrome extension that detects trending LinkedIn posts as you scroll and generates thoughtful AI-powered comments using your local Ollama instance. No cloud APIs, no data leaves your machine.

## Features

### Trending Post Detector
- **Auto-detects high-engagement posts** while you scroll your LinkedIn feed
- **Color-coded badges** based on engagement level:
  - 🟢 **Trending** — meets your threshold
  - 🟠 **Hot** (score 1K+) — highly discussed
  - 🔴 **Viral** (score 5K+) — massively popular
- Shows **reactions, comments, and reposts** count on each badge
- **Configurable thresholds** — set minimum reactions, comments, and reposts
- Skips promoted/sponsored posts automatically

### Inline Comment Generator
- Click any trending badge to open the **comment generator widget** directly on the post
- **5 comment styles:**
  - **Insightful** — thoughtful perspective with domain expertise
  - **Supportive** — genuine agreement with personal experience
  - **Curious** — smart follow-up questions
  - **Contrarian** — respectful alternative viewpoint
  - **Criticize** — direct, professional critique
- **Optional angle** — add context like "as a startup founder" or "from a design perspective"
- **One-click actions:** Copy to clipboard, Insert directly into LinkedIn's comment box, or Redo

### Settings (Extension Popup)
- Configure **Ollama server URL** and select from available models
- **Fetch Models** button auto-discovers installed Ollama models
- Toggle trending detector on/off
- Set engagement thresholds for badge visibility

## Requirements

- [Ollama](https://ollama.ai) running locally (default: `http://localhost:11434`)
- At least one model pulled (e.g., `ollama pull llama3.2`)
- Chrome or Chromium-based browser (Brave, Edge, etc.)

## Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in your browser
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `linkedit` folder
5. Click the extension icon → configure your Ollama URL → click **Fetch Models** → select a model → **Save Settings**
6. Navigate to LinkedIn and scroll your feed — trending badges will appear on high-engagement posts

## How It Works

1. **Content script** runs on LinkedIn pages, using `IntersectionObserver` to passively detect posts entering the viewport
2. **Engagement extraction** reads reactions, comments, and reposts from LinkedIn's DOM — scoped to the correct social bar to avoid nested/reshared post confusion
3. Posts exceeding your thresholds get a **colored badge** injected at the top
4. Clicking a badge opens an **inline widget** with style selection and AI generation
5. Generation requests are proxied through the **background service worker** to avoid CORS issues with localhost Ollama
6. Generated comments can be inserted directly into LinkedIn's contenteditable comment box using `document.execCommand('insertText')`

## File Structure

```
linkedit/
├── manifest.json      # MV3 extension config
├── background.js      # Ollama API proxy (CORS bypass) + badge notifications
├── content.js         # LinkedIn DOM interaction, trending detector, inline widget
├── content.css        # Badge styles, widget styles, toast notifications
├── popup.html         # Settings-only popup UI
├── popup.js           # Settings load/save, model fetching
├── rules.json         # Declarative net request rules for Ollama CORS
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Tech Stack

- **Zero cloud dependencies** — all AI runs locally via Ollama
- **Manifest V3** — latest Chrome extension standard
- **IntersectionObserver** — passive, performance-friendly post detection
- **MutationObserver** — detects dynamically loaded posts (LinkedIn SPA)
- **chrome.storage** — settings persistence with real-time sync
- **declarativeNetRequest** — CORS handling for localhost API

## Privacy

All data stays on your machine. Post text is sent only to your local Ollama instance. No analytics, no telemetry, no cloud servers.

## License

MIT
