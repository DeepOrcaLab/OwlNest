import type { VideoTranscript } from "./video-transcript"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing"
import { formatVideoTranscriptContext, isSupportedVideoPage, requestVideoTranscript } from "./video-transcript"

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("formatVideoTranscriptContext", () => {
  it("adds timestamped video evidence anchors", () => {
    const transcript: VideoTranscript = {
      title: "Example video",
      url: "https://www.youtube.com/watch?v=example",
      language: "en",
      segments: [
        { start: 12_000, text: "First idea" },
        { start: 3_725_000, text: "Later idea" },
      ],
    }

    const context = formatVideoTranscriptContext(transcript, 1000)

    expect(context).toContain("[V1 @ 0:12] First idea")
    expect(context).toContain("[V2 @ 1:02:05] Later idea")
  })

  it("respects the transcript content budget", () => {
    const transcript: VideoTranscript = {
      title: "Example",
      url: "https://www.youtube.com/watch?v=example",
      language: "en",
      segments: [
        { start: 0, text: "12345" },
        { start: 1000, text: "67890" },
      ],
    }

    expect(formatVideoTranscriptContext(transcript, 7)).toContain(
      "[V1 @ 0:00] 12345\n[V2 @ 0:01] 67",
    )
  })
})

describe("requestVideoTranscript", () => {
  it("injects the transcript scripts and retries when an updated extension cannot reach the old page", async () => {
    const transcript: VideoTranscript = {
      title: "Example video",
      url: "https://www.youtube.com/watch?v=example",
      language: "en",
      segments: [{ start: 0, text: "Recovered transcript" }],
    }
    const sendMessage = vi.spyOn(fakeBrowser.tabs, "sendMessage")
      .mockRejectedValueOnce(new Error("Receiving end does not exist"))
      .mockResolvedValueOnce({ ok: true, transcript })
    const executeScript = vi.spyOn(fakeBrowser.scripting, "executeScript").mockResolvedValue([])

    const result = await requestVideoTranscript(42, transcript.url)
    expect(executeScript).toHaveBeenNthCalledWith(1, {
      target: { tabId: 42, allFrames: true },
      files: ["/content-scripts/interceptor.js"],
      world: "MAIN",
    })
    expect(executeScript).toHaveBeenNthCalledWith(2, {
      target: { tabId: 42, allFrames: true },
      files: ["/content-scripts/subtitles.js"],
    })
    expect(sendMessage).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ ok: true, transcript })
  })

  it("recognizes supported video platforms", () => {
    expect(isSupportedVideoPage("https://www.youtube.com/watch?v=example")).toBe(true)
    expect(isSupportedVideoPage("https://www.douyin.com/?recommend=1")).toBe(true)
    expect(isSupportedVideoPage("https://example.com/video")).toBe(false)
  })

  it("treats an undefined content-script response as a recoverable connection failure", async () => {
    const transcript: VideoTranscript = {
      title: "Douyin video",
      url: "https://www.douyin.com/?recommend=1",
      language: "zh-CN",
      segments: [{ start: 0, text: "Video description" }],
    }
    const sendMessage = vi.spyOn(fakeBrowser.tabs, "sendMessage")
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ok: true, transcript })
    const executeScript = vi.spyOn(fakeBrowser.scripting, "executeScript").mockResolvedValue([])

    await expect(requestVideoTranscript(7, transcript.url)).resolves.toEqual({ ok: true, transcript })
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ["/content-scripts/video-page.js"],
    })
    expect(sendMessage).toHaveBeenCalledTimes(2)
  })
})
