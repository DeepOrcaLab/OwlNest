import { IconMessageChatbot } from "@tabler/icons-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/base-ui/button"
import { sendMessage } from "@/utils/message"

export function SidePanelButton() {
  const [errorText, setErrorText] = useState<string | null>(null)

  const openSidePanel = async () => {
    console.warn("[Popup] Open AI Sidebar clicked")
    setErrorText(null)

    // Try chrome.sidePanel.open() directly from the user-gesture context first.
    // chrome.sidePanel.open MUST be called in direct response to a user gesture.
    try {
      const chromeApi = (globalThis as any).chrome?.sidePanel
      if (typeof chromeApi?.open === "function") {
        const currentWindow = await (globalThis as any).chrome.windows.getCurrent()
        console.warn("[Popup] Calling chrome.sidePanel.open with windowId:", currentWindow.id)
        await chromeApi.open({ windowId: currentWindow.id })
        console.warn("[Popup] chrome.sidePanel.open succeeded")
        // Close the popup so the user sees the side panel
        window.close()
        return
      }
    }
    catch (err) {
      console.warn("[Popup] chrome.sidePanel.open failed, falling back to background message:", err)
    }

    // Fallback: send message to background with pre-resolved windowId
    try {
      const chromeApi = (globalThis as any).chrome
      if (chromeApi?.windows) {
        const currentWindow = await chromeApi.windows.getCurrent()
        console.warn("[Popup] Fallback: sending openSidePanel with windowId:", currentWindow.id)
        const result = await sendMessage("toggleSidePanel", {
          source: "extension-user-action",
          windowId: currentWindow.id,
        } as any) as { ok?: boolean, action?: string, reason?: string }

        if (result?.ok) {
          console.warn("[Popup] toggleSidePanel succeeded:", result.action)
          window.close()
          return
        }
        console.warn("[Popup] toggleSidePanel returned:", result)
      }
    }
    catch (err) {
      console.error("[Popup] All side panel open methods failed:", err)
    }

    // All methods failed
    const msg = "Failed to open sidebar"
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
