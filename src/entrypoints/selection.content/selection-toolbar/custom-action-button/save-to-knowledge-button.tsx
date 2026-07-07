import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
import type { KnowledgeSourceType } from "@/types/knowledge"
import { useMutation } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/base-ui/button"
import { sendMessage } from "@/utils/message"

interface SaveToLocalKnowledgeButtonProps {
  action: SelectionToolbarCustomAction
  isRunning: boolean
  result: Record<string, unknown> | null
  selectionText?: string | null
  sourceUrl?: string
  pageTitle?: string | null
}

/**
 * Saves the current action result to the local IndexedDB knowledge base.
 * Works without login — always available.
 */
export function SaveToLocalKnowledgeButton({
  action,
  isRunning,
  result,
  selectionText,
  sourceUrl,
  pageTitle,
}: SaveToLocalKnowledgeButtonProps) {
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result || !selectionText)
        return

      const fields = result as Record<string, unknown>

      // Extract meaningful result text from structured output
      const resultText = typeof fields.translation === "string"
        ? fields.translation
        : typeof fields.definition === "string"
          ? fields.definition
          : typeof fields.explanation === "string"
            ? fields.explanation
            : JSON.stringify(fields)

      // Determine source type from action template
      let sourceType: KnowledgeSourceType = "ai-action"
      if (action.name.toLowerCase().includes("dictionary") || action.name.toLowerCase().includes("词典")) {
        sourceType = "dictionary"
      }
      else if (action.name.toLowerCase().includes("translat") || action.name.toLowerCase().includes("翻译")) {
        sourceType = "translation"
      }

      await (sendMessage as any)("knowledge:create", {
        card: {
          selectedText: selectionText,
          resultText,
          pageUrl: sourceUrl ?? window.location.href,
          pageTitle: pageTitle || document.title || undefined,
          sourceType,
          provider: "local",
          tags: [],
          topic: "",
        },
      })
    },
    onSuccess: () => {
      setSaved(true)
      toast.success("Saved to Knowledge")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save to knowledge base",
      )
    },
  })

  const handleSave = useCallback(() => {
    if (saved)
      return
    saveMutation.mutate()
  }, [saveMutation, saved])

  if (!result || isRunning)
    return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSave}
      disabled={saveMutation.isPending || saved}
      className="h-7 text-xs"
    >
      {saveMutation.isPending ? "Saving..." : saved ? "Saved" : "Save to Knowledge"}
    </Button>
  )
}
