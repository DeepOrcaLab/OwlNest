import type { VideoTranscriptResponse } from "@/utils/agent/video-transcript"
import { browser, defineContentScript } from "#imports"
import { collectVideoPageTranscript } from "@/utils/agent/video-page"
import { AGENT_VIDEO_TRANSCRIPT_REQUEST } from "@/utils/agent/video-transcript"

declare global {
  interface Window {
    __OWLNEST_VIDEO_PAGE_AGENT_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ["*://*.douyin.com/*"],
  runAt: "document_idle",
  main(ctx) {
    if (window.__OWLNEST_VIDEO_PAGE_AGENT_INJECTED__)
      return
    window.__OWLNEST_VIDEO_PAGE_AGENT_INJECTED__ = true

    const listener = async (message: unknown): Promise<VideoTranscriptResponse | undefined> => {
      if (
        typeof message !== "object"
        || message === null
        || !("type" in message)
        || message.type !== AGENT_VIDEO_TRANSCRIPT_REQUEST
      ) {
        return undefined
      }

      const transcript = collectVideoPageTranscript(document, window.location.href)
      return transcript
        ? { ok: true, transcript }
        : {
            ok: false,
            reason: "no-subtitles",
            message: "抖音没有向当前页面暴露可读取的字幕或视频文案，无法可靠总结这段视频。",
          }
    }

    browser.runtime.onMessage.addListener(listener)
    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(listener)
      window.__OWLNEST_VIDEO_PAGE_AGENT_INJECTED__ = false
    })
  },
})
