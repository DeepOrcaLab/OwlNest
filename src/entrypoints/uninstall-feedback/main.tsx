import { createRoot } from "react-dom/client"
import { browser } from "#imports"
import "@/assets/styles/theme.css"

function UninstallFeedback() {
  const iconUrl = browser.runtime.getURL("/owlnest-icon.png")
  const params = new URLSearchParams(location.search)
  const version = params.get("version") ?? "dev"
  const browserType = params.get("browser") ?? "browser"

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-6 py-10 text-[#202124]">
      <section className="mx-auto flex max-w-2xl flex-col items-start gap-7 rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <img src={iconUrl} alt="OwlNest" className="size-20 rounded-2xl" />
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#6f756d]">OwlNest Agent</p>
          <h1 className="text-3xl font-semibold leading-tight">感谢你试用 OwlNest</h1>
          <p className="text-base leading-7 text-[#4b514a]">
            如果你离开是因为功能不够、联网不可用、页面读取失败、语音不稳定，OwlNest 会继续修。你也可以到项目页留下反馈，我会优先处理这些真实问题。
          </p>
        </div>
        <div className="grid w-full gap-3 text-sm text-[#4b514a] sm:grid-cols-2">
          <div className="rounded-xl bg-[#f0f3ee] p-4">
            <div className="font-medium text-[#202124]">版本</div>
            <div>{version}</div>
          </div>
          <div className="rounded-xl bg-[#f0f3ee] p-4">
            <div className="font-medium text-[#202124]">浏览器</div>
            <div>{browserType}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/owlnest/owlnest/issues/new"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/85"
          >
            反馈问题
          </a>
          <a
            href="https://github.com/owlnest/owlnest"
            className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5"
          >
            打开项目页
          </a>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<UninstallFeedback />)
