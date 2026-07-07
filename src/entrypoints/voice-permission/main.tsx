import "@/utils/zod-config"
import { useState } from "react"
import { browser } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { renderPersistentReactRoot } from "@/utils/react-root"
import "@/assets/styles/theme.css"

function getPermissionErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "Unknown"
  const message = error instanceof Error ? error.message : ""
  console.warn("[OwlNest Voice Permission] getUserMedia failed", { name, message })

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "麦克风权限被拒绝，请在浏览器权限中允许 OwlNest 使用麦克风。"
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "没有检测到麦克风，请检查设备。"
    case "NotReadableError":
    case "TrackStartError":
      return "麦克风可能被其他应用占用。"
    case "SecurityError":
      return "当前扩展页面无法请求麦克风权限，请检查 Chrome 扩展页面权限。"
    default:
      return "语音功能启动失败，请查看控制台错误。"
  }
}

function VoicePermissionApp() {
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "error">("idle")
  const [message, setMessage] = useState("请点击按钮授权 OwlNest 使用麦克风。")

  async function requestPermission() {
    setStatus("requesting")
    setMessage("正在请求麦克风权限...")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      await browser.storage.local.set({ voicePermissionGranted: true })
      console.warn("[OwlNest Voice Permission] getUserMedia permission result", { granted: true })
      setStatus("granted")
      setMessage("麦克风授权成功。现在可以回到 OwlNest Side Panel 使用语音输入。")
    }
    catch (error) {
      await browser.storage.local.set({ voicePermissionGranted: false })
      setStatus("error")
      setMessage(getPermissionErrorMessage(error))
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">OwlNest 语音权限</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-5 flex gap-2">
          <Button onClick={() => void requestPermission()} disabled={status === "requesting"}>
            {status === "requesting" ? "请求中..." : status === "granted" ? "重新授权" : "授权麦克风"}
          </Button>
          <Button variant="outline" onClick={() => window.close()}>
            关闭
          </Button>
        </div>
      </section>
    </main>
  )
}

const root = document.getElementById("root")!
root.className = "min-h-screen bg-background text-base antialiased"

renderPersistentReactRoot(root, <VoicePermissionApp />)
