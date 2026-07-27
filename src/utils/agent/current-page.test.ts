import type { CurrentPageSnapshot } from "./current-page"
import { describe, expect, it } from "vitest"
import { formatPageEvidence } from "./current-page"

function createPage(overrides: Partial<CurrentPageSnapshot> = {}): CurrentPageSnapshot {
  return {
    tabId: 1,
    title: "Example",
    url: "https://example.com",
    selectedText: "",
    content: "",
    paragraphs: [],
    description: "",
    capturedAt: 0,
    ...overrides,
  }
}

describe("formatPageEvidence", () => {
  it("numbers extracted paragraphs as stable evidence anchors", () => {
    const page = createPage({ paragraphs: ["First useful paragraph.", "Second useful paragraph."] })

    expect(formatPageEvidence(page, 1000)).toBe(
      "[P1] First useful paragraph.\n\n[P2] Second useful paragraph.",
    )
  })

  it("prioritizes selected text", () => {
    const page = createPage({
      selectedText: "Selected evidence",
      paragraphs: ["Other paragraph"],
    })

    expect(formatPageEvidence(page, 1000)).toBe("[P1] Selected evidence")
  })

  it("respects the content budget", () => {
    const page = createPage({ paragraphs: ["12345", "67890"] })

    expect(formatPageEvidence(page, 7)).toBe("[P1] 12345\n\n[P2] 67")
  })
})
