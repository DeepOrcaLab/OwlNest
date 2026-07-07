import type { LLMProviderConfig } from "@/types/config/provider"
import {
  IconArrowUp,
  IconBolt,
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconLoader2,
  IconMicrophone,
  IconPlayerStop,
  IconSparkles,
  IconWaveSine,
} from "@tabler/icons-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { browser } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { cn } from "@/utils/styles/utils"

export type ChatMode = "smart" | "fast" | "balanced" | "advanced"

export interface ChatModeConfig {
  id: ChatMode
  label: string
  description: string
  providerId?: string
  model?: string
}

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  currentMode: ChatMode
  onModeChange: (mode: ChatMode) => void
  providers: LLMProviderConfig[]
  selectedProviderId: string | null
  onProviderChange: (providerId: string) => void
  isListening: boolean
  onStartListening: () => void
  onStopListening: () => void
  onStartVoiceConversation: () => void
  voiceSupported: boolean
  isRequestingVoicePermission?: boolean
  voiceStatusText?: string | null
  voiceError?: string | null
  onOpenVoicePermissionPage?: () => void
  onOpenProviderSettings?: () => void
}

const MODE_META: Record<ChatMode, Omit<ChatModeConfig, "id" | "label" | "description"> & { icon: typeof IconSparkles, labels: { zh: string, en: string }, descriptions: { zh: string, en: string } }> = {
  smart: {
    labels: { zh: "智能", en: "Smart" },
    descriptions: { zh: "自动选择合适模型，兼顾质量和速度", en: "Automatically chooses a suitable chat model." },
    icon: IconSparkles,
  },
  fast: {
    labels: { zh: "极速", en: "Fast" },
    descriptions: { zh: "优先速度最快的 chat provider / model", en: "Prioritizes the fastest chat-capable model." },
    icon: IconBolt,
  },
  balanced: {
    labels: { zh: "均衡", en: "Balanced" },
    descriptions: { zh: "使用默认 Chat Provider，适合普通问答", en: "Uses the default chat provider." },
    icon: IconWaveSine,
  },
  advanced: {
    labels: { zh: "高级", en: "Advanced" },
    descriptions: { zh: "优先推理能力更强的模型", en: "Prioritizes stronger reasoning models." },
    icon: IconBrain,
  },
}

const MODE_ORDER: ChatMode[] = ["smart", "fast", "balanced", "advanced"]

export function getChatModeConfig(mode: ChatMode): ChatModeConfig {
  return { id: mode, label: MODE_META[mode].labels.zh, description: MODE_META[mode].descriptions.zh }
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  isGenerating,
  currentMode,
  onModeChange,
  providers,
  selectedProviderId,
  onProviderChange,
  isListening,
  onStartListening,
  onStopListening,
  onStartVoiceConversation,
  voiceSupported,
  isRequestingVoicePermission,
  voiceStatusText,
  voiceError,
  onOpenVoicePermissionPage,
  onOpenProviderSettings,
}: ChatInputBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hasInput = value.trim().length > 0
  const isChinese = browser.i18n.getUILanguage?.().toLowerCase().startsWith("zh") ?? false
  const locale = isChinese ? "zh" : "en"
  const mode = MODE_META[currentMode]
  const ModeIcon = mode.icon
  const placeholder = isChinese ? "有问题，尽管问" : "Ask OwlNest Agent..."
  const selectedProvider = providers.find(provider => provider.id === selectedProviderId)
  const menuModeItems = useMemo(() => MODE_ORDER.map(modeId => ({
    id: modeId,
    label: MODE_META[modeId].labels[locale],
    description: MODE_META[modeId].descriptions[locale],
    icon: MODE_META[modeId].icon,
  })), [locale])

  useEffect(() => {
    if (!menuOpen)
      return

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node))
        setMenuOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [menuOpen])

  return (
    <div className="relative rounded-[26px] border border-border bg-background px-3 py-2 shadow-sm">
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            if (hasInput && !disabled)
              onSend()
          }
        }}
        placeholder={isListening ? isChinese ? "正在聆听..." : "Listening..." : placeholder}
        disabled={disabled}
        rows={1}
        className="max-h-32 min-h-9 w-full resize-none border-0 bg-transparent px-1 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
      {voiceStatusText && (
        <div className={cn("px-1 pb-1 text-[11px]", voiceError ? "text-destructive" : "text-muted-foreground")}>
          {voiceStatusText}
        </div>
      )}
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            className="inline-flex h-8 max-w-[42vw] shrink min-w-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={selectedProvider ? `${mode.labels[locale]}: ${selectedProvider.name}` : mode.labels[locale]}
            aria-label={`Chat mode: ${mode.labels[locale]}`}
          >
            <ModeIcon className="size-3.5 shrink-0" />
            <span className="truncate">{mode.labels[locale]}</span>
            <IconChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-full right-0 z-[9999] mb-2 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/10">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {isChinese ? "聊天模式" : "Chat mode"}
              </div>
              {menuModeItems.map((item) => {
                const ItemIcon = item.icon
                const selected = currentMode === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onModeChange(item.id)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ItemIcon className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 font-medium">
                        {item.label}
                        {selected && <IconCheck className="size-4 text-primary" />}
                      </span>
                      <span className="mt-0.5 block whitespace-normal text-xs leading-4 text-muted-foreground">{item.description}</span>
                    </span>
                  </button>
                )
              })}

              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {isChinese ? "当前模型" : "Current model"}
              </div>
              {providers.length > 0
                ? providers.map((provider) => {
                    const selected = provider.id === selectedProviderId
                    const modelLabel = "model" in provider
                      ? provider.model?.customModel || provider.model?.model
                      : undefined

                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => {
                          onProviderChange(provider.id)
                          setMenuOpen(false)
                        }}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2 font-medium">
                            <span className="truncate">{provider.name}</span>
                            {selected && <IconCheck className="size-4 shrink-0 text-primary" />}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {provider.provider}
                            {modelLabel ? ` · ${modelLabel}` : ""}
                            {!provider.apiKey ? isChinese ? " · 缺少 API Key" : " · Missing API key" : ""}
                          </span>
                        </span>
                      </button>
                    )
                  })
                : (
                    <div className="space-y-2 rounded-lg px-2 py-2 text-sm">
                      <div className="font-medium">{isChinese ? "未配置 AI 模型" : "No AI model configured"}</div>
                      <div className="text-xs leading-5 text-muted-foreground">
                        {isChinese
                          ? "请到 Options → API 提供商 中添加 DeepSeek、OpenAI、MiMo 或 OpenRouter"
                          : "Add DeepSeek, OpenAI, MiMo, OpenRouter, or another chat provider in Options → API Providers."}
                      </div>
                      {onOpenProviderSettings && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenProviderSettings()
                            setMenuOpen(false)
                          }}
                        >
                          {isChinese ? "打开设置" : "Open settings"}
                        </Button>
                      )}
                    </div>
                  )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={isListening ? onStopListening : onStartListening}
          disabled={disabled || isRequestingVoicePermission}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isListening && "bg-primary/10 text-primary ring-1 ring-primary/30",
            voiceError && "text-destructive",
            (disabled || isRequestingVoicePermission) && "cursor-not-allowed opacity-40",
          )}
          title={!voiceSupported ? "Voice recognition is not supported" : isListening ? "Stop voice input" : "Voice input"}
          aria-label={!voiceSupported ? "Voice recognition not supported" : isListening ? "Stop voice input" : "Start voice input"}
        >
          {isRequestingVoicePermission ? <IconLoader2 className="size-4 animate-spin" /> : <IconMicrophone className="size-4" />}
        </button>

        {voiceError && onOpenVoicePermissionPage && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="hidden max-[360px]:hidden sm:inline-flex"
            onClick={onOpenVoicePermissionPage}
          >
            {isChinese ? "授权" : "Allow"}
          </Button>
        )}

        <Button
          type="button"
          size="icon-lg"
          onClick={() => {
            if (isGenerating) {
              onStop?.()
              return
            }
            if (hasInput)
              onSend()
            else
              onStartVoiceConversation()
          }}
          disabled={disabled && !isGenerating}
          className={cn(
            "size-9 rounded-full disabled:opacity-40",
            isGenerating
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/85"
              : "bg-foreground text-background hover:bg-foreground/85",
          )}
          title={isGenerating ? "Stop generating" : hasInput ? "Send" : "Voice conversation"}
          aria-label={isGenerating ? "Stop generating" : hasInput ? "Send message" : "Start voice conversation"}
        >
          {isGenerating
            ? <IconPlayerStop className="size-4 fill-current" />
            : hasInput
              ? <IconArrowUp className="size-4 stroke-[2.4]" />
              : <IconWaveSine className="size-4 stroke-[2.4]" />}
        </Button>
      </div>
    </div>
  )
}
