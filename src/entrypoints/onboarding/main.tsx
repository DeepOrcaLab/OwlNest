import "@/utils/zod-config"
import { useMemo, useState } from "react"
import { browser } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { sendMessage } from "@/utils/message"
import { renderPersistentReactRoot } from "@/utils/react-root"
import "@/assets/styles/theme.css"

const languages = ["简体中文", "繁体中文", "English", "日本語", "한국어"]

const steps = [
  {
    title: "欢迎使用 OwlNest",
    subtitle: "你的 AI 阅读、翻译与知识巢助手已经安装完成。",
    body: "选择主要语言后，OwlNest 会陪你阅读网页、理解内容，并把重要知识沉淀到个人知识巢。",
    action: "继续",
  },
  {
    title: "固定 OwlNest 插件图标",
    subtitle: "为了方便随时打开翻译、AI 聊天和知识库，请把 OwlNest 固定到浏览器工具栏。",
    body: "点击浏览器右上角扩展按钮，找到 OwlNest，并把它固定到工具栏。",
    action: "我已固定，继续",
  },
  {
    title: "试试 OwlNest 翻译和 AI 阅读",
    subtitle: "打开任意英文网页，点击 OwlNest 图标，可以进行网页翻译、划词解释，也可以打开 OwlNest Agent 询问当前网页内容。",
    body: "你可以让 OwlNest 总结当前页面、解释难懂段落，或把重点保存到 Knowledge 知识巢。",
    action: "继续",
  },
  {
    title: "OwlNest 已准备好",
    subtitle: "现在你可以使用 OwlNest 进行网页翻译、AI 聊天、语音提问、联网搜索，并把重要内容保存到 Knowledge 知识巢。",
    body: "配置 DeepSeek、OpenAI、小米 MiMo、OpenRouter 或自定义 API 后，可以启用更完整的 AI 能力。",
    action: "完成",
  },
]

function OnboardingApp() {
  const [stepIndex, setStepIndex] = useState(0)
  const [language, setLanguage] = useState(languages[0])
  const imageUrl = useMemo(() => browser.runtime.getURL("/assets/owlnest/owlnest-onboarding.png"), [])
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  function next() {
    if (isLast) {
      window.close()
      return
    }
    setStepIndex(current => Math.min(current + 1, steps.length - 1))
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_1.08fr]">
        <section className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" />
            OwlNest - AI 阅读与知识巢
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">
              Step
              {" "}
              {stepIndex + 1}
              {" / "}
              {steps.length}
            </p>
            <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">{step.title}</h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">{step.subtitle}</p>
          </div>

          <p className="max-w-xl text-sm leading-7 text-muted-foreground">{step.body}</p>

          {stepIndex === 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">主要语言</div>
              <div className="flex flex-wrap gap-2">
                {languages.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLanguage(item)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${language === item ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={next}>{step.action}</Button>
            {isLast && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    void sendMessage("openOptionsPage", { route: "/api-providers" })
                  }}
                >
                  打开设置
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void sendMessage("toggleSidePanel", { source: "extension-user-action" })
                  }}
                >
                  打开 OwlNest Agent
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <img
            src={imageUrl}
            alt="OwlNest owl learning scenes"
            className="block aspect-[4/3] h-auto w-full object-cover"
          />
        </section>
      </div>
    </main>
  )
}

const root = document.getElementById("root")!
root.className = "min-h-screen bg-background text-base antialiased"

renderPersistentReactRoot(root, <OnboardingApp />)
