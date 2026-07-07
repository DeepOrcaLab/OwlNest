import { browser } from "#imports"

export const APP_NAME = "OwlNest"
const manifest = browser.runtime.getManifest()
export const EXTENSION_VERSION = manifest.version
