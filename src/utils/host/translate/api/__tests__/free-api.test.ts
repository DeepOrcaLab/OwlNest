import { describe, expect, it } from "vitest"
import { googleTranslate, microsoftTranslate } from "../../api"

// Network tests are opt-in: only run when explicitly enabled.
// SKIP_FREE_API is the legacy env var; RUN_NETWORK_TESTS is the canonical opt-in.
const runNetworkTests = process.env.RUN_NETWORK_TESTS === "true"
  || (process.env.SKIP_FREE_API !== "true" && process.env.CI === "true")

const describeFreeApi = runNetworkTests ? describe : describe.skip

describeFreeApi("googleTranslate", () => {
  it("google translates text to simplified chinese", async () => {
    const result = await googleTranslate("Library", "en", "zh")
    expect(result).toBe("图书馆")
  }, 15000)
  it("google translates text to traditional chinese", async () => {
    const result = await googleTranslate("Library", "en", "zh-TW")
    expect(result).toBe("圖書館")
  }, 15000)
})

describeFreeApi("microsoftTranslate", () => {
  it("microsoft translates text to simplified chinese", async () => {
    const result = await microsoftTranslate("Library", "en", "zh")
    expect(result).toBe("图书馆")
  }, 15000)
  it("microsoft translates text to traditional chinese", async () => {
    const result = await microsoftTranslate("Library", "en", "zh-TW")
    expect(result).toBe("圖書館")
  }, 15000)
})
