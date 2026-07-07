# OwlNest

An AI reading agent and knowledge nest browser extension.

OwlNest 是一个 AI 阅读与知识巢浏览器扩展，帮助你翻译网页、理解文章、语音提问、网页搜索，并把重要内容保存到本地 Knowledge Nest。

[![English][english-shield]](./README.md) [![简体中文][chinese-shield]](./readmes/README.zh-CN.md)

[GitHub](https://github.com/DeepOrcaLab/OwlNest) · [Issues][issues-link]

[![GPL-3.0 License][license-shield]](./LICENSE)
[![TypeScript][ts-shield]](#)
![Last Commit][last-commit-shield]

## Features

### Web Translation

Translate entire web pages or specific content with two display modes. **Bilingual mode** shows original text alongside its translation. **Translation-only mode** gives you a clean, immersive reading experience. Switch seamlessly without refreshing.

### Selection Translation

Select any text on a webpage to reveal a smart toolbar. **Translate** streams the result in real-time. **Explain** provides detailed explanations. **Speak** reads text aloud with TTS. The toolbar auto-positions within the viewport and supports drag.

### OwlNest Agent Chat

Open the side panel to chat with an AI agent that understands the page you're reading. Ask questions, get summaries, or explore topics — all with full awareness of the current page content.

### Voice Input

Speak your questions naturally. OwlNest converts speech to text and feeds it to the AI agent. Supports Chinese (中文) and English voice recognition.

### Text-to-Speech (TTS)

Listen to selected text with 150+ high-quality AI voices across 80+ languages. Powered by **Edge TTS** — completely free. Adjustable rate, pitch, and volume.

### Web Search

Enable web search for real-time information. Ask about news, events, or facts — OwlNest fetches current results. Tools show live status indicators as they work.

### Knowledge Nest

Save important content to your local Knowledge Nest. Capture selected text, translations, AI responses, or whole page content. AI-generated tags and topics help organize your knowledge. Browse, search, edit, and export — all stored locally in your browser.

### Page Export

Export the current page or your entire Knowledge Nest to **Markdown** or **PDF**. Clean, readable formatting perfect for sharing or archiving.

### Multi-Provider Support

Connect to popular AI providers or any OpenAI-compatible API. Example providers include DeepSeek, OpenAI, MiMo, OpenRouter, Zhipu GLM, Moonshot, Qwen, SiliconFlow, and custom endpoints.

Plus free translation: Google Translate, Microsoft Translate, and DeepLX.

### Subtitle Translation

Translate YouTube subtitles directly in the video player with real-time bilingual display.

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server
WXT_SKIP_ENV_VALIDATION=true pnpm build   # Build for production
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` directory

## Credits

OwlNest is a modified project based on **Read Frog**:

https://github.com/mengxi-ream/read-frog

Thanks to the original Read Frog authors and contributors. This project preserves the original GPLv3 license notice.

Major changes in OwlNest include:

- Rebranded UI from Read Frog → OwlNest
- Added OwlNest Agent side panel with page-aware chat
- Added Knowledge Nest for local knowledge capture
- Added save-to-knowledge workflow with AI-generated tags/topics
- Added page export to Markdown and PDF
- Added voice input and TTS improvements
- Added web search tool integrations
- Added agent tool workflow with live status indicators
- Updated onboarding, branding assets, and multi-language support
- Unified icon library and theme token system

## License

OwlNest is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See [LICENSE](./LICENSE) for the full text.

[english-shield]: https://img.shields.io/badge/English-gray?style=flat-square
[chinese-shield]: https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-gray?style=flat-square
[issues-link]: https://github.com/DeepOrcaLab/OwlNest/issues
[license-shield]: https://img.shields.io/github/license/DeepOrcaLab/OwlNest?style=flat-square&label=License&color=green&labelColor=black
[ts-shield]: https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=black
[last-commit-shield]: https://img.shields.io/github/last-commit/DeepOrcaLab/OwlNest?style=flat-square&label=commit&labelColor=black
