import {
  IconBook,
  IconBrandGithub,
  IconBug,
  IconDots,
  IconInfoCircle,
  IconLanguageHiragana,
} from "@tabler/icons-react"
import { browser, i18n } from "#imports"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/base-ui/dropdown-menu"

export function MoreMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-300 dark:hover:bg-neutral-700"
          />
        )}
      >
        <IconDots className="size-4" strokeWidth={1.6} />
        <span className="text-[13px] font-medium">{i18n.t("popup.more.title")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-fit">
        <DropdownMenuItem
          onClick={() => window.open("https://github.com/owlnest/owlnest", "_blank", "noopener,noreferrer")}
          className="cursor-pointer"
        >
          <IconBrandGithub className="size-4" strokeWidth={1.6} />
          GitHub Project
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.open("https://owlnest.app/docs", "_blank", "noopener,noreferrer")}
          className="cursor-pointer"
        >
          <IconBook className="size-4" strokeWidth={1.6} />
          Documentation
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.open("https://github.com/owlnest/owlnest/issues", "_blank", "noopener,noreferrer")}
          className="cursor-pointer"
        >
          <IconBug className="size-4" strokeWidth={1.6} />
          Report Issue
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => void browser.tabs.create({ url: browser.runtime.getURL("/translation-hub.html") })}
          className="cursor-pointer"
        >
          <IconLanguageHiragana className="size-4" strokeWidth={1.6} />
          {i18n.t("popup.more.translationHub")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.open("https://owlnest.app/about", "_blank", "noopener,noreferrer")}
          className="cursor-pointer"
        >
          <IconInfoCircle className="size-4" strokeWidth={1.6} />
          About OwlNest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
