# Translate Masry

A two-way Egyptian Arabic (Masry) ⇄ English helper for WhatsApp conversations.

Paste a message in Arabic script or Arabizi (Arabic written with Latin letters and numbers) and get warm, natural English that keeps the tone. Write your reply in English and get it back as casual spoken Masry, ready to send. I built it for my own WhatsApp conversations, where general-purpose translators tend to flatten casual Egyptian Arabic into formal Arabic.

## Features

- **Incoming translation** — handles Arabic script, Arabizi and mixed English, and adds a short note only when a phrase is an idiom, blessing or cultural reference that doesn't translate directly.
- **Suggested replies** — two reply options (one warm, one brief) in Masry, each with an English gloss, using the last few messages as context.
- **Write your own** — type in English or rough Arabic and get natural spoken Masry back.
- **Edit before sending** — change the English and regenerate the Masry, or edit the Arabic directly.
- **Open in WhatsApp** — sends the final text into WhatsApp with one tap (no copy-paste).
- **Share-sheet entry** — open the page with `?in=<text>` or `?out=<text>` (for example from an iOS Shortcut) and it starts translating immediately.
- **Recent history** — the last few exchanges, kept only in this browser.

## How it's built

A single dependency-free HTML file (vanilla JS + CSS, light and dark themes, mobile-first, RTL-aware text fields).

It was first built as a Claude artifact, where the page gets model calls from the Claude runtime (`claude.use("sample")`). [`claude-shim.js`](claude-shim.js) provides the same API anywhere else by calling the Anthropic Messages API straight from the browser with an API key the visitor enters. Inside claude.ai the shim detects the real runtime and does nothing.

## Run it

Open `index.html` in a browser, or serve the folder with any static host (GitHub Pages works). Click **Set API key** (bottom-right) and paste an Anthropic API key. The key is stored only in your browser and is sent only to `api.anthropic.com`.

## License

MIT
