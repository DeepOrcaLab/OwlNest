import { browser } from "#imports"

export interface CurrentPageSnapshot {
  tabId: number
  title: string
  url: string
  selectedText: string
  content: string
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

  return {
    title: document.title,
    url: location.href,
    selectedText,
    description: metaDescription,
    content: content.slice(0, 24000),
  }
}

function normalizePageText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
