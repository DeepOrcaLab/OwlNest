<div align="center"><a name="readme-top"></a>

# OwlNest

An AI reading, translation, and personal knowledge browser extension.

Understand web pages and videos, ask AI without leaving the page, and turn what matters into knowledge you can revisit.

[![English][english-shield]](./README.md) [![简体中文][chinese-shield]](./readmes/README.zh-CN.md)

[GitHub](https://github.com/DeepOrcaLab/OwlNest) · [Issues][issues-link]

<!-- SHIELD GROUP -->

[![Latest Version badge][extension-release-shield]][github-release-link]
[![GPL-3.0 License badge][license-shield]](./LICENSE)
[![TypeScript badge][ts-shield]][github-release-link]
[![Stars badge][star-history-shield]][star-history-link]
[![Contributors badge][contributors-shield]][contributors-link]
![Last Commit badge][last-commit-shield]
[![Issues badge][issues-shield]][issues-link]

</div>

<details>
<summary><kbd>Table of contents</kbd></summary>

- [Demo](#demo)
- [Getting Started](#getting-started)
- [Features](#features)
  - [AI Reading](#ai-reading)
  - [Web Translation](#web-translation)
  - [Selection Translation](#selection-translation)
  - [OwlNest Agent Chat](#owlnest-agent-chat)
  - [Voice Input](#voice-input)
  - [Text-to-Speech (TTS)](#text-to-speech-tts)
  - [Knowledge Nest](#knowledge-nest)
  - [Multi-Provider Support](#multi-provider-support)
  - [Subtitle Translation](#subtitle-translation)
- [🧑‍💻 Development](#-development)
- [📜 Credits](#-credits)
- [📄 License](#-license)

</details>

## Demo

<div align="center">
  <img src="public/assets/owlnest/owlnest-onboarding.png" width="80%" alt="OwlNest Agent" />
</div>

## Getting Started

OwlNest is an open-source AI browser extension for focused reading and learning. It brings AI reading, translation, video subtitles, a page-aware AI Agent, and a personal knowledge nest into the browser—so you can understand content, ask questions, and retain what you learn without constantly switching tools.

### Download

| Browser | Version                                                                | Download                                 |
| ------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| Chrome  | [![Chrome Version badge][chrome-version-shield]][chrome-store-link]    | [Chrome Web Store][chrome-store-link]    |
| Edge    | [![Edge Version badge][edge-version-shield]][edge-store-link]          | [Microsoft Edge Addons][edge-store-link] |
| Firefox | [![Firefox Version badge][firefox-version-shield]][firefox-store-link] | [Firefox Add-ons][firefox-store-link]    |

### Community

| [![Discord badge][discord-shield-badge]][discord-link] | In Discord ask questions, and connect with developers. |
| :----------------------------------------------------- | :----------------------------------------------------- |

> \[!IMPORTANT]
>
> **⭐️ Star Us**, You will receive all release notifications from GitHub without any delay \~

[![GitHub stars][star-history-shield]][github-star-link]

<details>
<summary><kbd>Star History</kbd></summary>

<a href="https://www.star-history.com/#DeepOrcaLab/OwlNest&Timeline">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=DeepOrcaLab/OwlNest&type=Timeline&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=DeepOrcaLab/OwlNest&type=Timeline" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=DeepOrcaLab/OwlNest&type=Timeline" />
 </picture>
</a>

</details>

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## Features

### AI Reading

Turn dense pages into clear learning material. Summarize the current page, extract the key ideas, explain unfamiliar terms, and make complex passages easier to understand.

### Web Translation

Translate entire web pages or specific content with two display modes. **Bilingual mode** shows original text alongside its translation. **Translation-only mode** gives you a clean, immersive reading experience. Switch seamlessly without refreshing.

### Selection Translation

Select any text on a webpage to reveal a smart toolbar. **Translate** streams the result in real-time. **Explain** provides detailed explanations. **Speak** reads text aloud with TTS. The toolbar auto-positions within the viewport and supports drag.

### OwlNest Agent Chat

Use the built-in AI Agent without leaving the page. It understands the webpage or video you are viewing, so you can ask follow-up questions, get supporting information, check claims, and turn content into learning notes while you read.

### Voice Input

Speak your questions naturally. OwlNest converts speech to text and feeds it to the AI agent. Supports Chinese (中文) and English voice recognition.

### Text-to-Speech (TTS)

Listen to selected text with 150+ high-quality AI voices across 80+ languages. Powered by **Edge TTS** — completely free. Adjustable rate, pitch, and volume.

### Knowledge Nest

Build a personal knowledge base from what you read. Save selected text, translations, AI responses, or complete pages locally in your browser; AI-generated tags and topics keep everything organized. Search, revisit, and continue asking questions based on your saved material later.

### Multi-Provider Support

Connect to popular AI providers or any OpenAI-compatible API. Example providers include DeepSeek, OpenAI, MiMo, OpenRouter, Zhipu GLM, Moonshot, Qwen, SiliconFlow, and custom endpoints.

Plus free translation: Google Translate, Microsoft Translate, and DeepLX.

### Subtitle Translation

Translate video subtitles directly in the player with real-time bilingual display, making courses, talks, and educational videos easier to follow.

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## 🧑‍💻 Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
WXT_SKIP_ENV_VALIDATION=true pnpm build

# Type check
pnpm typecheck

# Run tests
pnpm test
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` directory

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## 📜 Credits

OwlNest builds on open-source work. Attribution and license notices are maintained in [CREDITS.md](./CREDITS.md).

OwlNest combines AI reading, translation, video subtitle support, a page-aware Agent, voice interaction, and a local knowledge nest into one continuous learning experience.

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## 📄 License

OwlNest is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See [LICENSE](./LICENSE) for the full text.

<!-- LINK GROUP -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square
[chrome-store-link]: https://github.com/DeepOrcaLab/OwlNest/releases
[chrome-version-shield]: https://img.shields.io/github/package-json/v/DeepOrcaLab/OwlNest?style=flat-square&label=Version&labelColor=black&color=yellow
[contributors-link]: https://github.com/DeepOrcaLab/OwlNest/graphs/contributors
[contributors-shield]: https://img.shields.io/github/contributors/DeepOrcaLab/OwlNest?style=flat-square&labelColor=black
[chinese-shield]: https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-gray?style=flat-square
[discord-link]: https://discord.gg/ej45e3PezJ
[discord-shield-badge]: https://img.shields.io/badge/chat-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white&labelColor=black
[edge-store-link]: https://github.com/DeepOrcaLab/OwlNest/releases
[english-shield]: https://img.shields.io/badge/English-gray?style=flat-square
[firefox-store-link]: https://github.com/DeepOrcaLab/OwlNest/releases
[firefox-version-shield]: https://img.shields.io/github/package-json/v/DeepOrcaLab/OwlNest?style=flat-square&label=Firefox%20Version&labelColor=black&color=orange
[edge-version-shield]: https://img.shields.io/badge/dynamic/json?style=flat-square&logo=microsoft-edge&label=Edge%20Version&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fcbcbomlgikfbdnoaohcjfledcoklcjbo&labelColor=black&prefix=v
[extension-release-shield]: https://img.shields.io/github/package-json/v/DeepOrcaLab/OwlNest?filename=package.json&style=flat-square&label=Latest%20Version&color=brightgreen&labelColor=black
[github-release-link]: https://github.com/DeepOrcaLab/OwlNest/releases
[github-star-link]: https://github.com/DeepOrcaLab/OwlNest/stargazers
[issues-link]: https://github.com/DeepOrcaLab/OwlNest/issues
[issues-shield]: https://img.shields.io/github/issues/DeepOrcaLab/OwlNest?style=flat-square&labelColor=black
[last-commit-shield]: https://img.shields.io/github/last-commit/DeepOrcaLab/OwlNest?style=flat-square&label=commit&labelColor=black
[license-shield]: https://img.shields.io/github/license/DeepOrcaLab/OwlNest?style=flat-square&label=License&color=green&labelColor=black
[ts-shield]: https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=black
[star-history-link]: https://www.star-history.com/#DeepOrcaLab/OwlNest&Timeline
[star-history-shield]: https://img.shields.io/github/stars/DeepOrcaLab/OwlNest?style=flat-square&label=stars&color=yellow&labelColor=black
