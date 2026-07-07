import type { ChatMode } from "./chat-input-bar"
import type { LLMProviderConfig } from "@/types/config/provider"
import type { KnowledgeCard } from "@/types/knowledge"
import type { CurrentPageSnapshot } from "@/utils/agent/current-page"
import type { AgentToolEvent, AgentToolEventListener } from "@/utils/agent/types"
import type { ChatMessage } from "@/utils/chat/chat-memory"
import {
  IconArrowsDiagonal,
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconThumbDown,
  IconThumbUp,
  IconVolume,
  IconVolumeOff,
  IconWorld,
} from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { browser } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { isLLMProviderConfig } from "@/types/config/provider"
import { getCurrentReadablePage } from "@/utils/agent/current-page"
import { isExplicitWebSearchQuery, isSaveToKnowledgeQuery, isWeatherQuery, shouldReadCurrentPage, shouldSearchWeb } from "@/utils/agent/query-intent"
import { createToolEvent } from "@/utils/agent/types"
import { getAgentWebSearchConfig } from "@/utils/agent/web-search-config"
import { addChatMessage, clearConversation, getConversationMessages, getOrCreateConversation } from "@/utils/chat/chat-memory"
import { streamBackgroundText } from "@/utils/content-script/background-stream-client"
import { sendMessage } from "@/utils/message"
import { formatSearchResults, performWebSearch } from "@/utils/search/web-search"
import { cn } from "@/utils/styles/utils"
import { useVoiceInteraction } from "../hooks/use-voice-interaction"
import { ChatInputBar } from "./chat-input-bar"

interface PageContext { title?: string, url?: string }
interface AssistantResponseMeta { query: string, durationMs?: number, startedAt?: number }
const MAX_RECENT = 20
const DEFAULT_CHAT_MODE: ChatMode = "advanced"

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pageContext, setPageContext] = useState<PageContext>({})
  const [llmProviders, setLlmProviders] = useState<LLMProviderConfig[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [chatMode, setChatMode] = useState<ChatMode>(DEFAULT_CHAT_MODE)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initDone, setInitDone] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [inputNotice, setInputNotice] = useState<string | null>(null)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [webSearchActive, setWebSearchActive] = useState(false)
  const [pageText, setPageText] = useState<string>("")
  const [toolEvents, setToolEvents] = useState<AgentToolEvent[]>([])
  const [responseMeta, setResponseMeta] = useState<Record<string, AssistantResponseMeta>>({})
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<string, "up" | "down">>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const handleSendRef = useRef<(overrideText?: string) => Promise<void>>(async () => {})
  const autoSendVoiceRef = useRef(false)
  const voice = useVoiceInteraction("zh-CN")

  // Init
  useEffect(() => {
    void (async () => {
      try {
        const { getLocalConfig } = await import("@/utils/config/storage")
        const { DEFAULT_CONFIG } = await import("@/utils/constants/config")
        const config = await getLocalConfig() ?? DEFAULT_CONFIG
        const providers = (config.providersConfig ?? []).filter(p => p.enabled !== false && isLLMProviderConfig(p)) as LLMProviderConfig[]
        setLlmProviders(providers)
        if (providers.length > 0) {
          const providerWithKey = providers.find(p => !!p.apiKey)
          const defaultProvider = providerWithKey ?? providers[0]
          setSelectedProviderId(defaultProvider.id)
          setChatMode(getDefaultChatModeForProvider(defaultProvider))
        }

        const pageResult = await getCurrentReadablePage()
        const currentUrl = pageResult.ok ? pageResult.page.url : "about:blank"
        setPageContext(pageResult.ok ? { title: pageResult.page.title, url: pageResult.page.url } : {})
        if (pageResult.ok)
          setPageText(pageResult.page.selectedText || pageResult.page.content)

        const conv = await getOrCreateConversation(currentUrl, pageResult.ok ? pageResult.page.title : undefined)
        setConversationId(conv.id)
        const existing = await getConversationMessages(conv.id, MAX_RECENT)
        setMessages(existing)
      }
      catch (err) {
        setInitError(err instanceof Error ? err.message : "Failed to init")
      }
      finally {
        setInitDone(true)
      }
    })()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const resolvedProvider = useMemo(
    () => resolveChatModeProvider(chatMode, llmProviders, selectedProviderId),
    [chatMode, llmProviders, selectedProviderId],
  )

  // ---- Voice input ----
  const toggleListening = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening()
      autoSendVoiceRef.current = false
    }
    else {
      autoSendVoiceRef.current = false
      void voice.startListening({ autoSend: false })
    }
  }, [voice])

  const startVoiceConversation = useCallback(() => {
    if (isLoading)
      return
    autoSendVoiceRef.current = true
    void voice.startListening({ autoSend: true })
  }, [isLoading, voice])

  useEffect(() => {
    if (!voice.transcript)
      return

    if (autoSendVoiceRef.current) {
      void handleSendRef.current(voice.transcript)
      autoSendVoiceRef.current = false
    }
    else {
      setInput(prev => `${prev}${voice.transcript}`)
    }

    voice.resetTranscript()
  }, [voice])

  const voiceStatusText = useMemo(() => {
    if (voice.error)
      return voice.error
    if (voice.isRequestingPermission)
      return "正在请求麦克风权限..."
    if (voice.isListening)
      return voice.interimTranscript ? `正在聆听：${voice.interimTranscript}` : "正在聆听..."
    if (voice.status === "transcript-ready")
      return "语音识别完成，可编辑后发送。"
    return null
  }, [voice])

  // ---- TTS ----
  const sanitizeForSpeech = useCallback((text: string): string => {
    return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`{1,3}[^`]*`{1,3}/g, " code snippet ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, " link ").replace(/[#>|]/g, " ").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim()
  }, [])

  const speakMessage = useCallback((msg: ChatMessage) => {
    if (!msg.content)
      return
    window.speechSynthesis.cancel()
    if (speakingMsgId === msg.id) {
      setSpeakingMsgId(null)
      return
    }
    const cleaned = sanitizeForSpeech(msg.content)
    const u = new SpeechSynthesisUtterance(cleaned)
    u.rate = 0.85
    u.pitch = 1
    u.lang = /[\u4E00-\u9FFF]/.test(cleaned) ? "zh-CN" : "en-US"
    u.onend = () => setSpeakingMsgId(null)
    u.onerror = () => setSpeakingMsgId(null)
    setSpeakingMsgId(msg.id)
    window.speechSynthesis.speak(u)
  }, [speakingMsgId, sanitizeForSpeech])

  // ---- Chat logic ----
  const emitToolEvent = useCallback<AgentToolEventListener>((event) => {
    setToolEvents(prev => [...prev, event].slice(-6))
  }, [])

  const buildPrompt = useCallback((userText: string, recent: ChatMessage[], toolContext?: string, pageTxt?: string) => {
    const h = recent.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n")
    const ctx = pageContext.title ? `[From Page: ${pageContext.title}]\n` : ""
    const pg = pageTxt ? `[Page Content]:\n${pageTxt.slice(0, 6000)}\n\n` : ""
    const tools = toolContext ? `[Agent Tool Context]:\n${toolContext}\n\n` : ""
    const now = new Date().toISOString().slice(0, 10)
    return `Today is ${now}.\n${ctx}${pg}${tools}Previous conversation:\n${h}\n\nUser: ${userText}\n\nAssistant:`
  }, [pageContext])

  const searchKnowledgeContext = useCallback(async (query: string): Promise<string> => {
    try {
      emitToolEvent(createToolEvent("search_knowledge", "running", "正在搜索 Knowledge"))
      const cards = await (sendMessage as any)("knowledge:query", { query: { searchText: query, sortBy: "createdAt", sortDirection: "desc", limit: 3 } }) as KnowledgeCard[]
      if (!cards?.length) {
        emitToolEvent(createToolEvent("search_knowledge", "skipped", "Knowledge 没有匹配结果"))
        return ""
      }
      emitToolEvent(createToolEvent("search_knowledge", "success", `找到 ${cards.length} 条 Knowledge`))
      return cards.map(c => `- ${c.selectedText.slice(0, 200)}${c.resultText ? ` → ${c.resultText.slice(0, 200)}` : ""}`).join("\n")
    }
    catch {
      emitToolEvent(createToolEvent("search_knowledge", "error", "Knowledge 搜索失败"))
      return ""
    }
  }, [emitToolEvent])

  const buildAgentToolContext = useCallback(async (query: string): Promise<string> => {
    const chunks: string[] = []
    const wantsFullPage = shouldReadCurrentPage(query)
    const pageResult = await getCurrentReadablePage()

    if (wantsFullPage)
      emitToolEvent(createToolEvent("read_page", "running", "正在读取左侧网页"))

    if (pageResult.ok) {
      setPageContext({ title: pageResult.page.title, url: pageResult.page.url })
      const readableText = pageResult.page.selectedText || pageResult.page.content
      setPageText(readableText)

      if (wantsFullPage) {
        emitToolEvent(createToolEvent("read_page", "success", "已读取左侧网页", pageResult.page.title || pageResult.page.url))
        chunks.push(formatCurrentPageToolContext(pageResult.page, 12000))
      }
      else {
        chunks.push(formatCurrentPageToolContext(pageResult.page, 4500))
      }
    }
    else {
      if (wantsFullPage) {
        emitToolEvent(createToolEvent("read_page", "error", "无法读取左侧网页", pageResult.error.message))
        chunks.push(`[Tool: read_page failed]\n${pageResult.error.message}`)
      }
      else if (pageText) {
        chunks.push(`[Tool: cached_page]\nTitle: ${pageContext.title ?? ""}\nURL: ${pageContext.url ?? ""}\nContent:\n${pageText.slice(0, 4500)}`)
      }
    }

    const knowledge = await searchKnowledgeContext(query)
    if (knowledge)
      chunks.push(`[Tool: search_knowledge]\n${knowledge}`)

    if (isWeatherQuery(query)) {
      emitToolEvent(createToolEvent("weather", "running", "正在查询天气"))
      const weather = await fetchWeatherContext(query)
      if (weather) {
        emitToolEvent(createToolEvent("weather", "success", "天气查询完成"))
        chunks.push(`[Tool: weather]\n${weather}`)
      }
      else {
        emitToolEvent(createToolEvent("weather", "error", "天气查询失败"))
      }
    }

    const explicitWebSearch = isExplicitWebSearchQuery(query)
    if ((webSearchEnabled || explicitWebSearch) && shouldSearchWeb(query)) {
      if (!webSearchEnabled && explicitWebSearch) {
        setWebSearchEnabled(true)
        emitToolEvent(createToolEvent("web_search", "running", "已为本次查询启用联网搜索"))
      }
      setWebSearchActive(true)
      emitToolEvent(createToolEvent("web_search", "running", "正在联网搜索"))
      try {
        const searchContext = await fetchWebSearchContext(query)
        if (searchContext) {
          emitToolEvent(createToolEvent("web_search", "success", "联网搜索完成"))
          chunks.push(`[Tool: web_search]\n${searchContext}`)
        }
        else {
          emitToolEvent(createToolEvent("web_search", "skipped", "没有搜索到可用结果", "请在 Agent 工具设置中配置 Brave 或 Tavily API Key 以获得更稳定的实时搜索。"))
          chunks.push(`[Tool: web_search returned no usable results]\nThe web search tool ran, but the configured and no-key fallback sources returned no usable results for this query. Do not say browser permission is missing. Tell the user that no usable results were returned and suggest a narrower query or configuring Brave/Tavily Search.`)
        }
      }
      catch (error) {
        emitToolEvent(createToolEvent("web_search", "error", "联网搜索失败", error instanceof Error ? error.message : "Unknown error"))
        chunks.push(`[Tool: web_search failed]\n${error instanceof Error ? error.message : "Unknown error"}\nDo not say browser permission is missing.`)
      }
      finally {
        setWebSearchActive(false)
      }
    }

    return chunks.join("\n\n")
  }, [emitToolEvent, pageContext, pageText, searchKnowledgeContext, webSearchEnabled])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    const provider = resolvedProvider.provider
    const providerId = provider?.id ?? null
    if (!text || isLoading || !conversationId)
      return
    if (!providerId || !provider) {
      setInputNotice("未配置 AI 模型，请到 Options → API 提供商 中添加 DeepSeek、OpenAI、MiMo 或 OpenRouter。")
      return
    }
    if (!provider.apiKey) {
      setInputNotice(`${provider.name} 缺少 API Key，请先在 API Providers 中配置。`)
      return
    }

    setInputNotice(resolvedProvider.fallbackMessage)
    setToolEvents([])

    setInput("")
    setIsLoading(true)
    const userMsg = await addChatMessage({ conversationId, role: "user", content: text, providerId, providerName: provider.name })
    const recent = [...messages, userMsg].slice(-MAX_RECENT)
    setMessages([...messages, userMsg])

    if (isSaveToKnowledgeQuery(text)) {
      emitToolEvent(createToolEvent("save_to_knowledge", "running", "正在保存到 Knowledge"))
      const savedText = pageText || pageContext.title || text
      await (sendMessage as any)("knowledge:create", {
        card: {
          selectedText: savedText.slice(0, 2000),
          resultText: `Saved from current page by OwlNest Agent.\n\n${savedText.slice(0, 4000)}`,
          pageUrl: pageContext.url ?? "",
          pageTitle: pageContext.title,
          sourceType: "ai-action",
          provider: "OwlNest Agent",
          tags: ["saved"],
          topic: "Current Page",
        },
      })
      emitToolEvent(createToolEvent("save_to_knowledge", "success", "已保存到 Knowledge"))
      const saved = await addChatMessage({
        conversationId,
        role: "assistant",
        content: "已保存当前网页内容到 Knowledge 知识巢。",
        providerId,
        providerName: provider.name,
      })
      setMessages(prev => [...prev, saved])
      setIsLoading(false)
      return
    }

    const placeholderId = crypto.randomUUID()
    const placeholder: ChatMessage = { id: placeholderId, conversationId, role: "assistant", content: "", createdAt: Date.now() }
    const requestStartedAt = Date.now()
    setResponseMeta(prev => ({ ...prev, [placeholderId]: { query: text, startedAt: requestStartedAt } }))
    setMessages(prev => [...prev, placeholder])

    const abort = new AbortController()
    streamAbortRef.current = abort
    let streamedText = ""

    try {
      const runtimeModelLabel = getProviderRuntimeLabel(provider)
      const systemPrompt = `You are OwlNest Agent, an AI reading assistant. Help users read, understand, and learn from web content. Be clear and educational.
Current runtime:
- Chat mode: ${chatMode}
- Provider name: ${provider.name}
- Provider type: ${provider.provider}
- Model: ${runtimeModelLabel}
Rules:
- If the user asks what model/provider you are using, answer from Current runtime exactly. Do not guess or say OpenAI unless Provider name/type is OpenAI.
- Today's date is in the context. Use it for time-aware queries.
- Answer in the SAME LANGUAGE as the user (Chinese → Chinese, English → English).
- If [From Web Search] results are provided, cite them. If [From Knowledge] results are provided, mention them.
- If [Tool: web_search] results are provided, you HAVE web search context. Do not claim you lack web access or permissions.
- For time-sensitive questions, if any web search results are present, you MUST summarize the returned results in useful bullets with dates and sources. Do not answer only with an apology.
- If no result exactly matches today's date, say "以下是搜索工具返回的最新可用结果" and still summarize them. Mention the date mismatch briefly, then provide the list.
- Do not ask the user to choose between self-search and a generic explanation when web results are present.
- If no web results are provided, say the search tool did not return usable results instead of claiming browser permission is missing.
- If [Page Content] is provided, you CAN read it directly. Do NOT say you cannot access the URL.
- If [Tool: current_page] or [Tool: read_page] is provided, you know the currently open page title/URL and any extracted text. Never say you cannot see the left/current page. If only title/URL is available, describe that metadata and say the page did not expose readable body text.
- Never make up facts. Say so when unsure.`

      const agentToolContext = await buildAgentToolContext(text)

      await streamBackgroundText(
        { providerId, instructions: systemPrompt, prompt: buildPrompt(text, recent, agentToolContext, pageText) },
        {
          signal: abort.signal,
          onChunk: (snapshot) => {
            streamedText = snapshot.output
            setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: streamedText } : m))
          },
        },
      )

      const durationMs = Date.now() - requestStartedAt
      const saved = await addChatMessage({ conversationId, role: "assistant", content: streamedText || "(No response)", providerId, providerName: provider.name })
      setResponseMeta((prev) => {
        const { [placeholderId]: placeholderMeta, ...rest } = prev
        return { ...rest, [saved.id]: { query: placeholderMeta?.query ?? text, durationMs } }
      })
      setMessages(prev => prev.map(m => m.id === placeholderId ? saved : m))
    }
    catch (error) {
      const errText = `${provider.name} request failed: ${error instanceof Error ? error.message : "Unknown"}`
      const saved = await addChatMessage({ conversationId, role: "assistant", content: errText })
      setResponseMeta((prev) => {
        const { [placeholderId]: placeholderMeta, ...rest } = prev
        return { ...rest, [saved.id]: { query: placeholderMeta?.query ?? text, durationMs: Date.now() - requestStartedAt } }
      })
      setMessages(prev => prev.map(m => m.id === placeholderId ? saved : m))
    }
    finally {
      setIsLoading(false)
      streamAbortRef.current = null
    }
  }, [input, isLoading, resolvedProvider, conversationId, messages, pageText, pageContext, chatMode, emitToolEvent, buildAgentToolContext, buildPrompt])

  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  const handleStopGenerating = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setIsLoading(false)
    setWebSearchActive(false)
  }, [])

  // ---- Render ----
  if (!initDone)
    return <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">Loading...</div>
  if (initError)
    return <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-destructive">{initError}</div>

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* === STICKY HEADER === */}
      <div className="shrink-0 border-b px-3 py-2 space-y-2 bg-background">
        <div className="flex items-center justify-end">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={async () => {
                if (conversationId) {
                  await clearConversation(conversationId)
                  setMessages([])
                }
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {pageContext.title && (
          <div className="text-xs text-muted-foreground truncate">
            Reading:
            {pageContext.title}
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button variant={webSearchEnabled ? "default" : "outline"} size="sm" className="h-5 text-[11px] px-1.5" onClick={() => setWebSearchEnabled(!webSearchEnabled)} aria-label={webSearchEnabled ? "Web search on" : "Web search off"}>
            <IconWorld className="size-3" />
            {" "}
            {webSearchEnabled ? "On" : "Off"}
          </Button>
          {webSearchActive && <span className="text-[11px] text-muted-foreground animate-pulse">Searching...</span>}
        </div>
        {toolEvents.length > 0 && (
          <div className="space-y-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1.5">
            {toolEvents.slice(-4).map(event => (
              <div key={event.id} className="flex items-start gap-1.5 text-[11px] leading-4">
                <span className={cn(
                  "mt-1 size-1.5 shrink-0 rounded-full",
                  event.status === "running" && "animate-pulse bg-blue-500",
                  event.status === "success" && "bg-emerald-500",
                  event.status === "error" && "bg-destructive",
                  event.status === "skipped" && "bg-muted-foreground",
                )}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{event.label}</span>
                  {event.detail && <span className="ml-1 text-muted-foreground">{event.detail}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === SCROLLABLE MESSAGES === */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Ask OwlNest Agent about this page...</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            {msg.role === "assistant"
              ? (
                  <AssistantMessageView
                    msg={msg}
                    meta={responseMeta[msg.id]}
                    isPending={isLoading && msg.content === ""}
                    isSpeaking={speakingMsgId === msg.id}
                    copied={copiedMessageId === msg.id}
                    feedback={feedbackByMessageId[msg.id]}
                    onCopy={() => {
                      void navigator.clipboard.writeText(msg.content)
                      setCopiedMessageId(msg.id)
                      window.setTimeout(setCopiedMessageId, 1400, null)
                    }}
                    onSave={() => handleSaveToKnowledge(msg)}
                    onSpeak={() => speakMessage(msg)}
                    onFeedback={value => setFeedbackByMessageId(prev => ({ ...prev, [msg.id]: value }))}
                  />
                )
              : (
                  <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* === STICKY INPUT BAR === */}
      <div className="shrink-0 border-t bg-background p-3">
        {/* Page context pill */}
        {pageContext.title && (
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground max-w-full truncate">
              <span className="shrink-0">📄</span>
              <span className="truncate">{pageContext.title}</span>
            </span>
          </div>
        )}
        {(voice.error || inputNotice) && (
          <div className={cn("mb-1 flex items-center justify-between gap-2 text-[11px]", voice.error ? "text-destructive" : "text-amber-600")}>
            <span>{voice.error || inputNotice}</span>
            {voice.error && (voice.permissionState === "requires-page" || voice.permissionState === "denied") && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => void voice.openPermissionPage()}
              >
                打开授权页面
              </Button>
            )}
          </div>
        )}
        <ChatInputBar
          value={input}
          onChange={(value) => {
            setInput(value)
            if (inputNotice)
              setInputNotice(null)
          }}
          onSend={() => void handleSend()}
          onStop={handleStopGenerating}
          disabled={isLoading}
          isGenerating={isLoading}
          currentMode={chatMode}
          onModeChange={(mode) => {
            setChatMode(mode)
            setInputNotice(null)
          }}
          providers={llmProviders}
          selectedProviderId={selectedProviderId}
          onProviderChange={(providerId) => {
            setSelectedProviderId(providerId)
            setChatMode("balanced")
            setInputNotice(null)
          }}
          isListening={voice.isListening}
          onStartListening={toggleListening}
          onStopListening={voice.stopListening}
          onStartVoiceConversation={startVoiceConversation}
          voiceSupported={voice.isSupported}
          isRequestingVoicePermission={voice.isRequestingPermission}
          voiceStatusText={voiceStatusText}
          voiceError={voice.error}
          onOpenVoicePermissionPage={() => void voice.openPermissionPage()}
          onOpenProviderSettings={() => {
            void sendMessage("openOptionsPage", { route: "/api-providers" })
          }}
        />
      </div>
    </div>
  )
}

// ---- Helpers ----
interface AssistantMessageViewProps {
  msg: ChatMessage
  meta?: AssistantResponseMeta
  isPending: boolean
  isSpeaking: boolean
  copied: boolean
  feedback?: "up" | "down"
  onCopy: () => void
  onSave: () => void
  onSpeak: () => void
  onFeedback: (value: "up" | "down") => void
}

function AssistantMessageView({
  msg,
  meta,
  isPending,
  isSpeaking,
  copied,
  feedback,
  onCopy,
  onSave,
  onSpeak,
  onFeedback,
}: AssistantMessageViewProps) {
  const durationLabel = meta?.durationMs != null
    ? `${Math.max(1, Math.round(meta.durationMs / 1000))}s`
    : meta?.startedAt
      ? "处理中"
      : null

  return (
    <div className="w-full max-w-none rounded-none bg-transparent px-2 py-3 text-sm text-foreground">
      {durationLabel && (
        <div className="mb-3 flex items-center gap-1 border-b pb-2 text-xs text-muted-foreground">
          <span>{meta?.durationMs != null ? "已处理" : "处理中"}</span>
          <span>{durationLabel}</span>
          <span className="text-base leading-none">›</span>
        </div>
      )}

      <div className="max-w-none leading-7">
        {isPending
          ? <span className="animate-pulse">●</span>
          : (
              <ReactMarkdown
                components={{
                  h1: props => <h1 className="mb-3 mt-1 text-lg font-semibold leading-7" {...props} />,
                  h2: props => <h2 className="mb-2 mt-4 text-base font-semibold leading-7" {...props} />,
                  h3: props => <h3 className="mb-2 mt-3 text-sm font-semibold leading-6" {...props} />,
                  p: props => <p className="my-2 leading-7" {...props} />,
                  ol: props => <ol className="my-3 list-decimal space-y-3 pl-6" {...props} />,
                  ul: props => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
                  li: props => <li className="pl-1 leading-7" {...props} />,
                  strong: props => <strong className="font-semibold" {...props} />,
                  a: props => <a className="text-blue-600 underline-offset-2 hover:underline" target="_blank" rel="noreferrer" {...props} />,
                  hr: props => <hr className="my-4 border-border" {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
      </div>

      {msg.content && (
        <div className="mt-3 flex items-center gap-3 text-muted-foreground">
          <ActionIconButton title={copied ? "已复制" : "复制"} onClick={onCopy}>
            {copied ? <IconCheck className="size-4" /> : <IconCopy className="size-4" />}
          </ActionIconButton>
          <ActionIconButton title="保存到 Knowledge" onClick={onSave}>
            <IconDeviceFloppy className="size-4" />
          </ActionIconButton>
          <ActionIconButton title={isSpeaking ? "停止朗读" : "朗读"} onClick={onSpeak}>
            {isSpeaking ? <IconVolumeOff className="size-4" /> : <IconVolume className="size-4" />}
          </ActionIconButton>
          <ActionIconButton title="赞" active={feedback === "up"} onClick={() => onFeedback("up")}>
            <IconThumbUp className="size-4" />
          </ActionIconButton>
          <ActionIconButton title="踩" active={feedback === "down"} onClick={() => onFeedback("down")}>
            <IconThumbDown className="size-4" />
          </ActionIconButton>
          <ActionIconButton title="展开" onClick={() => openAssistantMessageInTab(msg)}>
            <IconArrowsDiagonal className="size-4" />
          </ActionIconButton>
          <span className="ml-1 text-xs">{formatMessageTime(msg.createdAt)}</span>
        </div>
      )}
    </div>
  )
}

function ActionIconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function formatMessageTime(createdAt: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(createdAt))
}

function openAssistantMessageInTab(msg: ChatMessage) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>OwlNest Agent</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.75;max-width:860px;margin:40px auto;padding:0 24px;color:#202124;white-space:pre-wrap}h1,h2,h3{line-height:1.35}</style></head><body>${escapeHtml(msg.content)}</body></html>`
  const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  void browser.tabs.create({ url, active: true })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function handleSaveToKnowledge(msg: ChatMessage) {
  if (msg.role !== "assistant" || !msg.content)
    return
  void (async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })
      await (sendMessage as any)("knowledge:create", { card: { selectedText: "", resultText: msg.content, pageUrl: tabs[0]?.url ?? "", pageTitle: tabs[0]?.title, sourceType: "ai-action", provider: msg.providerName ?? "AI", tags: [], topic: "" } })
    }
    catch { /* best-effort */ }
  })()
}

function formatCurrentPageToolContext(page: CurrentPageSnapshot, maxContentLength: number): string {
  const readableText = page.selectedText || page.content
  const content = readableText.trim()
    ? readableText.slice(0, maxContentLength)
    : "(No readable body text was extracted from this page.)"

  return [
    "[Tool: current_page]",
    "The user is viewing this page in the active browser tab.",
    `Title: ${page.title || "(untitled)"}`,
    `URL: ${page.url || "(unknown)"}`,
    `Description: ${page.description || "(none)"}`,
    `Selected Text: ${page.selectedText || "(none)"}`,
    "",
    "Readable Content:",
    content,
  ].join("\n")
}

function resolveChatModeProvider(
  mode: ChatMode,
  providers: LLMProviderConfig[],
  selectedProviderId: string | null,
): { provider: LLMProviderConfig | null, fallbackMessage: string | null } {
  const defaultProvider = providers.find(provider => provider.id === selectedProviderId)
    ?? providers.find(provider => !!provider.apiKey)
    ?? providers[0]
    ?? null

  if (!defaultProvider)
    return { provider: null, fallbackMessage: null }

  const keyedProviders = providers.filter(provider => !!provider.apiKey)
  const candidates = keyedProviders.length > 0 ? keyedProviders : providers
  const fallback = { provider: defaultProvider, fallbackMessage: null }

  if (mode === "balanced")
    return fallback

  if (mode === "smart") {
    const smartProvider = defaultProvider.apiKey ? defaultProvider : candidates[0]
    return {
      provider: smartProvider ?? defaultProvider,
      fallbackMessage: smartProvider ? null : "智能模式暂未找到可用 provider，已回退到默认 Chat Provider。",
    }
  }

  const scored = candidates
    .map(provider => ({
      provider,
      score: mode === "fast" ? getFastProviderScore(provider) : getAdvancedProviderScore(provider),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const chosen = scored[0]?.provider
  if (chosen)
    return { provider: chosen, fallbackMessage: null }

  return {
    provider: defaultProvider,
    fallbackMessage: `${mode === "fast" ? "极速" : "高级"}模式暂未找到匹配的可用 provider，已回退到默认 Chat Provider：${defaultProvider.name}。`,
  }
}

function getProviderModelId(provider: LLMProviderConfig): string {
  if (!("model" in provider))
    return ""
  return provider.model.customModel || provider.model.model || ""
}

function getProviderRuntimeLabel(provider: LLMProviderConfig): string {
  const modelId = getProviderModelId(provider)
  return [
    provider.name,
    provider.provider,
    modelId || "unknown model",
  ].filter(Boolean).join(" / ")
}

function getProviderSearchText(provider: LLMProviderConfig): string {
  return `${provider.id} ${provider.name} ${provider.provider} ${getProviderModelId(provider)}`.toLowerCase()
}

function getDefaultChatModeForProvider(provider: LLMProviderConfig): ChatMode {
  const text = getProviderSearchText(provider)
  if (/reason|deepseek-r1|qwq|thinking|sonar-(?:deep-research|reasoning)|gpt-5(?:\.5|\.4|\.2|-pro)?|opus|pro|kimi-k2-thinking|mimo.*pro/.test(text))
    return "advanced"
  return "balanced"
}

function getFastProviderScore(provider: LLMProviderConfig): number {
  const text = getProviderSearchText(provider)
  let score = 0
  if (/\b(?:deepseek-chat|gpt-4o-mini|gpt-4\.1-mini|gpt-5(?:\.\d+)?-(?:mini|nano)|mini|max-flash|flash|lite|turbo|instant|fast|highspeed|qwen-flash|mimo.*flash)\b/i.test(text))
    score += 12
  if (/\b(?:groq|cerebras|volcengine|minimax|mimo|deepseek|openrouter)\b/i.test(text))
    score += 3
  if (/reason|thinking|pro|opus|sonar-deep-research/.test(text))
    score -= 6
  return score
}

function getAdvancedProviderScore(provider: LLMProviderConfig): number {
  const text = getProviderSearchText(provider)
  let score = 0
  if (/reason|deepseek-r1|qwq|thinking|sonar-(?:deep-research|reasoning)|gpt-5(?:\.5|\.4|\.2|-pro)?|gpt-4\.1|opus|sonnet|pro|kimi-k2-thinking|mimo.*pro/.test(text))
    score += 12
  if (provider.provider === "deepseek" || provider.provider === "openrouter" || provider.provider === "openai-compatible" || provider.provider === "openai" || provider.provider === "minimax")
    score += 2
  if (/mini|nano|lite|flash|highspeed|turbo/.test(text))
    score -= 4
  return score
}

function extractWeatherLocation(query: string): string {
  const compact = query.replace(/\s+/g, "")
  const chineseMatch = compact.match(/(?:今天|明天|现在|查询|查一下|请问)?(.{2,20}?)(?:天气|气温)/)
  if (chineseMatch?.[1])
    return chineseMatch[1].replace(/的$/, "") || "北京"

  const lower = query.toLowerCase()
  for (const marker of ["weather in ", "weather for ", "forecast in ", "forecast for ", "temperature in ", "temperature for ", "in ", "for "]) {
    const index = lower.indexOf(marker)
    if (index >= 0) {
      const value = query.slice(index + marker.length).replace(/weather|forecast|temperature/gi, "").trim()
      if (value)
        return value
    }
  }
  return "Beijing"
}

async function fetchWeatherContext(query: string): Promise<string> {
  const location = extractWeatherLocation(query)
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=zh`)
    if (!response.ok)
      return ""
    const data = await response.json() as any
    const current = data.current_condition?.[0]
    const area = data.nearest_area?.[0]
    const place = area?.areaName?.[0]?.value ?? location
    if (!current)
      return ""
    return [
      `Location: ${place}`,
      `Weather: ${current.weatherDesc?.[0]?.value ?? ""}`,
      `Temperature: ${current.temp_C}°C`,
      `Feels like: ${current.FeelsLikeC}°C`,
      `Humidity: ${current.humidity}%`,
      `Wind: ${current.windspeedKmph} km/h`,
    ].join("\n")
  }
  catch {
    return ""
  }
}

async function fetchWebSearchContext(query: string): Promise<string> {
  const config = await getAgentWebSearchConfig()
  const search = await performWebSearch(query, config)
  const context = formatSearchResults(search.results)
  if (!context)
    return ""

  return search.fallbackUsed
    ? `${context}\n\nTool guidance: These are no-key fallback search results. They may be latest-available rather than exact-date results. If the user asked for today's news, do not stop at saying no exact same-day result was found. Summarize the returned results with dates/sources and clearly label them as latest available.`
    : `${context}\n\nTool guidance: Summarize these search results with dates and sources. If exact same-day results are missing, still provide the latest available results.`
}
