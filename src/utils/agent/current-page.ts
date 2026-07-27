import { browser } from "#imports"

export interface CurrentPageSnapshot {
  tabId: number
  title: string
  url: string
  selectedText: string
  content: string
  paragraphs: string[]
  description: string
  capturedAt: number
}

export interface CurrentPageError {
  reason: "no-tab" | "unsupported-url" | "script-failed" | "empty-content"
  message: string
}

export type CurrentPageResult
  = | { ok: true, page: CurrentPageSnapshot }
    | { ok: false, error: CurrentPageError }

interface CandidateTab {
  id?: number
  url?: string
  title?: string
  active?: boolean
  windowId?: number
}

const READABLE_URL_RE = /^https?:\/\//i

export async function getCurrentReadablePage(): Promise<CurrentPageResult> {
  const tab = await findCurrentTab()
  if (!tab?.id) {
    return {
      ok: false,
      error: {
        reason: "no-tab",
        message: "没有找到可读取的左侧网页标签页。请先打开一个普通网页，再使用 OwlNest Agent。",
      },
    }
  }

  if (!tab.url || !READABLE_URL_RE.test(tab.url)) {
    return {
      ok: true,
      page: {
        tabId: tab.id,
        title: tab.title ?? "",
        url: tab.url ?? "",
        selectedText: "",
        content: "",
        paragraphs: [],
        description: "当前页面不是可注入读取正文的普通网页，但 OwlNest 已识别到它的标题和 URL。",
        capturedAt: Date.now(),
      },
    }
  }

  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: readPageInHost,
    })
    const page = result?.result

    if (!page?.content?.trim() && !page?.selectedText?.trim()) {
      return {
        ok: true,
        page: {
          tabId: tab.id,
          title: page?.title || tab.title || "",
          url: page?.url || tab.url,
          selectedText: page?.selectedText || "",
          content: "",
          paragraphs: page?.paragraphs || [],
          description: page?.description || "已连接到当前页面，但没有读取到正文内容。",
          capturedAt: Date.now(),
        },
      }
    }

    return {
      ok: true,
      page: {
        tabId: tab.id,
        title: page.title || tab.title || "",
        url: page.url || tab.url,
        selectedText: page.selectedText || "",
        content: page.content || "",
        paragraphs: page.paragraphs || [],
        description: page.description || "",
        capturedAt: Date.now(),
      },
    }
  }
  catch (error) {
    return {
      ok: true,
      page: {
        tabId: tab.id,
        title: tab.title ?? "",
        url: tab.url ?? "",
        selectedText: "",
        content: "",
        paragraphs: [],
        description: `已识别当前页面，但正文读取失败：${error instanceof Error ? error.message : "注入脚本失败"}`,
        capturedAt: Date.now(),
      },
    }
  }
}

async function findCurrentTab(): Promise<CandidateTab | null> {
  const focusedWindowTabs = await browser.tabs.query({ active: true, lastFocusedWindow: true })
  const focusedTab = focusedWindowTabs.find(isUsableTab)
  if (focusedTab)
    return focusedTab

  const currentWindowTabs = await browser.tabs.query({ active: true, currentWindow: true })
  const currentTab = currentWindowTabs.find(isUsableTab)
  if (currentTab)
    return currentTab

  const allActiveTabs = await browser.tabs.query({ active: true })
  const activeTab = allActiveTabs.find(isUsableTab)
  if (activeTab)
    return activeTab

  const allTabs = await browser.tabs.query({})
  return allTabs.find(tab => tab.active && isReadableTab(tab))
    ?? allTabs.find(tab => tab.active && isUsableTab(tab))
    ?? allTabs.find(isReadableTab)
    ?? allTabs.find(isUsableTab)
    ?? null
}

function isUsableTab(tab: CandidateTab): boolean {
  return !!tab.id && !!tab.url
}

function isReadableTab(tab: CandidateTab): boolean {
  return !!tab.id && !!tab.url && READABLE_URL_RE.test(tab.url)
}

function readPageInHost() {
  const selectedText = globalThis.getSelection?.()?.toString().trim() ?? ""
  const metaDescription = document.querySelector<HTMLMetaElement>("meta[name='description']")?.content
    ?? document.querySelector<HTMLMetaElement>("meta[property='og:description']")?.content
    ?? ""
  const main = document.querySelector("article, main, [role='main'], #content, .content")
  const source = main ?? document.body
  const content = normalizePageText(source?.textContent ?? "")
  const seen = new Set<string>()
  const paragraphs = Array.from(source?.querySelectorAll("h1, h2, h3, h4, p, li, blockquote") ?? [])
    .map(node => normalizePageText(node.textContent ?? ""))
    .filter((text) => {
      if (text.length < 20 || seen.has(text))
        return false
      seen.add(text)
      return true
    })
    .slice(0, 160)

  return {
    title: document.title,
    url: location.href,
    selectedText,
    description: metaDescription,
    content: content.slice(0, 24000),
    paragraphs,
  }
}

function normalizePageText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function formatPageEvidence(page: CurrentPageSnapshot, maxContentLength: number): string {
  const sourceParagraphs = getPageEvidenceParagraphs(page)

  let usedLength = 0
  const numbered: string[] = []

  for (const paragraph of sourceParagraphs) {
    const remaining = maxContentLength - usedLength
    if (remaining <= 0)
      break

    const content = paragraph.slice(0, remaining)
    numbered.push(`[P${numbered.length + 1}] ${content}`)
    usedLength += content.length
  }

  return numbered.join("\n\n") || "(No readable body text was extracted from this page.)"
}

export function getPageEvidenceParagraphs(page: CurrentPageSnapshot): string[] {
  return page.selectedText.trim()
    ? [page.selectedText.trim()]
    : page.paragraphs.length > 0
      ? page.paragraphs
      : page.content.split(/\n{2,}/).map(text => text.trim()).filter(Boolean)
}

export async function focusCurrentPageEvidence(evidenceText: string): Promise<boolean> {
  const tab = await findCurrentTab()
  if (!tab?.id || !tab.url || !READABLE_URL_RE.test(tab.url) || !evidenceText.trim())
    return false

  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      args: [evidenceText],
      func: (targetText: string) => {
        const normalize = (value: string) => value
          .replace(/\u00A0/g, " ")
          .replace(/\s+/g, " ")
          .trim()
        const target = normalize(targetText)
        const candidates = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, li, blockquote"))
        const element = candidates.find((node) => {
          const text = normalize(node.textContent ?? "")
          return text === target || text.includes(target) || target.includes(text)
        })

        if (!element)
          return false

        const previous = {
          backgroundColor: element.style.backgroundColor,
          borderRadius: element.style.borderRadius,
          outline: element.style.outline,
          outlineOffset: element.style.outlineOffset,
          transition: element.style.transition,
        }

        element.scrollIntoView({ behavior: "smooth", block: "center" })
        element.style.transition = "background-color 180ms ease, outline-color 180ms ease"
        element.style.backgroundColor = "rgba(250, 204, 21, 0.22)"
        element.style.borderRadius = "4px"
        element.style.outline = "2px solid rgba(245, 158, 11, 0.72)"
        element.style.outlineOffset = "3px"

        window.setTimeout(() => {
          Object.assign(element.style, previous)
        }, 2600)

        return true
      },
    })

    return result?.result === true
  }
  catch {
    return false
  }
}
