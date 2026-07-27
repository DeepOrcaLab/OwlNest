import type { VideoTranscript } from "./video-transcript"

const DESCRIPTION_SELECTORS = [
  "[data-e2e='video-desc']",
  "[data-e2e*='video-desc']",
  "[class*='video-info-detail']",
  "[class*='videoInfoDetail']",
  "[class*='desc']",
]

const CAPTION_SELECTORS = [
  "[data-e2e*='caption']",
  "[class*='subtitle']",
  "[class*='Subtitle']",
  "[class*='caption']",
  "[class*='Caption']",
]

export function collectVideoPageTranscript(doc: Document, pageUrl: string): VideoTranscript | null {
  const segments = collectNativeTrackCues(doc)
  if (segments.length > 0) {
    return {
      title: doc.title,
      url: pageUrl,
      language: doc.documentElement.lang || "unknown",
      coverage: "full-transcript",
      segments,
    }
  }

  const video = doc.querySelector("video")
  const currentTimeMs = video instanceof HTMLVideoElement
    ? Math.max(0, video.currentTime * 1000)
    : 0
  const texts = uniqueTexts([
    readMeta(doc, "meta[property='og:description']"),
    readMeta(doc, "meta[name='description']"),
    ...readVisibleTexts(doc, DESCRIPTION_SELECTORS),
    ...readVisibleTexts(doc, CAPTION_SELECTORS),
  ])

  if (texts.length === 0)
    return null

  return {
    title: doc.title,
    url: pageUrl,
    language: doc.documentElement.lang || "zh-CN",
    coverage: "page-text",
    notice: "该平台没有向网页暴露完整字幕轨道；以下内容仅包含视频文案、页面描述和当前可见字幕，不能代表整段视频的完整转写。",
    segments: texts.map((text, index) => ({
      text,
      start: index === 0 ? 0 : currentTimeMs,
    })),
  }
}

function collectNativeTrackCues(doc: Document) {
  const segments: Array<{ text: string, start: number }> = []
  const tracks = Array.from(doc.querySelectorAll("video track"))

  for (const element of tracks) {
    const track = (element as HTMLTrackElement).track
    if (!track)
      continue
    if (track.mode === "disabled")
      track.mode = "hidden"

    for (const cue of Array.from(track.cues ?? [])) {
      const text = "text" in cue ? String(cue.text).trim() : ""
      if (text)
        segments.push({ text, start: cue.startTime * 1000 })
    }
  }

  return dedupeSegments(segments)
}

function readMeta(doc: Document, selector: string): string {
  return doc.querySelector<HTMLMetaElement>(selector)?.content?.trim() ?? ""
}

function readVisibleTexts(doc: Document, selectors: string[]): string[] {
  return selectors.flatMap(selector =>
    Array.from(doc.querySelectorAll<HTMLElement>(selector))
      .filter(element => isVisible(element))
      .map(element => (element.textContent || "").trim()),
  )
}

function isVisible(element: HTMLElement): boolean {
  const style = globalThis.getComputedStyle?.(element)
  return style?.display !== "none" && style?.visibility !== "hidden"
}

function uniqueTexts(texts: string[]): string[] {
  const seen = new Set<string>()
  return texts
    .map(text => text.replace(/\s+/g, " ").trim())
    .filter(text => text.length >= 2 && text.length <= 4000)
    .filter((text) => {
      if (seen.has(text))
        return false
      seen.add(text)
      return true
    })
    .slice(0, 24)
}

function dedupeSegments(segments: Array<{ text: string, start: number }>) {
  const seen = new Set<string>()
  return segments.filter((segment) => {
    const key = `${segment.start}:${segment.text}`
    if (seen.has(key))
      return false
    seen.add(key)
    return true
  })
}
