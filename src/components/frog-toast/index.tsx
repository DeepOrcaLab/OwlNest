import { kebabCase } from "case-anything"
import * as React from "react"
import { Toaster } from "sonner"

import { browser } from "#imports"
import owlIcon from "@/assets/icons/owlnest-icon.png?url&no-inline"
import { APP_NAME } from "@/utils/constants/app"

const owlIconUrl = new URL(owlIcon, browser.runtime.getURL("/")).href

const owlIconElement = (
  <img
    src={owlIconUrl}
    alt="OwlNest"
    style={{
      maxWidth: "100%",
      height: "auto",
      minHeight: "20px",
      minWidth: "20px",
    }}
  />
)

function OwlToast({ position = "bottom-left", toastOptions, ...props }: React.ComponentProps<typeof Toaster>) {
  return (
    <Toaster
      {...props}
      position={position}
      richColors
      icons={{
        warning: owlIconElement,
        success: owlIconElement,
        error: owlIconElement,
        info: owlIconElement,
        loading: owlIconElement,
      }}
      toastOptions={{
        ...toastOptions,
        className: [`${kebabCase(APP_NAME)}-toaster`, toastOptions?.className].filter(Boolean).join(" "),
      }}
      className="z-[2147483647] notranslate"
    />
  )
}

export default OwlToast
