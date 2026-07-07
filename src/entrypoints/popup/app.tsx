import { IconSettings } from "@tabler/icons-react"
import { browser, i18n } from "#imports"
import { openOptionsPage } from "@/utils/navigation"
import { version } from "../../../package.json"
import { AISmartContext } from "./components/ai-smart-context"
import { AlwaysTranslate } from "./components/always-translate"
import LanguageOptionsSelector from "./components/language-options-selector"
import { MoreMenu } from "./components/more-menu"
import Hotkey from "./components/node-translation-hotkey-selector"
import ProvidersField from "./components/providers-field"
import { SidePanelButton } from "./components/side-panel-button"
import { SiteControlToggle } from "./components/site-control-toggle"
import TranslateButton from "./components/translate-button"
import TranslatePromptSelector from "./components/translate-prompt-selector"
import { TranslationHubButton } from "./components/translation-hub-button"
import TranslationModeSelector from "./components/translation-mode-selector"

function App() {
  const owlIconUrl = browser.runtime.getURL("/owlnest-icon.png")

  return (
    <>
      <div className="bg-background flex flex-col gap-4 px-6 pt-5 pb-4">
        {/* OwlNest header — no account system */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={owlIconUrl} alt="" className="size-5 rounded-md" />
            <span className="text-[15px] font-semibold">OwlNest</span>
            <span className="text-[11px] text-muted-foreground">AI Reading Agent</span>
          </div>
          <div className="flex items-center">
            <TranslationHubButton />
          </div>
        </div>
        <LanguageOptionsSelector />
        <ProvidersField />
        <TranslatePromptSelector />
        <div className="flex w-full items-center gap-2">
          <TranslationModeSelector />
          <TranslateButton className="min-w-0 flex-1" />
        </div>
        <SidePanelButton />
        <SiteControlToggle />
        <AlwaysTranslate />
        <Hotkey />
        <AISmartContext />
      </div>
      <div className="flex items-center justify-between bg-muted px-2 py-1">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 hover:bg-muted-foreground/10"
          onClick={() => {
            void openOptionsPage()
          }}
        >
          <IconSettings className="size-4" strokeWidth={1.6} />
          <span className="text-[13px] font-medium">
            {i18n.t("popup.options")}
          </span>
        </button>
        <span className="text-sm text-muted-foreground">
          OwlNest v
          {version}
        </span>
        <MoreMenu />
      </div>
    </>
  )
}

export default App
