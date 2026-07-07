import type { KnowledgeCard } from "@/types/knowledge"
import {
  IconChevronDown,
  IconDownload,
  IconFileTypePdf,
  IconMarkdown,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { browser } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { Input } from "@/components/ui/base-ui/input"
import { sendMessage } from "@/utils/message"
import { cn } from "@/utils/styles/utils"

export function KnowledgePanel() {
  const [cards, setCards] = useState<KnowledgeCard[]>([])
  const [searchText, setSearchText] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editTags, setEditTags] = useState("")
  const [editTopic, setEditTopic] = useState("")
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [generatingTags, setGeneratingTags] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const loadCards = useCallback(async (search?: string, tag?: string | null) => {
    setIsLoading(true)
    setError(null)
    try {
      const query: any = { sortBy: "createdAt" as const, sortDirection: "desc" as const }
      if (search)
        query.searchText = search
      if (tag)
        query.tags = [tag]

      const [result, tags] = await Promise.all([
        (sendMessage as any)("knowledge:query", { query }) as Promise<KnowledgeCard[]>,
        (sendMessage as any)("knowledge:tags") as Promise<string[]>,
      ])
      setCards(result ?? [])
      setAvailableTags(tags ?? [])
    }
    catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    }
    finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCards(searchText, selectedTag)
  }, [loadCards, searchText, selectedTag])

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen)
      return
    const handlePointerDown = (event: PointerEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node))
        setExportMenuOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [exportMenuOpen])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await (sendMessage as any)("knowledge:delete", { id })
      setCards(prev => prev.filter(c => c.id !== id))
      setDeletingCardId(null)
    }
    catch {
      toast.error("Failed to delete")
    }
  }, [])

  const handleEdit = useCallback((card: KnowledgeCard) => {
    setEditingCardId(card.id)
    setEditTags(card.tags?.join(", ") ?? "")
    setEditTopic(card.topic ?? "")
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingCardId)
      return
    try {
      const updates: any = { tags: editTags.split(",").map(t => t.trim()).filter(Boolean), topic: editTopic.trim() }
      await (sendMessage as any)("knowledge:update", { id: editingCardId, updates })
      setCards(prev => prev.map(c => c.id === editingCardId ? { ...c, ...updates } : c))
      setEditingCardId(null)
    }
    catch {
      toast.error("Failed to update")
    }
  }, [editingCardId, editTags, editTopic])

  const handleExportJSON = useCallback(async () => {
    try {
      const json = await (sendMessage as any)("knowledge:exportJSON") as string
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `owlnest-knowledge-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportMenuOpen(false)
      toast.success("Exported successfully")
    }
    catch {
      toast.error("Export failed")
    }
  }, [])

  const handleExportMarkdown = useCallback(async () => {
    try {
      const md = await (sendMessage as any)("knowledge:exportMarkdown") as string
      const blob = new Blob([md], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `owlnest-knowledge-${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
      setExportMenuOpen(false)
      toast.success("Exported successfully")
    }
    catch {
      toast.error("Export failed")
    }
  }, [])

  const handleExportPageMarkdown = useCallback(async () => {
    try {
      const page = await readCurrentPageForExport()
      if (!page.mainContent.trim()) {
        toast.error("Failed to read current page. Please refresh the page and try again.")
        return
      }
      const md = buildPageMarkdown(page)
      downloadBlob(
        md,
        `${slugify(page.title || "owlnest-page")}-${new Date().toISOString().slice(0, 10)}.md`,
        "text/markdown;charset=utf-8",
      )
      setExportMenuOpen(false)
      toast.success("Current page exported as Markdown")
    }
    catch (err) { toast.error(err instanceof Error ? err.message : "Export page failed") }
  }, [])

  const handleExportPagePDF = useCallback(async () => {
    try {
      const page = await readCurrentPageForExport()
      if (!page.mainContent.trim()) {
        toast.error("Failed to read current page. Please refresh the page and try again.")
        return
      }
      const exportId = crypto.randomUUID()
      await browser.storage.local.set({ [`owlnest-page-export:${exportId}`]: page })
      await browser.tabs.create({ url: browser.runtime.getURL(`/page-export.html#${exportId}`), active: true })
      setExportMenuOpen(false)
      toast.success("Opened clean PDF export page")
    }
    catch (err) { toast.error(err instanceof Error ? err.message : "Export page failed") }
  }, [])

  const handleGenerateTags = useCallback(async (card: KnowledgeCard) => {
    setGeneratingTags(true)
    try {
      const prompt = `你是 OwlNest 的知识库整理助手。请根据下面这条知识卡片内容，生成适合用于个人知识库的 tags 和 topic。

要求：
1. tags 生成 3 到 6 个，简短准确。
2. topic 生成 1 个大分类。
3. 不要生成太泛的标签，比如"文章""内容""信息"。
4. 只返回 JSON，不要解释。

内容：
- 原文: ${card.selectedText.slice(0, 300)}
- 结果: ${(card.resultText ?? "").slice(0, 300)}
- 来源: ${card.sourceType}
- 页面: ${card.pageTitle ?? ""}`

      const result = await (sendMessage as any)("backgroundGenerateText", {
        providerId: "", // Will use first available LLM provider
        instructions: "Return only valid JSON. No markdown, no explanation.",
        prompt,
      }) as { text?: string }

      if (result?.text) {
        let json = result.text
        // Strip markdown code fences
        json = json.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(json) as { tags?: string[], topic?: string }
        if (parsed.tags?.length)
          setEditTags(parsed.tags.slice(0, 6).join(", "))
        if (parsed.topic)
          setEditTopic(parsed.topic)
      }
    }
    catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate tags")
    }
    finally {
      setGeneratingTags(false)
    }
  }, [])

  const handleClear = useCallback(async () => {
    try {
      await (sendMessage as any)("knowledge:clear")
      setCards([])
      setShowClearConfirm(false)
      toast.success("Knowledge cleared")
    }
    catch {
      toast.error("Failed to clear")
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="shrink-0 border-b px-3 py-2.5 space-y-2.5">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadCards(searchText, selectedTag)}
              placeholder="Search saved items..."
              className="h-8 flex-1 pl-8 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {/* Export dropdown */}
            <div ref={exportMenuRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setExportMenuOpen(o => !o)}
                aria-label="Export"
              >
                <IconDownload className="size-3.5" />
                <span className="hidden sm:inline">Export</span>
                <IconChevronDown className="size-3" />
              </Button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  <MenuExportItem icon={IconDownload} label="Export Knowledge JSON" onClick={() => void handleExportJSON()} />
                  <MenuExportItem icon={IconMarkdown} label="Export Knowledge MD" onClick={() => void handleExportMarkdown()} />
                  <div className="my-0.5 h-px bg-border" />
                  <MenuExportItem icon={IconMarkdown} label="Export Page MD" onClick={() => void handleExportPageMarkdown()} />
                  <MenuExportItem icon={IconFileTypePdf} label="Export Page PDF" onClick={() => void handleExportPagePDF()} />
                </div>
              )}
            </div>
            {/* Clear All */}
            {!showClearConfirm
              ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => setShowClearConfirm(true)}
                    aria-label="Clear all knowledge"
                  >
                    <IconTrash className="size-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )
              : (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-destructive whitespace-nowrap">Clear all?</span>
                    <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => void handleClear()}>Yes</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowClearConfirm(false)}>No</Button>
                  </div>
                )}
          </div>
        </div>
        {/* Tag filter pills */}
        {availableTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                !selectedTag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              All
            </button>
            {availableTags.map(tag => (
              <button
                type="button"
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                  tag === selectedTag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-12 text-sm text-destructive">
            {error}
          </div>
        )}
        {!isLoading && !error && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
            <p className="text-sm text-muted-foreground">No saved items yet.</p>
            <p className="text-xs text-muted-foreground/70">
              Select text on any webpage and save it to your Knowledge Nest.
            </p>
          </div>
        )}
        {cards.map(card => (
          <div key={card.id} className="border-b px-4 py-3.5 last:border-b-0 hover:bg-muted/30 transition-colors">
            {editingCardId === card.id
              ? (
                  <div className="space-y-2.5">
                    <div className="text-[13px] font-medium leading-snug line-clamp-3">{card.selectedText}</div>
                    <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="Tags (comma separated)" className="h-8 text-xs" />
                    <Input value={editTopic} onChange={e => setEditTopic(e.target.value)} placeholder="Topic" className="h-8 text-xs" />
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={() => void handleSaveEdit()} size="sm" className="h-7 text-xs">Save</Button>
                      <Button onClick={() => setEditingCardId(null)} variant="ghost" size="sm" className="h-7 text-xs">Cancel</Button>
                      <Button onClick={() => void handleGenerateTags(card)} variant="outline" size="sm" className="h-7 text-xs" disabled={generatingTags}>
                        <IconSparkles className="size-3" />
                        <span className="ml-1">{generatingTags ? "Generating..." : "Auto Tags"}</span>
                      </Button>
                    </div>
                  </div>
                )
              : (
                  <>
                    {/* Card topic badge */}
                    {card.topic && (
                      <span className="mb-1.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                        {card.topic}
                      </span>
                    )}
                    {/* Selected text */}
                    <div className="text-[13px] font-medium leading-snug line-clamp-3">{card.selectedText || "(No text)"}</div>
                    {/* Result text */}
                    {card.resultText && (
                      <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-3">
                        {card.resultText}
                      </div>
                    )}
                    {/* Tags & actions row */}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex gap-1 flex-wrap items-center min-w-0">
                        {card.sourceType && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">{card.sourceType}</span>
                        )}
                        {card.tags?.map(tag => (
                          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          onClick={() => handleEdit(card)}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Button>
                        {deletingCardId === card.id
                          ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-destructive">Delete?</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 text-[11px]"
                                  onClick={() => void handleDelete(card.id)}
                                >
                                  Yes
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px]"
                                  onClick={() => setDeletingCardId(null)}
                                >
                                  <IconX className="size-3" />
                                </Button>
                              </div>
                            )
                          : (
                              <Button
                                onClick={() => setDeletingCardId(card.id)}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] text-muted-foreground hover:text-destructive"
                              >
                                Delete
                              </Button>
                            )}
                      </div>
                    </div>
                    {/* Page URL */}
                    {card.pageUrl && (
                      <div className="mt-1.5 truncate text-[11px] text-muted-foreground/50">
                        {card.pageUrl}
                      </div>
                    )}
                  </>
                )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {cards.length > 0 && (
        <div className="shrink-0 border-t px-4 py-2 text-[11px] text-muted-foreground">
          {cards.length}
          {" "}
          saved item
          {cards.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}

function MenuExportItem({ icon: Icon, label, onClick }: { icon: typeof IconDownload, label: string, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </button>
  )
}

interface PageExportPayload {
  title: string
  url: string
  mainContent: string
  selectedText: string
  exportedAt: string
}

async function readCurrentPageForExport(): Promise<PageExportPayload> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab?.id)
    throw new Error("No active tab found")

  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const selectedText = window.getSelection()?.toString() ?? ""
      const article = document.querySelector("article, main, [role='main']") as HTMLElement | null
      const source = article ?? document.body
      return {
        title: document.title,
        url: location.href,
        selectedText,
        mainContent: source.textContent?.replace(/\n{3,}/g, "\n\n").trim().slice(0, 50000) ?? "",
      }
    },
  })

  const page = results[0]?.result
  if (!page)
    throw new Error("Unable to read current page")

  return {
    title: page.title || tab.title || "Untitled Page",
    url: page.url || tab.url || "",
    selectedText: page.selectedText || "",
    mainContent: page.mainContent || "",
    exportedAt: new Date().toISOString(),
  }
}

function buildPageMarkdown(page: PageExportPayload): string {
  return `# ${page.title}

Source: ${page.url}

Exported at: ${page.exportedAt}

---

${page.selectedText ? `## Selected Text\n\n${page.selectedText}\n\n---\n\n` : ""}## 页面内容

${page.mainContent}

---

Generated by OwlNest Agent.
`
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return slug.slice(0, 80) || "owlnest-page"
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
