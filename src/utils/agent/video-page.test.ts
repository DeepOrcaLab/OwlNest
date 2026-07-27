// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { collectVideoPageTranscript } from "./video-page"

describe("collectVideoPageTranscript", () => {
  it("collects Douyin description and visible captions as limited page text", () => {
    document.documentElement.lang = "zh-CN"
    document.title = "抖音视频"
    document.head.innerHTML = `<meta property="og:description" content="四个科学记忆方法">`
    document.body.innerHTML = `
      <video></video>
      <div data-e2e="video-desc">为什么学了很久还是会忘记？</div>
      <div class="player-subtitle">两个小时之后</div>
    `

    const transcript = collectVideoPageTranscript(document, "https://www.douyin.com/?recommend=1")

    expect(transcript?.coverage).toBe("page-text")
    expect(transcript?.notice).toContain("没有向网页暴露完整字幕轨道")
    expect(transcript?.segments.map(segment => segment.text)).toEqual([
      "四个科学记忆方法",
      "为什么学了很久还是会忘记？",
      "两个小时之后",
    ])
  })

  it("returns null when the page exposes no useful video text", () => {
    document.head.innerHTML = ""
    document.body.innerHTML = "<video></video>"

    expect(collectVideoPageTranscript(document, "https://www.douyin.com/")).toBeNull()
  })
})
