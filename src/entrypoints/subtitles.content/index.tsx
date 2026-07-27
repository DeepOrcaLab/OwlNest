import "@/utils/zod-config"
import type { VideoTranscriptResponse } from "@/utils/agent/video-transcript"
import { browser, defineContentScript } from "#imports"
import { AGENT_VIDEO_TRANSCRIPT_REQUEST } from "@/utils/agent/video-transcript"
import { getLocalConfig } from "@/utils/config/storage"

declare global {
  interface Window {
    __READ_FROG_SUBTITLES_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ["*://*.youtube.com/*", "*://*.youtube-nocookie.com/*"],
  allFrames: true,
  cssInjectionMode: "manifest",
  async main(ctx) {
    if (window.__READ_FROG_SUBTITLES_INJECTED__)
      return
    window.__READ_FROG_SUBTITLES_INJECTED__ = true

    if (window.top === window) {
      const transcriptListener = (message: unknown) => {
        if (
          typeof message !== "object"
          || message === null
          || !("type" in message)
          || message.type !== AGENT_VIDEO_TRANSCRIPT_REQUEST
        ) {
          return undefined
        }

        return fetchAgentVideoTranscript()
      }

      browser.runtime.onMessage.addListener(transcriptListener)
      ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(transcriptListener))
    }

    const config = await getLocalConfig()
    if (!config?.videoSubtitles?.enabled) {
      window.__READ_FROG_SUBTITLES_INJECTED__ = false
      return
    }

    ctx.onInvalidated(() => {
      window.__READ_FROG_SUBTITLES_INJECTED__ = false
    })

    const { bootstrapSubtitlesRuntime } = await import("./runtime")
    await bootstrapSubtitlesRuntime()
  },
})

async function fetchAgentVideoTranscript(): Promise<VideoTranscriptResponse> {
  try {
    const { YoutubeSubtitlesFetcher } = await import("@/utils/subtitles/fetchers")
    const fetcher = new YoutubeSubtitlesFetcher()
    const subtitles = await fetcher.fetch()

    if (subtitles.length === 0) {
      return {
        ok: false,
        reason: "no-subtitles",
        message: "这个视频没有可用字幕，暂时无法可靠总结视频内容。",
      }
    }

    return {
      ok: true,
      transcript: {
        title: document.title,
        url: window.location.href,
        language: fetcher.getSourceLanguage(),
        segments: subtitles.map(fragment => ({
          text: fragment.text,
          start: fragment.start,
        })),
      },
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const hasNoSubtitles = /no.?subtitles|no captions/i.test(message)
    return {
      ok: false,
      reason: hasNoSubtitles ? "no-subtitles" : "fetch-failed",
      message: hasNoSubtitles
        ? "这个视频没有可用字幕，暂时无法可靠总结视频内容。"
        : `读取视频字幕失败：${message}`,
    }
  }
}
