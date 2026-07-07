import "@/utils/zod-config"
import type { ThemeMode } from "@/types/config/theme"
import { Provider as JotaiProvider } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { baseThemeModeAtom } from "@/utils/atoms/theme"
import { renderPersistentReactRoot } from "@/utils/react-root"
import { getLocalThemeMode } from "@/utils/theme"
import { SidePanelApp } from "./app"
import "@/assets/styles/text-small.css"
import "@/assets/styles/theme.css"

function HydrateAtoms({
  initialValues,
  children,
}: {
  initialValues: [
    [typeof baseThemeModeAtom, ThemeMode],
  ]
  children: React.ReactNode
}) {
  useHydrateAtoms(initialValues)
  return children
}

async function initApp() {
  const root = document.getElementById("root")!
  root.className = "min-h-screen bg-background text-base antialiased"

  const themeMode = await getLocalThemeMode()

  renderPersistentReactRoot(root, (
    <JotaiProvider>
      <HydrateAtoms initialValues={[[baseThemeModeAtom, themeMode]]}>
        <ThemeProvider>
          <SidePanelApp />
        </ThemeProvider>
      </HydrateAtoms>
    </JotaiProvider>
  ))
}

void initApp()
