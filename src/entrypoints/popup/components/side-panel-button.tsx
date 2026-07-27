import { IconMessageChatbot } from "@tabler/icons-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/base-ui/button"
import { sendMessage } from "@/utils/message"

function isExtensionContextValid(): boolean {
  try {
    return !!(globalThis as any).chrome?.runtime?.id
  }
  catch {
    return false
  }
}

function ignoreContextInvalidated(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("Extension context invalidated")
    || msg.includes("Could not establish connection")
    || msg.includes("Receiving end does not exist")
}

export function SidePanelButton() {
  const [errorText, setErrorText] = useState<string | null>(null)

  const openSidePanel = async () => {
    if (!isExtensionContextValid()) {
      setErrorText("Extension context is not available, please reload the extension.")
      return
    }
    setErrorText(null)

    const chromeApi = (globalThis as any).chrome

    // Try chrome.sidePanel.open() directly from user-gesture context
    if (typeof chromeApi?.sidePanel?.open === "function") {
      try {
        const currentWindow = await chromeApi.windows.getCurrent()
        if (!isExtensionContextValid())
          return
        await chromeApi.sidePanel.open({ windowId: currentWindow.id })
        window.close()
        return
      }
      catch (err) {
        if (ignoreContextInvalidated(err))
          return
        // Silently fall through to fallback
      }
    }

    // Fallback: send message to background with pre-resolved windowId
    try {
      if (!isExtensionContextValid())
        return
      const currentWindow = await chromeApi.windows.getCurrent()
      if (!isExtensionContextValid())
        return
      const result = await sendMessage("toggleSidePanel", {
        source: "extension-user-action",
        windowId: currentWindow.id,
      } as any) as { ok?: boolean, action?: string, reason?: string }

      if (!isExtensionContextValid())
        return

      if (result?.ok) {
        window.close()
        return
      }

      if (result?.reason === "unsupported") {
        const msg = "Your browser does not support Side Panel. Please use Chrome."
        setErrorText(msg)
        toast.error(msg)
        return
      }
    }
    catch (err) {
      if (ignoreContextInvalidated(err))
        return
    }

    // chrome.sidePanel might not exist at all
    if (typeof chromeApi?.sidePanel?.open !== "function") {
      const msg = "Your browser does not support Side Panel. Please use Chrome."
      setErrorText(msg)
      toast.error(msg)
      return
    }

    const msg = "Failed to open Side Panel"
    setErrorText(msg)
    toast.error(msg)
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={() => void openSidePanel()}
        variant="secondary"
        className="w-full"
      >
        <span className="flex items-center justify-center gap-2">
          <IconMessageChatbot className="size-4.5" strokeWidth={1.6} />
          <span>Open OwlNest Agent</span>
        </span>
      </Button>
      {errorText && (
        <p className="text-center text-[11px] text-destructive">{errorText}</p>
      )}
    </div>
  )
}
