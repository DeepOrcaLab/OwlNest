import { IconLanguageHiragana } from "@tabler/icons-react"
import { browser, i18n } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/base-ui/tooltip"

export function TranslationHubButton() {
  const handleClick = async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL("/translation-hub.html"),
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={handleClick} />}>
        <IconLanguageHiragana />
      </TooltipTrigger>
      <TooltipContent className="max-w-[200px] text-wrap">
        {i18n.t("popup.hub.tooltip")}
      </TooltipContent>
    </Tooltip>
  )
}
