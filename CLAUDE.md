# CLAUDE.md — Project Context for AI Assistants

## Project Overview

LinkedComment is a Chrome extension (Manifest V3) that detects trending LinkedIn posts and generates AI-powered comments using a local Ollama instance. The extension popup is settings-only; all comment generation happens inline on LinkedIn via a widget attached to trending post badges.

## Architecture

### Content Script (`content.js`)
The main file — runs on `*://*.linkedin.com/*`. Contains:

- **Post detection**: `IntersectionObserver` watches `.occludable-update` elements (LinkedIn's virtual scroll wrappers). Only top-level posts are observed — nested/embedded posts are skipped via `isTopLevelPost()`.
- **Engagement extraction**: `extractEngagement()` reads reactions, comments, reposts from the LAST `.social-details-social-activity` container in a post (outermost = feed item's own stats, not embedded post's).
- **Badge injection**: `injectBadge()` creates color-coded trending badges. Dedup via `data-linkedcomment-processed` attribute on the inner `.feed-shared-update-v2` element.
- **Inline widget**: `createWidget()` builds a full comment generator UI (style pills, angle input, generate button, output with copy/insert/redo). Communicates with background.js for Ollama API calls.
- **Post text extraction**: 3-strategy approach using `textContent` (not `innerText`) to bypass CSS truncation. Handles "see more" expansion via `MutationObserver` with 3s safety timeout.

### Background Service Worker (`background.js`)
- `ollamaFetch`: GET proxy for Ollama API (model listing)
- `ollamaStream`: POST proxy with streaming for generation
- Badge notification helpers for extension icon

### Popup (`popup.html` + `popup.js`)
Settings-only UI:
- Ollama URL + model selector with Fetch Models button
- Trending detector toggle + threshold inputs (reactions, comments, reposts)
- Save Settings persists to `chrome.storage.local` and notifies content script

### Styles (`content.css`)
All classes prefixed with `linkedcomment-` to avoid LinkedIn CSS collisions. Uses `!important` extensively because LinkedIn's styles (especially `-webkit-text-fill-color`) override injected element colors.

### CORS Rules (`rules.json`)
Two `declarativeNetRequest` rules removing Origin header for localhost:11434 and 127.0.0.1:11434.

## Key Design Decisions

1. **`.occludable-update` as scroll observer target, `.feed-shared-update-v2` as dedup target**: LinkedIn splits feed items across multiple `.occludable-update` wrappers but shares the inner `.feed-shared-update-v2`. Deduping on the inner element prevents double badges.

2. **Last social bar wins**: For engagement extraction, the LAST `.social-details-social-activity` in a post is the feed item's own stats. Embedded/reshared post stats appear earlier in DOM order.

3. **`textContent` over `innerText`**: LinkedIn uses CSS `text-overflow`, `max-height`, `overflow:hidden` to visually truncate posts. `innerText` respects these CSS rules and returns truncated text. `textContent` gets all text regardless.

4. **`document.execCommand('insertText')` for comment insertion**: LinkedIn's contenteditable comment box requires this legacy API for proper event dispatching. Direct `textContent` assignment doesn't trigger LinkedIn's internal state updates.

5. **`!important` on all widget styles**: LinkedIn's CSS cascade is aggressive. Without `!important`, injected elements inherit LinkedIn's text colors (often white on dark mode), making text invisible.

## Common Issues

- **`chrome-extension://invalid/` console errors**: These are LinkedIn's own bundled scripts making failed fetch calls. Not related to this extension.
- **"Extension context invalidated" error**: Happens when extension is reloaded but LinkedIn tab isn't refreshed. Guarded by `isExtensionValid()`.
- **Post text truncation**: If grabbed text is short, check if `expandPost()` is clicking "see more" and if the `MutationObserver` is detecting the expansion.

## Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `ollamaUrl` | string | Ollama server URL |
| `ollamaModel` | string | Selected model name |
| `highReachEnabled` | boolean | Trending detector on/off |
| `highReachThresholds` | object | `{ reactions, comments, reposts }` |

## Development

1. Make changes to source files
2. Go to `chrome://extensions/` → click reload on LinkedComment
3. Refresh LinkedIn tab (required for content script changes)
4. For popup changes, just close and reopen the popup
