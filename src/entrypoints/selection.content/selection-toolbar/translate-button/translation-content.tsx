import type { ThinkingSnapshot } from "@/types/background-stream"
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react"
import { Activity, useCallback } from "react"
import { toast } from "sonner"
import { Thinking } from "@/components/thinking"
import { buttonVariants } from "@/components/ui/base-ui/button"
import { sendMessage } from "@/utils/message"
import { CopyButton } from "../../components/copy-button"
import { SelectionSourceContent } from "../../components/selection-source-content"
import { SpeakButton } from "../../components/speak-button"

interface TranslationContentProps {
  selectionContent: string | null | undefined
  translatedText: string | undefined
  isTranslating: boolean
  thinking: ThinkingSnapshot | null
}

export function TranslationContent({
  selectionContent,
  translatedText,
  isTranslating,
  thinking,
}: TranslationContentProps) {
  const showLoadingIndicator = isTranslating && !thinking && !translatedText
  const showStreamingIndicator = isTranslating && !thinking && translatedText

  const handleSaveToKnowledge = useCallback(async () => {
    if (!selectionContent)
      return
    try {
      await (sendMessage as any)("knowledge:create", {
        card: {
          selectedText: selectionContent,
          resultText: translatedText ?? "",
          pageUrl: window.location.href,
          pageTitle: document.title || undefined,
          sourceType: "translation",
          provider: "local",
          tags: [],
          topic: "",
        },
      })
      toast.success("Saved to Knowledge")
    }
    catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save",
      )
    }
  }, [selectionContent, translatedText])

  return (
    <div className="p-4">
      <SelectionSourceContent text={selectionContent} separatorClassName="mb-3" />
      <div className="space-y-2">
        {thinking && (
          <Thinking status={thinking.status} content={thinking.text} />
        )}
        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {showLoadingIndicator && <IconLoader2 className="inline size-4 animate-spin" strokeWidth={1.6} />}
          {translatedText}
          {showStreamingIndicator && " ●"}
        </p>
        <Activity mode={translatedText ? "visible" : "hidden"}>
          <div className="flex items-center gap-1">
            <CopyButton text={translatedText} />
            <SpeakButton text={translatedText} />
            <button
              type="button"
              className={buttonVariants({ variant: "ghost-secondary", size: "icon-sm" })}
              onClick={() => void handleSaveToKnowledge()}
              aria-label="Save to Knowledge"
              title="Save to Knowledge"
            >
              <IconDeviceFloppy />
            </button>
          </div>
        </Activity>
      </div>
    </div>
  )
}
