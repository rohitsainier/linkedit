# LinkeEdit — LinkedIn Post Formatter & Toolkit

A Chrome extension that gives you the formatting tools LinkedIn doesn't — bold, italic, special fonts, emojis, separators, post templates, and a character counter.

## Features

### Popup Editor (Full Toolkit)
- **12 Unicode Font Styles** — Bold, Italic, Bold-Italic, Monospace, Script, Fraktur, Double-Struck, Circled, Squared, Small Caps, Strikethrough, Underline
- **Separator & Bullet Library** — 12 styles including arrows, diamonds, sparkles, lines
- **Emoji Picker** — 150+ emojis across 5 categories (Popular, Business, People, Arrows, Symbols)
- **Post Templates** — 10 battle-tested frameworks including hooks, listicles, story formats, CTAs
- **Character Counter** — Real-time count with 3,000 char limit warning
- **Line Counter** — Track post length for readability
- **Live Preview** — See exactly how your post will look
- **Draft Persistence** — Your work is auto-saved between sessions
- **One-Click Copy** — Copy formatted text to paste into LinkedIn

### Inline Toolbar (On LinkedIn)
- **Floating FAB button** — Appears when LinkedIn's post editor is open
- **Quick Bold/Italic** — Select text → click to transform
- **Insert separators, bullets, arrows, checklists** directly into LinkedIn's editor
- **Quick emoji insertion** — Fire, pin, lightbulb one-click insert

## Installation

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `linkedit` folder
4. Navigate to LinkedIn → start creating a post
5. The floating "Le" button appears when LinkedIn's editor is active

## How It Works

LinkedIn doesn't support rich text formatting in posts. LinkeEdit uses **Unicode mathematical alphanumeric symbols** to render bold, italic, and other styles that display correctly on all platforms — no special rendering needed.

This means the formatted text works everywhere LinkedIn posts are shown — feed, mobile, email notifications, search results.

## Post Templates Included

| Template | Type | Best For |
|----------|------|----------|
| Hot Take | Hook | Engagement bait that works |
| Story Hook | Hook | Personal narratives |
| Number Hook | Hook | List-based virality |
| Myth Buster | Hook | Contrarian positioning |
| Before/After | Hook | Transformation stories |
| Controversial Q | Hook | Discussion starters |
| Listicle | Framework | Numbered insight posts |
| Story + Lesson | Framework | Personal brand building |
| Do This Not That | Framework | Comparison content |
| CTA Post | Framework | Lead generation |

## Monetization Plan

### Pricing Strategy
- **Free tier**: Bold, italic, 3 templates, basic emojis
- **Pro ($3.99 one-time)**: All 12 fonts, all templates, full emoji library, separators, draft persistence, inline toolbar
- Uses ExtensionPay (Stripe-based, no server needed)

### Target Market
- LinkedIn content creators (growing 30%+ YoY)
- B2B marketers and founders
- Career coaches and recruiters
- Anyone building a personal brand on LinkedIn

### Marketing Channels
1. Post on LinkedIn using the tool (show formatting in action)
2. Product Hunt launch
3. YouTube: "How to Format LinkedIn Posts in 2026"
4. Twitter/X dev community
5. LinkedIn creator communities & Slack groups

## File Structure

```
linkedit/
├── manifest.json          # Extension manifest v3
├── background.js          # Service worker
├── content.js             # LinkedIn inline toolbar
├── content.css            # Inline toolbar styles
├── popup.html             # Full editor popup (self-contained)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Tech Stack

- **Zero dependencies** — Pure vanilla JS
- **Zero server cost** — Everything client-side
- **Manifest V3** — Latest Chrome extension standard
- **chrome.storage** — Settings + draft persistence
- **Unicode transforms** — Works everywhere, no rendering engine needed

## License

MIT — Build, modify, sell freely.
