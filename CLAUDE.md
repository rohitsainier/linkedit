# CLAUDE.md — Project Context for AI Assistants

## Project Overview

LinkedComment is a Chrome extension (Manifest V3) that detects trending LinkedIn posts and generates AI-powered comments using a local Ollama instance. The extension popup is settings-only; all comment generation happens inline on LinkedIn via a widget attached to trending post badges.

## Architecture

### Content Script (`content.js`)
The main file — runs on `*://*.linkedin.com/*`. Contains:

- **Post detection**: `findAllFeedPosts()` finds posts by looking for `<h2>` elements containing "Feed post" screen-reader text (SDUI strategy), with fallbacks to legacy `.occludable-update` and `[data-urn]` selectors. A `MutationObserver` + scroll listener triggers debounced rescans as new posts load.
- **Engagement extraction**: `extractEngagement()` reads reactions, comments, reposts from screen-reader `<span>` elements matching patterns like "20 reactions", "8 comments" (SDUI), with fallback to legacy `.social-details-social-activity` selectors.
- **Badge injection**: `injectBadge()` creates color-coded trending badges. Dedup via `data-linkedcomment-processed` attribute on the post container.
- **Inline widget**: `createWidget()` builds a full comment generator UI (style pills, angle input, generate button, output with copy/insert/redo). Communicates with background.js for Ollama API calls.
- **Post text extraction**: Multi-strategy approach: primary uses `[data-testid="expandable-text-box"]` (SDUI), falls back to `span[dir="ltr"]` collection, legacy class selectors, and broadest text block search. Handles "see more" expansion via `[data-testid="expandable-text-button"]` + `MutationObserver` with 3s safety timeout.
- **Debug logging**: All key operations log to console with `[LinkedComment]` prefix when `DEBUG=true`.

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

1. **SDUI-first selectors with legacy fallbacks**: LinkedIn migrated to Server-Driven UI (SDUI) in ~2025, replacing semantic class names with hashed/obfuscated ones. All selectors now use stable attributes first (`data-testid`, `aria-label`, SVG `id`, text content matching) and fall back to legacy class names for older LinkedIn versions.

2. **`<h2>` with "Feed post" text as post container**: In SDUI, each feed post is wrapped in a container whose first child is an `<h2>` with screen-reader text "Feed post". This is the primary post detection strategy.

3. **Screen-reader spans for engagement counts**: SDUI renders counts in `<span>` elements with text like "20 reactions", "8 comments". These are matched via regex patterns.

4. **`textContent` over `innerText`**: LinkedIn uses CSS `text-overflow`, `max-height`, `overflow:hidden` to visually truncate posts. `innerText` respects these CSS rules and returns truncated text. `textContent` gets all text regardless.

5. **`document.execCommand('insertText')` for comment insertion**: LinkedIn's contenteditable comment box requires this legacy API for proper event dispatching. Direct `textContent` assignment doesn't trigger LinkedIn's internal state updates.

6. **`!important` on all widget styles**: LinkedIn's CSS cascade is aggressive. Without `!important`, injected elements inherit LinkedIn's text colors (often white on dark mode), making text invisible.

7. **Debounced MutationObserver + scroll scanning**: Instead of IntersectionObserver on specific selectors, uses a MutationObserver on `document.body` that triggers debounced rescans via `requestAnimationFrame`, plus a throttled scroll listener. This handles SDUI's dynamic rendering.

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
