import { browser } from "#imports"

export const AGENT_VIDEO_TRANSCRIPT_REQUEST = "OWLNEST_AGENT_GET_VIDEO_TRANSCRIPT"

export interface VideoTranscriptSegment {
  text: string
  start: number
}

export interface VideoTranscript {
  title: string
  url: string
  language: string
  coverage?: "full-transcript" | "page-text"
  notice?: string
  segments: VideoTranscriptSegment[]
}

export type VideoTranscriptResponse
  = | { ok: true, transcript: VideoTranscript }
    | { ok: false, reason: "no-subtitles" | "fetch-failed", message: string }

export async function requestVideoTranscript(tabId: number, pageUrl = ""): Promise<VideoTranscriptResponse> {
  try {
    return await sendTranscriptRequest(tabId)
  }
  catch {
    try {
      await injectVideoTranscriptScripts(tabId, pageUrl)
      return await sendTranscriptRequest(tabId)
    }
    catch {
      return {
        ok: false,
        reason: "fetch-failed",
        message: "视频页面没有返回可读取的字幕或文案，请重新加载该页面后重试。",
      }
    }
  }
}

async function sendTranscriptRequest(tabId: number): Promise<VideoTranscriptResponse> {
  const response = await browser.tabs.sendMessage(tabId, {
    type: AGENT_VIDEO_TRANSCRIPT_REQUEST,
  }) as unknown

  if (!isVideoTranscriptResponse(response))
    throw new Error("Video transcript content script returned no valid response")

  return response
}

function isVideoTranscriptResponse(value: unknown): value is VideoTranscriptResponse {
  if (typeof value !== "object" || value === null || !("ok" in value))
    return false

  if (value.ok === true)
    return "transcript" in value && typeof value.transcript === "object" && value.transcript !== null

  return value.ok === false && "reason" in value && "message" in value
}

async function injectVideoTranscriptScripts(tabId: number, pageUrl: string): Promise<void> {
  if (isYouTubeUrl(pageUrl)) {
    await browser.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["/content-scripts/interceptor.js"],
      world: "MAIN",
    })
    await browser.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["/content-scripts/subtitles.js"],
    })
    return
  }

  await browser.scripting.executeScript({
    target: { tabId },
    files: ["/content-scripts/video-page.js"],
  })
}

export function isSupportedVideoPage(url: string): boolean {
  return isYouTubeUrl(url) || /^https?:\/\/(?:www\.)?douyin\.com\//i.test(url)
}

function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(url)
}

export function formatVideoTranscriptContext(
  transcript: VideoTranscript,
  maxContentLength: number,
): string {
  let usedLength = 0
  const lines: string[] = []

  for (const segment of transcript.segments) {
    const remaining = maxContentLength - usedLength
    if (remaining <= 0)
      break

    const text = segment.text.trim().slice(0, remaining)
    if (!text)
      continue

    const index = lines.length + 1
    lines.push(`[V${index} @ ${formatTranscriptTime(segment.start)}] ${text}`)
    usedLength += text.length
  }

  return [
    "[Tool: video_transcript]",
    `Title: ${transcript.title || "(untitled)"}`,
    `URL: ${transcript.url}`,
    `Subtitle language: ${transcript.language || "(unknown)"}`,
    `Coverage: ${transcript.coverage ?? "full-transcript"}`,
    transcript.notice ? `Important limitation: ${transcript.notice}` : "",
    "",
    "Transcript (video evidence anchors):",
    lines.join("\n") || "(No usable subtitle text was returned.)",
  ].join("\n")
}

function formatTranscriptTime(startMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(startMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
